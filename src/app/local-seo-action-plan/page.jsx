import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { BRAND, SITE_URL } from "@/lib/brand";

export const metadata = {
  title: "Local SEO Action Plan",
  description: "A prioritized Google Business Profile and local visibility action plan for improving Thorost's local online presence.",
  alternates: { canonical: `${SITE_URL}/local-seo-action-plan` },
  openGraph: {
    title: `Local SEO Action Plan | ${BRAND}`,
    description: "High-ROI Google Business Profile, review, NAP, website, and citation actions for Thorost.",
    url: `${SITE_URL}/local-seo-action-plan`
  }
};

const criticalFixes = [
  {
    title: "Complete and verify the Google Business Profile",
    what: "Claim or verify Thorost's Google Business Profile, then fill every conversion-critical field.",
    why: "GBP is the highest-leverage local asset for map rankings, phone calls, website clicks, direction requests, and trust.",
    steps: [
      "Go to google.com/business and search for Thorost.",
      "Claim the existing profile or create the official profile if one does not exist.",
      "Add the exact business name, phone, website, service area, business hours, appointment/contact link, and description.",
      "Upload the Thorost logo, cover image, real service visuals, and any team or location photos.",
      "Add services that match the actual Local Business Presence Checkup offer."
    ],
    impact: "Creates or strengthens eligibility for Google Maps visibility and gives ready buyers a complete path to contact Thorost."
  },
  {
    title: "Lock in the right primary category",
    what: "Set the primary GBP category to the most commercially accurate service category available.",
    why: "The primary category heavily controls which local searches Google considers Thorost relevant for.",
    steps: [
      "Search top local visibility, SEO audit, and marketing competitors in Google Maps.",
      "Document their primary categories.",
      "Choose the closest category to Thorost's revenue-driving offer, not the broadest label.",
      "Add only directly relevant secondary categories and remove vague or unrelated ones."
    ],
    impact: "Improves ranking eligibility for high-intent local searches instead of diluting relevance across weak categories."
  },
  {
    title: "Launch a review generation system",
    what: "Ask every satisfied customer for a Google review using a simple post-service request flow.",
    why: "Review count, rating, recency, and owner responses drive trust, clicks, and conversion in Maps results.",
    steps: [
      "Copy the GBP review link from the profile dashboard.",
      "Create one short SMS/email template for happy customers.",
      "Send the request after a completed checkup, cleanup, consultation, or successful customer interaction.",
      "Ask customers to mention the specific service they received in their own words.",
      "Respond to every review within 24–72 hours."
    ],
    impact: "Builds visible proof fast and helps Thorost compete against businesses with older or larger local footprints."
  },
  {
    title: "Standardize NAP everywhere",
    what: "Make Thorost's name, address/service area, phone, website, and hours consistent across every public profile.",
    why: "Conflicting business data weakens Google's confidence and causes customers to hesitate or contact the wrong place.",
    steps: [
      "Create one master NAP record for Thorost.",
      "Update GBP, the website footer/contact page, Apple Business Connect, Bing Places, Facebook, LinkedIn, Yelp, and relevant directories.",
      "Remove outdated phone numbers, alternate spellings, duplicate profiles, and old URLs.",
      "Recheck the first page of Google results for Thorost after updates."
    ],
    impact: "Improves trust signals, reduces lost leads, and makes the main Thorost profile easier for Google to validate."
  },
  {
    title: "Strengthen the website's local conversion signals",
    what: "Make the website clearly state what Thorost does, who it helps, where it operates, and how to start a checkup.",
    why: "The connected website supports GBP relevance and converts visitors who click through from Maps or local search.",
    steps: [
      "Put the primary offer and target market above the fold.",
      "Add click-to-call, contact, or checkup CTA buttons on mobile and desktop.",
      "Add NAP and service-area details to the footer and contact page.",
      "Add service proof: sample report, what Thorost checks, testimonials when available, and FAQ answers.",
      "Add LocalBusiness and Service schema if not already present."
    ],
    impact: "Raises conversion from local search traffic and gives Google stronger context about Thorost's service relevance."
  },
  {
    title: "Remove duplicate or incorrect listings",
    what: "Find and clean up duplicate profiles, outdated directory listings, and incorrect business references.",
    why: "Duplicate listings split authority, confuse customers, and can suppress the primary GBP profile.",
    steps: [
      "Search Google and Maps for Thorost, Thorost phone number, and Thorost website.",
      "Check Apple Maps, Bing, Yelp, Facebook, and major directories.",
      "Claim the correct listing where needed.",
      "Request removal, merge, or suppression of duplicates.",
      "Update wrong phone, website, address, service-area, or hour details."
    ],
    impact: "Consolidates authority around the correct Thorost presence and reduces customer confusion."
  }
];

const highValue = [
  "Google Business Profile: add every real service, short service descriptions, business hours, holiday hours, appointment/contact link, messaging if response time is reliable, Q&A, and 10–20 real photos.",
  "Reviews: set a monthly review target, request reviews after successful customer moments, respond to every review, and use natural service/context language without stuffing keywords.",
  "NAP consistency: maintain one master record and update GBP, website, Apple Business Connect, Bing Places, Yelp, Facebook, LinkedIn, local chambers, and industry-specific directories.",
  "Website local signals: add a strong contact page, service pages, service-area language, LocalBusiness/Service schema, click-to-call buttons, testimonials, FAQs, and a clear sample report path.",
  "Citations: prioritize high-authority and customer-used directories first, then local community sources, partner pages, sponsorship pages, and relevant industry listings.",
  "Competitor gap review: compare categories, review count, photo volume, service lists, Q&A, posts, and citations against the strongest local competitors."
];

