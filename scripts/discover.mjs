// Private discovery CLI. Server-side only — runs locally or in a trusted
// shell, never from the browser.
//
//   node scripts/discover.mjs create-campaign --name "east-plumbers" --category "plumber" --center "33.749,-84.388" --radius-km 5
//   node scripts/discover.mjs create-campaign --name "30303-hvac" --category "hvac" --zip 30303
//   node scripts/discover.mjs plan --campaign "east-plumbers"
//   node scripts/discover.mjs plan --category "plumber" --center "33.749,-84.388" --radius-km 5   (offline, no DB needed)
//   node scripts/discover.mjs run --campaign "east-plumbers" [--max-requests 100] [--resume <run-id>]

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { planDiscovery, runDiscovery } from "../src/lib/discoveryRun.mjs";
import { discoveryConfig } from "../src/lib/prospectingConfig.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnvLocal();

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    name: { type: "string" },
    campaign: { type: "string" },
    category: { type: "string" },
    type: { type: "string" },
    center: { type: "string" },
    zip: { type: "string" },
    "radius-km": { type: "string" },
    "tile-radius-m": { type: "string" },
    "max-requests": { type: "string" },
    resume: { type: "string" }
  }
});

const command = positionals[0];

try {
  if (command === "create-campaign") await createCampaign();
  else if (command === "plan") await plan();
  else if (command === "run") await run();
  else {
    console.error("Usage: discover.mjs <create-campaign|plan|run> [options] (see header comments)");
    process.exit(1);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

async function createCampaign() {
  if (!values.name) throw new Error("--name is required.");
  if (!values.category && !values.type) throw new Error("--category or --type is required.");
  if (!values.center && !values.zip) throw new Error("--center \"lat,lng\" or --zip is required.");

  const criteria = {
    category: values.category || null,
    type: values.type || null,
    center: values.center ? parseCenter(values.center) : null,
    zip: values.zip || null,
    radiusKm: values["radius-km"] ? Number(values["radius-km"]) : undefined,
    tileRadiusM: values["tile-radius-m"] ? Number(values["tile-radius-m"]) : undefined
  };

  const { query } = await import("../src/lib/db.mjs");
  const existing = await query("select id from campaigns where name = $1", [values.name]);
  if (existing.rows.length) throw new Error(`Campaign "${values.name}" already exists.`);
  const inserted = await query(
    "insert into campaigns (name, criteria) values ($1, $2) returning id",
    [values.name, JSON.stringify(criteria)]
  );
  console.log(`Created campaign "${values.name}" (${inserted.rows[0].id}).`);
  process.exit(0);
}

async function plan() {
  let criteria;
  if (values.campaign) {
    const { query } = await import("../src/lib/db.mjs");
    const result = await query("select criteria from campaigns where name = $1", [values.campaign]);
    if (!result.rows.length) throw new Error(`No campaign named "${values.campaign}".`);
    criteria = result.rows[0].criteria;
  } else {
    criteria = {
      category: values.category || null,
      type: values.type || null,
      center: values.center ? parseCenter(values.center) : null,
      zip: values.zip || null,
      radiusKm: values["radius-km"] ? Number(values["radius-km"]) : undefined,
      tileRadiusM: values["tile-radius-m"] ? Number(values["tile-radius-m"]) : undefined
    };
  }

  const result = planDiscovery(criteria);
  const { estimate, tiles } = result;
  console.log("Dry run — no API calls made.\n");
  console.log(`Criteria:        ${JSON.stringify(result.criteria)}`);
  console.log(`Tiles:           ${estimate.tileCount} (tile radius ${result.criteria.tileRadiusM}m, spacing ${Math.round(result.criteria.tileRadiusM * Math.SQRT2)}m)`);
  console.log(`Nearby Search:   ${estimate.nearbySearchRequests.min}-${estimate.nearbySearchRequests.max} requests (1-${discoveryConfig.maxPagesPerTile} pages/tile)`);
  console.log(`  est. cost:     $${estimate.nearbySearchCostUsd.min.toFixed(2)}-$${estimate.nearbySearchCostUsd.max.toFixed(2)}`);
  console.log(`Contact details: ~1 call per NEW business (Nearby returns no contact fields; only closed/chain pre-filtered are skipped)`);
  console.log(`  est. cost:     ~$${estimate.contactDetailsCostUsdPer100New.toFixed(2)} per 100 new businesses`);
  console.log(`Request ceiling: ${values["max-requests"] || estimate.maxRequestsPerRun} requests/run — run aborts cleanly and is resumable at the ceiling`);
  console.log(`\nFirst tiles: ${tiles.slice(0, 5).map((tile) => `[${tile.key}] ${tile.lat},${tile.lng}`).join("  ")}${tiles.length > 5 ? " ..." : ""}`);
  process.exit(0);
}

async function run() {
  if (!values.campaign) throw new Error("--campaign is required.");
  const result = await runDiscovery({
    campaignName: values.campaign,
    resumeRunId: values.resume,
    maxRequests: values["max-requests"] ? Number(values["max-requests"]) : undefined
  });

  const { stats } = result;
  console.log(`\nRun ${result.runId} ${result.aborted ? `ABORTED (${result.aborted}) — resume with --resume ${result.runId}` : "completed"}.`);
  console.log(`Requests:        ${JSON.stringify(result.requestCounts)}  (~$${stats.estimatedCostUsd})`);
  console.log(`Tiles:           ${Object.keys(stats.tiles).length}/${stats.tilesPlanned ?? "?"} searched, truncated: ${stats.tilesTruncated?.length ? stats.tilesTruncated.join(", ") + " — subdivide with a smaller --tile-radius-m" : "none"}`);
  console.log(`Results:         ${stats.resultsReturned} returned, ${stats.duplicatesInRun} tile-overlap dupes, ${stats.duplicatesInDb} already known`);
  console.log(`Businesses:      ${stats.newBusinesses} new`);
  console.log(`Pre-filtered:    ${JSON.stringify(stats.prefiltered)}`);
  console.log(`Candidates:      ${stats.candidates} awaiting deep scan (Step 3 — not triggered automatically)`);
  process.exit(0);
}

function parseCenter(raw) {
  const [lat, lng] = raw.split(",").map((part) => Number(part.trim()));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error(`--center must be "lat,lng", got "${raw}".`);
  return { lat, lng };
}

// Same minimal loader as scripts/migrate.mjs: works outside Next.js without a
// dotenv dependency; real environment variables always win.
function loadEnvLocal() {
  const envPath = path.join(projectRoot, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || line.trim().startsWith("#")) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}
