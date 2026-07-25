"use client";

import { useMemo, useState } from "react";
import { bandForScore, formatDate } from "@/lib/scoring";
import { getScoringCategories } from "@/lib/scoringConfig";
import { encodeAuditForUrl } from "@/lib/shareLinks";
import { BRAND } from "@/lib/brand";

export function ReportView({ audit, preparerName, sharedMode = false }) {
  const [copyStatus, setCopyStatus] = useState("Copy Share Link");
  const [summaryStatus, setSummaryStatus] = useState("Copy report summary");
  const [fullReportUnlocked, setFullReportUnlocked] = useState(Boolean(audit.fullReportUnlocked));
  const band = bandForScore(audit.score.total);
  const reportPreparer = preparerName || BRAND;
  const categoryLabels = getScoringCategories(audit);
  const isFoodBusiness = audit.industry === "Restaurant / Food Service";
  const healthScore = audit.score?.breakdown || audit.businessHealthScore;
  const isPlacesBreakdown = Boolean(audit.score?.breakdown?.availableWeight !== undefined);
  const executiveIssues = isPlacesBreakdown
    ? audit.score.breakdown.prioritizedIssues.filter((issue) => fullReportUnlocked || isFreePlacesIssue(issue)).slice(0, 2)
    : [];
  const lowestCategories = isPlacesBreakdown ? [] : [...audit.score.categories].sort((a, b) => a.points / a.max - b.points / b.max).slice(0, 2);
  const weakestMeasuredPlaceCategory = isPlacesBreakdown
    ? audit.score.breakdown.categories.filter((category) => category.status === "measured").sort((a, b) => a.score - b.score)[0]
    : null;
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const payload = encodeAuditForUrl({ ...audit, preparerName: reportPreparer });
    return `${window.location.origin}${window.location.pathname}?report=${payload}`;
  }, [audit, reportPreparer]);

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopyStatus("Copied");
    window.setTimeout(() => setCopyStatus("Copy Share Link"), 1600);
  }

  async function copySummary() {
    const summary = buildReportSummary(audit);
    await navigator.clipboard.writeText(summary);
    setSummaryStatus("Summary copied");
    window.setTimeout(() => setSummaryStatus("Copy report summary"), 1600);
  }

  return (
    <article className="print-page mx-auto max-w-5xl overflow-hidden rounded-lg border border-line bg-surface shadow-soft">
      <div className="no-print grid gap-2 border-b border-line bg-paper px-4 py-4 sm:flex sm:justify-end sm:px-5">
        {!sharedMode && <button className="secondary-button w-full py-2 sm:w-auto" onClick={copyLink}>{copyStatus}</button>}
        <button className="secondary-button w-full py-2 sm:w-auto" onClick={copySummary}>{summaryStatus}</button>
        <button className="primary-button w-full py-2 sm:w-auto" onClick={() => window.print()}>Print / save PDF</button>
      </div>

      <header className="grid gap-5 border-b border-line p-5 sm:p-7 md:grid-cols-[1fr_240px] md:items-center">
        <div>
          <p className="eyebrow">Snapshot</p>
          <h2 className="mt-2 break-words text-3xl font-black tracking-tight text-ink sm:text-4xl">{audit.businessName}</h2>
          <p className="mt-2 text-base font-semibold text-slate-600">
            {audit.industry} in {audit.city} | Prepared {formatDate(audit.createdAt)}
          </p>
          <p className={`mt-5 max-w-3xl text-lg font-black sm:text-xl ${band.textClass}`}>{band.verdict}</p>
        </div>
        <div className={`w-full rounded-lg border-2 p-5 text-center sm:w-auto ${band.panelClass}`}>
          <div className="text-xs font-black uppercase tracking-[0.16em]">{BRAND}</div>
          <div className="mt-2 text-6xl font-black leading-none sm:text-7xl">{audit.score.total}</div>
          <div className="mt-1 text-sm font-black">out of 100 | {band.label}</div>
        </div>
      </header>

      <section className="grid border-b border-line md:grid-cols-3">
        <Insight label="Most urgent gap" value={audit.gaps[0]?.title ?? "No major gap found"} />
        <Insight label="Weakest category" value={weakestMeasuredPlaceCategory?.label ?? categoryLabels[lowestCategories[0]?.key]?.label ?? "None"} />
        <Insight label="Likely customer impact" value={isFoodBusiness ? "Lost orders and visits" : "Lost calls and quotes"} />
      </section>

      <section className="print-break-inside border-b border-line p-5 sm:p-7">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h3 className="text-2xl font-black text-ink">Executive Read</h3>
            <p className="mt-3 leading-7 text-slate-700">
              This report estimates how easy it is for a ready-to-buy customer to find, trust, and choose this business. The score is not about vanity. It is about whether the public details match what customers need at the moment they decide.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {isPlacesBreakdown
              ? executiveIssues.map((issue) => <PriorityIssueBox key={issue.id} issue={issue} />)
              : lowestCategories.map((category) => (
                  <PriorityBox key={category.key} label={categoryLabels[category.key].label} category={category} />
                ))}
          </div>
        </div>
      </section>

      {!isPlacesBreakdown && (
        <section className="print-break-inside grid gap-4 border-b border-line p-5 sm:p-7">
          <h3 className="text-2xl font-black text-ink">Category Breakdown</h3>
          {audit.score.categories.map((category) => (
            <ProgressRow key={category.key} category={category} label={categoryLabels[category.key].label} />
          ))}
        </section>
      )}

      {healthScore && <BusinessHealthSection healthScore={healthScore} fullReportUnlocked={fullReportUnlocked} />}

      {healthScore && !fullReportUnlocked && (
        <section className="print-break-inside border-b border-line p-5 sm:p-7">
          <LockedReportSection onUnlock={() => setFullReportUnlocked(true)} />
        </section>
      )}

      <section className="print-break-inside border-b border-line p-5 sm:p-7">
        <h3 className="text-2xl font-black text-ink">What Fixing This Looks Like</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <FixCard title="Accuracy cleanup" body={isFoodBusiness ? "Hours, phone, address, menu basics, prices, and ordering links checked across the places customers actually look." : "Hours, phone, address, service area, and offers checked across Google, the website, and major listings."} />
          <FixCard title="Google profile tune-up" body="Categories, services, photos, hours, descriptions, and trust signals cleaned up so the business looks active and easy to choose." />
          <FixCard title={isFoodBusiness ? "Ordering and photo lift" : "Conversion path lift"} body={isFoodBusiness ? "Delivery menus, item photos, online ordering, and catering inquiry paths tightened so more views turn into orders." : "Website calls-to-action, click-to-call, quote forms, review prompts, and response paths tightened so more visits turn into leads."} />
        </div>
      </section>

      <section className="print-break-inside border-b border-line bg-ink p-5 text-white sm:p-7">
        <div className="grid gap-5 md:grid-cols-[1fr_1.2fr] md:items-center">
          <div>
            <p className="eyebrow text-brand-soft">Suggested next step</p>
            <h3 className="mt-2 text-2xl font-black">Fix the top 3 visibility leaks first.</h3>
          </div>
          <p className="text-sm leading-6 text-slate-200">
            The fastest win is usually not a full rebuild. Start by correcting public info, tightening Google, improving the highest-friction contact/order path, and adding proof where customers already look.
          </p>
        </div>
      </section>

      <section className="print-break-inside border-b border-line bg-nested-surface p-5 sm:p-7">
        <div className="grid gap-5 rounded-xl border border-line bg-surface p-5 shadow-soft md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h3 className="text-2xl font-black text-ink">Want us to fix these issues?</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
              We can prepare a clearly scoped cleanup plan. No changes are made without your approval.
            </p>
          </div>
          <a className="primary-button w-full md:w-auto" href="mailto:hello@streetsignal.com?subject=Request%20cleanup%20plan">
            Request cleanup plan
          </a>
        </div>
      </section>

      <footer className="p-5 text-sm text-slate-700 sm:p-7">
        <p className="font-black text-ink">Prepared by {reportPreparer}</p>
        <p className="mt-1">A few focused improvements can turn more local searches into calls, orders, quote requests, and booked jobs.</p>
      </footer>
    </article>
  );
}

