"use client";

import { useEffect, useState } from "react";
import { bandForScore } from "@/lib/scoring";
import { BRAND } from "@/lib/brand";
import { SAMPLE_REPORTS } from "@/lib/sampleReport";
import { ScoreMethodology } from "@/components/ScoreMethodology";

const STORAGE_KEY = "streetSignal.sampleReportIndex.v1";

function selectSampleReport() {
  const lastIndex = Number(window.sessionStorage.getItem(STORAGE_KEY));
  const availableIndexes = SAMPLE_REPORTS.map((_, index) => index).filter((index) => index !== lastIndex);
  const nextIndex = availableIndexes[Math.floor(Math.random() * availableIndexes.length)] ?? 0;
  window.sessionStorage.setItem(STORAGE_KEY, String(nextIndex));
  return SAMPLE_REPORTS[nextIndex];
}

/**
 * Mirrors ReportView.jsx's structure, category names, and states so a
 * prospect sees the same report language here as on their first real scan.
 * Shows the full report, no paywall — every category is illustrated,
 * including the ones a real free scan keeps locked. Picks a different
 * example business on each visit (excluding the last one shown, via
 * sessionStorage), matching the rotation already used for the homepage's
 * diagnostic preview and problem cards.
 */
export function SampleReport({ checkedDate }) {
  const [report, setReport] = useState(SAMPLE_REPORTS[0]);

  useEffect(() => {
    queueMicrotask(() => setReport(selectSampleReport()));
  }, []);

  const { business, scoreTotal, availableWeight, categories, prioritizedIssues } = report;
  const band = bandForScore(scoreTotal);
  const weakestCategory = [...categories].sort((a, b) => a.score - b.score)[0];
  // The shared band verdict is score-only and identical for any 71-100 -
  // it doesn't know this sample has one genuinely weak category. Name it
  // specifically here instead, falling back to the generic verdict if the
  // sample data changes enough that this qualifier no longer applies.
  const hasVisibleWeakSpot = weakestCategory.score <= 60 && band.label === "Strong";
  const verdictLine = hasVisibleWeakSpot
    ? `Your digital foundation is strong, but ${weakestCategory.label} is a clear gap still worth fixing.`
    : band.verdict;

  return (
    <article id="sample-report" className="scroll-mt-24 overflow-hidden rounded-lg border border-line bg-surface shadow-soft">
      <header className="grid gap-5 border-b border-line p-5 sm:p-7 md:grid-cols-[1fr_240px] md:items-center">
        <div>
          <p className="eyebrow">Sample report · Fictional business</p>
          <h2 className="mt-2 break-words text-3xl font-black tracking-tight text-ink sm:text-4xl">{business.businessName}</h2>
          <p className="mt-2 text-base font-semibold text-slate-600">
            {business.industry} | {business.city} | Checked {checkedDate}
          </p>
          <p className={`mt-5 max-w-3xl text-lg font-black sm:text-xl ${band.textClass}`}>{verdictLine}</p>
        </div>
        <div className={`w-full rounded-lg border-2 p-5 text-center sm:w-auto ${band.panelClass}`}>
          <div className="text-xs font-black uppercase tracking-[0.16em]">{BRAND}</div>
          <div className="mt-2 text-6xl font-black leading-none sm:text-7xl">{scoreTotal}</div>
          <div className="mt-1 text-sm font-black">out of 100 | {band.label}</div>
        </div>
      </header>

      <section className="grid border-b border-line md:grid-cols-3">
        <Insight label="Most urgent gap" value={prioritizedIssues[0]?.title ?? "No major gap found"} />
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
            {prioritizedIssues.slice(0, 2).map((issue) => <PriorityIssueBox key={issue.id} issue={issue} />)}
          </div>
        </div>
      </section>

      <section className="border-b border-line p-5 sm:p-7">
        <h4 className="font-black text-ink">Prioritized next fixes</h4>
        <div className="mt-3 grid gap-3">
          {prioritizedIssues.map((issue) => <PriorityIssueBox key={issue.id} issue={issue} />)}
        </div>
      </section>

      <section className="p-5 sm:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Business Health Score</p>
            <h3 className="mt-2 text-2xl font-black text-ink">Google Places scan</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
              Your score is based on the checks Thorost could complete. Any unavailable checks are identified separately and do not automatically lower the score.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-nested-surface p-4 text-left sm:text-right">
            <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Overall score</div>
            <div className="mt-1 text-3xl font-black text-ink">{scoreTotal}/100</div>
            <div className="mt-1 text-xs font-bold text-slate-500">Checks completed: {availableWeight}%</div>
          </div>
        </div>

        <ScoreMethodology />

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {categories.map((category) => <SampleCategoryCard key={category.key} category={category} />)}
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
            <div className="mt-1 break-words">{metric.score === null ? "Not available from this checkup" : `${metric.score}/100`} - {metric.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
