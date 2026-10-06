import Image from "next/image";
import { SITE_URL } from "@/lib/brand";

const SCANNER_URL = "https://opt.buzzbullmarketing.com/registration";
const BUZZBULL_LOGO = "/buzzbull-logo.png";

export const metadata = {
  title: { absolute: "Free Business Scanner | BuzzBull Marketing Systems" },
  description: "Run a free Thorost-powered business scanner through BuzzBull Marketing Systems and see which public presence gaps may be costing calls, bookings, and clients.",
  alternates: { canonical: `${SITE_URL}/free-snapshot` },
  openGraph: {
    title: "Free Business Scanner | BuzzBull Marketing Systems",
    description: "A free business scanner for local business owners, powered by Thorost and routed through BuzzBull Marketing Systems.",
    url: `${SITE_URL}/free-snapshot`
  }
};

const scanSteps = [
  "Enter your business and market.",
  "Thorost Scanner checks public presence signals.",
  "BuzzBull shows the weak links and next steps."
];

const growthLinks = [
  ["01", "Capture leads", "Turn traffic and attention into trackable opportunities."],
  ["02", "Speed to leads", "Respond while interest is high and before a competitor does."],
  ["03", "Nurture leads", "Stay in the conversation until a prospect is ready."],
  ["04", "Generate leads", "Create consistent opportunity beyond word-of-mouth referrals."],
  ["05", "Convert leads", "Improve the sales process that turns interest into customers."],
  ["06", "Execute & scale", "Connect strategy, accountability, measurement, and implementation."]
];

const examples = [
  {
    name: "Example 1 — Dental clinic",
    score: "76",
    issue: "Booking link mismatch",
    note: "Listing sends patients to an old scheduler while the website uses a new request form.",
    fix: "Fix first: align every appointment link before spending more on ads."
  },
  {
    name: "Example 2 — Home services",
    score: "61",
    issue: "Slow speed-to-lead",
    note: "Calls after hours go unanswered and web forms do not trigger fast follow-up.",
    fix: "Fix first: add AI phone coverage and instant text follow-up."
  },
  {
    name: "Example 3 — Local restaurant",
    score: "83",
    issue: "Menu trust gap",
    note: "Prices and hours differ across the website, Google profile, and third-party directories.",
    fix: "Fix first: sync menu, hours, and profile details across public sources."
  }
];