const weeklySystems = [
  "Request reviews from every satisfied customer.",
  "Respond to new reviews within 24–72 hours.",
  "Upload 2–5 real GBP photos.",
  "Publish one GBP post: service spotlight, FAQ answer, recent project, or seasonal reminder.",
  "Check GBP messages, missed calls, and top search terms."
];

const monthlySystems = [
  "Audit NAP consistency on the highest-value profiles.",
  "Check for duplicate or incorrect listings.",
  "Review competitor GBP categories, photos, reviews, and services.",
  "Add or improve one website page, FAQ, case study, or proof asset.",
  "Track GBP calls, website clicks, direction requests, review count, average rating, and local ranking movement."
];

const quickWins = [
  "Upload the 1024 x 1024 Thorost logo to GBP and website assets.",
  "Add the correct primary GBP category.",
  "Add phone, website, hours, service area, and appointment/contact link.",
  "Write a concise GBP business description focused on the Local Business Presence Checkup.",
  "Add core services to GBP.",
  "Copy the Google review link and send it to recent satisfied customers.",
  "Respond to all existing reviews.",
  "Add or verify NAP in the website footer and contact page.",
  "Claim or update Apple Business Connect and Bing Places.",
  "Search for duplicate Thorost listings and flag anything incorrect.",
  "Publish one GBP post explaining what Thorost checks.",
  "Add five common customer questions to GBP Q&A."
];

export default function LocalSeoActionPlanPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-paper px-4 py-6 text-ink sm:px-5 sm:py-10">
        <div className="mx-auto grid max-w-6xl gap-6">
          <Link className="link text-sm font-bold" href="/">← Back to {BRAND}</Link>

          <section className="rounded-3xl border border-line bg-surface p-6 shadow-soft sm:p-8 lg:p-10">
            <p className="eyebrow">Local SEO Action Plan</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-ink sm:text-6xl">Prioritized local visibility plan for Thorost</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-700">
              A practical, high-ROI plan focused on Google Business Profile, reviews, NAP consistency, website local signals, and citations.
            </p>
          </section>

          <section className="grid gap-4 rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-8">
            <h2 className="text-3xl font-black tracking-tight">Critical Fixes (Do First)</h2>
            <div className="grid gap-5">
              {criticalFixes.map((fix, index) => (
                <article key={fix.title} className="rounded-2xl border border-line bg-paper p-5">
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-brand">Fix {index + 1}</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight">{fix.title}</h3>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <InfoBlock label="What to do" value={fix.what} />
                    <InfoBlock label="Why it matters" value={fix.why} />
                    <div className="lg:col-span-2">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Exact steps</p>
                      <ol className="mt-2 grid list-decimal gap-2 pl-5 text-sm leading-6 text-slate-700">
                        {fix.steps.map((step) => <li key={step}>{step}</li>)}
                      </ol>
                    </div>
                    <InfoBlock label="Expected impact" value={fix.impact} className="lg:col-span-2" />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <PlanSection title="High-Value Optimizations (Next 2–4 weeks)" items={highValue} />

          <section className="grid gap-4 rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-8 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-black tracking-tight">Ongoing Systems</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Simple habits that compound visibility, trust, and conversion.</p>
            </div>
            <div className="grid gap-5">
              <Checklist title="Weekly" items={weeklySystems} />
              <Checklist title="Monthly" items={monthlySystems} />
            </div>
          </section>

          <PlanSection title="Quick Wins Checklist" items={quickWins} />

          <section className="rounded-3xl border border-line bg-surface p-6 shadow-soft sm:p-8">
            <h2 className="text-3xl font-black tracking-tight">Business details</h2>
            <dl className="mt-5 grid gap-3 text-sm leading-6 sm:grid-cols-2">
              <Detail label="Business name" value="Thorost" />
              <Detail label="Primary category / what we do" value="Local Business Presence Checkup and online visibility cleanup for service-based and brick-and-mortar businesses" />
              <Detail label="Location / service area" value="Online service for local businesses; city and service areas to be finalized in Google Business Profile" />
              <Detail label="Website" value={SITE_URL} />
              <Detail label="Current Google Business Profile status" value="Needs confirmation: claim, verification, completeness, categories, services, photos, and duplicate-listing status should be audited first" />
              <Detail label="Approximate review count & average rating" value="Needs confirmation from the live Google Business Profile" />
              <Detail label="Specific problems noticed" value="GBP details, review system, NAP consistency, website local signals, and citation coverage need structured cleanup" />
            </dl>
          </section>
        </div>
      </main>
    </>
  );
}

function InfoBlock({ label, value, className = "" }) {
  return (
    <div className={className}>
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}

function PlanSection({ title, items }) {
  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-soft sm:p-8">
      <h2 className="text-3xl font-black tracking-tight">{title}</h2>
      <ul className="mt-5 grid gap-3 text-sm leading-6 text-slate-700">
        {items.map((item) => <li key={item} className="rounded-2xl border border-line bg-paper p-4">{item}</li>)}
      </ul>
    </section>
  );
}

function Checklist({ title, items }) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-5">
      <h3 className="font-black text-ink">{title}</h3>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
        {items.map((item) => <li key={item}>• {item}</li>)}
      </ul>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-4">
      <dt className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</dt>
      <dd className="mt-2 font-bold text-ink">{value}</dd>
    </div>
  );
}
