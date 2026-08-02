// Public/private separation leak test.
//
// Asserts that no public surface can contain private-layer vocabulary:
//   prospect, viability, momentum, disqualif, weakness, reachability,
//   completeness, campaign, pipeline  (case-insensitive)
//
// Surfaces checked:
//   1. The whitelisted public report object — built from a REAL scan produced
//      by the actual API handler, with private fields adversarially injected
//      at several nesting levels to simulate a future bug.
//   2. The share-link payload (the only serialized report that leaves the
//      browser) — real encode/decode round trip.
//   3. Real API route handlers (success, error, and bad-input paths),
//      including response headers and error messages, with upstream Google
//      calls mocked.
//   4. The prerendered page HTML + RSC/flight payload from the production
//      build output (`__NEXT_DATA__`-equivalent serialized props live here).
//   5. Import-graph isolation: nothing reachable from the public app can
//      import a private module or the Postgres driver — which also proves no
//      private table is queried in any public request path (only db.mjs
//      talks to the database).
//   6. Every string literal and JSX text node in report-rendering modules —
//      the client renders the report DOM (and its printed PDF) exclusively
//      from these strings plus the whitelisted object, so together with (1)
//      this bounds what the PDF/DOM can ever contain.
//
// Not scanned, deliberately: minified JS bundle identifiers (function/prop
// names are never rendered; surfaces (1) and (6) cover everything that can
// reach the DOM), and PDF binary output (browser print of the DOM — content
// is exactly surface (1) + (6), metadata is layout.jsx's <title>, covered
// by (6)).

import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BANNED = /prospect|viability|momentum|disqualif|weakness|reachability|completeness|campaign|pipeline/i;

const { buildPublicReport } = await import("../src/lib/publicReport.js");
const { encodeAuditForUrl, decodeAuditFromUrl } = await import("../src/lib/shareLinks.js");
const { buildReportSummary, createReportViewModel, sampleReportToAudit } = await import("../src/lib/reportViewModel.js");
const { SAMPLE_REPORTS } = await import("../src/lib/sampleReport.js");

