import { BRAND, CONTACT_EMAIL, SITE_URL } from "@/lib/brand";
import Link from "next/link";

export const metadata = {
  title: "Privacy",
  description: `Privacy information for ${BRAND}'s local business presence checkup.`,
  alternates: { canonical: `${SITE_URL}/privacy` }
};

const effectiveDate = "July 24, 2026";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-5 py-8">
      <article className="panel mx-auto max-w-3xl p-7">
        <Link className="link text-sm font-black" href="/">← Back to {BRAND}</Link>
        <p className="eyebrow mt-6">Privacy</p>
        <h1 className="mt-3 text-3xl font-black text-ink">Privacy Policy</h1>
        <p className="mt-3 text-sm leading-6 text-slate-700">Effective date: {effectiveDate}</p>
        <div className="mt-6 grid gap-6 text-sm leading-7 text-slate-700">
          <Section title="What information is collected">
            <p>{BRAND} collects the business name, city or area, selected public listing, and public business details needed to prepare a checkup. If you submit a request form, it may also collect the contact method and notes you choose to provide.</p>
          </Section>
          <Section title="Why it is collected">
            <p>The information is used to find the correct business, run public-facing checks, prepare a diagnostic report, and respond if you request follow-up.</p>
          </Section>
          <Section title="Business search terms and submitted records">
            <p>The live business search sends search terms to the StreetSignal API so it can query public listing providers. Reports created in the browser are saved to localStorage on your device. The separate request form currently stores submissions in your browser localStorage unless a production storage destination is configured.</p>
          </Section>
          <Section title="Geolocation">
            <p>If you choose “Use my current area,” your browser asks for permission. Approximate coordinates are used only to narrow the business lookup. You can deny location access and search by city or area instead.</p>
          </Section>
          <Section title="Third-party APIs">
            <p>Business names, locations, and selected listing identifiers may be sent to public data providers such as Google Places to find and check the business. Website URLs may be requested by StreetSignal’s website audit endpoint to test public customer-action paths.</p>
          </Section>
          <Section title="Analytics">
            <p>No analytics provider is configured in the current codebase. If analytics are added later, this policy should be updated to identify the provider and data collected.</p>
          </Section>
          <Section title="Data retention and deletion">
            <p>Browser-saved reports and request drafts remain on the device until the browser storage is cleared. If a server-side contact or database destination is configured later, retention and deletion procedures must be documented here. You may request deletion using the contact method below if server-side records exist.</p>
          </Section>
          <Section title="Security limitations">
            <p>{BRAND} does not ask for Google passwords or listing access for the initial scan. No internet service can guarantee perfect security. Do not submit secrets, passwords, private account credentials, or confidential customer data through the checkup form.</p>
          </Section>
          <Section title="Contact method">
            {CONTACT_EMAIL ? (
              <p>Privacy questions or deletion requests can be sent to <a className="link font-bold" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
            ) : (
              <p className="font-bold text-signal-red">A real contact email is not configured yet. Set NEXT_PUBLIC_CONTACT_EMAIL before collecting real customer submissions.</p>
            )}
          </Section>
          <Section title="Policy updates">
            <p>This policy should be updated whenever the product adds new storage, analytics, data providers, or customer communication workflows. Material changes should be dated clearly.</p>
          </Section>
        </div>
      </article>
    </main>
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
