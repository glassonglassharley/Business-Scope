import { BRAND, CONTACT_EMAIL, SITE_URL } from "@/lib/brand";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata = {
  title: "Terms",
  description: `Plain-English terms for using ${BRAND}.`,
  alternates: { canonical: `${SITE_URL}/terms` }
};

const effectiveDate = "July 24, 2026";

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen px-5 py-8">
      <article className="panel mx-auto max-w-3xl p-7">
        <Link className="link text-sm font-black" href="/">← Back to {BRAND}</Link>
        <p className="eyebrow mt-6">Terms</p>
        <h1 className="mt-3 text-3xl font-black text-ink">Terms of Use</h1>
        <p className="mt-3 text-sm leading-6 text-slate-700">Effective date: {effectiveDate}</p>
        {/* Attorney review recommended before commercial launch. */}
        <div className="mt-6 grid gap-6 text-sm leading-7 text-slate-700">
          <Section title="Informational diagnostic">
            <p>{BRAND} provides an informational public-presence checkup. It helps identify public details, trust gaps, and customer-action paths that may need review.</p>
          </Section>
          <Section title="No revenue guarantee">
            <p>The report is not a promise of more calls, visits, bookings, orders, rankings, or revenue. Business results depend on many factors outside StreetSignal’s control.</p>
          </Section>
          <Section title="Accuracy limitations">
            <p>StreetSignal checks public sources that may be incomplete, unavailable, outdated, or temporarily inconsistent. Users should verify findings before making changes.</p>
          </Section>
          <Section title="User responsibility">
            <p>You are responsible for confirming that submitted business information is accurate and that you have permission to request a checkup for the business.</p>
          </Section>
          <Section title="Ownership of submitted information">
            <p>You keep ownership of information you submit. You allow StreetSignal to use it to find the business, prepare the report, and respond to your request.</p>
          </Section>
          <Section title="Acceptable use">
            <p>Do not use StreetSignal to submit false information, overload the service, reverse engineer private systems, scan businesses for harassment, or upload secrets, passwords, or private customer data.</p>
          </Section>
          <Section title="Service availability">
            <p>The service may be unavailable, incomplete, or rate-limited. Public data providers and websites may fail to respond. StreetSignal may show partial or failed scan states when that happens.</p>
          </Section>
          <Section title="Liability limitations">
            <p>To the extent allowed by law, StreetSignal is provided as-is and is not liable for decisions made solely from a report without independent verification.</p>
          </Section>
          <Section title="Contact">
            {CONTACT_EMAIL ? (
              <p>Questions about these terms can be sent to <a className="link font-bold" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
            ) : (
              <p className="font-bold text-signal-red">A real contact email is not configured yet. Set NEXT_PUBLIC_CONTACT_EMAIL before using the site for customer intake.</p>
            )}
          </Section>
        </div>
      </article>
      </main>
    </>
  );
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-xl font-black text-ink">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
