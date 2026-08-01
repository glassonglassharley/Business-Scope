"use client";

import { useEffect, useMemo, useState } from "react";
import { BRAND } from "@/lib/brand";
import { SAMPLE_REPORTS } from "@/lib/sampleReport";
import { sampleReportToAudit } from "@/lib/reportViewModel";
import { ReportView } from "@/components/ReportView";

const STORAGE_KEY = "streetSignal.sampleReportIndex.v1";

function selectSampleReport() {
  const lastIndex = Number(window.sessionStorage.getItem(STORAGE_KEY));
  const availableIndexes = SAMPLE_REPORTS.map((_, index) => index).filter((index) => index !== lastIndex);
  const nextIndex = availableIndexes[Math.floor(Math.random() * availableIndexes.length)] ?? 0;
  window.sessionStorage.setItem(STORAGE_KEY, String(nextIndex));
  return SAMPLE_REPORTS[nextIndex];
}

/**
 * Renders the same premium report component used by real Thorost reports,
 * adapted from fictional sample data for the public sample page.
 */
export function SampleReport({ checkedDate }) {
  const [report, setReport] = useState(SAMPLE_REPORTS[0]);

  useEffect(() => {
    queueMicrotask(() => setReport(selectSampleReport()));
  }, []);

  const audit = useMemo(() => sampleReportToAudit(report, checkedDate), [report, checkedDate]);

  return <ReportView audit={audit} preparerName={BRAND} />;
}