const PAID_PLACES_CATEGORY_KEYS = new Set(["contentFreshness", "aiVisibility"]);
const FREE_ONLINE_PRESENCE_METRIC_IDS = new Set(["websitePhone", "websiteAddress"]);
const PAID_ONLINE_PRESENCE_METRIC_IDS = new Set(["yelpPresence", "yelpName", "yelpAddress", "yelpPhone"]);

function isFreePlacesIssue(issue) {
  if (!issue?.id) return true;
  if (issue.id.startsWith("contentFreshness-") || issue.id.startsWith("aiVisibility-")) return false;
  if (!issue.id.startsWith("onlinePresence-")) return true;
  const metricId = issue.id.replace("onlinePresence-", "");
  return !PAID_ONLINE_PRESENCE_METRIC_IDS.has(metricId);
}

function toFreePlacesCategory(category) {
  if (PAID_PLACES_CATEGORY_KEYS.has(category.key)) return null;
  if (category.key !== "onlinePresence") return category;
  const metrics = category.metrics.filter((metric) => FREE_ONLINE_PRESENCE_METRIC_IDS.has(metric.id));
  return metrics.length ? { ...category, metrics } : null;
}

function isPaidLegacyCategory(category) {
  const key = category.key?.toLowerCase?.() || "";
  const label = category.label?.toLowerCase?.() || "";
  return key.includes("freshness") || key.includes("ai") || label.includes("content freshness") || label.includes("ai visibility");
}

