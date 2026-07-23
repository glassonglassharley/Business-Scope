// Multi-category sweep. Runs discovery -> deepscan -> recompute -> export for
// each category in sequence, one campaign per category, sharing a geography.
//
//   node scripts/sweep.mjs plan --area sd --center "32.7157,-117.1611" --radius-km 8
//   node scripts/sweep.mjs run  --area sd --center "32.7157,-117.1611" --radius-km 8 --max-spend-usd 120
//
// Flags:
//   --categories a,b,c   restrict to these slugs (default: catalog entries with default:true)
//   --all                include weak-fit categories too
//   --max-spend-usd N    HARD batch ceiling across every category. Aborts cleanly
//                        and resumably when the next category cannot fit.
//   --deepscan-limit N   per-category deep-scan cap (default 200)
//   --resume             skip categories already fully scored; continue the rest
//
// Cross-category place_id dedup is automatic (businesses/scans/contact_channels
// are keyed on place_id, not campaign): a business found under a second category
// costs nothing to re-store or re-scan — only its tile searches are billed.

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { loadEnvLocal } from "./envLocal.mjs";
import { planDiscovery } from "../src/lib/discoveryRun.mjs";
import { categoryCatalog, discoveryConfig, estimateCostUsd } from "../src/lib/prospectingConfig.mjs";

loadEnvLocal();
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    area: { type: "string" },
    center: { type: "string" },
    "radius-km": { type: "string" },
    categories: { type: "string" },
    all: { type: "boolean" },
    "max-spend-usd": { type: "string" },
    "deepscan-limit": { type: "string" },
    resume: { type: "boolean" }
  }
});

const command = positionals[0];
if (!["plan", "run"].includes(command)) {
  console.error("Usage: sweep.mjs <plan|run> --area <name> --center \"lat,lng\" --radius-km N [options]");
  process.exit(1);
}
if (!values.area || !values.center) {
  console.error("--area and --center are required.");
  process.exit(1);
}

const center = parseCenter(values.center);
const radiusKm = Number(values["radius-km"] || 8);
const categories = selectCategories();
const campaignName = (slug) => `${values.area}-${slug}-${radiusKm}km`;

// Per-category discovery plan is deterministic from geography (tiles are the
// same for every category at a shared center/radius).
const perCategory = categories.map((cat) => {
  const plan = planDiscovery({ category: cat.keyword || null, type: cat.type || null, center, radiusKm });
  return { cat, tiles: plan.estimate.tileCount, search: plan.estimate.nearbySearchRequests, searchCost: plan.estimate.nearbySearchCostUsd };
});

if (command === "plan") {
  printPlan();
  process.exit(0);
}

await runSweep();

// ---------------------------------------------------------------------------

