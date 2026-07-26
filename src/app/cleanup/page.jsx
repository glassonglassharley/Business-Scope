import Link from "next/link";
import { CleanupRequestForm } from "@/components/CleanupRequestForm";
import { SiteHeader } from "@/components/SiteHeader";
import { BRAND, SITE_URL } from "@/lib/brand";

const steps = [
  "Run the free StreetSignal checkup",
  "Choose Sandbox Fix ($49) or go straight to Full Cleanup ($297)",
  "We do the work (with your approval)",
  "You receive a before/after summary"
];

const packageItems = [
  "Makes every fixed issue live",
  "Publishes your aligned business details",
  "Before/after summary included",
  "No changes without your approval"
];

const guarantees = [
  "No Google password required up front",
  "No changes made without your explicit approval",
  "We only work on public-facing information",
  "Clear communication throughout the process"
];

export const metadata = {
  title: "Cleanup Service",
  description: `Request the paid ${BRAND} cleanup service to fix public-facing business issues found by your free checkup.`,
  alternates: { canonical: `${SITE_URL}/cleanup` },
  openGraph: {
    title: `Cleanup Service | ${BRAND}`,
    description: `Request a cleanup plan for public-facing business issues found by ${BRAND}.`,
    url: `${SITE_URL}/cleanup`
  }
};

export default async function CleanupPage({ searchParams }) {
  const params = await searchParams;
  const checkoutStatus = params?.checkout;

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-paper px-4 py-6 text-ink sm:px-5 sm:py-10">
      <div className="mx-auto grid max-w-7xl gap-8">
        <Link className="link text-sm font-bold" href="/">← Back to {BRAND}</Link>

        {checkoutStatus === "success" && (
          <div className="rounded-xl border border-line bg-nested-surface p-4 text-sm font-bold leading-6 text-ink">
            Payment received — thank you! We&apos;ll be in touch at the email you provided to get started.
          </div>
        )}
        {checkoutStatus === "cancelled" && (
          <div className="rounded-xl border border-line bg-nested-surface p-4 text-sm font-bold leading-6 text-ink">
            Checkout was cancelled — no payment was made. You can try again below whenever you&apos;re ready.
          </div>
        )}

        <section className="hero-grid lg:grid-cols-[1fr_440px]">
          <div className="hero-copy">
            <p className="eyebrow">Cleanup Service</p>
            <h1>We’ll fix the issues StreetSignal found</h1>
            <p className="hero-subcopy">
              After your free checkup, we build your full cleanup and show you the finished result — with a few pieces already live so you can see it's real. From there, $297 unlocks making everything live. No changes are ever made without your approval.
            </p>
            <a className="primary-button mt-6 w-full sm:w-auto" href="#cleanup-request">Request cleanup plan</a>
          </div>
          <div>
            <span id="cleanup-request-sandbox" />
            <span id="cleanup-request-full" />
            <CleanupRequestForm />
          </div>
        </section>

        <section className="panel-section">
          <div className="section-heading">
            <p className="eyebrow">How it works</p>
            <h2>Four simple steps.</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-4">
            {steps.map((step, index) => <StepCard key={step} number={index + 1} step={step} />)}
          </div>
        </section>

        <section className="panel-section">
          <div className="section-heading">
            <p className="eyebrow">Pricing</p>
            <h2>Try it first, or go all in.</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <article className="rounded-2xl border-2 border-brand/60 bg-search-surface p-5 shadow-soft sm:p-6">
              <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.14em] text-brand">Sandbox Fix</p>
                  <h3 className="mt-2 text-3xl font-black tracking-tight text-ink">$49</h3>
                </div>
                <a className="primary-button w-full sm:w-auto" href="#cleanup-request-sandbox">Request Sandbox Fix</a>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-700">
                We build the entire cleanup — every Critical and High issue from your report — and show you the finished result. A few of the fixes go live immediately, so you can confirm it's real work, not a mockup.
              </p>
              <div className="mt-4 rounded-xl border border-line bg-nested-surface p-3 text-sm leading-6 text-slate-700">
                <strong className="text-ink">Credited toward the Full Cleanup:</strong> $297 unlocks making the rest of it live — everything you already saw finished. Your $49 comes off that price.
              </div>
            </article>

            <article className="rounded-2xl border-2 border-brand/60 bg-search-surface p-5 shadow-soft sm:p-6">
              <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.14em] text-brand">Full Cleanup</p>
                  <h3 className="mt-2 text-3xl font-black tracking-tight text-ink">$297</h3>
                </div>
                <a className="primary-button w-full sm:w-auto" href="#cleanup-request-full">Request Full Cleanup</a>
              </div>
              <Checklist items={packageItems} compact />
            </article>
          </div>
        </section>

        <section className="trust-section">
          <div className="section-heading">
            <p className="eyebrow">Trust / Guarantees</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {guarantees.map((point) => <div key={point} className="trust-point"><span aria-hidden="true">✓</span>{point}</div>)}
          </div>
        </section>

        <section className="final-cta">
          <div>
            <h2>Ready to clean up your public presence?</h2>
            <p>Start with the free checkup, then request a cleanup plan if you want us to fix the issues for you.</p>
          </div>
          <a className="primary-button w-full sm:w-auto" href="#cleanup-request">Request cleanup plan</a>
        </section>
      </div>
      </main>
    </>
  );
}

function Checklist({ items, compact = false }) {
  return (
    <ul className={`grid gap-3 ${compact ? "mt-5" : "sm:grid-cols-2"}`}>
      {items.map((item) => (
        <li key={item} className="trust-point">
          <span aria-hidden="true">✓</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function StepCard({ number, step }) {
  return (
    <article className="step-card">
      <span>{number}</span>
      <h3>{step}</h3>
    </article>
  );
}
