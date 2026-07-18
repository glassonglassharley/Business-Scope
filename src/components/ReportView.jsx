"use client";

import { useMemo, useState } from "react";
import { bandForScore, formatDate } from "@/lib/scoring";
import { getScoringCategories } from "@/lib/scoringConfig";
import { encodeAuditForUrl } from "@/lib/shareLinks";
import { BRAND } from "@/lib/brand";

export function ReportView({ audit, preparerName, prospectMode = false }) {
  const [copyStatus, setCopyStatus] = useState("Copy Share Link");
  const band = bandForScore(audit.score.total);
  const reportPreparer = preparerName || BRAND;
  const categoryLabels = getScoringCategories(audit);
  const isFoodBusiness = audit.industry === "Restaurant / Food Service";
  const healthScore = audit.score?.breakdown || audit.businessHealthScore;
  const isPlacesBreakdown = Boolean(audit.score?.breakdown?.availableWeight !== undefined);
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

  return (
    <article className="print-page mx-auto max-w-5xl overflow-hidden rounded-lg border border-line bg-surface shadow-soft">
      <div className="no-print grid gap-2 border-b border-line bg-paper px-4 py-4 sm:flex sm:justify-end sm:px-5">
        {!prospectMode && <button className="secondary-button w-full py-2 sm:w-auto" onClick={copyLink}>{copyStatus}</button>}
        <button className="primary-button w-full py-2 sm:w-auto" onClick={() => window.print()}>Export PDF</button>
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
          {audit.score?.breakdown?.hasScanError && <p className="mt-3 text-xs font-bold leading-5">Provisional: one check could not run this time.</p>}
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
              ? audit.score.breakdown.prioritizedIssues.slice(0, 2).map((issue) => <PriorityIssueBox key={issue.id} issue={issue} />)
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

      {healthScore && <BusinessHealthSection healthScore={healthScore} />}

      <section className="print-break-inside border-b border-line p-5 sm:p-7">
        <h3 className="text-2xl font-black text-ink">Top Gaps Costing Customers</h3>
        <div className="mt-4 grid gap-3">
          {audit.gaps.map((gap, index) => (
            <div key={gap.id} className="rounded-lg border border-line bg-paper p-4">
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-signal-red text-sm font-black text-white">{index + 1}</span>
                <div>
                  <h4 className="font-black text-ink">{gap.title}</h4>
                  <p className="mt-1 text-sm leading-6 text-slate-700">{gap.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

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

      <footer className="p-5 text-sm text-slate-700 sm:p-7">
        <p className="font-black text-ink">Prepared by {reportPreparer}</p>
        <p className="mt-1">A few focused improvements can turn more local searches into calls, orders, quote requests, and booked jobs.</p>
      </footer>
    </article>
  );
}

function PlacesHealthSection({ breakdown }) {
  return (
    <section className="print-break-inside border-b border-line p-5 sm:p-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Business Health Score</p>
          <h3 className="mt-2 text-2xl font-black text-ink">Google Places scan</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
            This score uses measured scanner results. Categories without a real scanner are marked not yet measured; scanner outages are marked separately so the score is clear when provisional.
          </p>
          {breakdown.hasScanError && (
            <p className="mt-3 rounded-md border border-signal-amber/40 bg-signal-amber/10 p-3 text-sm font-bold leading-6 text-slate-700">
              Provisional score: {breakdown.scanErrors.join(", ")} could not run this time.
            </p>
          )}
        </div>
        <div className="rounded-lg border border-line bg-nested-surface p-4 text-left sm:text-right">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Overall score</div>
          <div className="mt-1 text-3xl font-black text-ink">{breakdown.overallScore ?? 0}/100</div>
          <div className="mt-1 text-xs font-bold text-slate-500">Measured coverage: {breakdown.availableWeight}/100</div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {breakdown.categories.map((category) => <PlacesCategoryCard key={category.key} category={category} />)}
      </div>

      {breakdown.prioritizedIssues?.length > 0 && (
        <div className="mt-5 rounded-lg border border-line bg-nested-surface p-4">
          <h4 className="font-black text-ink">Prioritized next fixes</h4>
          <div className="mt-3 grid gap-3">
            {breakdown.prioritizedIssues.slice(0, 5).map((issue) => <PriorityIssueBox key={issue.id} issue={issue} />)}
          </div>
        </div>
      )}
    </section>
  );
}

function PlacesCategoryCard({ category }) {
  const measured = category.status === "measured";
  const unavailable = category.status === "scan_unavailable";
  const band = measured ? bandForScore(category.score) : null;
  const statusText = measured ? `Weight ${category.weight}% after renormalization` : unavailable ? "Scan unavailable - could not run this check" : "Not yet measured";
  const scoreText = measured ? category.score : unavailable ? "Unavailable" : "Pending";
  const scoreClass = measured ? `text-2xl font-black ${band.textClass}` : unavailable ? "text-sm font-black text-signal-amber" : "text-sm font-black text-slate-500";

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
        {category.metrics.map((metric) => (
          <div key={metric.id} className="min-w-0 rounded-md border border-line bg-nested-surface p-3 text-sm leading-5 text-slate-700">
            <div className="font-black text-ink">{metric.label}</div>
            <div className="mt-1 break-words">{metric.score === null ? "Not available from this scan" : `${metric.score}/100`} - {metric.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
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
function BusinessHealthSection({ healthScore }) {
  if (healthScore.availableWeight !== undefined) return <PlacesHealthSection breakdown={healthScore} />;

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
        {healthScore.categories.map((category) => <HealthCategoryCard key={category.key} category={category} />)}
      </div>

      {healthScore.prioritizedIssues?.length > 0 && (
        <div className="mt-5 rounded-lg border border-line bg-nested-surface p-4">
          <h4 className="font-black text-ink">Prioritized next fixes</h4>
          <div className="mt-3 grid gap-3">
            {healthScore.prioritizedIssues.slice(0, 5).map((issue) => (
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