function isPaidLegacyIssue(issue) {
  const combined = `${issue.id || ""} ${issue.category || ""} ${issue.title || ""}`.toLowerCase();
  return combined.includes("freshness") || combined.includes("ai visibility") || combined.includes("yelp") || combined.includes("bing") || combined.includes("apple maps") || combined.includes("facebook");
}

function LockedReportSection({ onUnlock }) {
  return (
    <div className="rounded-xl border border-brand/30 bg-brand-soft p-5 shadow-soft">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.14em] text-brand">Locked full scan</div>
          <h4 className="mt-2 text-2xl font-black text-ink">Unlock the full scan</h4>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
            Get secondary listings, content freshness, and the complete cross-source action plan.
          </p>
        </div>
        <button type="button" className="primary-button w-full sm:w-auto" onClick={onUnlock}>
          Unlock Full Report — $19
        </button>
      </div>
    </div>
  );
}

function PlacesHealthSection({ breakdown, fullReportUnlocked }) {
  const [checkView, setCheckView] = useState("all");
  const showAllChecks = checkView === "all";
  const visibleCategories = fullReportUnlocked ? breakdown.categories : breakdown.categories.map(toFreePlacesCategory).filter(Boolean);
  const issueMetricIds = useMemo(
    () => new Set((breakdown.prioritizedIssues || []).filter((issue) => fullReportUnlocked || isFreePlacesIssue(issue)).map((issue) => issue.id)),
    [breakdown.prioritizedIssues, fullReportUnlocked]
  );
  const displayedCategories = showAllChecks
    ? visibleCategories
    : visibleCategories.filter((category) => category.metrics.some((metric) => issueMetricIds.has(`${category.key}-${metric.id}`)));
  const visiblePrioritizedIssues = (breakdown.prioritizedIssues || []).filter((issue) => fullReportUnlocked || isFreePlacesIssue(issue));

  return (
    <section className="print-break-inside border-b border-line p-5 sm:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Business Health Score</p>
          <h3 className="mt-2 text-2xl font-black text-ink">Google Places scan</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
            Your score is based on the checks StreetSignal could complete. Any unavailable checks are identified separately and do not automatically lower the score.
          </p>
          {breakdown.hasScanError && (
            <p className="mt-3 text-xs font-bold leading-5 text-slate-500">
              {breakdown.scanErrors.join(", ")} could not run this time. The score above reflects every other completed check.
            </p>
          )}
        </div>
        <div className="rounded-lg border border-line bg-nested-surface p-4 text-left sm:text-right">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Overall score</div>
          <div className="mt-1 text-3xl font-black text-ink">{breakdown.overallScore ?? 0}/100</div>
          <div className="mt-1 text-xs font-bold text-slate-500">Checks completed: {breakdown.availableWeight}%</div>
        </div>
      </div>

      <div className="no-print mt-5 flex flex-col gap-3 rounded-lg border border-line bg-nested-surface p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-bold text-slate-700">Detailed checks view</p>
        <div className="grid gap-2 sm:inline-grid sm:grid-cols-2">
          <button
            type="button"
            className={checkToggleClass(!showAllChecks)}
            aria-pressed={!showAllChecks}
            onClick={() => setCheckView("issues")}
          >
            Show issues only
          </button>
          <button
            type="button"
            className={checkToggleClass(showAllChecks)}
            aria-pressed={showAllChecks}
            onClick={() => setCheckView("all")}
          >
            Show all checks
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {displayedCategories.map((category) => <PlacesCategoryCard key={category.key} category={category} issueMetricIds={issueMetricIds} showAllChecks={showAllChecks} />)}
        {!showAllChecks && displayedCategories.length === 0 && (
          <div className="rounded-lg border border-line bg-nested-surface p-4 text-sm font-bold leading-6 text-slate-700 lg:col-span-2">
            No issue checks were found in the detailed scan. Use “Show all checks” to review every available and unavailable check.
          </div>
        )}
      </div>

      {visiblePrioritizedIssues.length > 0 && (
        <div className="mt-5 rounded-lg border border-line bg-nested-surface p-4">
          <h4 className="font-black text-ink">{fullReportUnlocked ? "Prioritized next fixes" : "Free prioritized next fixes"}</h4>
          <div className="mt-3 grid gap-3">
            {visiblePrioritizedIssues.slice(0, 5).map((issue) => <PriorityIssueBox key={issue.id} issue={issue} />)}
          </div>
        </div>
      )}
    </section>
  );
}

