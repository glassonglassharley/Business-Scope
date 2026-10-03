// Exports a campaign's qualified prospect list to CSV — the call sheet.
//
//   node scripts/export-prospects.mjs --campaign "sd-plumbers-8km" [--out path.csv] [--solar has|none|unclear|unchecked]
//
// One row per qualified (not disqualified, scored) business, ranked by
// prospect_score. Contact channels come from contact_channels; the top three
// specific defects are the lowest-scoring website-side metrics from the latest
// scan, weighted toward what the offer fixes, so they are concrete talking
// points rather than category labels. The solar columns carry the rooftop
// signal and the KEY-LESS Static Maps URL that was classified.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { loadEnvLocal } from "./envLocal.mjs";
import { prospectScoringConfig } from "../src/lib/prospectingConfig.mjs";
import { parseSolarFilter, solarFilterSql, solarLabel } from "../src/lib/solarSignal.mjs";

loadEnvLocal();

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { values } = parseArgs({ options: { campaign: { type: "string" }, out: { type: "string" }, solar: { type: "string" }, "include-incomplete": { type: "boolean" } } });
if (!values.campaign) {
  console.error("Usage: export-prospects.mjs --campaign <name> [--out path.csv] [--solar has|none|unclear|unchecked] [--include-incomplete]");
  process.exit(1);
}
const solarFilter = parseSolarFilter(values.solar);

const { getDb } = await import("../src/lib/db.mjs");
const db = getDb();

const campaign = await db.query("select id, incomplete from campaigns where name = $1", [values.campaign]);
if (!campaign.rows.length) {
  console.error(`No campaign named "${values.campaign}".`);
  process.exit(1);
}
// Refuse to turn partial data into a call sheet.
if (campaign.rows[0].incomplete && !values["include-incomplete"]) {
  console.error(`Campaign "${values.campaign}" is INCOMPLETE — discovery or deep scan hit the request ceiling, so only part of it was covered. Refusing to export partial data as a call sheet. Complete the sweep, or pass --include-incomplete to override.`);
  process.exit(2);
}
const campaignId = campaign.rows[0].id;

const rows = await db.query(
  `select b.id, b.place_id, b.name, b.city, b.phone, b.website_url, b.rating, b.review_count, b.business_status,
          b.solar_status, b.solar_image_url,
          ps.prospect_score, ps.weakness, ps.viability, ps.momentum, ps.reachability_factor, ps.completeness, ps.weights_version
   from prospect_scores ps
   join businesses b on b.id = ps.business_id
   where ps.campaign_id = $1 and ps.disqualified = false and ps.prospect_score is not null
     and ${solarFilterSql("$2")}
   order by ps.prospect_score desc`,
  [campaignId, solarFilter]
);

const outPath = values.out
  ? path.resolve(values.out)
  : path.join(projectRoot, "outputs", `${values.campaign}-prospects-${new Date().toISOString().slice(0, 10)}.csv`);
mkdirSync(path.dirname(outPath), { recursive: true });

const header = [
  "rank", "business", "city", "phone", "email", "web_form", "social",
  "prospect_score", "weakness", "viability", "momentum", "reachability", "completeness",
  "review_count", "rating", "website_status", "solar", "solar_image_url", "weights_version",
  "defect_1", "defect_2", "defect_3"
];

const lines = [header.join(",")];

for (const [index, row] of rows.rows.entries()) {
  const [channels, scan] = await Promise.all([
    db.query("select channel_type, platform, value, status from contact_channels where place_id = $1 order by channel_type", [row.place_id]),
    db.query("select score_breakdown, signals from scans where place_id = $1 order by scanned_at desc limit 1", [row.place_id])
  ]);

  const byType = (type) => channels.rows.filter((channel) => channel.channel_type === type);
  const emails = byType("email").map((channel) => channel.value).join(" | ");
  const forms = byType("form").map((channel) => channel.value).join(" | ");
  const social = byType("social").map((channel) => `${channel.platform || "social"}${channel.status && channel.status !== "unknown" ? `(${channel.status})` : ""}: ${channel.value}`).join(" | ");

  const defects = topDefects(scan.rows[0]?.score_breakdown, 3);

  lines.push([
    index + 1,
    row.name,
    row.city || "",
    row.phone || "",
    emails,
    forms,
    social,
    row.prospect_score,
    row.weakness,
    row.viability,
    row.momentum,
    row.reachability_factor,
    row.completeness,
    row.review_count ?? "",
    row.rating ?? "",
    websiteStatus(row.website_url, scan.rows[0]?.signals),
    solarLabel(row.solar_status),
    row.solar_image_url || "",
    row.weights_version,
    defects[0] || "",
    defects[1] || "",
    defects[2] || ""
  ].map(csvCell).join(","));
}

writeFileSync(outPath, "﻿" + lines.join("\r\n") + "\r\n", "utf8");
console.log(`Wrote ${rows.rows.length} qualified prospects to:`);
console.log(outPath);
await db.end();

/**
 * The lowest-scoring website-side metrics from the latest scan — the concrete
 * defects to raise on a call. Ranked by the private weakness weighting so the
 * things the offer fixes surface first, then by how bad each metric is.
 * customerSignals is excluded: low reviews are a viability fact, not a defect
 * to pitch as a website fix.
 */
function topDefects(breakdown, limit) {
  if (!breakdown?.categories) return [];
  const weights = prospectScoringConfig.weakness.categoryWeights;
  const candidates = [];
  for (const category of breakdown.categories) {
    if (category.status !== "measured") continue;
    const categoryWeight = weights[category.key];
    if (!categoryWeight) continue; // customerSignals / anything outside the weakness model
    for (const metric of category.metrics || []) {
      if (typeof metric.score !== "number" || metric.score >= 75) continue;
      candidates.push({ label: metric.label, note: metric.note, priority: categoryWeight * (100 - metric.score) });
    }
  }
  return candidates
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit)
    .map((defect) => defect.note ? `${defect.label}: ${defect.note}` : defect.label);
}

function websiteStatus(websiteUrl, signals) {
  if (!websiteUrl) return "no website";
  if (signals?.websiteBroken === true) return "listed but not loading";
  return "has website";
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
