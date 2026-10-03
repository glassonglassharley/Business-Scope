// Private pipeline CLI — work the prospect call sheet and hand warm
// prospects to the fulfillment partner (see src/lib/referrals.js).
//
//   node scripts/pipeline.mjs queue --campaign "sd-plumbers-8km" [--limit 20]
//   node scripts/pipeline.mjs show --campaign "sd-plumbers-8km" --business "SoCal Plumber"
//   node scripts/pipeline.mjs contact --campaign "sd-plumbers-8km" --business "<id|name>" --via phone --notes "Left voicemail"
//   node scripts/pipeline.mjs refer --campaign "sd-plumbers-8km" --business "<id|name>" [--notes "..."]
//   node scripts/pipeline.mjs move --campaign "sd-plumbers-8km" --business "<id|name>" --to replied [--notes "..."]
//   node scripts/pipeline.mjs followups [--campaign "sd-plumbers-8km"]
//   node scripts/pipeline.mjs templates
//
// PRIVATE: server-side only, reads DATABASE_URL from .env.local. Never expose
// these queries through a public route (see tests/publicLeak.test.mjs).

import { parseArgs } from "node:util";
import { loadEnvLocal } from "./envLocal.mjs";

loadEnvLocal();

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    campaign: { type: "string" },
    business: { type: "string" },
    via: { type: "string" },
    to: { type: "string" },
    notes: { type: "string" },
    limit: { type: "string" },
    status: { type: "string" },
    "followup-days": { type: "string" },
  },
});

const command = positionals[0];
const { prospectScoringConfig } = await import("../src/lib/prospectingConfig.mjs");
const referrals = await import("../src/lib/referrals.js");

const STATUSES = ["new", "queued", "needs_lookup", "contacted", "replied", "meeting", "referred", "won", "lost", "disqualified"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function die(msg) {
  console.error(msg);
  process.exit(1);
}

async function getCampaignId(db, name) {
  const r = await db.query("select id from campaigns where name = $1", [name]);
  if (!r.rows.length) die(`No campaign named "${name}".`);
  return r.rows[0].id;
}

/** Resolve --business to {businessId, campaignId, name}: UUID or fuzzy name match. */
async function resolveBusiness(db, campaignName, ref) {
  if (!ref) die("Pass --business <id or name>.");
  let campaignId = null;
  if (campaignName) campaignId = await getCampaignId(db, campaignName);

  if (UUID_RE.test(ref)) {
    const r = await db.query(
      `select b.id as business_id, b.name, ps.campaign_id
       from businesses b join prospect_scores ps on ps.business_id = b.id
       where b.id = $1 ${campaignId ? "and ps.campaign_id = $2" : ""} limit 1`,
      campaignId ? [ref, campaignId] : [ref]
    );
    if (!r.rows.length) die(`No business with id ${ref}${campaignId ? " in this campaign" : ""}.`);
    return r.rows[0];
  }

  const r = await db.query(
    `select b.id as business_id, b.name, ps.campaign_id, c.name as campaign_name
     from businesses b
     join prospect_scores ps on ps.business_id = b.id
     join campaigns c on c.id = ps.campaign_id
     where b.name ilike $1 ${campaignId ? "and ps.campaign_id = $2" : ""}
     order by ps.prospect_score desc nulls last limit 6`,
    campaignId ? [`%${ref}%`, campaignId] : [`%${ref}%`]
  );
  if (!r.rows.length) die(`No business matching "${ref}".`);
  if (r.rows.length > 1) {
    console.error(`"${ref}" matches ${r.rows.length} businesses — be more specific:`);
    for (const row of r.rows) console.error(`  ${row.business_id}  ${row.name}  (${row.campaign_name})`);
    process.exit(1);
  }
  return r.rows[0];
}

async function getChannels(db, placeId) {
  const r = await db.query(
    "select channel_type, platform, value, status from contact_channels where place_id = $1 order by channel_type",
    [placeId]
  );
  return r.rows;
}

function formatChannels(channels) {
  const pick = (t) => channels.filter((c) => c.channel_type === t).map((c) => c.value);
  const parts = [];
  const emails = pick("email"), forms = pick("form"), socials = pick("social");
  if (emails.length) parts.push(`email: ${emails[0]}`);
  if (forms.length) parts.push(`form: ${forms[0]}`);
  if (socials.length) parts.push(`social: ${socials[0]}`);
  return parts.join(" · ") || "no channels";
}

/** Twin of the defect extractor in export-prospects.mjs — keep in sync. */
function topDefects(breakdown, limit) {
  if (!breakdown?.categories) return [];
  const weights = prospectScoringConfig.weakness.categoryWeights;
  const candidates = [];
  for (const category of breakdown.categories) {
    if (category.status !== "measured") continue;
    const w = weights[category.key];
    if (!w) continue;
    for (const metric of category.metrics || []) {
      if (typeof metric.score !== "number" || metric.score >= 75) continue;
      candidates.push({ label: metric.label, note: metric.note, priority: w * (100 - metric.score) });
    }
  }
  return candidates
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit)
    .map((d) => (d.note ? `${d.label}: ${d.note}` : d.label));
}