function PlacesCategoryCard({ category, issueMetricIds, showAllChecks }) {
  const measured = category.status === "measured";
  const unavailable = category.status === "scan_unavailable";
  const band = measured ? bandForScore(category.score) : null;
  const statusText = measured ? "Completed check" : unavailable ? "Unavailable - could not run this check" : "Not included in this checkup";
  const scoreText = measured ? category.score : unavailable ? "Unavailable" : "Pending";
  const scoreClass = measured ? `text-2xl font-black ${band.textClass}` : unavailable ? "text-sm font-black text-signal-amber" : "text-sm font-black text-slate-500";
  const issueMetrics = category.metrics.filter((metric) => issueMetricIds.has(`${category.key}-${metric.id}`));
  const availableNonIssueMetrics = category.metrics.filter((metric) => typeof metric.score === "number" && !issueMetricIds.has(`${category.key}-${metric.id}`));
  const unavailableMetrics = category.metrics.filter((metric) => metric.score === null);
  const visibleMetrics = showAllChecks ? [...issueMetrics, ...availableNonIssueMetrics] : issueMetrics;

  return (
    <div className="rounded-lg border border-line bg-surface p-4 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="font-black text-ink">{category.label}</h4>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            {statusText}
          </p>
        </div>
        <span className={scoreClass}>
          {scoreText}
        </span>
      </div>
      {measured && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className={`h-full rounded-full ${band.fillClass}`} style={{ width: `${category.score}%` }} />
        </div>
      )}
      <div className="mt-3 grid gap-2">
        {visibleMetrics.map((metric) => (
          <div key={metric.id} className="min-w-0 rounded-md border border-line bg-nested-surface p-3 text-sm leading-5 text-slate-700">
            <div className="font-black text-ink">{metric.label}</div>
            <div className="mt-1 break-words">{metric.score === null ? "Not available from this checkup" : `${metric.score}/100`} - {metric.note}</div>
          </div>
        ))}
        {showAllChecks && unavailableMetrics.length > 0 && (
          <details className="rounded-md border border-line bg-nested-surface p-3 text-sm leading-5 text-slate-700">
            <summary className="cursor-pointer font-black text-ink">Unavailable checks ({unavailableMetrics.length})</summary>
            <div className="mt-3 grid gap-2">
              {unavailableMetrics.map((metric) => (
                <div key={metric.id} className="rounded-md border border-line bg-surface p-3">
                  <div className="font-black text-ink">{metric.label}</div>
                  <div className="mt-1 break-words">Not available from this checkup - {metric.note}</div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

function checkToggleClass(active) {
  return [
    "rounded-md border px-4 py-2 text-sm font-black transition",
    active ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink hover:border-brand hover:text-brand"
  ].join(" ");
}

function PriorityIssueBox({ issue }) {
  return (
    <div className="rounded-lg border border-line bg-nested-surface p-4">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{issue.impact} impact</div>
      <div className="mt-2 font-black text-ink">{issue.title}</div>
      <p className="mt-1 text-sm leading-6 text-slate-700">{issue.suggestedFix}</p>
    </div>
  );
}
function BusinessHealthSection({ healthScore, fullReportUnlocked }) {
  if (healthScore.availableWeight !== undefined) return <PlacesHealthSection breakdown={healthScore} fullReportUnlocked={fullReportUnlocked} />;

  const visibleCategories = fullReportUnlocked ? healthScore.categories : healthScore.categories.filter((category) => !isPaidLegacyCategory(category));
  const freeIssues = (healthScore.prioritizedIssues || []).filter((issue) => fullReportUnlocked || !isPaidLegacyIssue(issue));

  return (
    <section className="print-break-inside border-b border-line p-5 sm:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Business Health Score</p>
          <h3 className="mt-2 text-2xl font-black text-ink">Multi-dimensional visibility read</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
            The score blends accuracy, discovery, website, freshness, customer trust, AI visibility, and technical health. Unknown data lowers confidence instead of being treated as a confirmed pass.
          </p>
        </div>
        <div className="rounded-lg border border-line bg-nested-surface p-4 text-left sm:text-right">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Confidence</div>
          <div className="mt-1 text-3xl font-black text-ink">{healthScore.confidence}%</div>
        </div>
      </div>

      {healthScore.warnings?.length > 0 && (
        <div className="mt-4 rounded-lg border border-line bg-nested-surface p-4 text-sm leading-6 text-slate-700">
          <p className="font-black text-ink">Score notes</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {healthScore.warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {visibleCategories.map((category) => <HealthCategoryCard key={category.key} category={category} />)}
      </div>

      {freeIssues.length > 0 && (
        <div className="mt-5 rounded-lg border border-line bg-nested-surface p-4">
          <h4 className="font-black text-ink">{fullReportUnlocked ? "Prioritized next fixes" : "Free prioritized next fixes"}</h4>
          <div className="mt-3 grid gap-3">
            {freeIssues.slice(0, 5).map((issue) => (
              <div key={issue.id} className="grid gap-2 border-t border-line pt-3 first:border-t-0 first:pt-0 md:grid-cols-[1fr_auto]">
                <div>
                  <p className="font-black text-ink">{issue.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{issue.suggestedFix}</p>
                </div>
                <div className="text-sm font-black text-slate-700 md:text-right">
                  <p>{issue.impact} impact</p>
                  <p className="text-brand">+{issue.estimatedImpact} pts</p>
                  <p className="text-xs text-slate-500">{issue.difficulty} | {issue.timeEstimate}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function HealthCategoryCard({ category }) {
  const band = bandForScore(category.score);

  return (
    <div className="rounded-lg border border-line bg-surface p-4 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="font-black text-ink">{category.label}</h4>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            Weight {category.effectiveWeight}% | Confidence {category.confidence}%
          </p>
        </div>
        <span className={`text-2xl font-black ${band.textClass}`}>{category.score}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${band.fillClass}`} style={{ width: `${category.score}%` }} />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {category.subScores.map((subScore) => (
          <div key={subScore.key} className="rounded-md border border-line bg-nested-surface p-3">
            <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{subScore.label}</div>
            <div className="mt-1 font-black text-ink">{subScore.score}/100</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function Insight({ label, value }) {
  return (
    <div className="border-b border-line p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-black leading-5 text-ink">{value}</div>
    </div>
  );
}

function PriorityBox({ label, category }) {
  return (
    <div className="rounded-lg border border-line bg-paper p-4">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Priority</div>
      <div className="mt-2 font-black text-ink">{label}</div>
      <div className="mt-1 text-sm font-bold text-signal-red">{category.points}/{category.max} points</div>
    </div>
  );
}

function ProgressRow({ category, label }) {
  const percentage = Math.round((category.points / category.max) * 100);
  const band = bandForScore(percentage);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-black text-ink">{label}</span>
        <span className="text-sm font-black text-slate-700">{category.points}/{category.max}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${band.fillClass}`} style={{ width: `${percentage}%` }} aria-label={`${percentage}%`} />
      </div>
    </div>
  );
}

function FixCard({ title, body }) {
  return (
    <div className="rounded-lg border border-line p-4">
      <h4 className="font-black text-ink">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-slate-700">{body}</p>
    </div>
  );
}

function buildReportSummary(audit) {
  const lines = [
    `${audit.businessName} — ${BRAND} checkup`,
    `Score: ${audit.score.total}/100`,
    `Prepared: ${formatDate(audit.createdAt)}`,
    "",
    "Top findings:"
  ];
  audit.gaps.slice(0, 3).forEach((gap, index) => {
    lines.push(`${index + 1}. ${gap.title} — ${gap.body}`);
  });
  const nextFix = audit.score?.breakdown?.prioritizedIssues?.[0]?.suggestedFix || audit.gaps[0]?.body || "Review the highest-impact public-facing issue first.";
  lines.push("", `Fix first: ${nextFix}`);
  return lines.join("\n");
}


