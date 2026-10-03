import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { BRAND, SITE_URL } from "@/lib/brand";

export const metadata = {
  title: "Free Online Presence Snapshot",
  description: `Get a free 5-minute ${BRAND} snapshot showing exactly where your local business is losing customers online — and the two ways to fix it.`,
  alternates: { canonical: `${SITE_URL}/free-snapshot` },
  openGraph: {
    title: `Free Online Presence Snapshot | ${BRAND}`,
    description: `See where your business is invisible online, then pick your fix: a one-time cleanup or a full marketing system.`,
    url: `${SITE_URL}/free-snapshot`
  }
};

const FORM_URL = "https://link.buzzbullmarketing.com/widget/form/zWUZFkv23BLRmpXLGnFw?am_id=jonathan225";

const FINDINGS = [
  {
    title: "No website — or a broken one",
    body: "Customers search, find nothing (or a dead page), and call your competitor instead."
  },
  {
    title: "Invisible on Google",
    body: "If you're not in the top results for your service + city, you don't exist to new customers."
  },
  {
    title: "Missed calls, zero follow-up",
    body: "80% of callers won't leave a voicemail. Every missed call becomes someone else's sale."
  },
  {
    title: "Disconnected tools",
    body: "Website, reviews, and ads managed in different places — leads slip through the cracks."
  }
];

const STEPS = [
  {
    n: "1",
    title: "Tell us about your business",
    body: "Thirty seconds on the form — name, business, what you do."
  },
  {
    n: "2",
    title: "We scan your online presence",
    body: "Our checkup reviews your website, Google visibility, and customer trust signals."
  },
  {
    n: "3",
    title: "You get the report + your options",
    body: "A plain-language snapshot of what's costing you customers — and the two ways to fix it."
  }
];

const TIERS = [
  { name: "Foundation", price: "$395/mo", desc: "Website + CRM + Google Business Profile + Local Service Ads" },
  { name: "Pro", price: "$695/mo", desc: "Everything in Foundation + 24/7 AI phone assistant that answers, books, and follows up" },
  { name: "Growth", price: "$1,495/mo", desc: "Everything in Pro + full local SEO domination" }
];

export default function FreeSnapshotPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-paper px-4 py-6 text-ink sm:px-5 sm:py-10">
        <div className="mx-auto grid max-w-7xl gap-5">
          <Link className="link text-sm font-bold" href="/">← Back to {BRAND}</Link>

          {/* Hero */}
          <section className="rounded-2xl border border-line bg-surface p-6 shadow-soft sm:p-10">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Free for local businesses</p>
            <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
              Is your business invisible online?
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
              Get a free 5-minute snapshot showing exactly where you&apos;re losing
              customers to competitors — and the two ways to fix it.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a className="primary-button" href={FORM_URL}>Get my free snapshot</a>
              <Link className="link self-center text-sm font-bold" href="/sample-report">See a sample report first →</Link>
            </div>
            <p className="mt-4 text-xs text-slate-500">Free. No pitch attached to the snapshot — just the report.</p>
          </section>

          {/* What we find */}
          <section className="rounded-2xl border border-line bg-surface p-6 shadow-soft sm:p-8">
            <h2 className="text-xl font-black sm:text-2xl">What the snapshot usually finds</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Most local businesses are losing customers to two or three small,
              fixable problems — and have no idea.
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {FINDINGS.map((f) => (
                <div key={f.title} className="rounded-xl border border-line bg-paper p-5">
                  <p className="font-black">{f.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{f.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* How it works */}
          <section className="rounded-2xl border border-line bg-surface p-6 shadow-soft sm:p-8">
            <h2 className="text-xl font-black sm:text-2xl">How it works</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className="rounded-xl border border-line bg-paper p-5">
                  <p className="flex h-9 w-9 items-center justify-center rounded-full bg-ink font-black text-paper">{s.n}</p>
                  <p className="mt-3 font-black">{s.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{s.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Two ways to fix it */}
          <section className="rounded-2xl border border-line bg-surface p-6 shadow-soft sm:p-8">
            <h2 className="text-xl font-black sm:text-2xl">Two ways to fix it</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Your snapshot shows the problems. How you fix them is up to you.
            </p>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-line bg-paper p-6">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Option A</p>
                <p className="mt-2 text-lg font-black">One-time cleanup by {BRAND}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  We fix the issues in your report directly — website repair or
                  rebuild, listings corrected, the fundamentals solid. One-time
                  project; you own everything after.
                </p>
                <p className="mt-4 text-sm font-black">$497–$1,500 depending on scope</p>
                <a className="primary-button mt-4" href={FORM_URL}>Scope my cleanup</a>
              </div>
              <div className="rounded-xl border-2 border-ink bg-paper p-6">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Option B — recommended partner</p>
                <p className="mt-2 text-lg font-black">Full marketing system by BuzzBull</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Our recommended fulfillment partner, BuzzBull Marketing Systems,
                  handles the whole system: website, CRM, AI answering your calls
                  24/7, and SEO — all working together. No contracts. 90-day
                  money-back guarantee.
                </p>
                <ul className="mt-4 space-y-2">
                  {TIERS.map((t) => (
                    <li key={t.name} className="text-sm leading-6 text-slate-700">
                      <span className="font-black text-ink">{t.name} — {t.price}:</span> {t.desc}
                    </li>
                  ))}
                </ul>
                <a className="primary-button mt-4" href={FORM_URL}>Get the full system</a>
              </div>
            </div>
            <blockquote className="mt-6 rounded-xl bg-paper p-5 text-sm leading-6 text-slate-700">
              “Two ways to fix this. I do one-time cleanups myself through {BRAND}.
              And if you want the full system — website, CRM, AI answering your
              calls, SEO — I partner with a company called BuzzBull Marketing
              Systems that does exactly that.”
              <footer className="mt-2 font-black text-ink">— Jonathan, {BRAND}</footer>
            </blockquote>
          </section>

          {/* Final CTA */}
          <section className="rounded-2xl bg-ink p-6 text-white shadow-soft sm:p-10 sm:text-center">
            <h2 className="text-2xl font-black sm:text-3xl">Ready to be found?</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              Tell us about your business and we&apos;ll run your free snapshot.
              Takes 30 seconds — the report is on us.
            </p>
            <a className="primary-button mt-6 sm:mx-auto" href={FORM_URL}>Get my free snapshot</a>
          </section>

          <p className="text-center text-xs text-slate-500">
            Questions? <a className="link font-bold" href="mailto:jonathan@thorost.com">jonathan@thorost.com</a>
          </p>
        </div>
      </main>
    </>
  );
}
