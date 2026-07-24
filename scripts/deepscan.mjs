// Stage-2 deep scan — explicitly triggered, never chained from discovery.
// Reuses the EXISTING public scan engine (prospectData → websiteProvider →
// scoring) and stores computed results as an immutable scans snapshot.
//
//   node scripts/deepscan.mjs run --campaign "east-plumbers" [--limit 20] [--rescan-days 30] [--max-requests 100]
//
// Shortlist = pipeline rows still 'new' for the campaign with no scan newer
// than --rescan-days, highest review count first (most viable first). Also
// enriches contact_channels from the scanned homepage (emails, forms, social
// links) at zero extra API cost.

import { parseArgs } from "node:util";
import { loadEnvLocal } from "./envLocal.mjs";

loadEnvLocal();

const { GooglePlacesProvider } = await import("../src/lib/prospectData.js");
const { WebsiteProvider } = await import("../src/lib/websiteProvider.js");
const { calculateBusinessHealthScore } = await import("../src/lib/scoring.js");
const { getDb, refreshCampaignCompleteness } = await import("../src/lib/db.mjs");
const { sleep } = await import("../src/lib/placesHttp.mjs");
const { discoveryConfig, estimateCostUsd } = await import("../src/lib/prospectingConfig.mjs");

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    campaign: { type: "string" },
    limit: { type: "string" },
    "rescan-days": { type: "string" },
    "max-requests": { type: "string" }
  }
});

if (positionals[0] !== "run" || !values.campaign) {
  console.error("Usage: deepscan.mjs run --campaign <name> [--limit 20] [--rescan-days 30] [--max-requests 100]");
  process.exit(1);
}
if (!process.env.GOOGLE_PLACES_API_KEY) {
  console.error("GOOGLE_PLACES_API_KEY is not set.");
  process.exit(1);
}

const db = getDb();
const limit = Number(values.limit || 20);
const rescanDays = Number(values["rescan-days"] || 30);
const budget = Number(values["max-requests"] || discoveryConfig.maxRequestsPerRun);

const campaignResult = await db.query("select id from campaigns where name = $1", [values.campaign]);
if (!campaignResult.rows.length) {
  console.error(`No campaign named "${values.campaign}".`);
  process.exit(1);
}
const campaignId = campaignResult.rows[0].id;

const shortlist = await db.query(
  `select b.id as business_id, b.place_id, b.name, b.city
   from pipeline p join businesses b on b.id = p.business_id
   where p.campaign_id = $1 and p.status = 'new'
     and not exists (
       select 1 from scans s where s.place_id = b.place_id
         and s.scanned_at > now() - make_interval(days => $2)
     )
   order by b.review_count desc nulls last
   limit $3`,
  [campaignId, rescanDays, limit]
);

const run = await db.query(
  "insert into runs (campaign_id, kind) values ($1, 'deep_scan') returning id",
  [campaignId]
);
const runId = run.rows[0].id;
const requestCounts = {};
const stats = { shortlisted: shortlist.rows.length, scanned: 0, scanErrors: 0, channelsAdded: 0 };

console.log(`Deep scanning ${shortlist.rows.length} businesses (run ${runId})...`);

