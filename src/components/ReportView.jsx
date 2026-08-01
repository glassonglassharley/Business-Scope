"use client";

import { useMemo, useState } from "react";
import { bandForScore } from "@/lib/scoring";
import { getScoringCategories } from "@/lib/scoringConfig";
import { encodeAuditForUrl } from "@/lib/shareLinks";
import { BRAND } from "@/lib/brand";
import { buildReportSummary, createReportViewModel } from "@/lib/reportViewModel";
import { ScoreMethodology } from "@/components/ScoreMethodology";
import { ThorostLogo } from "@/components/ThorostLogo";

export function ReportView({ audit: auditInput, preparerName, sharedMode = false }) {
  const audit = useMemo(() => createReportViewModel(auditInput), [auditInput]);
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
  const visiblePrioritizedFixes = (healthScore?.prioritizedIssues || [])
    .filter((issue) => fullReportUnlocked || (isPlacesBreakdown ? isFreePlacesIssue(issue) : !isPaidLegacyIssue(issue)))
    .slice(0, 5);
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
    <article className="print-page mx-auto max-w-[1240px] overflow-hidden rounded-xl border border-[#ded8cc] bg-[#fbfaf7] shadow-[0_22px_70px_rgba(28,25,23,0.10)] [overflow-wrap:anywhere]">
      <style jsx global>{`
        @media print {
          @page {
            margin: 0.45in;
          }

          html,
          body {
            background: #fffdfa !important;
          }

          * {
            box-shadow: none !important;
            text-shadow: none !important;
            overflow-wrap: anywhere;
            word-break: normal;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          .no-print {
            display: none !important;
          }

          .print-page {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            background: #fffdfa !important;
            overflow: visible !important;
          }

          .print-page section,
          .print-page header,
          .print-page footer {
            padding: 18px 0 !important;
            border-color: #d8d1c4 !important;
            background: #fffdfa !important;
          }

          .print-page h1 {
            font-size: 34px !important;
            line-height: 1.08 !important;
          }

          .print-page h2 {
            font-size: 22px !important;
            line-height: 1.2 !important;
          }

          .print-page p,
          .print-page li,
          .print-page div {
            color: #1c1917;
          }

          .print-page .grid {
            gap: 10px !important;
          }

          .print-break-inside,
          .print-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }

          .print-page aside,
          .print-page article,
          .print-page details,
          .print-page [class*="rounded"] {
            border-color: #d8d1c4 !important;
          }

          .print-page [class*="bg-[#183b29]"] {
            background: #fffdfa !important;
            border-left: 5px solid #1f4d33 !important;
            color: #1c1917 !important;
          }

          .print-page [class*="bg-[#183b29]"] * {
            color: #1c1917 !important;
          }

          .print-page [class*="absolute"] {
            display: none !important;
          }
        }
      `}</style>
      <div className="no-print flex flex-col gap-3 border-b border-[#e2dccf] bg-[#fbfaf7]/95 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <ThorostLogo className="h-8 w-auto" />
          <span className="text-xs font-black uppercase tracking-[0.18em] text-[#1f4d33]">Report</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:flex lg:justify-end">
          {!sharedMode && <button className="secondary-button border-[#d8d1c4] bg-white py-2 hover:border-[#1f4d33] hover:text-[#1f4d33]" onClick={copyLink}>{copyStatus}</button>}
          <button className="secondary-button border-[#d8d1c4] bg-white py-2 hover:border-[#1f4d33] hover:text-[#1f4d33]" onClick={copySummary}>{summaryStatus}</button>
          <button className="primary-button bg-[#1f4d33] py-2 hover:bg-[#173b27]" onClick={() => window.print()}>Print / Save PDF</button>
        </div>
      </div>

      <header className="print-break-inside border-b border-[#e2dccf] bg-[#fbfaf7] p-5 sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-stretch">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#1f4d33]">Snapshot</p>
            <h1 className="mt-3 break-words text-3xl font-black leading-[1.08] tracking-[-0.035em] text-[#1c1917] [overflow-wrap:anywhere] sm:text-5xl lg:text-6xl">{audit.businessName}</h1>
            <p className="mt-4 break-words text-base font-bold leading-7 text-stone-600 [overflow-wrap:anywhere]">
              {audit.industry} in {audit.city} · Prepared {audit.reportDateLabel}
            </p>
            <p className="mt-6 max-w-3xl text-lg font-black leading-8 text-[#1f4d33] sm:text-xl">{band.verdict}</p>
          </div>
          <ScoreCard score={audit.score.total} label={band.label} />
        </div>
      </header>

      <section className="grid gap-3 border-b border-[#e2dccf] bg-[#f5f1e8] p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4">
        <Insight icon="!" label="Most Urgent Gap" value={audit.gaps[0]?.title ?? "No major gap found"} />
        <Insight icon="▣" label="Weakest Category" value={weakestMeasuredPlaceCategory?.label ?? categoryLabels[lowestCategories[0]?.key]?.label ?? "None"} />
        <Insight icon="↗" label="Likely Customer Impact" value={isFoodBusiness ? "Lost orders and visits" : "Lost calls and quotes"} />
        <Insight icon="◷" label="Report Date" value={audit.reportDateLabel} />
      </section>

      <section className="print-break-inside border-b border-[#e2dccf] bg-white p-5 sm:p-8 lg:p-10">
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <div className="flex items-center gap-3">
              <IconMark>§</IconMark>
              <h2 className="text-2xl font-black tracking-tight text-[#1c1917] sm:text-3xl">Executive Read</h2>
            </div>
            <p className="mt-4 leading-7 text-stone-600">
              This report estimates how easy it is for a ready-to-buy customer to find, trust, and choose this business. The score is not about vanity. It is about whether the public details match what customers need at the moment they decide.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {isPlacesBreakdown
              ? executiveIssues.map((issue) => <PriorityIssueBox key={issue.id} issue={issue} />)
              : lowestCategories.map((category) => (
                  <PriorityBox key={category.key} label={categoryLabels[category.key]?.label ?? category.label ?? "Not available"} category={category} />
                ))}
          </div>
        </div>
      </section>

      {visiblePrioritizedFixes.length > 0 && (
        <section className="print-break-inside border-b border-[#e2dccf] bg-[#fbfaf7] p-5 sm:p-8 lg:p-10">
          <SectionHeader kicker="Action plan" title={fullReportUnlocked ? "Prioritized Next Fixes" : "Free Prioritized Next Fixes"} />
          <div className="mt-5 overflow-hidden rounded-xl border border-[#e0d9cc] bg-white">
            {visiblePrioritizedFixes.map((issue) => <PrioritizedFixRow key={issue.id} issue={issue} />)}
          </div>
        </section>
      )}

      {!isPlacesBreakdown && (
        <section className="print-break-inside grid gap-4 border-b border-[#e2dccf] bg-white p-5 sm:p-8 lg:p-10">
          <SectionHeader kicker="Diagnostic categories" title="Category Breakdown" />
          {audit.score.categories.map((category) => (
            <ProgressRow key={category.key} category={category} label={categoryLabels[category.key]?.label ?? category.label ?? "Not available"} />
          ))}
        </section>
      )}

      {healthScore && <BusinessHealthSection healthScore={healthScore} fullReportUnlocked={fullReportUnlocked} />}

      {healthScore && !fullReportUnlocked && (
        <section className="print-break-inside border-b border-[#e2dccf] bg-[#fbfaf7] p-5 sm:p-8 lg:p-10">
          <LockedReportSection onUnlock={() => setFullReportUnlocked(true)} />
        </section>
      )}

      <section className="print-break-inside border-b border-[#e2dccf] bg-white p-5 sm:p-8 lg:p-10">
        <SectionHeader kicker="Fix outcomes" title="What Fixing This Looks Like" />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <FixCard title="Accuracy cleanup" body={isFoodBusiness ? "Hours, phone, address, menu basics, prices, and ordering links checked across the places customers actually look." : "Hours, phone, address, service area, and offers checked across Google, the website, and major listings."} />
          <FixCard title="Google profile tune-up" body="Categories, services, photos, hours, descriptions, and trust signals cleaned up so the business looks active and easy to choose." />
          <FixCard title={isFoodBusiness ? "Ordering and photo lift" : "Conversion path lift"} body={isFoodBusiness ? "Delivery menus, item photos, online ordering, and catering inquiry paths tightened so more views turn into orders." : "Website calls-to-action, click-to-call, quote forms, review prompts, and response paths tightened so more visits turn into leads."} />
        </div>
      </section>

      <section className="print-break-inside relative overflow-hidden border-b border-[#e2dccf] bg-[#183b29] p-5 text-white sm:p-8 lg:p-10">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border border-white/10" aria-hidden="true" />
        <div className="absolute -right-8 top-10 h-32 w-32 rounded-full border border-white/10" aria-hidden="true" />
        <div className="relative grid gap-5 md:grid-cols-[0.95fr_1.05fr] md:items-center">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#f2c276]">Suggested Next Step</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Fix the top 3 visibility leaks first.</h2>
          </div>
          <p className="text-sm leading-7 text-stone-100">
            The fastest win is usually not a full rebuild. Start by correcting public info, tightening Google, improving the highest-friction contact/order path, and adding proof where customers already look.
          </p>
        </div>
      </section>

      <section className="print-break-inside border-b border-[#e2dccf] bg-[#f5f1e8] p-5 sm:p-8 lg:p-10">
        <div className="grid gap-5 rounded-xl border border-[#e0d9cc] bg-white p-5 shadow-[0_16px_40px_rgba(28,25,23,0.07)] md:grid-cols-[1fr_auto] md:items-center md:p-6">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-[#1c1917] sm:text-3xl">Want us to fix these issues?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
              We can prepare a clearly scoped cleanup plan. No changes are made without your approval.
            </p>
          </div>
          <a className="primary-button no-print w-full bg-[#1f4d33] hover:bg-[#173b27] md:w-auto" href="mailto:hello@thorost.com?subject=Request%20cleanup%20plan">
            Request cleanup plan
          </a>
        </div>
      </section>

      <footer className="bg-[#fbfaf7] p-5 text-sm text-stone-600 sm:p-8 lg:p-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ThorostLogo className="h-8 w-auto" />
          <p className="font-black text-[#1c1917]">Prepared by {reportPreparer}</p>
        </div>
        <p className="mt-4 max-w-3xl">A few focused improvements can turn more local searches into calls, orders, quote requests, and booked jobs.</p>
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
    <div className="print-avoid rounded-xl border border-[#d9c393] bg-[#fff8e7] p-5 shadow-[0_12px_30px_rgba(28,25,23,0.06)]">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.14em] text-[#9a5b07]">Locked full scan</div>
          <h4 className="mt-2 text-2xl font-black text-ink">Unlock the full scan</h4>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            Get secondary listings, content freshness, and the complete cross-source action plan.
          </p>
        </div>
        <button type="button" className="primary-button no-print w-full bg-[#1f4d33] hover:bg-[#173b27] sm:w-auto" onClick={onUnlock}>
          Unlock Full Report — $19
        </button>
      </div>
    </div>
  );
}


