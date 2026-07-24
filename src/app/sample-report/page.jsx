import Link from "next/link";
import { SampleReport } from "@/components/SampleReport";
import { BRAND, SITE_URL } from "@/lib/brand";

export const metadata = {
  title: "Sample Report",
  description: `Review a fictional ${BRAND} sample report showing a local business presence score, customer-impact findings, and recommended fixes.`,
  alternates: { canonical: `${SITE_URL}/sample-report` },
  openGraph: {
    title: `Sample Report | ${BRAND}`,
    description: `See how ${BRAND} prioritizes local business presence issues.`,
    url: `${SITE_URL}/sample-report`
  }
};

export default function SampleReportPage() {
  const checkedDate = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date());

  return (
    <main className="min-h-screen bg-paper px-4 py-6 text-ink sm:px-5 sm:py-10">
      <div className="mx-auto grid max-w-7xl gap-5">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft sm:p-8">
          <Link className="link text-sm font-bold" href="/">← Back to {BRAND}</Link>
          <p className="eyebrow mt-8">Sample Report</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-ink sm:text-5xl">A fictional report showing how StreetSignal ranks public business issues.</h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
            This sample keeps the report structure visible without taking space from the homepage. It is not a real customer report.
          </p>
        </div>
        <SampleReport checkedDate={checkedDate} />
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-soft sm:p-7">
          <p className="font-black text-ink">Ready to check a real business?</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">Run the free public-presence checkup from the homepage. No account or listing access required.</p>
          <Link className="primary-button mt-4" href="/#business-search">Run my free checkup</Link>
        </div>
      </div>
    </main>
  );
}
