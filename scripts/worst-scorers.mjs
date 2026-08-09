// PRIVATE. Outreach pull: the worst-scoring businesses in a niche/geography,
// with the specific checks that failed and how to reach them. Read-only —
// selects only, no writes, no API calls, no cost.
//
//   node scripts/worst-scorers.mjs --campaign "sd-plumbers-8km" --limit 15
//   node scripts/worst-scorers.mjs --type plumber --city "San Diego" --limit 20
//   node scripts/worst-scorers.mjs --campaign "sd-roofing-8km" --by prospect
//   node scripts/worst-scorers.mjs --campaign "sd-hvac-8km" --csv > sheet.csv
//   node scripts/worst-scorers.mjs --campaign "sd-plumbers-8km" --html
//
// Filters (combine freely; omit all to sweep every scored campaign):
//   --campaign <name>   one campaign (this is the niche+geography unit that exists)
//   --type <slug>       businesses.primary_type, e.g. plumber, roofing_contractor
//   --city <name>       businesses.city, ILIKE
//   --limit N           default 15
//   --by worst|prospect worst = lowest public presence score first (default)
//                       prospect = highest likelihood-to-buy first
//   --site broken|none|any   broken = listed a website that does not load (the
//                       sharpest opening line); none = no website at all;
//                       default any
//   --min-reviews N     cut the 1-3 review micro-listings that dominate the
//                       bottom of the presence-score range
//   --reachable-only    drop rows with no phone/email/form/social on file
//   --include-incomplete  allow campaigns whose discovery/deep scan hit the ceiling
//
// Output format (default is the readable console call sheet):
//   --csv               CSV to stdout
//   --html              write a styled table to outputs/worst-scorers-<scope>.html
//                       and print the path. outputs/ is gitignored.
//   --out <path>        override the --html destination
//
// Only qualified rows are returned (disqualified = false) and only businesses
// that were actually deep-scanned, because the failing-check detail lives in
// scans.score_breakdown. Every filter is a bound query parameter; the same
// single read-only SELECT and the same topProblems() ranking feed all three
// output formats.
//
// The HTML file is for opening from disk. It is fully self-contained — inline
// CSS only, no scripts, no images, no fonts, no network requests of any kind
// when opened — and it carries the same PRIVATE banner as the console output.
// It is written to gitignored outputs/ and is never served by the app.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { loadEnvLocal } from "./envLocal.mjs";
import { prospectScoringConfig } from "../src/lib/prospectingConfig.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

loadEnvLocal();

const { values } = parseArgs({
  options: {
    campaign: { type: "string" },
    type: { type: "string" },
    city: { type: "string" },
    limit: { type: "string" },
    by: { type: "string" },
    site: { type: "string" },
    "min-reviews": { type: "string" },
    "reachable-only": { type: "boolean" },
    "include-incomplete": { type: "boolean" },
    csv: { type: "boolean" },
    html: { type: "boolean" },
    out: { type: "string" }
  }
});

const limit = Number(values.limit || 15);
const orderBy = values.by === "prospect"
  ? "ps.prospect_score desc, s.presence_score asc"
  : "s.presence_score asc, ps.weakness desc";

const { getDb } = await import("../src/lib/db.mjs");
const db = getDb();

// Mirror the guard score.mjs/export-prospects.mjs already enforce: a campaign
// that aborted at the request ceiling covers only part of its area, so its
// ranked list is a biased sample and must not be read as a clean worst-N.
if (values.campaign && !values["include-incomplete"]) {
  const c = await db.query("select incomplete from campaigns where name = $1", [values.campaign]);
  if (!c.rows.length) {
    console.error(`No campaign named "${values.campaign}".`);
    process.exit(1);
  }
  if (c.rows[0].incomplete) {
    console.error(`Campaign "${values.campaign}" is INCOMPLETE — discovery or deep scan hit the request ceiling, so only part of the area was covered. Pass --include-incomplete to override.`);
    process.exit(2);
  }
}