async function getProspectDetail(db, businessId, campaignId) {
  const r = await db.query(
    `select b.id, b.place_id, b.name, b.city, b.phone, b.website_url, b.rating, b.review_count,
            ps.prospect_score, ps.weakness, ps.viability, ps.momentum,
            p.status, p.notes, p.last_contacted_at, p.next_follow_up_at
     from businesses b
     join prospect_scores ps on ps.business_id = b.id and ps.campaign_id = $2
     left join pipeline p on p.business_id = b.id and p.campaign_id = $2
     where b.id = $1`,
    [businessId, campaignId]
  );
  if (!r.rows.length) die("Business has no score in this campaign.");
  const row = r.rows[0];
  const [channels, scan] = await Promise.all([
    getChannels(db, row.place_id),
    db.query("select score_breakdown from scans where place_id = $1 order by scanned_at desc limit 1", [row.place_id]),
  ]);
  return { ...row, channels, defects: topDefects(scan.rows[0]?.score_breakdown, 3) };
}

function stampNote(existing, text) {
  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  const line = `[${stamp}] ${text}`;
  return existing ? `${existing}\n${line}` : line;
}

async function upsertPipeline(db, businessId, campaignId, patch) {
  const sets = [], params = [businessId, campaignId];
  let i = 3;
  for (const [k, v] of Object.entries(patch)) {
    sets.push(`${k} = $${i++}`);
    params.push(v);
  }
  sets.push("updated_at = now()");
  const r = await db.query(
    `insert into pipeline (business_id, campaign_id, ${Object.keys(patch).join(", ")})
     values ($1, $2, ${Object.keys(patch).map((_, n) => `$${n + 3}`).join(", ")})
     on conflict (business_id, campaign_id) do update set ${sets.join(", ")}
     returning status`,
    params
  );
  return r.rows[0].status;
}

/* ------------------------------------------------------------------ */

async function cmdQueue(db) {
  if (!values.campaign) die("queue needs --campaign.");
  const campaignId = await getCampaignId(db, values.campaign);
  const limit = Math.min(parseInt(values.limit || "20", 10) || 20, 100);
  const statuses = (values.status || "new,queued").split(",").map((s) => s.trim()).filter(Boolean);
  for (const s of statuses) if (!STATUSES.includes(s)) die(`Unknown status "${s}".`);

  const r = await db.query(
    `select b.id, b.place_id, b.name, b.city, b.phone, b.website_url,
            ps.prospect_score, coalesce(p.status, 'new') as status, p.next_follow_up_at
     from prospect_scores ps
     join businesses b on b.id = ps.business_id
     left join pipeline p on p.business_id = b.id and p.campaign_id = ps.campaign_id
     where ps.campaign_id = $1 and ps.disqualified = false and ps.prospect_score is not null
       and coalesce(p.status, 'new') = any($2)
     order by ps.prospect_score desc limit $3`,
    [campaignId, statuses, limit]
  );
  if (!r.rows.length) {
    console.log("Queue is empty for those statuses.");
    return;
  }
  console.log(`Call queue — ${values.campaign} (${r.rows.length} shown)\n`);
  for (const [i, row] of r.rows.entries()) {
    const channels = await getChannels(db, row.place_id);
    const follow = row.next_follow_up_at ? ` | follow up ${String(row.next_follow_up_at).slice(0, 10)}` : "";
    console.log(
      `${String(i + 1).padStart(2)}. [${Math.round(row.prospect_score)}] ${row.name} — ${row.city || "?"} [${row.status}]${follow}\n` +
      `    ${row.phone || "no phone"} · ${formatChannels(channels)}\n` +
      `    id: ${row.id}`
    );
  }
}

