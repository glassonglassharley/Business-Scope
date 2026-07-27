"use client";

import { useId, useState } from "react";
import { PLACES_CATEGORY_WEIGHTS } from "@/lib/scoring";

const TOTAL_BASE_WEIGHT = PLACES_CATEGORY_WEIGHTS.reduce((sum, category) => sum + category.baseWeight, 0);
const MAX_BASE_WEIGHT = Math.max(...PLACES_CATEGORY_WEIGHTS.map((category) => category.baseWeight));

/**
 * Expandable "how this score is calculated" disclosure, shared by the real
 * report and the sample report. Weights come straight from scoring.js's
 * PLACES_CATEGORY_WEIGHTS (derived from the live engine's own category
 * config) so this can never show numbers the engine doesn't actually use.
 */
export function ScoreMethodology() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="no-print mt-4">
      <button
        type="button"
        className="link text-sm font-bold"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        How is this score calculated? <span aria-hidden="true">{open ? "▾" : "▸"}</span>
      </button>

      {open && (
        <div id={panelId} className="mt-3 rounded-lg border border-line bg-nested-surface p-4">
          <p className="text-sm leading-6 text-slate-700">
            Your Thorost score is a weighted average of {PLACES_CATEGORY_WEIGHTS.length} public-presence categories. Unavailable checks are shown separately and do not lower the score.
          </p>
          <div className="mt-4 grid gap-3">
            {PLACES_CATEGORY_WEIGHTS.map((category) => (
              <div key={category.key} className="grid gap-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-black text-ink">{category.label}</span>
                  <span className="inline-flex min-w-9 items-center justify-center rounded-full border border-line bg-surface px-3 py-1 text-xs font-black text-ink">{category.baseWeight}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-brand" style={{ width: `${(category.baseWeight / MAX_BASE_WEIGHT) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            These are relative weight units on a {TOTAL_BASE_WEIGHT}-point base scale, not fixed percentages. A category that couldn&apos;t be scanned is excluded, and the remaining measured categories are rebalanced to 100% for this specific report.
          </p>
        </div>
      )}
    </div>
  );
}
