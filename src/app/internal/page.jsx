import Link from "next/link";
import { ReportView } from "@/components/ReportView";
import { SiteHeader } from "@/components/SiteHeader";
import { BRAND, SITE_URL } from "@/lib/brand";
import { seededAudits } from "@/lib/seedAudits";

export const metadata = {
  title: "Internal Report Preview",
  description: `Internal ${BRAND} report preview for reviewing the premium audit report layout.`,
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_URL}/internal` }
};

export default function InternalReportPreviewPage() {
  const audit = { ...seededAudits[0], fullReportUnlocked: true };

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-paper px-4 py-6 text-ink sm:px-5 sm:py-10">
        <div className="mx-auto grid max-w-7xl gap-5">
          <div className="no-print flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Internal preview — seeded data</p>
              <h1 className="text-3xl font-black tracking-tight text-ink">Premium report preview</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
                This internal preview renders the deployed report component with seeded audit data so the current report design can be reviewed on thorost.com.
              </p>
            </div>
            <Link className="secondary-button w-full sm:w-auto" href="/sample-report">
              View public sample report
            </Link>
          </div>

          <ReportView audit={audit} preparerName={BRAND} />
        </div>
      </main>
    </>
  );
}
