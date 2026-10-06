// Combined scan endpoint for server-to-server callers (e.g. a partner site's
// own backend proxy). Chains the same three steps NewAuditForm.jsx and
// scripts/deepscan.mjs already run separately: Places lookup -> website
// audit -> full 7-category score. Requires a shared-secret header since this
// is not meant to be called from a browser.
//
// Relative imports (not @/ alias) so this stays consistent with the other
// route handlers and is importable from Node directly if a test needs it.
import { GooglePlacesProvider } from "../../../lib/prospectData.js";
import { WebsiteProvider } from "../../../lib/websiteProvider.js";
import { calculateBusinessHealthScore, bandForScore } from "../../../lib/scoring.js";

export const runtime = "nodejs";

export async function POST(request) {
  const expectedToken = process.env.SCAN_PROXY_TOKEN;
  if (!expectedToken) {
    return Response.json(
      { ok: false, error: { code: "unavailable", message: "Scan proxy is not configured." } },
      { status: 503 }
    );
  }

  const providedToken = request.headers.get("x-scan-token");
  if (!providedToken || providedToken !== expectedToken) {
    return Response.json(
      { ok: false, error: { code: "unauthorized", message: "Missing or invalid scan token." } },
      { status: 401 }
    );
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: { code: "bad_request", message: "Request body must be JSON." } }, { status: 400 });
  }

  const businessName = typeof body.businessName === "string" ? body.businessName.trim() : "";
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const placeId = typeof body.placeId === "string" ? body.placeId.trim() : undefined;

  if (body.mode === "candidates") {
    if (!businessName) {
      return Response.json({ ok: false, error: { code: "bad_request", message: "businessName is required." } }, { status: 400 });
    }
    const candidatesResult = await GooglePlacesProvider.findCandidates({ businessName, city });
    if (!candidatesResult.ok) {
      return Response.json({ ok: false, error: candidatesResult.error }, { status: statusForCode(candidatesResult.error?.code) });
    }
    return Response.json({ ok: true, candidates: candidatesResult.candidates, error: null });
  }

  if (!businessName) {
    return Response.json({ ok: false, error: { code: "bad_request", message: "businessName is required." } }, { status: 400 });
  }

  try {
    const lookup = await GooglePlacesProvider.getProspectData({
      businessName,
      city,
      industry: "Other Local Business",
      placeId
    });
    if (!lookup.ok) {
      return Response.json({ ok: false, error: lookup.error }, { status: statusForCode(lookup.error?.code) });
    }

    const auditResult = await WebsiteProvider.auditResolvedPlace(lookup.place);
    const websiteAudit = auditResult.ok ? auditResult.audit : null;
    const scoreBreakdown = calculateBusinessHealthScore({ ...lookup.prospect, websiteAudit });

    return Response.json({
      ok: true,
      place: lookup.place,
      scan: lookup.prospect,
      websiteAudit,
      scoreBreakdown,
      summary: buildSummary(scoreBreakdown),
      error: null
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: { code: "api_error", message: error?.message || "Scan failed." } },
      { status: 502 }
    );
  }
}

// Additive summary layer — every field here is derived from scoreBreakdown,
// which already has no partner/branding vocabulary in it (see
// tests/publicLeak.test.mjs). Nothing here is invented copy: ratingLabel and
// verdict come straight from the engine's own bandForScore, gap/fix titles
// come straight from prioritizedIssues, check pass/fail reuses the engine's
// own < 75 "needs attention" threshold.
function buildSummary(scoreBreakdown) {
  const band = typeof scoreBreakdown.overallScore === "number" ? bandForScore(scoreBreakdown.overallScore) : null;
  const measuredCategories = (scoreBreakdown.categories || []).filter(
    (category) => category.status === "measured" && typeof category.score === "number"
  );
  const weakest = measuredCategories.length
    ? measuredCategories.reduce((lowest, category) => (category.score < lowest.score ? category : lowest))
    : null;
  const topIssues = scoreBreakdown.prioritizedIssues || [];

  return {
    ratingLabel: band?.label ?? null,
    likelyCustomerImpact: band?.verdict ?? null,
    mostUrgentGap: topIssues[0]?.title ?? null,
    weakestCategory: weakest ? { key: weakest.key, label: weakest.label, score: weakest.score } : null,
    topFixes: topIssues.slice(0, 3).map((issue) => ({ title: issue.title, note: issue.suggestedFix })),
    categories: measuredCategories.map((category) => ({ key: category.key, label: category.label, score: category.score })),
    checks: measuredCategories.flatMap((category) =>
      (category.metrics || [])
        .filter((metric) => typeof metric.score === "number")
        .map((metric) => ({
          category: category.key,
          id: metric.id,
          label: metric.label,
          pass: metric.score >= 75,
          score: metric.score,
          note: metric.note
        }))
    )
  };
}

function statusForCode(code) {
  return code === "missing_api_key" ? 503 : code === "bad_request" ? 400 : code === "not_found" ? 404 : code === "rate_limited" ? 429 : 502;
}