const result = await db.query(
  `select b.name, b.place_id, b.city, b.primary_type, b.phone, b.website_url,
          b.rating, b.review_count, b.business_status,
          c.name  as campaign,
          s.presence_score, s.score_breakdown, s.signals as scan_signals, s.scanned_at,
          ps.prospect_score, ps.weakness, ps.viability, ps.momentum,
          ps.reachability_factor, ps.completeness, ps.signals as prospect_signals,
          (select json_agg(json_build_object(
                    'type', cc.channel_type, 'platform', cc.platform,
                    'value', cc.value, 'status', cc.status) order by cc.channel_type)
             from contact_channels cc where cc.place_id = b.place_id) as channels
     from prospect_scores ps
     join campaigns  c on c.id = ps.campaign_id
     join businesses b on b.id = ps.business_id
     join scans      s on s.id = ps.scan_id
    where ps.disqualified = false
      and ps.prospect_score is not null
      and s.presence_score is not null
      and ($1::text is null or c.name = $1)
      and ($2::text is null or b.primary_type = $2)
      and ($3::text is null or b.city ilike $3)
      and ($4::int  is null or b.review_count >= $4)
      -- signals.websiteBroken is ALSO true when there is no website at all
      -- (275 scans vs 51 genuinely dead links), so 'broken' must additionally
      -- require a listed URL or it silently returns the no-website segment.
      and ($5::text is null
           or ($5 = 'none'   and b.website_url is null)
           or ($5 = 'broken' and b.website_url is not null
                             and s.signals->>'websiteBroken' = 'true')
           or  $5 = 'any')
    order by ${orderBy}
    limit $6`,
  [values.campaign ?? null, values.type ?? null, values.city ?? null,
   values["min-reviews"] ? Number(values["min-reviews"]) : null,
   values.site ?? null, limit * 3]
);

let rows = result.rows;
if (values["reachable-only"]) {
  rows = rows.filter((r) => r.phone || (r.channels || []).length);
}
rows = rows.slice(0, limit);

if (!rows.length) {
  console.error("No qualified, deep-scanned businesses matched those filters.");
  console.error("Only ~1,600 of the discovered businesses have been deep-scanned; an unscanned business has no failing-check detail and is excluded here.");
  await db.end();
  process.exit(0);
}

if (values.html) writeHtml(rows);
else if (values.csv) printCsv(rows);
else printCallSheet(rows);

await db.end();

// ---------------------------------------------------------------------------

/** Human-readable description of the active filters. Shared by every format. */
function scopeLabel() {
  return [
    values.campaign && `campaign ${values.campaign}`,
    values.type && `type ${values.type}`,
    values.city && `city ${values.city}`,
    values.site && values.site !== "any" && `site ${values.site}`,
    values["min-reviews"] && `${values["min-reviews"]}+ reviews`
  ].filter(Boolean).join(", ") || "all scored campaigns";
}

/** How the rows are ordered, in words. Shared by every format. */
function sortLabel() {
  return values.by === "prospect" ? "best prospect first" : "worst public presence score first";
}

function printCallSheet(rows) {
  const scope = scopeLabel();

  console.log(`\nWORST SCORERS — ${scope}`);
  console.log(`${rows.length} businesses, ${sortLabel()}`);
  console.log("PRIVATE — internal prospecting data. Never shown to a business owner.\n");

  for (const [i, r] of rows.entries()) {
    const problems = topProblems(r.score_breakdown, 3);
    console.log(`${String(i + 1).padStart(2)}. ${r.name}${r.city ? ` — ${r.city}` : ""}   [${r.primary_type || "?"}]`);
    console.log(`    presence ${r.presence_score}/100   weakness ${num(r.weakness)}   prospect ${num(r.prospect_score)}   ${r.review_count ?? "?"} reviews @ ${r.rating ?? "?"}★`);
    console.log(`    site: ${websiteStatus(r.website_url, r.scan_signals)}${r.website_url ? `  ${r.website_url}` : ""}`);
    for (const p of problems) console.log(`    · ${p}`);
    if (!problems.length) console.log(`    · (no per-metric detail on this scan)`);
    console.log(`    reach: ${contactLine(r)}`);
    console.log("");
  }

  console.log(`Campaigns flagged incomplete are excluded unless --include-incomplete.`);
}

/**
 * The concrete failing checks to raise on a call. Prefers the scanner's own
 * prioritizedIssues (title + the fix it suggests); falls back to the lowest-
 * scoring metrics inside the categories the private weakness model actually
 * weights, so the defect named is one the offer fixes. customerSignals is
 * excluded either way: low review count is a viability fact, not a website
 * defect to pitch.
 */
function topProblems(breakdown, limit) {
  if (!breakdown) return [];
  const weights = prospectScoringConfig.weakness.categoryWeights;

  const issues = (breakdown.prioritizedIssues || [])
    .filter((issue) => weights[issue.category])
    .map((issue) => `${issue.title.replace(/ needs attention$/, "")} — ${issue.suggestedFix}`);
  if (issues.length) return issues.slice(0, limit);

  const candidates = [];
  for (const category of breakdown.categories || []) {
    if (category.status !== "measured") continue;
    const w = weights[category.key];
    if (!w) continue;
    for (const metric of category.metrics || []) {
      if (typeof metric.score !== "number" || metric.score >= 75) continue;
      candidates.push({ text: metric.note ? `${metric.label} — ${metric.note}` : metric.label, priority: w * (100 - metric.score) });
    }
  }
  return candidates.sort((a, b) => b.priority - a.priority).slice(0, limit).map((c) => c.text);
}