async function cmdShow(db) {
  if (!values.campaign) die("show needs --campaign.");
  const campaignId = await getCampaignId(db, values.campaign);
  const biz = await resolveBusiness(db, values.campaign, values.business);
  const d = await getProspectDetail(db, biz.business_id, campaignId);
  console.log(`\n${d.name} — ${d.city || "?"}`);
  console.log(`Score ${Math.round(d.prospect_score)} (weakness ${Math.round(d.weakness)} · viability ${Math.round(d.viability)} · momentum ${Math.round(d.momentum)})`);
  console.log(`Status: ${d.status || "new"} · Rating ${d.rating ?? "?"} (${d.review_count ?? "?"} reviews)`);
  console.log(`Phone: ${d.phone || "—"} · Site: ${d.website_url || "none"}`);
  console.log(`Channels: ${formatChannels(d.channels)}`);
  if (d.defects.length) {
    console.log("Talking points:");
    for (const defect of d.defects) console.log(`  - ${defect}`);
  }
  if (d.last_contacted_at) console.log(`Last contacted: ${String(d.last_contacted_at).slice(0, 16)}`);
  if (d.next_follow_up_at) console.log(`Follow up: ${String(d.next_follow_up_at).slice(0, 16)}`);
  if (d.notes) console.log(`Notes:\n${d.notes}`);
  console.log(`id: ${d.id}\n`);
}

async function cmdContact(db) {
  if (!values.campaign) die("contact needs --campaign.");
  const campaignId = await getCampaignId(db, values.campaign);
  const biz = await resolveBusiness(db, values.campaign, values.business);
  const via = values.via || "phone";
  const days = parseInt(values["followup-days"] || "3", 10) || 3;
  const d = await getProspectDetail(db, biz.business_id, campaignId);
  const note = stampNote(d.notes, `Contacted via ${via}.${values.notes ? " " + values.notes : ""}`);
  const status = await upsertPipeline(db, biz.business_id, campaignId, {
    status: "contacted",
    notes: note,
    last_contacted_at: new Date().toISOString(),
    next_follow_up_at: new Date(Date.now() + days * 864e5).toISOString(),
  });
  console.log(`✓ ${d.name} → ${status}. Follow up in ${days} days.`);
}

async function cmdRefer(db) {
  if (!values.campaign) die("refer needs --campaign.");
  const campaignId = await getCampaignId(db, values.campaign);
  const biz = await resolveBusiness(db, values.campaign, values.business);
  const d = await getProspectDetail(db, biz.business_id, campaignId);
  const email = d.channels.find((c) => c.channel_type === "email")?.value || "";

  // Validate partner config BEFORE touching the database.
  const formUrl = referrals.referralFormUrl();
  const partner = referrals.partnerConfig();

  const note = stampNote(d.notes, `Referred to ${partner.name}.${values.notes ? " " + values.notes : ""}`);
  await upsertPipeline(db, biz.business_id, campaignId, {
    status: "referred",
    notes: note,
    next_follow_up_at: new Date(Date.now() + 7 * 864e5).toISOString(), // check the partner portal in a week
  });

  const summary = referrals.buildReferralSummary({
    businessName: d.name,
    website: d.website_url,
    phone: d.phone,
    email,
    city: d.city,
    prospectScore: Math.round(d.prospect_score),
    topDefects: d.defects,
    notes: values.notes,
  });

  console.log(`\n✓ ${d.name} marked as referred. Now submit the lead:\n`);
  console.log(`Form (attribution baked in):\n${formUrl}\n`);
  console.log("Paste into the form:\n---");
  console.log(summary);
  console.log("---\nThen log the outcome in the partner portal and run:");
  console.log(`  node scripts/pipeline.mjs move --campaign "${values.campaign}" --business "${d.id}" --to won --notes "Partner closed"`);
  console.log("  (or --to lost if it fizzles)\n");
}

