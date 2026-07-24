import Link from "next/link";
import { CleanupRequestForm } from "@/components/CleanupRequestForm";
import { BRAND, CONTACT_EMAIL, SITE_URL } from "@/lib/brand";

const contactEmail = CONTACT_EMAIL || "hello@streetsignal.com";

const includedItems = [
  "Fix all Critical and High issues from your report",
  "Align key public details (phone, hours, website, booking links, services, etc.)",
  "Make sure information is consistent across major public listings",
  "Deliver a short before/after summary when the work is complete",
  "You approve every change before it goes live"
];

const steps = [
  "Run the free StreetSignal checkup",
  "Choose a cleanup plan",
  "We fix the issues (with your approval)",
  "You receive a before/after summary"
];

const packageItems = [
  "Fixes all Critical and High issues",
  "Aligns key public business details",
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

export default function CleanupPage() {
  return (
    <main className="min-h-screen bg-paper px-4 py-6 text-ink sm:px-5 sm:py-10">
      <div className="mx-auto grid max-w-7xl gap-8">
        <Link className="link text-sm font-bold" href="/">← Back to {BRAND}</Link>

        <section className="hero-grid lg:grid-cols-[1fr_440px]">
          <div className="hero-copy">
            <p className="eyebrow">Cleanup Service</p>
            <h1>We’ll fix the issues StreetSignal found</h1>
            <p className="hero-subcopy">
              After your free checkup, we can clean up the public details that are costing you calls, visits, and bookings. No changes are ever made without your approval.
            </p>
            <a className="primary-button mt-6 w-full sm:w-auto" href="#cleanup-request">Request cleanup plan</a>
          </div>
          <CleanupRequestForm contactEmail={contactEmail} />
        </section>

        <section className="panel-section">
          <div className="section-heading">
            <p className="eyebrow">What you get</p>
            <h2>What’s included</h2>
          </div>
          <Checklist items={includedItems} />
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
            <h2>Simple pricing</h2>
          </div>
          <article className="rounded-2xl border-2 border-brand/60 bg-search-surface p-5 shadow-soft sm:p-6 lg:max-w-xl">
            <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.14em] text-brand">Full Cleanup</p>
                <h3 className="mt-2 text-3xl font-black tracking-tight text-ink">$297</h3>
              </div>
              <a className="primary-button w-full sm:w-auto" href="#cleanup-request">Request Full Cleanup</a>
            </div>
            <Checklist items={packageItems} compact />
          </article>
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
