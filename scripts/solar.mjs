// Rooftop solar backfill — the same per-business check deepscan.mjs runs
// inline, for businesses that were deep-scanned before the signal existed.
// SPENDS: one Static Maps request + one vision call per business.
//
//   node scripts/solar.mjs run --campaign "sd-plumbers-8km" [--limit 50] [--recheck] [--max-requests 100]
//   node scripts/solar.mjs run --all [--limit 200]
//
// Targets = deep-scanned businesses with coordinates and no solar_status yet
// (or every one with --recheck), most-reviewed first so the likeliest
// prospects are covered first if the budget runs out. Logs request counts to
// runs (kind 'solar') like every other spending run.

import { parseArgs } from "node:util";
import { loadEnvLocal } from "./envLocal.mjs";

loadEnvLocal();

const { getDb } = await import("../src/lib/db.mjs");
const { discoveryConfig, estimateCostUsd } = await import("../src/lib/prospectingConfig.mjs");
const { checkSolarForBusiness, staticMapsKey } = await import("../src/lib/solarSignal.mjs");

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    campaign: { type: "string" },
    all: { type: "boolean" },
    limit: { type: "string" },
    recheck: { type: "boolean" },
    "max-requests": { type: "string" }
  }
});

if (positionals[0] !== "run" || (!values.campaign && !values.all)) {
  console.error("Usage: solar.mjs run (--campaign <name> | --all) [--limit 50] [--recheck] [--max-requests 100]");
  process.exit(1);
}
if (!staticMapsKey()) {
  console.error("GOOGLE_STATIC_MAPS_API_KEY (or GOOGLE_PLACES_API_KEY) is not set.");
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY is not set.");
  process.exit(1);
}

const db = getDb();
const limit = Number(values.limit || 50);
const budget = Number(values["max-requests"] || discoveryConfig.maxRequestsPerRun);

let campaignId = null;
if (values.campaign) {
  const campaign = await db.query("select id from campaigns where name = $1", [values.campaign]);
  if (!campaign.rows.length) {
    console.error(`No campaign named "${values.campaign}".`);
    process.exit(1);
  }
  campaignId = campaign.rows[0].id;
}

const targets = await db.query(
  `select distinct on (b.id) b.id, b.name, b.lat, b.lng, b.review_count
     from businesses b
     join scans s on s.business_id = b.id
     left join pipeline p on p.business_id = b.id
    where b.lat is not null and b.lng is not null
      and ($1::uuid is null or p.campaign_id = $1)
      and ($2::bool is true or b.solar_status is null)
    order by b.id, b.review_count desc nulls last`,
  [campaignId, Boolean(values.recheck)]
);
const rows = targets.rows
  .sort((a, b) => (b.review_count || 0) - (a.review_count || 0))
  .slice(0, limit);

const run = await db.query(
  "insert into runs (campaign_id, kind) values ($1, 'solar') returning id",
  [campaignId]
);
const runId = run.rows[0].id;
const requestCounts = {};
const stats = { targeted: rows.length, checked: 0, errors: 0, has_solar: 0, no_solar: 0, unclear: 0 };

console.log(`Checking rooftop solar for ${rows.length} businesses (run ${runId})...`);

try {
  for (const business of rows) {
    if (totalRequests() >= budget) {
      await finishRun("failed", "max_requests_ceiling");
      console.log(`Aborted at request ceiling (${budget}). Re-run to continue — checked businesses are skipped automatically.`);
      process.exit(0);
    }

    const result = await checkSolarForBusiness(db, business, { count });
    if (!result.ok) {
      stats.errors += 1;
      console.error(`  ${business.name}: ${result.code}: ${result.message}`);
      if (result.code === "rate_limited") {
        await finishRun("failed", "rate_limited");
        process.exit(1);
      }
    } else {
      stats.checked += 1;
      stats[result.status] += 1;
      console.log(`  ${business.name}: ${result.status.replace("_", " ")}`);
    }
    await persist();
  }

  await finishRun("completed");
  console.log(`\nDone. Requests: ${JSON.stringify(requestCounts)} (~$${estimateCostUsd(requestCounts)})`);
  console.log(`Checked ${stats.checked}: ${stats.has_solar} has solar / ${stats.no_solar} no solar / ${stats.unclear} unclear. Errors ${stats.errors}.`);
  process.exit(0);
} catch (error) {
  await finishRun("failed", error.message).catch(() => {});
  console.error(error.message);
  process.exit(1);
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
}