// ---------------------------------------------------------------------------
// Mocked Google upstream so the REAL route handlers run without network.
// ---------------------------------------------------------------------------
const realFetch = globalThis.fetch;
function mockGoogle() {
  globalThis.fetch = async (url) => {
    const href = String(url);
    if (href.includes("findplacefromtext")) {
      return jsonResponse({
        status: "OK",
        candidates: [{ place_id: "pid-1", name: "Rosa's Taqueria", formatted_address: "12 Main St, Atlanta, GA 30303, USA", business_status: "OPERATIONAL", types: ["restaurant"] }]
      });
    }
    if (href.includes("place/details")) {
      return jsonResponse({
        status: "OK",
        result: {
          place_id: "pid-1",
          name: "Rosa's Taqueria",
          formatted_address: "12 Main St, Atlanta, GA 30303, USA",
          international_phone_number: "+1 404-555-0182",
          business_status: "OPERATIONAL",
          opening_hours: { open_now: true, weekday_text: ["Monday: 9AM-5PM", "Tuesday: 9AM-5PM", "Wednesday: 9AM-5PM", "Thursday: 9AM-5PM", "Friday: 9AM-5PM"] },
          rating: 4.6,
          user_ratings_total: 210,
          reviews: [{ time: 1784000000 }, { time: 1783000000 }],
          types: ["restaurant"],
          photos: [{}, {}, {}]
        }
      });
    }
    throw new Error(`Unexpected fetch in test: ${href}`);
  };
}
function jsonResponse(data) {
  return new Response(JSON.stringify(data), { status: 200, headers: { "content-type": "application/json" } });
}
function postRequest(body) {
  return new Request("http://internal.test/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });
}
async function responseSurface(response) {
  const headerText = [...response.headers.entries()].flat().join(" ");
  return `${response.status} ${headerText} ${await response.text()}`;
}

// Build a realistic audit through the real handler once, shared by tests.
async function buildRealAudit() {
  process.env.GOOGLE_PLACES_API_KEY = "test-key";
  mockGoogle();
  try {
    const { POST } = await import("../src/app/api/places/lookup/route.js");
    const response = await POST(postRequest({ placeId: "pid-1", businessName: "Rosa's Taqueria", city: "Atlanta", industry: "Restaurant / Food Service" }));
    const body = await response.json();
    assert.equal(body.ok, true);
    // Mirrors buildAudit's google_places branch (buildAudit itself imports a
    // .ts module Node 22 cannot load; the shapes here are identical).
    return {
      id: "test-audit",
      createdAt: new Date("2026-07-23T00:00:00Z").toISOString(),
      ...body.scan,
      score: { total: body.scoreBreakdown.overallScore ?? 0, categories: body.scoreBreakdown.categories, breakdown: body.scoreBreakdown },
      businessHealthScore: body.scoreBreakdown,
      placesScoreBreakdown: body.scoreBreakdown,
      gaps: (body.scoreBreakdown.prioritizedIssues || []).map((issue) => ({ id: issue.id, title: issue.title, body: issue.suggestedFix }))
    };
  } finally {
    globalThis.fetch = realFetch;
  }
}

function injectPrivateFields(audit) {
  // Simulate the worst case: private scoring merged onto the audit object at
  // several nesting levels by some future bug.
  const poisoned = structuredClone(audit);
  poisoned.prospectScore = 88.1;
  poisoned.viability = 100;
  poisoned.momentum = 97;
  poisoned.weakness = 66;
  poisoned.reachabilityFactor = 1;
  poisoned.completeness = 91.9;
  poisoned.campaignId = "11111111-2222-3333-4444-555555555555";
  poisoned.pipelineStatus = "new";
  poisoned.disqualifyReasons = [];
  poisoned.googlePlaces = { ...(poisoned.googlePlaces || {}), prospectIntel: { secret: true } };
  poisoned.score.prospectNote = "internal ranking says call first";
  poisoned.reviews.momentumScore = 100;
  return poisoned;
}

// ---------------------------------------------------------------------------
// 1 + 2: whitelist output and share-link payload
// ---------------------------------------------------------------------------
test("public report built from a poisoned audit contains zero banned words", async () => {
  const poisoned = injectPrivateFields(await buildRealAudit());
  const report = buildPublicReport(poisoned);
  const serialized = JSON.stringify(report);

  assert.equal(BANNED.test(serialized), false, `banned word leaked: ${serialized.match(BANNED)?.[0]}`);
  assert.ok(!serialized.includes("internal ranking"), "injected private value leaked");
  assert.deepEqual(Object.keys(report).sort(), [
    "accuracy", "businessHealthScore", "businessName", "city", "contact", "createdAt",
    "dataSource", "gaps", "googleBusinessProfile", "id", "industry", "localVisibility",
    "ordering", "preparerName", "reviews", "score", "website"
  ], "public report grew an unexpected top-level field — extend the whitelist deliberately or remove the leak");
});

test("share-link payload is the whitelisted report, not a record dump", async () => {
  const poisoned = injectPrivateFields(await buildRealAudit());
  const encoded = encodeAuditForUrl({ ...poisoned, preparerName: "StreetSignal" });
  const decoded = decodeAuditFromUrl(`https://example.com/?report=${encodeURIComponent(encoded)}`);

  assert.ok(decoded, "share link failed to decode");
  const serialized = JSON.stringify(decoded);
  assert.equal(BANNED.test(serialized), false, `banned word in share payload: ${serialized.match(BANNED)?.[0]}`);
  assert.equal(decoded.businessName, "Rosa's Taqueria");
  assert.equal(decoded.score.breakdown.overallScore, decoded.score.total);
});

// ---------------------------------------------------------------------------
// 3: real API handlers — success, error, and bad-input paths
// ---------------------------------------------------------------------------
test("places lookup API surfaces (bodies, headers, errors) are clean", async () => {
  process.env.GOOGLE_PLACES_API_KEY = "test-key";
  mockGoogle();
  try {
    const { POST } = await import("../src/app/api/places/lookup/route.js");
    const surfaces = [
      await responseSurface(await POST(postRequest({ mode: "candidates", businessName: "Rosa's Taqueria", city: "Atlanta" }))),
      await responseSurface(await POST(postRequest({ placeId: "pid-1", businessName: "Rosa's Taqueria", city: "Atlanta", industry: "Restaurant / Food Service" }))),
      await responseSurface(await POST(postRequest("this is not json")))
    ];
    delete process.env.GOOGLE_PLACES_API_KEY;
    surfaces.push(await responseSurface(await POST(postRequest({ mode: "candidates", businessName: "X" }))));

    for (const surface of surfaces) {
      assert.equal(BANNED.test(surface), false, `banned word in API surface: ${surface.match(BANNED)?.[0]} — ${surface.slice(0, 200)}`);
    }
  } finally {
    globalThis.fetch = realFetch;
    process.env.GOOGLE_PLACES_API_KEY = "test-key";
  }
});

test("website audit API surfaces are clean", async () => {
  const { POST } = await import("../src/app/api/website/audit/route.js");
  const surfaces = [
    // No-website path exercises the full audit shape without live DNS/fetch.
    await responseSurface(await POST(postRequest({ place: { name: "Rosa's Taqueria", address: "12 Main St, Atlanta", phone: "+1 404-555-0182", website: null } }))),
    await responseSurface(await POST(postRequest("still not json")))
  ];
  for (const surface of surfaces) {
    assert.equal(BANNED.test(surface), false, `banned word in audit surface: ${surface.match(BANNED)?.[0]}`);
  }
});

// ---------------------------------------------------------------------------
// 4: prerendered HTML + RSC payload from the production build
// ---------------------------------------------------------------------------
test("prerendered page HTML and RSC payload are clean", (t) => {
  const candidates = ["server/app/index.html", "server/app/index.rsc", "server/app/privacy.html", "server/app/privacy.rsc"];
  const found = candidates.map((rel) => path.join(projectRoot, ".next", rel)).filter((file) => existsSync(file));
  if (!found.length) {
    t.skip("no .next build output — run `npm run build` before `npm test` for full coverage");
    return;
  }
  for (const file of found) {
    const content = readFileSync(file, "utf8");
    const match = content.match(BANNED);
    assert.equal(match, null, `banned word "${match?.[0]}" in build output ${path.basename(file)}`);
  }
});

// ---------------------------------------------------------------------------
// 5: import-graph isolation of the public app from the private layer
// ---------------------------------------------------------------------------
const PRIVATE_MODULES = new Set([
  "db.mjs", "discoveryRun.mjs", "discoveryGrid.mjs", "placesDiscovery.mjs",
  "prospectScoring.mjs", "prospectingConfig.mjs"
]);

test("no public entry point can reach a private module or the DB driver", () => {
  const entries = [
    ...listFiles(path.join(projectRoot, "src", "app")),
    ...listFiles(path.join(projectRoot, "src", "components"))
  ].filter((file) => /\.(js|jsx|mjs)$/.test(file));

  const reachable = new Set();
  const queue = [...entries];
  while (queue.length) {
    const file = queue.pop();
    if (reachable.has(file)) continue;
    reachable.add(file);
    for (const specifier of importsOf(readFileSync(file, "utf8"))) {
      const resolved = resolveImport(specifier, file);
      if (resolved && !reachable.has(resolved)) queue.push(resolved);
    }
  }

  for (const file of reachable) {
    const base = path.basename(file);
    assert.equal(PRIVATE_MODULES.has(base), false, `public app reaches private module ${base} via ${path.relative(projectRoot, file)}`);
    const source = readFileSync(file, "utf8");
    assert.equal(/from\s+["']pg["']|require\(["']pg["']\)/.test(source), false, `public-reachable file ${base} imports the Postgres driver`);
  }
  assert.ok(reachable.size > 10, "import walk looks broken — too few files reached");
});

// ---------------------------------------------------------------------------
// 6: renderable strings in every module that feeds the report DOM/PDF
// ---------------------------------------------------------------------------
test("string literals and JSX text in report-rendering modules are clean", () => {
  const files = [
    "src/components/ReportView.jsx", "src/components/AuditDashboard.jsx",
    "src/components/BusinessSearch.jsx", "src/components/NewAuditForm.jsx",
    "src/app/page.jsx", "src/app/layout.jsx",
    "src/lib/gaps.js", "src/lib/scoring.js", "src/lib/scoringConfig.js",
    "src/lib/brand.js", "src/lib/businessHealthScore.ts", "src/lib/seedAudits.js",
    "src/lib/publicReport.js"
  ];
  const stringLiteral = /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g;
  const jsxText = />([^<>{}\n]+)</g;

  for (const rel of files) {
    const file = path.join(projectRoot, rel);
    if (!existsSync(file)) continue;
    const source = readFileSync(file, "utf8");
    const renderable = [
      // `${expr}` interpolations are code, not literal text — their VALUES
      // flow through the data surfaces (tests 1-4), so strip them here.
      ...(source.match(stringLiteral) || []).map((text) => text.replace(/\$\{[^}]*\}/g, "")),
      ...[...source.matchAll(jsxText)].map((match) => match[1])
    ];
    for (const text of renderable) {
      const match = text.match(BANNED);
      assert.equal(match, null, `banned word "${match?.[0]}" in renderable string of ${rel}: ${text.slice(0, 80)}`);
    }
  }
});

// ---------------------------------------------------------------------------
// 7: premium report adapter preservation
// ---------------------------------------------------------------------------
test("live audit payload maps into the premium report view without changing factual values", async () => {
  const audit = await buildRealAudit();
  const viewModel = createReportViewModel(audit);

  assert.equal(viewModel.businessName, audit.businessName);
  assert.equal(viewModel.score.total, audit.score.total);
  assert.equal(viewModel.score.breakdown.overallScore, audit.score.breakdown.overallScore);
  assert.equal(viewModel.score.breakdown.availableWeight, audit.score.breakdown.availableWeight);
  assert.deepEqual(
    viewModel.score.breakdown.categories.map((category) => [category.key, category.score, category.status]),
    audit.score.breakdown.categories.map((category) => [category.key, category.score, category.status])
  );
  assert.deepEqual(
    viewModel.score.breakdown.prioritizedIssues.map((issue) => issue.id),
    audit.score.breakdown.prioritizedIssues.map((issue) => issue.id)
  );
});

test("premium report view model handles missing optional fields, unavailable checks, and zero scores", () => {
  const viewModel = createReportViewModel({
    id: "partial-report",
    score: {
      total: 0,
      breakdown: {
        overallScore: 0,
        availableWeight: 0,
        categories: [
          {
            key: "onlinePresence",
            label: "Online Presence",
            status: "measured",
            score: 0,
            metrics: [{ id: "url", label: "Website URL", score: null, note: "Not available" }]
          },
          {
            key: "technicalHealth",
            label: "Technical Health",
            status: "scan_unavailable",
            score: null,
            metrics: [{ id: "performance", label: "Mobile performance", score: null, note: "Not available" }]
          }
        ],
        prioritizedIssues: []
      }
    }
  });

  assert.equal(viewModel.businessName, "Unknown business");
  assert.equal(viewModel.industry, "Business type not available");
  assert.equal(viewModel.city, "Location not available");
  assert.equal(viewModel.reportDateLabel, "Not available");
  assert.equal(viewModel.score.total, 0);
  assert.equal(viewModel.score.breakdown.categories[0].score, 0);
  assert.equal(viewModel.score.breakdown.categories[1].status, "scan_unavailable");
  assert.deepEqual(viewModel.gaps, []);
});

test("sample report adapter feeds the same premium report component shape", () => {
  const sample = SAMPLE_REPORTS[2];
  const audit = sampleReportToAudit(sample, "August 1, 2026");

  assert.equal(audit.businessName, sample.business.businessName);
  assert.equal(audit.score.total, sample.scoreTotal);
  assert.equal(audit.score.breakdown.availableWeight, sample.availableWeight);
  assert.deepEqual(audit.score.breakdown.categories.map((category) => category.score), sample.categories.map((category) => category.score));
  assert.deepEqual(audit.score.breakdown.prioritizedIssues.map((issue) => issue.id), sample.prioritizedIssues.map((issue) => issue.id));
  assert.equal(audit.fullReportUnlocked, true);
});

test("copy-summary helper uses live report data and no internal-only label", async () => {
  const audit = await buildRealAudit();
  const summary = buildReportSummary(audit);

  assert.ok(summary.includes(audit.businessName));
  assert.ok(summary.includes(`Score: ${audit.score.total}/100`));
  assert.equal(summary.includes("Internal preview"), false);
  assert.equal(BANNED.test(summary), false, `banned word in report summary: ${summary.match(BANNED)?.[0]}`);
});

test("internal preview and public sample routes exist for build output", () => {
  assert.equal(existsSync(path.join(projectRoot, "src", "app", "internal", "page.jsx")), true);
  assert.equal(existsSync(path.join(projectRoot, "src", "app", "sample-report", "page.jsx")), true);
});

// ---------------------------------------------------------------------------
// 12: operator decision log (db/migrations/0004_operator_log.sql)
//
// The operator_log table records what the operator decided about a business
// and whether it was handed to a partner. It is written and read ONLY by the
// separate, password-gated prospects tool. This app must never learn it
// exists. Its vocabulary is checked separately from BANNED because "verdict"
// alone is legitimately public — it is the score band's summary sentence in
// src/lib/scoring.js — so only the compound operator/partner terms are banned.
// ---------------------------------------------------------------------------
const OPERATOR_BANNED = /operator[_\s]?log|operator[_\s]?verdict|operator[_\s]?notes|buzz[_\s]?bull|handoff[_\s]?outcome|buzzbull[_\s]?link|buzzbull[_\s]?submitted/i;

function injectOperatorFields(audit) {
  const poisoned = structuredClone(audit);
  poisoned.operatorVerdict = "buzzbull";
  poisoned.operator_verdict = "buzzbull";
  poisoned.handoffOutcome = "customer";
  poisoned.buzzBullLink = "https://marketing.buzzbullmarketing.com/book-now?am_id=jonathan3037";
  poisoned.buzzBullSubmittedAt = "2026-07-16";
  poisoned.operatorNotes = "owner is ready to buy, do not show this to them";
  poisoned.contactedAt = "2026-07-14";
  poisoned.score.operatorVerdict = "buzzbull";
  poisoned.reviews.handoffOutcome = "lead";
  poisoned.googlePlaces = { ...(poisoned.googlePlaces || {}), operatorLog: { verdict: "buzzbull" } };
  return poisoned;
}

test("public report built from an operator-poisoned audit contains no operator field", async () => {
  const poisoned = injectOperatorFields(await buildRealAudit());
  const serialized = JSON.stringify(buildPublicReport(poisoned));

  assert.equal(OPERATOR_BANNED.test(serialized), false, `operator field leaked: ${serialized.match(OPERATOR_BANNED)?.[0]}`);
  assert.equal(serialized.includes("do not show this to them"), false, "operator notes leaked into the public report");
  assert.equal(serialized.includes("2026-07-14"), false, "an operator date leaked into the public report");
});

test("share link and copied summary carry no operator field", async () => {
  const poisoned = injectOperatorFields(await buildRealAudit());

  const encoded = encodeAuditForUrl({ ...poisoned, preparerName: "Thorost" });
  const decoded = JSON.stringify(decodeAuditFromUrl(`https://example.com/?report=${encodeURIComponent(encoded)}`));
  assert.equal(OPERATOR_BANNED.test(decoded), false, `operator field in share payload: ${decoded.match(OPERATOR_BANNED)?.[0]}`);

  const summary = buildReportSummary(createReportViewModel(buildPublicReport(poisoned)));
  assert.equal(OPERATOR_BANNED.test(summary), false, `operator field in copied summary: ${summary.match(OPERATOR_BANNED)?.[0]}`);
});

test("no file in the public app mentions the operator log at all", () => {
  const files = [
    ...listFiles(path.join(projectRoot, "src")),
    ...listFiles(path.join(projectRoot, "scripts"))
  ].filter((file) => /\.(js|jsx|mjs|ts|tsx)$/.test(file));

  assert.ok(files.length > 10, "file walk looks broken — too few files found");
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const match = source.match(OPERATOR_BANNED);
    assert.equal(match, null, `${path.relative(projectRoot, file)} mentions "${match?.[0]}" — the operator log belongs only to the prospects tool`);
  }
});

test("page metadata and the prerendered build output carry no operator field", (t) => {
  const nextDir = path.join(projectRoot, ".next", "server", "app");
  if (!existsSync(nextDir)) {
    t.skip("no build output — run `npm run build` first");
    return;
  }

  const rendered = listFiles(nextDir).filter((file) => /\.(html|rsc|body)$/.test(file));
  assert.ok(rendered.length > 0, "no prerendered output found to scan");
  for (const file of rendered) {
    const source = readFileSync(file, "utf8");
    const match = source.match(OPERATOR_BANNED);
    assert.equal(match, null, `operator field "${match?.[0]}" in build output ${path.relative(projectRoot, file)}`);
  }
});

test("the operator_log migration is additive and touches no existing table", () => {
  const migration = path.join(projectRoot, "db", "migrations", "0004_operator_log.sql");
  assert.equal(existsSync(migration), true, "0004_operator_log.sql is missing");

  const sql = readFileSync(migration, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*--.*$/gm, "");

  // Only CREATE statements. Any ALTER/DROP/UPDATE/DELETE/TRUNCATE here would
  // mean the migration can change or destroy data that already exists.
  assert.equal(/\b(alter|drop|truncate|delete\s+from|update)\b/i.test(sql), false, "migration is not purely additive");

  const created = [...sql.matchAll(/create\s+(?:table|index)\s+(\w+)/gi)].map((match) => match[1].toLowerCase());
  assert.deepEqual(created.sort(), ["operator_log", "operator_log_verdict_idx"]);

  for (const table of ["businesses", "scans", "prospect_scores", "campaigns", "contact_channels", "pipeline", "runs"]) {
    assert.equal(new RegExp(`\\b${table}\\b`, "i").test(sql), false, `migration references the existing ${table} table`);
  }
});

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
function listFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath ?? entry.path, entry.name));
}

function importsOf(source) {
  return [...source.matchAll(/(?:import|export)\s[^"']*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g)]
    .map((match) => match[1] || match[2])
    .filter(Boolean);
}

function resolveImport(specifier, fromFile) {
  let base;
  if (specifier.startsWith("@/")) base = path.join(projectRoot, "src", specifier.slice(2));
  else if (specifier.startsWith(".")) base = path.resolve(path.dirname(fromFile), specifier);
  else return null; // bare package / node: builtin

  const attempts = [base, `${base}.js`, `${base}.jsx`, `${base}.mjs`, `${base}.ts`, `${base}.tsx`, path.join(base, "index.js")];
  return attempts.find((attempt) => existsSync(attempt) && !readdirSyncSafeDir(attempt)) || null;
}

function readdirSyncSafeDir(file) {
  try {
    return readdirSync(file) && true;
  } catch {
    return false;
  }
}