async function cmdMove(db) {
  if (!values.campaign) die("move needs --campaign.");
  if (!values.to || !STATUSES.includes(values.to)) die(`Pass --to one of: ${STATUSES.join(", ")}.`);
  const campaignId = await getCampaignId(db, values.campaign);
  const biz = await resolveBusiness(db, values.campaign, values.business);
  const d = await getProspectDetail(db, biz.business_id, campaignId);
  const note = stampNote(d.notes, `Status → ${values.to}.${values.notes ? " " + values.notes : ""}`);
  const patch = { status: values.to, notes: note };
  if (["lost", "disqualified", "won"].includes(values.to)) patch.next_follow_up_at = null;
  const status = await upsertPipeline(db, biz.business_id, campaignId, patch);
  console.log(`✓ ${d.name} → ${status}.`);
}

async function cmdFollowups(db) {
  let campaignId = null, label = "all campaigns";
  if (values.campaign) {
    campaignId = await getCampaignId(db, values.campaign);
    label = values.campaign;
  }
  const r = await db.query(
    `select b.name, b.city, b.phone, c.name as campaign, p.status, p.next_follow_up_at,
            left(p.notes, 120) as notes
     from pipeline p
     join businesses b on b.id = p.business_id
     join campaigns c on c.id = p.campaign_id
     where p.next_follow_up_at <= now()
       ${campaignId ? "and p.campaign_id = $1" : ""}
       and p.status not in ('won', 'lost', 'disqualified', 'referred')
     order by p.next_follow_up_at`,
    campaignId ? [campaignId] : []
  );
  if (!r.rows.length) {
    console.log(`No follow-ups due (${label}).`);
    return;
  }
  console.log(`Follow-ups due — ${label}:\n`);
  for (const row of r.rows) {
    console.log(`- ${row.name} (${row.city || "?"}) [${row.status}] — due ${String(row.next_follow_up_at).slice(0, 10)} · ${row.phone || "no phone"}`);
  }
}

function cmdTemplates() {
  console.log("\nOutreach templates:\n");
  for (const [name, text] of Object.entries(referrals.OUTREACH_TEMPLATES)) {
    console.log(`--- ${name} ---`);
    console.log(text + "\n");
  }
  console.log("Fill {business} with: node scripts/pipeline.mjs templates --business \"Name\"");
  if (values.business) {
    console.log("\nWith business filled in:\n");
    for (const name of Object.keys(referrals.OUTREACH_TEMPLATES)) {
      console.log(`--- ${name} ---`);
      console.log(referrals.fillTemplate(name, { business: values.business }) + "\n");
    }
  }
}

/* ------------------------------------------------------------------ */

const needsDb = ["queue", "show", "contact", "refer", "move", "followups"].includes(command);

try {
  if (command === "templates") {
    cmdTemplates();
  } else if (needsDb) {
    const { getDb } = await import("../src/lib/db.mjs");
    const db = getDb();
    try {
      switch (command) {
        case "queue": await cmdQueue(db); break;
        case "show": await cmdShow(db); break;
        case "contact": await cmdContact(db); break;
        case "refer": await cmdRefer(db); break;
        case "move": await cmdMove(db); break;
        case "followups": await cmdFollowups(db); break;
      }
    } finally {
      await db.end();
    }
  } else {
    console.error(`Usage: pipeline.mjs <queue|show|contact|refer|move|followups|templates> [options]`);
    process.exit(1);
  }
} catch (err) {
  die(err.message);
}
