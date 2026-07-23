// Prospect scoring CLI. Pure derivation — NO API calls, ever.
//
//   node scripts/score.mjs recompute --campaign "east-plumbers"   wipe + rescore the campaign
//   node scripts/score.mjs rank --campaign "east-plumbers" [--limit 20]
//   node scripts/score.mjs demo                                   worked examples, no DB needed
//
// recompute deletes the campaign's prospect_scores rows and rebuilds them
// from businesses / scans / contact_channels / pipeline. Run it freely while
// tuning weights in prospectingConfig.mjs (bump weightsVersion there).

import { parseArgs } from "node:util";
import { loadEnvLocal } from "./envLocal.mjs";
import { computeProspectScore } from "../src/lib/prospectScoring.mjs";
import { discoveryConfig, prospectScoringConfig } from "../src/lib/prospectingConfig.mjs";

loadEnvLocal();

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    campaign: { type: "string" },
    limit: { type: "string" }
  }
});

const command = positionals[0];

try {
  if (command === "recompute") await recompute();
  else if (command === "rank") await rank();
  else if (command === "demo") demo();
  else {
    console.error("Usage: score.mjs <recompute|rank|demo> [--campaign <name>] [--limit N]");
    process.exit(1);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

async function recompute() {
  if (!values.campaign) throw new Error("--campaign is required.");
  const { getDb } = await import("../src/lib/db.mjs");
  const db = getDb();

  const campaignResult = await db.query("select id from campaigns where name = $1", [values.campaign]);
  if (!campaignResult.rows.length) throw new Error(`No campaign named "${values.campaign}".`);
  const campaignId = campaignResult.rows[0].id;

  const run = await db.query(
    "insert into runs (campaign_id, kind) values ($1, 'scoring') returning id",
    [campaignId]
  );
  const runId = run.rows[0].id;
  const stats = { scored: 0, disqualified: 0, unscored_missing_scan: 0, unscored_missing_reachability: 0 };

  try {
    // prospect_scores is derived-only: wipe and rebuild is lossless.
    await db.query("delete from prospect_scores where campaign_id = $1", [campaignId]);

    const targets = await db.query(
      `select b.id as business_id, b.place_id, b.name, b.business_status, b.rating, b.review_count,
              b.website_url, p.status as pipeline_status, p.notes as pipeline_notes
       from pipeline p join businesses b on b.id = p.business_id
       where p.campaign_id = $1`,
      [campaignId]
    );

    for (const target of targets.rows) {
      const scans = await db.query(
        `select id, presence_score, review_count, latest_review_at, scanned_at, signals
         from scans where place_id = $1 order by scanned_at desc limit 2`,
        [target.place_id]
      );
      const channels = await db.query(
        "select channel_type, platform, status, last_activity_at from contact_channels where place_id = $1",
        [target.place_id]
      );

      const latestScan = scans.rows[0]
        ? {
            presenceScore: scans.rows[0].presence_score,
            reviewCount: scans.rows[0].review_count,
            latestReviewAt: scans.rows[0].latest_review_at,
            scannedAt: scans.rows[0].scanned_at,
            signals: scans.rows[0].signals || {}
          }
        : null;
      const previousScan = scans.rows[1]
        ? { reviewCount: scans.rows[1].review_count, scannedAt: scans.rows[1].scanned_at }
        : null;

      const result = computeProspectScore({
        business: {
          name: target.name,
          businessStatus: target.business_status,
          rating: target.rating === null ? null : Number(target.rating),
          reviewCount: target.review_count,
          websiteUrl: target.website_url,
          claimed: null
        },
        latestScan,
        previousScan,
        channels: channels.rows.map((row) => ({
          channelType: row.channel_type,
          platform: row.platform,
          status: row.status,
          lastActivityAt: row.last_activity_at
        })),
        contactsConfirmedAbsent: target.pipeline_status === "disqualified" && target.pipeline_notes === "no_contact_method",
        isChain: target.pipeline_notes === "chain_or_franchise" || isConfiguredChain(target.name)
      });

      await db.query(
        `insert into prospect_scores
           (business_id, campaign_id, scan_id, weakness, viability, momentum, reachability_factor,
            prospect_score, disqualified, disqualify_reasons, completeness, signals, weights_version)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [target.business_id, campaignId, scans.rows[0]?.id || null,
          result.weakness, result.viability, result.momentum, result.reachabilityFactor,
          result.prospectScore, result.disqualified, result.disqualifyReasons,
          result.completeness, JSON.stringify(result.signals), result.weightsVersion]
      );

      stats.scored += 1;
      if (result.disqualified) stats.disqualified += 1;
      else if (result.prospectScore === null && result.weakness === null) stats.unscored_missing_scan += 1;
      else if (result.prospectScore === null) stats.unscored_missing_reachability += 1;
    }

    stats.weightsVersion = prospectScoringConfig.weightsVersion;
    await db.query(
      "update runs set stats = $2, status = 'completed', finished_at = now() where id = $1",
      [runId, JSON.stringify(stats)]
    );
    console.log(`Recomputed ${stats.scored} rows (weights ${prospectScoringConfig.weightsVersion}): ${stats.disqualified} disqualified, ${stats.unscored_missing_scan} awaiting deep scan, ${stats.unscored_missing_reachability} awaiting contact confirmation.`);
  } catch (error) {
    await db.query(
      "update runs set stats = $2, status = 'failed', error = $3, finished_at = now() where id = $1",
      [runId, JSON.stringify(stats), error.message]
    ).catch(() => {});
    throw error;
  }
  process.exit(0);
}

async function rank() {
  if (!values.campaign) throw new Error("--campaign is required.");
  const { getDb } = await import("../src/lib/db.mjs");
  const db = getDb();
  const limit = Number(values.limit || 20);

  const result = await db.query(
    `select b.name, b.city, b.phone, b.website_url,
            ps.prospect_score, ps.weakness, ps.viability, ps.momentum,
            ps.reachability_factor, ps.completeness, ps.weights_version
     from prospect_scores ps join businesses b on b.id = ps.business_id
     where ps.campaign_id = (select id from campaigns where name = $1)
       and ps.disqualified = false and ps.prospect_score is not null
     order by ps.prospect_score desc
     limit $2`,
    [values.campaign, limit]
  );

  if (!result.rows.length) {
    console.log("No scored candidates yet. Run discovery, deepscan, then recompute.");
    process.exit(0);
  }
  console.log(`Top ${result.rows.length} — campaign "${values.campaign}" (weights ${result.rows[0].weights_version})\n`);
  console.log("  score  weak  viab  mom   reach  compl  business");
  for (const [index, row] of result.rows.entries()) {
    console.log(
      `${String(index + 1).padStart(3)}. ${fmt(row.prospect_score, 5)} ${fmt(row.weakness, 5)} ${fmt(row.viability, 5)} ${fmt(row.momentum, 5)} ${fmt(row.reachability_factor, 5)} ${fmt(row.completeness, 5)}  ${row.name}${row.city ? ` (${row.city})` : ""} ${row.phone || row.website_url || ""}`
    );
  }
  process.exit(0);
}

function demo() {
  const now = new Date("2026-07-23T12:00:00Z");
  const examples = [
    {
      label: "Rosa's Taqueria — alive & earning, losing online (the ideal prospect)",
      input: {
        business: { name: "Rosa's Taqueria", businessStatus: "OPERATIONAL", rating: 4.6, reviewCount: 210, websiteUrl: null, claimed: null },
        latestScan: { presenceScore: 34, reviewCount: 210, latestReviewAt: "2026-07-19T00:00:00Z", scannedAt: "2026-07-22T00:00:00Z", signals: { websiteBroken: null } },
        previousScan: { reviewCount: 201, scannedAt: "2026-06-22T00:00:00Z" },
        channels: [
          { channelType: "phone", status: "unknown", lastActivityAt: null },
          { channelType: "social", platform: "instagram", status: "active", lastActivityAt: "2026-07-20T00:00:00Z" }
        ],
        contactsConfirmedAbsent: false, isChain: false, now
      }
    },
    {
      label: "Marietta Plumbing Pros — strong site (disqualified: they won't buy)",
      input: {
        business: { name: "Marietta Plumbing Pros", businessStatus: "OPERATIONAL", rating: 4.8, reviewCount: 320, websiteUrl: "https://mariettaplumbingpros.example", claimed: null },
        latestScan: { presenceScore: 84, reviewCount: 320, latestReviewAt: "2026-07-21T00:00:00Z", scannedAt: "2026-07-22T00:00:00Z", signals: { websiteBroken: false } },
        previousScan: { reviewCount: 306, scannedAt: "2026-06-22T00:00:00Z" },
        channels: [{ channelType: "phone", status: "unknown", lastActivityAt: null }],
        contactsConfirmedAbsent: false, isChain: false, now
      }
    },
    {
      label: "Joe's Watch Repair — weakest presence but dying (weakness-only ranking would wrongly put this first)",
      input: {
        business: { name: "Joe's Watch Repair", businessStatus: "OPERATIONAL", rating: 3.4, reviewCount: 12, websiteUrl: "http://joeswatchrepair.example", claimed: null },
        latestScan: { presenceScore: 22, reviewCount: 12, latestReviewAt: "2025-05-10T00:00:00Z", scannedAt: "2026-07-22T00:00:00Z", signals: { websiteBroken: true } },
        previousScan: { reviewCount: 12, scannedAt: "2026-06-22T00:00:00Z" },
        channels: [{ channelType: "phone", status: "unknown", lastActivityAt: null }],
        contactsConfirmedAbsent: false, isChain: false, now
      }
    }
  ];

  console.log(`Weights ${prospectScoringConfig.weightsVersion}: weakness ${prospectScoringConfig.componentWeights.weakness}, viability ${prospectScoringConfig.componentWeights.viability}, momentum ${prospectScoringConfig.componentWeights.momentum}, x reachability\n`);
  for (const example of examples) {
    const result = computeProspectScore(example.input);
    console.log(`=== ${example.label}`);
    console.log(`  weakness    ${fmt(result.weakness, 6)} (100 - presence ${example.input.latestScan.presenceScore})`);
    console.log(`  viability   ${fmt(result.viability, 6)} ${detailLine(result.signals.viability)}`);
    console.log(`  momentum    ${fmt(result.momentum, 6)} ${detailLine(result.signals.momentum)}`);
    console.log(`  reachability x${result.reachabilityFactor} (${result.signals.reachability.basis})`);
    console.log(`  => prospect_score ${result.prospectScore ?? "null"} | completeness ${result.completeness} | ${result.disqualified ? `DISQUALIFIED: ${result.disqualifyReasons.join(", ")}` : "qualified"}\n`);
  }
  console.log("(Chains and permanently-closed businesses never get this far — the discovery pre-filter disqualifies them before any deep scan.)");
  process.exit(0);
}

function isConfiguredChain(name) {
  const normalized = String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return discoveryConfig.chainNames.some((chain) => normalized.includes(chain));
}

function detailLine(componentSignals) {
  return "(" + Object.entries(componentSignals)
    .map(([key, signal]) => `${key}: ${signal.status === "unmeasured" ? "not measured" : signal.score}`)
    .join(", ") + ")";
}

function fmt(value, width) {
  return String(value ?? "-").padStart(width);
}