try {
  for (const target of shortlist.rows) {
    if (totalRequests() >= budget) {
      await finishRun("failed", "max_requests_ceiling");
      console.log(`Aborted at request ceiling (${budget}). Re-run to continue — recent scans are skipped automatically.`);
      process.exit(0);
    }

    count("place_details_full");
    await sleep(discoveryConfig.rateLimitMs);
    const lookup = await GooglePlacesProvider.getProspectData({
      businessName: target.name,
      city: target.city || "",
      industry: "Other Local Business",
      placeId: target.place_id
    });
    if (!lookup.ok) {
      stats.scanErrors += 1;
      console.error(`  ${target.name}: ${lookup.error?.message}`);
      await persist();
      continue;
    }

    const place = lookup.place;
    if (place.website && (process.env.GOOGLE_PSI_API_KEY || process.env.GOOGLE_PLACES_API_KEY)) count("psi");
    if (process.env.YELP_API_KEY) count("yelp"); // approximate: match + fallback search bill as one
    const auditResult = await WebsiteProvider.auditResolvedPlace(place);
    const websiteAudit = auditResult.ok ? auditResult.audit : null;

    const breakdown = calculateBusinessHealthScore({ ...lookup.prospect, websiteAudit });
    const scannedAt = new Date();
    const latestReviewAt = place.reviewTimestamps?.[0] || null;
    const signals = {
      hasWebsite: Boolean(place.website),
      websiteBroken: websiteAudit ? websiteAudit.reachable?.value === false : null,
      hasContactForm: websiteAudit?.contactPaths?.hasContactForm ?? null,
      emailsFound: websiteAudit?.contactPaths?.emails?.length ?? 0,
      socialLinksFound: websiteAudit?.contactPaths?.socialLinks?.length ?? 0,
      recentReviews90d: (place.reviewTimestamps || [])
        .filter((time) => scannedAt - new Date(time) <= 90 * 86_400_000).length
    };

    await db.query(
      `insert into scans (business_id, place_id, presence_score, score_breakdown, signals, rating, review_count, latest_review_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [target.business_id, target.place_id, breakdown.overallScore, JSON.stringify(breakdown),
        JSON.stringify(signals), place.rating, place.reviewCount, latestReviewAt]
    );
    await db.query(
      `update businesses set phone = coalesce($2, phone), website_url = coalesce($3, website_url),
         rating = $4, review_count = $5, business_status = coalesce($6, business_status),
         last_seen_at = now(), updated_at = now()
       where id = $1`,
      [target.business_id, place.phone, place.website, place.rating, place.reviewCount, place.businessStatus]
    );
    await enrichChannels(target.place_id, place, websiteAudit);
    stats.scanned += 1;
    await persist();
    console.log(`  ${target.name}: presence ${breakdown.overallScore ?? "n/a"}`);
  }

  await finishRun("completed");
  console.log(`\nDone. Requests: ${JSON.stringify(requestCounts)} (~$${estimateCostUsd(requestCounts)})`);
  console.log(`Scanned ${stats.scanned}, errors ${stats.scanErrors}, channels added ${stats.channelsAdded}.`);
  console.log("Next: node scripts/score.mjs recompute --campaign", JSON.stringify(values.campaign));
  process.exit(0);
} catch (error) {
  await finishRun("failed", error.message).catch(() => {});
  console.error(error.message);
  process.exit(1);
}

async function enrichChannels(placeId, place, websiteAudit) {
  const rows = [];
  if (place.phone) rows.push({ type: "phone", platform: null, value: place.phone });
  for (const email of websiteAudit?.contactPaths?.emails || []) {
    rows.push({ type: "email", platform: null, value: email });
  }
  if (websiteAudit?.contactPaths?.hasContactForm) {
    rows.push({ type: "form", platform: null, value: websiteAudit.contactPaths.pageUrl || place.website || "homepage" });
  }
  for (const social of websiteAudit?.contactPaths?.socialLinks || []) {
    rows.push({ type: "social", platform: social.platform, value: social.url });
  }

  for (const row of rows) {
    const result = await db.query(
      `insert into contact_channels (place_id, channel_type, platform, value, source, last_verified_at)
       values ($1, $2, $3, $4, 'deep_scan', now())
       on conflict (place_id, channel_type, value) do update set last_verified_at = now()
       returning (xmax = 0) as inserted`,
      [placeId, row.type, row.platform, row.value]
    );
    if (result.rows[0]?.inserted) stats.channelsAdded += 1;
  }
}

function count(endpoint) {
  requestCounts[endpoint] = (requestCounts[endpoint] || 0) + 1;
}

function totalRequests() {
  return Object.values(requestCounts).reduce((sum, n) => sum + n, 0);
}

async function persist() {
  await db.query(
    "update runs set request_counts = $2, stats = $3 where id = $1",
    [runId, JSON.stringify(requestCounts), JSON.stringify(stats)]
  );
}

async function finishRun(status, error = null) {
  stats.estimatedCostUsd = estimateCostUsd(requestCounts);
  await db.query(
    "update runs set request_counts = $2, stats = $3, status = $4, error = $5, finished_at = now() where id = $1",
    [runId, JSON.stringify(requestCounts), JSON.stringify(stats), status, error]
  );
  // A deep scan that aborts at the ceiling leaves the shortlist partly
  // scanned — mark the campaign incomplete so its list is not treated as clean.
  // A silently-failed refresh would leave that partial campaign looking clean,
  // so log loudly instead of swallowing.
  await refreshCampaignCompleteness(db, campaignId).catch((err) =>
    console.error(`WARNING: could not update the campaign incomplete flag; this partly-scanned campaign may look clean until re-run or backfilled: ${err.message}`)
  );
}