/**
 * Reachable channels, best first — phone beats email/form beats social.
 * Returns at most four {kind, value} entries; empty means manual lookup.
 */
function contactParts(row) {
  const parts = [];
  if (row.phone) parts.push({ kind: "phone", value: row.phone });
  const by = (t) => (row.channels || []).filter((c) => c.type === t);
  for (const c of by("email")) parts.push({ kind: "email", value: c.value });
  for (const c of by("form")) parts.push({ kind: "form", value: c.value });
  for (const c of by("social")) parts.push({ kind: c.platform || "social", value: c.value });
  for (const c of by("phone").filter((c) => c.value !== row.phone)) parts.push({ kind: "phone", value: c.value });
  return parts.slice(0, 4);
}

function contactLine(row) {
  const parts = contactParts(row);
  return parts.length
    ? parts.map((p) => `${p.kind} ${p.value}`).join("  |  ")
    : "NO CHANNEL ON FILE — manual lookup";
}

function websiteStatus(websiteUrl, signals) {
  if (!websiteUrl) return "NO WEBSITE";
  if (signals?.websiteBroken === true) return "LISTED BUT NOT LOADING";
  return "has website";
}

function num(v) {
  return v === null || v === undefined ? "?" : Number(v).toFixed(1);
}

function printCsv(rows) {
  const header = ["rank", "business", "city", "type", "campaign", "presence_score", "weakness", "prospect_score",
    "reviews", "rating", "website_status", "problem_1", "problem_2", "problem_3", "contact"];
  const lines = [header.join(",")];
  for (const [i, r] of rows.entries()) {
    const p = topProblems(r.score_breakdown, 3);
    lines.push([i + 1, r.name, r.city || "", r.primary_type || "", r.campaign,
      r.presence_score, num(r.weakness), num(r.prospect_score), r.review_count ?? "", r.rating ?? "",
      websiteStatus(r.website_url, r.scan_signals), p[0] || "", p[1] || "", p[2] || "", contactLine(r)
    ].map(cell).join(","));
  }
  console.log("﻿" + lines.join("\r\n"));
}