function ScannerCard() {
  return (
    <aside className="border border-[#f97316]/45 bg-[#081523] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.36)] sm:p-7">
      <p className="font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">Free business scanner</p>
      <p className="mt-2 text-sm font-semibold text-[#8fa3b7]">Powered by Thorost Scanner · delivered through BuzzBull</p>
      <div className="mt-5 border border-[#f97316]/35 bg-[#241f23] px-5 py-4">
        <span className="text-2xl font-black text-[#8fa3b7] line-through">$199</span>
        <span className="ml-4 text-3xl font-black uppercase text-[#f97316]">Free</span>
        <span className="float-right mt-2 hidden text-xs font-bold text-[#8fa3b7] sm:block">Local business scan</span>
      </div>
      <form action={SCANNER_URL} className="mt-5 rounded-2xl bg-white p-5 text-[#111111] shadow-2xl" method="get">
        <p className="text-center text-sm font-black uppercase tracking-[0.16em] text-[#f97316]">Open the free business scanner</p>
        <label className="mt-5 block text-xs font-black uppercase tracking-[0.14em] text-[#1b2c3c]" htmlFor="business-name">Business name</label>
        <input id="business-name" name="business" className="mt-2 w-full rounded-md border border-slate-300 px-4 py-3 text-base font-semibold outline-none transition focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/25" placeholder="Example: Harbor City Dental" />
        <label className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-[#1b2c3c]" htmlFor="city-area">City or area</label>
        <input id="city-area" name="area" className="mt-2 w-full rounded-md border border-slate-300 px-4 py-3 text-base font-semibold outline-none transition focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/25" placeholder="City, neighborhood, or service area" />
        <label className="mt-4 block text-xs font-black uppercase tracking-[0.14em] text-[#1b2c3c]" htmlFor="website">Website or Google profile</label>
        <input id="website" name="website" className="mt-2 w-full rounded-md border border-slate-300 px-4 py-3 text-base font-semibold outline-none transition focus:border-[#f97316] focus:ring-2 focus:ring-[#f97316]/25" placeholder="Optional" />
        <button className="mt-5 w-full bg-[#f97316] px-5 py-4 text-lg font-black uppercase tracking-[0.08em] text-white transition hover:bg-[#ff8a2a]" type="submit">Continue to scanner</button>
      </form>
      <p className="mt-4 text-center text-sm text-[#8fa3b7]">Free scan. Practical next step. No spam.</p>
    </aside>
  );
}

function DiagnosticMini() {
  return (
    <div className="mt-8 border border-[#f97316]/35 bg-[#071422] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f97316]">Thorost Scanner preview</p>
          <h3 className="mt-2 text-2xl font-black uppercase text-white">Public presence signal</h3>
        </div>
        <div className="flex h-20 w-20 items-center justify-center border-2 border-[#f97316] text-4xl font-black text-white">76</div>
      </div>
      <div className="mt-5 grid gap-3">
        {[
          ["Menu", "medium", "Prices differ from the website."],
          ["Photos", "low", "Recent location photos found."],
          ["Profile", "medium", "One primary service is missing."]
        ].map(([label, tone, body]) => (
          <div key={label} className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-black text-white"><span className="mr-2 inline-block h-3 w-3 rounded-full bg-[#f97316]" />{label} <span className="uppercase tracking-[0.18em] text-[#8fa3b7]">{tone}</span></p>
            <p className="mt-1 text-sm text-[#9fb2c5]">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FreeSnapshotPage() {
  return (
    <main className="min-h-screen bg-[#081a2d] text-white">
      <div className="bg-gradient-to-r from-[#c84607] via-[#f97316] to-[#ff8a2a] px-4 py-3 text-center text-sm font-black uppercase tracking-[0.24em] text-[#15110d]">
        <span className="text-black/45 line-through">$199</span> — Free for local business owners
      </div>

      <header className="border-b border-[#f97316]/25 bg-black px-5 py-5">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <a className="bg-[#f97316] px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-black transition hover:bg-[#ff8a2a] sm:px-8" href={SCANNER_URL}>Get free scanner</a>
          <Image src={BUZZBULL_LOGO} alt="BuzzBull Marketing Systems" width={959} height={540} className="h-20 w-auto object-contain sm:h-24" priority />
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[#f97316]/20 bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,22,0.14),transparent_35%),linear-gradient(180deg,#07182a,#0b1d31_65%,#081a2d)] px-5 py-14 sm:py-20">
        <div className="absolute inset-y-0 left-1/2 w-px bg-gradient-to-b from-transparent via-[#f97316]/20 to-transparent" aria-hidden="true" />
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_0.86fr] lg:items-start">
          <div>
            <p className="inline-flex border border-[#f97316]/70 px-5 py-3 text-sm font-black uppercase tracking-[0.28em] text-[#f97316]">Free business scanner</p>
            <h1 className="mt-8 max-w-4xl text-5xl font-black uppercase leading-[0.95] tracking-[-0.04em] text-white sm:text-7xl lg:text-8xl">
              How much revenue is slipping through the <span className="text-[#f97316]">weakest link</span> in your marketing?
            </h1>
            <p className="mt-7 max-w-3xl text-xl leading-8 text-[#9fb2c5]"><span className="font-black text-white">You do not need another guess.</span> Use the Thorost Scanner to find public presence gaps that may be costing calls, bookings, and clients — then route the fix through BuzzBull Marketing Systems.</p>
            <ul className="mt-8 grid gap-4 text-lg text-[#dce8f4]">
              {scanSteps.map((step) => (
                <li key={step} className="flex items-center gap-4"><span className="grid h-7 w-7 place-items-center rounded-full border-2 border-[#f97316] text-[#f97316]">•</span>{step}</li>
              ))}
            </ul>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <a className="inline-flex min-h-14 items-center justify-center bg-[#f97316] px-8 py-4 text-lg font-black uppercase tracking-[0.12em] text-black shadow-[0_20px_60px_rgba(249,115,22,0.2)] transition hover:bg-[#ff8a2a]" href={SCANNER_URL}>Get the free business scanner</a>
              <p className="text-lg font-black uppercase tracking-[0.12em] text-[#f97316]"><span className="mr-2 text-[#8fa3b7] line-through">$199</span> Free today</p>
            </div>
          </div>

          <div>
            <ScannerCard />
            <DiagnosticMini />
          </div>
        </div>
      </section>

      <section className="border-b border-[#f97316]/20 px-5 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.34em] text-[#71869b]">The growth chain system™</p>
          <h2 className="mt-6 text-4xl font-black uppercase leading-tight tracking-[-0.03em] text-white sm:text-6xl">Every business grows through six links.<br /><span className="text-[#f97316]">Strengthen all six.</span></h2>
          <div className="mt-14 grid gap-8 text-left md:grid-cols-2">
            {growthLinks.map(([n, title, body]) => (
              <div key={n} className="border-t border-white/12 pt-7">
                <div className="flex gap-7">
                  <p className="text-4xl font-black text-[#f97316]">{n}</p>
                  <div>
                    <h3 className="text-2xl font-black uppercase text-white">{title}</h3>
                    <p className="mt-3 text-lg leading-7 text-[#8fa3b7]">{body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mx-auto mt-12 max-w-4xl text-lg leading-8 text-[#8fa3b7]">Most marketing companies sell one link — but an ad cannot fix slow response, a website cannot replace follow-up, and more leads cannot solve a broken sales process.</p>
        </div>
      </section>

      <section className="border-b border-[#f97316]/20 px-5 py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.86fr_1fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.32em] text-[#f97316]">Three scan examples</p>
            <h2 className="mt-5 text-4xl font-black uppercase leading-tight tracking-[-0.03em] text-white sm:text-6xl">What could the scanner find?</h2>
            <p className="mt-6 text-lg leading-8 text-[#9fb2c5]">These are illustrative examples of what the free scanner can surface. Your report depends on your actual business, market, and public presence.</p>
            <a className="mt-8 inline-flex min-h-14 items-center justify-center bg-[#f97316] px-8 py-4 text-base font-black uppercase tracking-[0.12em] text-black transition hover:bg-[#ff8a2a]" href={SCANNER_URL}>Get the free scanner</a>
          </div>
          <div className="grid gap-5">
            {examples.map((example) => (
              <article key={example.name} className="border border-[#f97316]/35 bg-[#071422] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.16)] sm:p-6">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-[#f97316]">{example.name}</p>
                    <h3 className="mt-2 text-2xl font-black text-white">{example.issue}</h3>
                    <p className="mt-2 text-base leading-7 text-[#9fb2c5]">{example.note}</p>
                  </div>
                  <div className="grid h-16 w-16 shrink-0 place-items-center border-2 border-[#f97316] text-3xl font-black text-white">{example.score}</div>
                </div>
                <p className="mt-4 border-l-4 border-[#f97316] bg-white/5 p-4 text-base font-semibold text-[#dce8f4]">{example.fix}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 text-center sm:py-24">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-4xl font-black uppercase leading-tight tracking-[-0.03em] text-white sm:text-6xl">Every week you wait can be another week of missed opportunity.</h2>
          <p className="mx-auto mt-6 max-w-4xl text-lg leading-8 text-[#9fb2c5]">Run the free Thorost Scanner through BuzzBull Marketing Systems and leave with a clearer view of which link may need attention first.</p>
          <div className="mx-auto mt-10 inline-block border border-[#f97316]/45 px-8 py-5">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#71869b]">Scanner value</p>
            <p className="mt-2 text-2xl font-black uppercase"><span className="text-[#8fa3b7] line-through">$199</span> <span className="text-[#f97316]">Free</span></p>
          </div>
          <div className="mt-7">
            <a className="inline-flex min-h-16 items-center justify-center bg-[#f97316] px-10 py-5 text-xl font-black uppercase tracking-[0.12em] text-black shadow-[0_24px_90px_rgba(249,115,22,0.2)] transition hover:bg-[#ff8a2a]" href={SCANNER_URL}>Open my free business scanner</a>
          </div>
          <p className="mt-4 text-[#8fa3b7]">Free scan. Practical next step. No spam.</p>
        </div>
      </section>

      <footer className="border-t border-[#f97316]/20 bg-black px-5 py-10">
        <div className="mx-auto max-w-7xl">
          <Image src={BUZZBULL_LOGO} alt="BuzzBull Marketing Systems" width={959} height={540} className="h-20 w-auto object-contain" />
          <p className="mt-6 text-sm text-[#71869b]">© 2026 BuzzBull Marketing Systems. Thorost Scanner is used as a diagnostic engine for public business presence review.</p>
          <p className="mt-5 max-w-5xl text-sm leading-6 text-[#71869b]">Disclaimer: Examples and calculations are illustrative. Results vary by business, market, offer, execution, and other factors. No specific outcome is guaranteed.</p>
        </div>
      </footer>
    </main>
  );
}