function printPlan() {
  const tiles = perCategory[0]?.tiles ?? 0;
  const searchMin = perCategory.reduce((sum, p) => sum + p.searchCost.min, 0);
  const searchMax = perCategory.reduce((sum, p) => sum + p.searchCost.max, 0);
  const detailsRate = discoveryConfig.costEstimatesUsdPer1000.place_details_contact;
  const scanRate = discoveryConfig.costEstimatesUsdPer1000.place_details_full;

  // Yield model from observed runs: plumber 65 new / 97 tiles, hvac 29 new.
  // First categories yield more; overlap shrinks later ones. Model a declining
  // average of new businesses per category.
  const n = perCategory.length;
  const highYield = 55, lowYield = 20;
  const estNewPerCategory = Array.from({ length: n }, (_, i) => Math.round(highYield - (highYield - lowYield) * (i / Math.max(1, n - 1))));
  const estNewTotal = estNewPerCategory.reduce((a, b) => a + b, 0);
  // Contact-details: ~1 per new business. Deep-scan: ~1 per new business
  // (already-scanned are skipped by the rescan window).
  const detailsCost = (detailsRate * estNewTotal) / 1000;
  const scanCost = (scanRate * estNewTotal) / 1000;

  console.log("Sweep dry run — no API calls, no writes.\n");
  console.log(`Area:        ${values.area}  center ${center.lat},${center.lng}  radius ${radiusKm}km`);
  console.log(`Categories:  ${n}  (${categories.filter(c => c.fit === "strong").length} strong / ${categories.filter(c => c.fit === "mixed").length} mixed / ${categories.filter(c => c.fit === "weak").length} weak)`);
  console.log(`Tiles/category: ${tiles}   (${tiles} searches min if no pagination, up to ${tiles * discoveryConfig.maxPagesPerTile} max)\n`);

  console.log("Per-category nearby-search estimate:");
  console.log("  slug                 fit     query               tiles  search$  min-max");
  for (const p of perCategory) {
    const q = p.cat.type ? `type:${p.cat.type}` : `kw:"${p.cat.keyword}"`;
    console.log("  " + p.cat.slug.padEnd(20) + p.cat.fit.padEnd(8) + q.padEnd(20) + String(p.tiles).padStart(4) + "   $" + p.searchCost.min.toFixed(2).padStart(6) + "  $" + p.searchCost.max.toFixed(2));
  }

  console.log("\n=== BATCH ESTIMATE ===");
  console.log(`Nearby search (deterministic-ish):  $${searchMin.toFixed(2)} - $${searchMax.toFixed(2)}`);
  console.log(`  (${perCategory.reduce((s,p)=>s+p.search.min,0)} - ${perCategory.reduce((s,p)=>s+p.search.max,0)} requests; both live runs so far used exactly 1 page/tile => low end is likely)`);
  console.log(`\nVariable, yield-dependent (modeled ~${estNewTotal} unique new businesses across all categories):`);
  console.log(`  Contact details (~1/new business):  ~$${detailsCost.toFixed(2)}`);
  console.log(`  Deep scan (~1/new business):        ~$${scanCost.toFixed(2)}   (PSI billed at $0)`);
  console.log(`  Dedup means a business shared across categories is scanned once, not per category.`);

  const loTotal = searchMin + detailsCost * 0.7 + scanCost * 0.7;
  const hiTotal = searchMax + detailsCost * 1.4 + scanCost * 1.4;
  console.log(`\nEstimated batch total:  $${loTotal.toFixed(2)} - $${hiTotal.toFixed(2)}   (most-likely near the low end)`);
  console.log(`Set --max-spend-usd to cap it; the sweep aborts cleanly and resumably when the next category cannot fit.`);
  console.log(`\nExpected qualified prospects: plumber yielded 39, hvac 19. At ~20-40 per strong category, ${n} categories should clear 400+.`);
}

async function runSweep() {
  const ceiling = values["max-spend-usd"] ? Number(values["max-spend-usd"]) : Infinity;
  const deepscanLimit = values["deepscan-limit"] || "200";
  let spent = 0;
  const results = [];

  console.log(`Sweep RUN — ${categories.length} categories, ceiling ${ceiling === Infinity ? "none" : "$" + ceiling}.\n`);

  for (const { cat } of perCategory) {
    const name = campaignName(cat.slug);

    if (values.resume && (await isCampaignScored(name))) {
      console.log(`= ${cat.slug}: already scored, skipping (resume).`);
      const cost = await campaignSpend(name);
      spent += cost;
      results.push({ slug: cat.slug, skipped: true, cost });
      continue;
    }

    // Guard: will even the cheapest part of this category fit under the ceiling?
    const catSearchMin = perCategory.find((p) => p.cat.slug === cat.slug).searchCost.min;
    if (spent + catSearchMin > ceiling) {
      console.log(`\nCEILING: $${spent.toFixed(2)} spent; "${cat.slug}" needs at least ~$${catSearchMin.toFixed(2)} more and would exceed $${ceiling}.`);
      console.log(`Stopping cleanly. Re-run the same command with --resume to continue from here.`);
      break;
    }

    // Cap this category's discovery requests to the remaining budget.
    const remaining = ceiling - spent;
    const maxReq = ceiling === Infinity
      ? discoveryConfig.maxRequestsPerRun
      : Math.max(1, Math.min(discoveryConfig.maxRequestsPerRun, Math.floor((remaining / discoveryConfig.costEstimatesUsdPer1000.nearby_search) * 1000)));

    console.log(`\n=== ${cat.label} (${cat.slug}) ===`);
    ensureCampaign(name, cat);
    step("discover", ["run", "--campaign", name, "--max-requests", String(maxReq)]);
    step("deepscan", ["run", "--campaign", name, "--limit", deepscanLimit], "deepscan.mjs");
    step("score", ["recompute", "--campaign", name], "score.mjs");
    step("export", ["--campaign", name], "export-prospects.mjs");

    const cost = await campaignSpend(name);
    const qualified = await campaignQualified(name);
    spent += cost;
    results.push({ slug: cat.slug, cost, qualified, costPerQualified: qualified ? cost / qualified : null });
    console.log(`  ${cat.slug}: $${cost.toFixed(2)}, ${qualified} qualified` + (qualified ? ` ($${(cost / qualified).toFixed(2)}/qualified)` : "") + `. Batch spend $${spent.toFixed(2)}.`);
  }

  console.log("\n=== SWEEP SUMMARY ===");
  console.log("  slug                 cost   qualified  $/qualified");
  let totalQ = 0;
  for (const r of results.filter((x) => !x.skipped)) {
    totalQ += r.qualified || 0;
    console.log("  " + r.slug.padEnd(20) + "$" + String(r.cost.toFixed(2)).padStart(6) + "  " + String(r.qualified ?? "-").padStart(6) + "     " + (r.costPerQualified ? "$" + r.costPerQualified.toFixed(2) : "-"));
  }
  console.log(`  TOTAL: $${spent.toFixed(2)} spent, ${totalQ} qualified prospects.`);
  console.log(`  CSVs in outputs/. Categories ranked by $/qualified show which to repeat in other geographies.`);
}