function cell(v) {
  const t = String(v ?? "");
  return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

// ---------------------------------------------------------------------------
// HTML call sheet — same rows, same order, same topProblems() ranking.
// ---------------------------------------------------------------------------

function writeHtml(rows) {
  const outPath = values.out
    ? path.resolve(values.out)
    : path.join(projectRoot, "outputs", `worst-scorers-${outputSlug()}.html`);

  mkdirSync(path.dirname(outPath), { recursive: true });
  writeFileSync(outPath, htmlDocument(rows), "utf8");

  console.log(`Wrote ${rows.length} businesses (${sortLabel()}) to:`);
  console.log(outPath);
  console.log("Open it from disk. The path is stable, so re-running overwrites it and a browser refresh picks up the new data.");
}

/** Stable, filesystem-safe name for the active filters. */
function outputSlug() {
  const raw = values.campaign
    || [values.type, values.city].filter(Boolean).join("-")
    || "all";
  return String(raw).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "all";
}

function htmlDocument(rows) {
  const generated = new Date().toLocaleString();
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Worst scorers — ${esc(scopeLabel())}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 32px 24px 64px;
    font: 15px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1b1f23; background: #f6f7f9;
  }
  .wrap { max-width: 1180px; margin: 0 auto; }
  .banner {
    background: #7f1d1d; color: #fff; border-radius: 8px;
    padding: 12px 16px; font-weight: 600; letter-spacing: .01em; margin-bottom: 24px;
  }
  .banner span { display: block; font-weight: 400; opacity: .85; font-size: 13px; margin-top: 4px; }
  h1 { font-size: 22px; margin: 0 0 6px; letter-spacing: -.01em; }
  .meta { color: #57606a; font-size: 13px; margin: 0 0 20px; }
  .meta b { color: #1b1f23; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; background: #fff;
          border: 1px solid #d8dee4; border-radius: 8px; overflow: hidden; }
  thead th {
    text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .06em;
    color: #57606a; background: #f0f2f5; padding: 10px 14px; border-bottom: 1px solid #d8dee4;
    white-space: nowrap;
  }
  tbody td { padding: 14px; border-bottom: 1px solid #eaeef2; vertical-align: top; }
  tbody tr:last-child td { border-bottom: 0; }
  tbody tr:nth-child(even) { background: #fbfcfd; }
  .rank { color: #8c959f; font-variant-numeric: tabular-nums; width: 40px; }
  .biz { font-weight: 600; }
  .sub { display: block; font-weight: 400; font-size: 12px; color: #57606a; margin-top: 3px; }
  .city { white-space: nowrap; color: #424a53; }
  .score { font-variant-numeric: tabular-nums; font-weight: 700; font-size: 17px; white-space: nowrap; }
  .score small { display: block; font-size: 11px; font-weight: 400; color: #8c959f; }
  .s-bad { color: #b91c1c; } .s-mid { color: #b45309; } .s-ok { color: #424a53; }
  .tag { display: inline-block; font-size: 11px; padding: 1px 7px; border-radius: 999px;
         border: 1px solid currentColor; margin-top: 5px; }
  .t-none { color: #b91c1c; } .t-broken { color: #b45309; } .t-has { color: #57606a; }
  ul.problems { margin: 0; padding-left: 17px; }
  ul.problems li { margin-bottom: 5px; }
  ul.problems li:last-child { margin-bottom: 0; }
  .none { color: #8c959f; font-style: italic; }
  .contact { font-size: 13px; white-space: nowrap; }
  .contact div { margin-bottom: 4px; }
  .contact .k { color: #8c959f; display: inline-block; min-width: 44px; }
  .nolead { color: #b91c1c; font-weight: 600; white-space: normal; }
  a { color: #0969da; text-decoration: none; }
  a:hover { text-decoration: underline; }
  footer { margin-top: 20px; color: #8c959f; font-size: 12px; }
  @media (max-width: 820px) { .contact, .city { white-space: normal; } body { padding: 16px 12px 48px; } }
</style>
</head>
<body>
<div class="wrap">

<div class="banner">
  PRIVATE — internal prospecting data. Never show this to a business owner.
  <span>Local file, generated on demand from the private layer. Do not publish, paste, or attach it. Delete when you are done.</span>
</div>

<h1>Worst scorers — ${esc(scopeLabel())}</h1>
<p class="meta">
  <b>${rows.length}</b> businesses · ${esc(sortLabel())} · generated ${esc(generated)}<br>
  Qualified, deep-scanned businesses only. Campaigns flagged incomplete are excluded unless <code>--include-incomplete</code>.
</p>

<table>
  <thead>
    <tr>
      <th>#</th><th>Business</th><th>City</th><th>Presence</th><th>Top problems</th><th>Contact</th>
    </tr>
  </thead>
  <tbody>
${rows.map((row, index) => htmlRow(row, index)).join("\n")}
  </tbody>
</table>

<footer>Read-only view. Nothing here was written back to the database.</footer>

</div>
</body>
</html>
`;
}

function htmlRow(row, index) {
  const problems = topProblems(row.score_breakdown, 3);
  const status = websiteStatus(row.website_url, row.scan_signals);
  const statusClass = status === "NO WEBSITE" ? "t-none" : status === "LISTED BUT NOT LOADING" ? "t-broken" : "t-has";
  const scoreClass = row.presence_score <= 50 ? "s-bad" : row.presence_score <= 70 ? "s-mid" : "s-ok";

  const site = row.website_url
    ? ` <a href="${esc(safeUrl(row.website_url))}" rel="noreferrer noopener">${esc(shorten(row.website_url, 42))}</a>`
    : "";

  const problemList = problems.length
    ? `<ul class="problems">${problems.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>`
    : `<span class="none">no per-metric detail on this scan</span>`;

  const parts = contactParts(row);
  const contact = parts.length
    ? `<div class="contact">${parts.map(contactHtml).join("")}</div>`
    : `<span class="nolead">no channel on file — manual lookup</span>`;

  return `    <tr>
      <td class="rank">${index + 1}</td>
      <td>
        <span class="biz">${esc(row.name)}</span>
        <span class="sub">${esc(row.primary_type || "uncategorized")} · ${esc(row.review_count ?? "?")} reviews @ ${esc(row.rating ?? "?")}★</span>
        <span class="tag ${statusClass}">${esc(status.toLowerCase())}</span>${site}
      </td>
      <td class="city">${esc(row.city || "—")}</td>
      <td class="score ${scoreClass}">${esc(row.presence_score)}<small>of 100</small></td>
      <td>${problemList}</td>
      <td>${contact}</td>
    </tr>`;
}

function contactHtml({ kind, value }) {
  let rendered = esc(value);
  if (kind === "phone") rendered = `<a href="tel:${esc(value.replace(/[^\d+]/g, ""))}">${esc(value)}</a>`;
  else if (kind === "email") rendered = `<a href="mailto:${esc(value)}">${esc(value)}</a>`;
  else if (/^https?:\/\//i.test(value)) rendered = `<a href="${esc(safeUrl(value))}" rel="noreferrer noopener">${esc(shorten(value, 30))}</a>`;
  return `<div><span class="k">${esc(kind)}</span>${rendered}</div>`;
}

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

/** Only ever emit http(s) hrefs — never trust a stored URL to be a safe scheme. */
function safeUrl(value) {
  return /^https?:\/\//i.test(value) ? value : "#";
}

function shorten(text, max) {
  const clean = String(text).replace(/^https?:\/\//i, "").replace(/\/$/, "");
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}
