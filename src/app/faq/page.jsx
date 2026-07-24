import Link from "next/link";
import { BRAND, SITE_URL } from "@/lib/brand";
import { STREET_SIGNAL_FAQS } from "@/lib/faqs";

export const metadata = {
  title: "FAQ",
  description: `Answers about what ${BRAND} checks, what access it needs, how scoring works, and what happens after a local business checkup.`,
  alternates: { canonical: `${SITE_URL}/faq` },
  openGraph: {
    title: `FAQ | ${BRAND}`,
    description: `Answers about ${BRAND}'s local business presence checkup.`,
    url: `${SITE_URL}/faq`
  }
};

export default function FAQPage() {
  return (
    <main className="min-h-screen bg-paper px-4 py-6 text-ink sm:px-5 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqSchema()) }} />
      <article className="mx-auto max-w-4xl rounded-2xl border border-line bg-surface p-5 shadow-soft sm:p-8">
        <Link className="link text-sm font-bold" href="/">← Back to {BRAND}</Link>
        <p className="eyebrow mt-8">FAQ</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-ink sm:text-5xl">Clear answers before you run a checkup.</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700">
          StreetSignal checks public-facing business information. These answers match the current live product and avoid promises the scanner cannot support yet.
        </p>

        <div className="faq-list mt-8">
          {STREET_SIGNAL_FAQS.map(([question, answer]) => (
            <details className="faq-item" key={question}>
              <summary>{question}</summary>
              <div className="faq-answer"><p>{answer}</p></div>
            </details>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-line bg-nested-surface p-4 text-sm leading-6 text-slate-700">
          <p className="font-black text-ink">Ready to check a business?</p>
          <p className="mt-1">Return to the homepage and run the free public-presence checkup. No account or listing access required.</p>
          <Link className="primary-button mt-4" href="/#business-search">Run my free checkup</Link>
        </div>
      </article>
    </main>
  );
}

function buildFaqSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: STREET_SIGNAL_FAQS.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer }
    }))
  };
}