function ensureCampaign(name, cat) {
  const check = runNode("discover.mjs", ["plan", "--campaign", name], true);
  if (check.status === 0) return; // campaign already exists (plan resolved it)
  const args = ["create-campaign", "--name", name, "--center", `${center.lat},${center.lng}`, "--radius-km", String(radiusKm)];
  if (cat.type) args.push("--type", cat.type);
  else args.push("--category", cat.keyword);
  const created = runNode("discover.mjs", args, true);
  if (created.status !== 0 && !/already exists/.test(created.stdout + created.stderr)) {
    throw new Error(`create-campaign failed for ${name}: ${created.stderr || created.stdout}`);
  }
}

function step(label, args, script = "discover.mjs") {
  const res = runNode(script, args, false);
  if (res.status !== 0) throw new Error(`${label} failed for this category (exit ${res.status}).`);
}

function runNode(script, args, capture) {
  return spawnSync(process.execPath, [path.join(projectRoot, "scripts", script), ...args], {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit"
  });
}

async function withDb(fn) {
  const { getDb } = await import("../src/lib/db.mjs");
  return fn(getDb());
}

async function isCampaignScored(name) {
  return withDb(async (db) => {
    const r = await db.query("select count(*)::int n from prospect_scores where campaign_id = (select id from campaigns where name = $1)", [name]);
    return r.rows[0].n > 0;
  });
}

async function campaignSpend(name) {
  return withDb(async (db) => {
    const r = await db.query("select coalesce(sum((stats->>'estimatedCostUsd')::numeric),0) t from runs where campaign_id = (select id from campaigns where name = $1)", [name]);
    return Number(r.rows[0].t);
  });
}

async function campaignQualified(name) {
  return withDb(async (db) => {
    const r = await db.query("select count(*)::int n from prospect_scores where campaign_id = (select id from campaigns where name = $1) and disqualified = false and prospect_score is not null", [name]);
    return r.rows[0].n;
  });
}

function selectCategories() {
  if (values.categories) {
    const wanted = values.categories.split(",").map((s) => s.trim());
    const found = wanted.map((slug) => {
      const cat = categoryCatalog.find((c) => c.slug === slug);
      if (!cat) throw new Error(`Unknown category slug "${slug}". Known: ${categoryCatalog.map((c) => c.slug).join(", ")}`);
      return cat;
    });
    return found;
  }
  return categoryCatalog.filter((c) => values.all || c.default);
}

function parseCenter(raw) {
  const [lat, lng] = raw.split(",").map((p) => Number(p.trim()));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error(`--center must be "lat,lng", got "${raw}".`);
  return { lat, lng };
}
