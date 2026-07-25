import Link from "next/link";
import { bandForScore } from "@/lib/scoring";
import { BRAND } from "@/lib/brand";
import {
  SAMPLE_AVAILABLE_WEIGHT,
  SAMPLE_BUSINESS,
  SAMPLE_CATEGORIES,
  SAMPLE_PRIORITIZED_ISSUES,
  SAMPLE_SCORE_TOTAL
} from "@/lib/sampleReport";

/**
 * Mirrors ReportView.jsx's structure, category names, states, and single
 * locked-scan paywall pattern so a prospect sees the same report language
 * here as on their first real scan. Always renders the free (locked) view —
 * a fictional business has nothing real to unlock, so the unlock button
 * routes to the real checkup instead of toggling local state.
 */
export function SampleReport({ checkedDate }) {
  const band = bandForScore(SAMPLE_SCORE_TOTAL);
  const weakestCategory = [...SAMPLE_CATEGORIES].sort((a, b) => a.score - b.score)[0];

  return (
    <article id="sample-report" className="scroll-mt-24 overflow-hidden rounded-lg border border-line bg-surface shadow-soft">
      <header className="grid gap-5 border-b border-line p-5 sm:p-7 md:grid-cols-[1fr_240px] md:items-center">
        <div>
          <p className="eyebrow">Sample report · Fictional business</p>
          <h2 className="mt-2 break-words text-3xl font-black tracking-tight text-ink sm:text-4xl">{SAMPLE_BUSINESS.businessName}</h2>
          <p className="mt-2 text-base font-semibold text-slate-600">
            {SAMPLE_BUSINESS.industry} | {SAMPLE_BUSINESS.city} | Checked {checkedDate}
          </p>
          <p className={`mt-5 max-w-3xl text-lg font-black sm:text-xl ${band.textClass}`}>{band.verdict}</p>
        </div>
        <div className={`w-full rounded-lg border-2 p-5 text-center sm:w-auto ${band.panelClass}`}>
          <div className="text-xs font-black uppercase tracking-[0.16em]">{BRAND}</div>
          <div className="mt-2 text-6xl font-black leading-none sm:text-7xl">{SAMPLE_SCORE_TOTAL}</div>
          <div className="mt-1 text-sm font-black">out of 100 | {band.label}</div>
        </div>
      </header>

      <section className="grid border-b border-line md:grid-cols-3">
        <Insight label="Most urgent gap" value={SAMPLE_PRIORITIZED_ISSUES[0]?.title ?? "No major gap found"} />
        <Insight label="Weakest category" value={weakestCategory.label} />
        <Insight label="Likely customer impact" value="Lost calls and quotes" />
      </section>

      <section className="border-b border-line p-5 sm:p-7">
        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h3 className="text-2xl font-black text-ink">Executive Read</h3>
            <p className="mt-3 leading-7 text-slate-700">
              This report estimates how easy it is for a ready-to-buy customer to find, trust, and choose this business. The score is not about vanity. It is about whether the public details match what customers need at the moment they decide.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {SAMPLE_PRIORITIZED_ISSUES.slice(0, 2).map((issue) => <PriorityIssueBox key={issue.id} issue={issue} />)}
          </div>
        </div>
      </section>

      <section className="border-b border-line p-5 sm:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Business Health Score</p>
            <h3 className="mt-2 text-2xl font-black text-ink">Google Places scan</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
              Your score is based on the checks StreetSignal could complete. Any unavailable checks are identified separately and do not automatically lower the score.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-nested-surface p-4 text-left sm:text-right">
            <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Overall score</div>
            <div className="mt-1 text-3xl font-black text-ink">{SAMPLE_SCORE_TOTAL}/100</div>
            <div className="mt-1 text-xs font-bold text-slate-500">Checks completed: {SAMPLE_AVAILABLE_WEIGHT}%</div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {SAMPLE_CATEGORIES.map((category) => <SampleCategoryCard key={category.key} category={category} />)}
        </div>

        <div className="mt-5 rounded-lg border border-line bg-nested-surface p-4">
          <h4 className="font-black text-ink">Free prioritized next fixes</h4>
          <div className="mt-3 grid gap-3">
            {SAMPLE_PRIORITIZED_ISSUES.map((issue) => <PriorityIssueBox key={issue.id} issue={issue} />)}
          </div>
        </div>
      </section>

      <section className="p-5 sm:p-7">
        <div className="rounded-xl border border-brand/30 bg-brand-soft p-5 shadow-soft">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.14em] text-brand">Locked full scan</div>
              <h4 className="mt-2 text-2xl font-black text-ink">Unlock the full scan</h4>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
                Get secondary listings, content freshness, and the complete cross-source action plan.
              </p>
            </div>
            <Link className="primary-button w-full sm:w-auto" href="/#business-search">
              Unlock Full Report — $19
            </Link>
          </div>
        </div>
      </section>
    </article>
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

function PriorityIssueBox({ issue }) {
  return (
    <div className="rounded-lg border border-line bg-nested-surface p-4">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{issue.impact} impact</div>
      <div className="mt-2 font-black text-ink">{issue.title}</div>
      <p className="mt-1 text-sm leading-6 text-slate-700">{issue.suggestedFix}</p>
    </div>
  );
}

function SampleCategoryCard({ category }) {
  const band = bandForScore(category.score);
  return (
    <div className="rounded-lg border border-line bg-surface p-4 shadow-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="font-black text-ink">{category.label}</h4>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Completed check</p>
        </div>
        <span className={`text-2xl font-black ${band.textClass}`}>{category.score}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full rounded-full ${band.fillClass}`} style={{ width: `${category.score}%` }} />
      </div>
      <div className="mt-3 grid gap-2">
        {category.metrics.map((metric) => (
          <div key={metric.id} className="min-w-0 rounded-md border border-line bg-nested-surface p-3 text-sm leading-5 text-slate-700">
            <div className="font-black text-ink">{metric.label}</div>
            <div className="mt-1 break-words">{metric.score}/100 - {metric.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