function ScoreCard({ score, label }) {
  return (
    <aside className="print-avoid flex h-full min-h-52 flex-col justify-between rounded-xl border border-[#d8d1c4] bg-white p-5 text-center shadow-[0_18px_46px_rgba(28,25,23,0.08)] sm:min-h-64 sm:p-6 lg:text-left" aria-label={`${BRAND} score ${score} out of 100, ${label}`}>
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-stone-500">{BRAND} score</p>
        <div className="mt-5 flex items-end justify-center gap-2 lg:justify-start">
          <span className="text-6xl font-black leading-none tracking-[-0.05em] text-[#1c1917] sm:text-7xl">{score}</span>
          <span className="mb-2 text-xl font-black text-stone-400">/100</span>
        </div>
      </div>
      <div className="mt-6 border-t border-[#e2dccf] pt-4">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-stone-500">Current rating</p>
        <p className="mt-1 text-2xl font-black text-[#1f4d33]">{label}</p>
      </div>
    </aside>
  );
}

function IconMark({ children, tone = "green" }) {
  const toneClass = tone === "amber" ? "border-[#e1c27c] bg-[#fff8e7] text-[#9a5b07]" : "border-[#c7d5c9] bg-[#eef5ee] text-[#1f4d33]";
  return (
    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm font-black ${toneClass}`} aria-hidden="true">
      {children}
    </span>
  );
}

function SectionHeader({ kicker, title }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#1f4d33]">{kicker}</p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-[#1c1917] sm:text-3xl">{title}</h2>
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

  return (
    <section className="print-break-inside border-b border-[#e2dccf] bg-white p-5 sm:p-8 lg:p-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#1f4d33]">Business Health Score</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-[#1c1917] sm:text-3xl">Google Places scan</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
            Your score is based on the checks Thorost could complete. Any unavailable checks are identified separately and do not automatically lower the score.
          </p>
          {breakdown.hasScanError && (
            <p className="mt-3 text-xs font-bold leading-5 text-stone-500">
              {breakdown.scanErrors.join(", ")} could not run this time. The score above reflects every other completed check.
            </p>
          )}
        </div>
        <div className="rounded-xl border border-[#d8d1c4] bg-[#fbfaf7] p-4 text-left sm:text-right">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">Overall score</div>
          <div className="mt-1 text-3xl font-black text-ink">{breakdown.overallScore ?? 0}/100</div>
          <div className="mt-1 text-xs font-bold text-stone-500">Checks completed: {breakdown.availableWeight}%</div>
        </div>
      </div>

      <ScoreMethodology />

      <div className="no-print mt-5 flex flex-col gap-3 rounded-xl border border-[#e0d9cc] bg-[#fbfaf7] p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-bold text-stone-600">Detailed checks view</p>
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

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {displayedCategories.map((category) => <PlacesCategoryCard key={category.key} category={category} issueMetricIds={issueMetricIds} showAllChecks={showAllChecks} />)}
        {!showAllChecks && displayedCategories.length === 0 && (
          <div className="rounded-lg border border-line bg-nested-surface p-4 text-sm font-bold leading-6 text-stone-600 lg:col-span-2">
            No issue checks were found in the detailed scan. Use “Show all checks” to review every available and unavailable check.
          </div>
        )}
      </div>
    </section>
  );
}

function PlacesCategoryCard({ category, issueMetricIds, showAllChecks }) {
  const hasNumericScore = typeof category.score === "number" && Number.isFinite(category.score);
  const measured = category.status === "measured" && hasNumericScore;
  const unavailable = category.status === "scan_unavailable";
  const band = measured ? bandForScore(category.score) : null;
  const statusText = measured ? "Completed check" : unavailable ? "Unavailable - could not run this check" : "Not included in this checkup";
  const scoreText = measured ? category.score : unavailable || !hasNumericScore ? "Unavailable" : "Pending";
  const scoreClass = measured ? `text-2xl font-black ${band.textClass}` : unavailable ? "text-sm font-black text-signal-amber" : "text-sm font-black text-stone-500";
  const issueMetrics = category.metrics.filter((metric) => issueMetricIds.has(`${category.key}-${metric.id}`));
  const availableNonIssueMetrics = category.metrics.filter((metric) => typeof metric.score === "number" && !issueMetricIds.has(`${category.key}-${metric.id}`));
  const unavailableMetrics = category.metrics.filter((metric) => metric.score === null);
  const visibleMetrics = showAllChecks ? [...issueMetrics, ...availableNonIssueMetrics] : issueMetrics;

  return (
    <div className="print-avoid rounded-xl border border-[#e0d9cc] bg-white p-4 shadow-[0_14px_36px_rgba(28,25,23,0.06)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="break-words font-black text-ink [overflow-wrap:anywhere]">{category.label}</h4>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-stone-500">
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
          <div key={metric.id} className="print-avoid min-w-0 rounded-lg border border-[#e7dfd2] bg-[#fbfaf7] p-3 text-sm leading-5 text-stone-600 [overflow-wrap:anywhere]">
            <div className="break-words font-black text-ink [overflow-wrap:anywhere]">{metric.label}</div>
            <div className="mt-1 break-words">{metric.score === null ? "Not available from this checkup" : `${metric.score}/100`} - {metric.note}</div>
          </div>
        ))}
        {showAllChecks && unavailableMetrics.length > 0 && (
          <details className="rounded-lg border border-[#e7dfd2] bg-[#fbfaf7] p-3 text-sm leading-5 text-stone-600">
            <summary className="cursor-pointer font-black text-ink">Unavailable checks ({unavailableMetrics.length})</summary>
            <div className="mt-3 grid gap-2">
              {unavailableMetrics.map((metric) => (
                <div key={metric.id} className="print-avoid rounded-lg border border-[#e7dfd2] bg-white p-3 [overflow-wrap:anywhere]">
                  <div className="break-words font-black text-ink [overflow-wrap:anywhere]">{metric.label}</div>
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
    "rounded-md border px-4 py-2 text-sm font-black transition focus:outline-none focus:ring-2 focus:ring-[#1f4d33]/25",
    active ? "border-[#1f4d33] bg-[#1f4d33] text-white" : "border-[#d8d1c4] bg-white text-ink hover:border-[#1f4d33] hover:text-[#1f4d33]"
  ].join(" ");
}

function PriorityIssueBox({ issue }) {
  return (
    <div className="print-avoid rounded-xl border border-[#e0d9cc] bg-[#fbfaf7] p-4 shadow-[0_12px_30px_rgba(28,25,23,0.05)]">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-[#9a5b07]">{issue.impact} impact</div>
      <div className="mt-2 break-words font-black text-ink [overflow-wrap:anywhere]">{issue.title}</div>
      <p className="mt-1 break-words text-sm leading-6 text-stone-600 [overflow-wrap:anywhere]">{issue.suggestedFix}</p>
    </div>
  );
}

function PrioritizedFixRow({ issue }) {
  const highImpact = issue.impact?.toLowerCase?.() === "high" || issue.impact?.toLowerCase?.() === "critical";
  return (
    <div className="print-avoid group grid gap-4 border-b border-[#e0d9cc] p-4 transition last:border-b-0 hover:bg-[#fff8e7] focus-within:bg-[#fff8e7] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-5">
      <IconMark tone="amber">!</IconMark>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {highImpact && <span className="rounded-full border border-[#e1c27c] bg-[#fff8e7] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#9a5b07]">High impact</span>}
          {issue.impact && <span className="text-[10px] font-black uppercase tracking-[0.16em] text-stone-500">{issue.impact} impact</span>}
        </div>
        <h3 className="mt-2 break-words text-base font-black leading-6 text-[#1c1917] [overflow-wrap:anywhere]">{issue.title}</h3>
        <p className="mt-1 break-words text-sm leading-6 text-stone-600 [overflow-wrap:anywhere]">{issue.suggestedFix}</p>
        {(issue.estimatedImpact || issue.difficulty || issue.timeEstimate) && (
          <p className="mt-2 text-xs font-bold leading-5 text-stone-500">
            {issue.estimatedImpact ? `+${issue.estimatedImpact} pts` : null}{issue.estimatedImpact && (issue.difficulty || issue.timeEstimate) ? " · " : null}{issue.difficulty}{issue.difficulty && issue.timeEstimate ? " · " : null}{issue.timeEstimate}
          </p>
        )}
      </div>
      <span className="justify-self-end text-2xl font-black text-[#1f4d33] transition group-hover:translate-x-0.5" aria-hidden="true">›</span>
    </div>
  );
}
function BusinessHealthSection({ healthScore, fullReportUnlocked }) {
  if (healthScore.availableWeight !== undefined) return <PlacesHealthSection breakdown={healthScore} fullReportUnlocked={fullReportUnlocked} />;

  const visibleCategories = fullReportUnlocked ? healthScore.categories : healthScore.categories.filter((category) => !isPaidLegacyCategory(category));

  return (
    <section className="print-break-inside border-b border-[#e2dccf] bg-white p-5 sm:p-8 lg:p-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#1f4d33]">Business Health Score</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-[#1c1917] sm:text-3xl">Multi-dimensional visibility read</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
            The score blends accuracy, discovery, website, freshness, customer trust, AI visibility, and technical health. Unknown data lowers confidence instead of being treated as a confirmed pass.
          </p>
        </div>
        <div className="rounded-xl border border-[#d8d1c4] bg-[#fbfaf7] p-4 text-left sm:text-right">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-stone-500">Confidence</div>
          <div className="mt-1 text-3xl font-black text-ink">{healthScore.confidence}%</div>
        </div>
      </div>

      {healthScore.warnings?.length > 0 && (
        <div className="mt-4 rounded-lg border border-line bg-nested-surface p-4 text-sm leading-6 text-stone-600">
          <p className="font-black text-ink">Score notes</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {healthScore.warnings.map((warning) => <li key={warning}>{warning}</li>)}
          </ul>
        </div>
      )}

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {visibleCategories.map((category) => <HealthCategoryCard key={category.key} category={category} />)}
      </div>
    </section>
  );
}

function HealthCategoryCard({ category }) {
  const score = typeof category.score === "number" && Number.isFinite(category.score) ? category.score : 0;
  const band = bandForScore(score);

  return (
    <div className="print-avoid rounded-xl border border-[#e0d9cc] bg-white p-4 shadow-[0_14px_36px_rgba(28,25,23,0.06)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="break-words font-black text-ink [overflow-wrap:anywhere]">{category.label}</h4>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-stone-500">
            Weight {category.effectiveWeight ?? "Not available"}% | Confidence {category.confidence ?? "Not available"}%
          </p>
        </div>
        <span className={`text-2xl font-black ${band.textClass}`}>{typeof category.score === "number" ? category.score : "Not available"}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${band.fillClass}`} style={{ width: `${score}%` }} />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {category.subScores.map((subScore) => (
          <div key={subScore.key} className="print-avoid rounded-lg border border-[#e7dfd2] bg-[#fbfaf7] p-3 [overflow-wrap:anywhere]">
            <div className="break-words text-xs font-black uppercase tracking-[0.12em] text-stone-500 [overflow-wrap:anywhere]">{subScore.label}</div>
            <div className="mt-1 font-black text-ink">{subScore.score}/100</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function Insight({ icon, label, value }) {
  return (
    <div className="print-avoid rounded-xl border border-[#e0d9cc] bg-white p-4 shadow-[0_12px_30px_rgba(28,25,23,0.05)]">
      <div className="flex items-center gap-3">
        <IconMark>{icon}</IconMark>
        <div className="text-[11px] font-black uppercase tracking-[0.16em] text-stone-500">{label}</div>
      </div>
      <div className="mt-4 break-words text-sm font-black leading-6 text-ink [overflow-wrap:anywhere]">{value}</div>
    </div>
  );
}

function PriorityBox({ label, category }) {
  return (
    <div className="print-avoid rounded-xl border border-[#e0d9cc] bg-[#fbfaf7] p-4 shadow-[0_12px_30px_rgba(28,25,23,0.05)]">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-[#9a5b07]">Priority</div>
      <div className="mt-2 break-words font-black text-ink [overflow-wrap:anywhere]">{label}</div>
      <div className="mt-1 text-sm font-bold text-[#9a5b07]">{category.points}/{category.max} points</div>
    </div>
  );
}

function ProgressRow({ category, label }) {
  const percentage = category.max ? Math.round((category.points / category.max) * 100) : 0;
  const band = bandForScore(percentage);
  return (
    <div className="print-avoid">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="font-black text-ink">{label}</span>
        <span className="text-sm font-black text-stone-600">{category.points}/{category.max}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${band.fillClass}`} style={{ width: `${percentage}%` }} aria-label={`${percentage}%`} />
      </div>
    </div>
  );
}

function FixCard({ title, body }) {
  return (
    <div className="print-avoid rounded-xl border border-[#e0d9cc] bg-[#fbfaf7] p-5 shadow-[0_12px_30px_rgba(28,25,23,0.05)]">
      <IconMark>✓</IconMark>
      <h4 className="break-words font-black text-ink [overflow-wrap:anywhere]">{title}</h4>
      <p className="mt-2 break-words text-sm leading-6 text-stone-600 [overflow-wrap:anywhere]">{body}</p>
    </div>
  );
}


