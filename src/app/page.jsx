"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuditDashboard } from "@/components/AuditDashboard";
import { BusinessSearch } from "@/components/BusinessSearch";
import { NewAuditForm } from "@/components/NewAuditForm";
import { ReportView } from "@/components/ReportView";
import { BRAND, CONTACT_EMAIL, OFFER, SITE_URL } from "@/lib/brand";
import { getAudits, saveAudit, seedAuditsIfEmpty } from "@/lib/auditStore";
import { buildAudit } from "@/lib/buildAudit";
import { decodeAuditFromUrl } from "@/lib/shareLinks";

const SETTINGS_KEY = "digitalHealthScore.settings.v1";
const REQUESTS_KEY = "businessScope.requests.v1";
const OFFER_LABEL = OFFER.charAt(0).toUpperCase() + OFFER.slice(1);
const FOOTER_CONTACT_EMAIL = CONTACT_EMAIL || "hello@streetsignal.com";

const defaultSettings = {
  preparerName: BRAND
};

const problemCardSets = [
  [
    { title: "Conflicting business hours", body: "Conflicting hours can cause customers to arrive when the business is closed.", status: "High", picture: "clock" },
    { title: "Broken booking or ordering links", body: "A broken booking link can stop an interested customer at the final step.", status: "Critical", picture: "link" },
    { title: "Missing services or categories", body: "Missing services can keep the business from appearing for the searches customers actually use.", status: "Medium", picture: "services" },
    { title: "Inconsistent phone, address, or website details", body: "Conflicting contact details make customers hesitate, call the wrong number, or choose a competitor.", status: "High", picture: "contact" }
  ],
  [
    { title: "Old address still showing", body: "Customers can drive to the wrong place when old suite, address, or service-area details remain public.", status: "Critical", picture: "contact" },
    { title: "Closed-day calls still coming in", body: "Outdated open-now signals make people call or visit when nobody is available to help.", status: "High", picture: "clock" },
    { title: "Service pages do not match listings", body: "Customers may skip the business when the listing and website describe different services.", status: "Medium", picture: "services" },
    { title: "Quote request link is hidden", body: "A hard-to-find action path can make ready buyers give up before asking for help.", status: "High", picture: "link" }
  ],
  [
    { title: "Menu or price details conflict", body: "Mismatched menu, service, or price details can make customers question what is actually available.", status: "High", picture: "services" },
    { title: "Website contact form fails", body: "A broken form can lose high-intent customers who do not want to call.", status: "Critical", picture: "link" },
    { title: "Holiday hours are missing", body: "Customers hesitate when special hours are not clear around holidays or seasonal changes.", status: "Medium", picture: "clock" },
    { title: "Wrong phone number on a directory", body: "One bad directory listing can send calls to a dead line or a competitor.", status: "High", picture: "contact" }
  ],
  [
    { title: "Mobile booking flow breaks", body: "Customers on phones can hit an error right when they are ready to schedule.", status: "Critical", picture: "link" },
    { title: "Primary category is too vague", body: "A weak category can keep the business out of the searches customers actually use.", status: "Medium", picture: "services" },
    { title: "Phone and website disagree", body: "Conflicting contact details make customers unsure which source to trust.", status: "High", picture: "contact" },
    { title: "Hours look incomplete", body: "Partial hours can make customers wonder whether the business is open, closed, or still operating.", status: "High", picture: "clock" }
  ]
];

const howItWorks = [
  "Find and confirm your business.",
  "StreetSignal checks the public customer journey.",
  "Review issues ranked by likely customer impact.",
  "Fix them yourself or request help."
];

const trustPoints = [
  "No Google password required",
  "No listing access required for the initial scan",
  "No changes made without approval",
  "Public sources shown with each finding",
  "Clear timestamps",
  "No fabricated revenue-loss claims"
];

const previewExamples = [
  {
    score: 91,
    scoreTone: "good",
    signals: [
      { label: "Booking link", status: "Low", body: "Mobile booking completed cleanly." },
      { label: "Hours", status: "Low", body: "Website and listing hours match." },
      { label: "Reviews", status: "Low", body: "Recent replies and strong rating found." }
    ],
    fixFirst: "Keep the review response cadence active so the strong trust signal stays current."
  },
  {
    score: 68,
    scoreTone: "middle",
    signals: [
      { label: "Booking link", status: "Critical", body: "Error returned on mobile." },
      { label: "Hours", status: "High", body: "Saturday mismatch found." },
      { label: "Services", status: "Medium", body: "Two core services missing." }
    ],
    fixFirst: "Repair the booking link because it directly blocks customer action."
  },
  {
    score: 43,
    scoreTone: "bad",
    signals: [
      { label: "Phone number", status: "Critical", body: "Listing and website numbers conflict." },
      { label: "Website", status: "High", body: "Contact page fails to load." },
      { label: "Photos", status: "Medium", body: "No recent proof found." }
    ],
    fixFirst: "Correct the phone number everywhere before customers call the wrong line."
  },
  {
    score: 76,
    scoreTone: "middle",
    signals: [
      { label: "Menu", status: "Medium", body: "Prices differ from the website." },
      { label: "Photos", status: "Low", body: "Recent location photos found." },
      { label: "Profile", status: "Medium", body: "One primary service is missing." }
    ],
    fixFirst: "Align the menu prices across public surfaces so customers do not hesitate."
  },
  {
    score: 27,
    scoreTone: "bad",
    signals: [
      { label: "Hours", status: "Critical", body: "Open-now status conflicts with website." },
      { label: "Address", status: "High", body: "Old suite number still appears." },
      { label: "Reviews", status: "High", body: "Low recent volume weakens trust." }
    ],
    fixFirst: "Fix hours and address first so customers can safely decide when and where to visit."
  }
];

export default function Home() {
  const [audits, setAudits] = useState([]);
  const [selectedAuditId, setSelectedAuditId] = useState(null);
  const [sharedAudit, setSharedAudit] = useState(null);
  const [view, setView] = useState("splash");
  const [settings, setSettings] = useState(defaultSettings);
  const [ownerMode, setOwnerMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const url = new URL(window.location.href);
      const auditFromUrl = decodeAuditFromUrl(window.location.href);
      if (auditFromUrl) {
        setSharedAudit(auditFromUrl);
        setView("report");
        return;
      }

      window.localStorage.removeItem("businessScope.ownerMode.v1");
      setOwnerMode(url.searchParams.get("owner") === "1");

      seedAuditsIfEmpty();
      const loadedAudits = getAudits();
      setAudits(loadedAudits);
      setSelectedAuditId(loadedAudits[0]?.id ?? null);

      const savedSettings = window.localStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      }
    });
  }, []);

  const selectedAudit = useMemo(() => {
    if (sharedAudit) return sharedAudit;
    return audits.find((audit) => audit.id === selectedAuditId) ?? audits[0];
  }, [audits, selectedAuditId, sharedAudit]);

  function handleCreateAudit(formData) {
    const audit = buildAudit(formData);
    const nextAudits = saveAudit(audit);
    setAudits(nextAudits);
    setSelectedAuditId(audit.id);
    setSharedAudit(null);
    setView("report");
    requestAnimationFrame(() => document.getElementById("report-top")?.scrollIntoView({ block: "start" }));
  }

  function handleSettingsChange(nextSettings) {
    setSettings(nextSettings);
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings));
  }

  const navItems = [
    ["How It Works", "#how-it-works"],
    ["Sample Report", "/sample-report"],
    ["Cleanup", "/cleanup"],
    ["What We Check", "/what-we-check"],
    ["FAQ", "/faq"],
    ["Run a Checkup", "#business-search"]
  ];

  return (
    <main className="min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildSchema()) }} />
      <header className="no-print sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-5">
          <button className="wordmark" aria-label={`${BRAND} home`} onClick={() => setView("splash")}>
            <span className="wordmark-mark" aria-hidden="true">SS</span>
            <span>{BRAND}</span>
          </button>
          {!sharedAudit && (
            <>
              <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
                {view === "splash" && navItems.map(([label, href]) => <Link key={label} className="nav-link" href={href}>{label}</Link>)}
                {ownerMode && <button className={navClass(view === "dashboard")} onClick={() => setView("dashboard")}>Checkups</button>}
                {ownerMode && <button className={navClass(view === "new")} onClick={() => setView("new")}>New Checkup</button>}
                {ownerMode && <button className={navClass(view === "report")} disabled={!selectedAudit} onClick={() => setView("report")}>Saved Report</button>}
              </nav>
              <button className="secondary-button lg:hidden" type="button" aria-expanded={mobileMenuOpen} aria-controls="mobile-menu" onClick={() => setMobileMenuOpen((open) => !open)}>
                Menu
              </button>
            </>
          )}
        </div>
        {mobileMenuOpen && view === "splash" && (
          <nav id="mobile-menu" className="grid gap-2 border-t border-line bg-surface px-4 py-3 lg:hidden" aria-label="Mobile navigation">
            {navItems.map(([label, href]) => <Link key={label} className="nav-link" href={href} onClick={() => setMobileMenuOpen(false)}>{label}</Link>)}
          </nav>
        )}
      </header>

      <div id="report-top" className="mx-auto max-w-7xl px-4 py-5 sm:px-5 sm:py-6">
        {view === "splash" && <PublicHome onAuditComplete={handleCreateAudit} />}
        {view === "request" && <VisibilitySnapshotRequest />}

        {ownerMode && view === "dashboard" && (
          <AuditDashboard
            audits={audits}
            selectedAuditId={selectedAudit?.id}
            onSelect={(auditId) => {
              setSelectedAuditId(auditId);
              setView("report");
            }}
            settings={settings}
            onSettingsChange={handleSettingsChange}
          />
        )}

        {ownerMode && view === "new" && <NewAuditForm onSubmit={handleCreateAudit} />}

        {view === "report" && selectedAudit && (
          <ReportView audit={selectedAudit} preparerName={sharedAudit?.preparerName ?? settings.preparerName} sharedMode={Boolean(sharedAudit)} />
        )}
      </div>
    </main>
  );
}

function PublicHome({ onAuditComplete }) {
  const checkedDate = useMemo(() => new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date()), []);

  return (
    <div className="grid gap-8">
      <section className="hero-grid">
        <div className="hero-copy">
          <h1>Find the online mistakes costing you calls, visits, bookings, and clients.</h1>
          <BusinessSearch onAuditComplete={onAuditComplete} variant="compact" />
        </div>
        <DiagnosticPreview checkedDate={checkedDate} />
      </section>

      <HowItWorks />
      <ProblemSection />
      <TrustSection />
      <CommercialPath />
      <SiteFooter />
    </div>
  );
}

function DiagnosticPreview({ checkedDate }) {
  const [preview, setPreview] = useState(previewExamples[0]);

  useEffect(() => {
    queueMicrotask(() => setPreview(selectPreviewExample()));
  }, []);

  return (
    <aside className="diagnostic-preview hidden lg:block" aria-label="Compact diagnostic result preview">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Diagnostic preview</p>
          <h2 className="mt-2 text-xl font-black text-ink">Public presence signal</h2>
        </div>
        <div className={`score-orb ${preview.scoreTone}`} aria-label={`Sample score ${preview.score} out of 100`}>{preview.score}</div>
      </div>
      <div className="mt-5 grid gap-3">
        {preview.signals.map((signal) => <SignalRow key={`${preview.score}-${signal.label}`} {...signal} />)}
      </div>
      <div className="mt-5 rounded-xl border border-line bg-nested-surface p-4 text-sm leading-6 text-slate-700">
        <strong className="text-ink">Fix First:</strong> {preview.fixFirst}
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Sample checked: {checkedDate}</p>
    </aside>
  );
}

function selectPreviewExample() {
  const storageKey = "streetSignal.previewExampleIndex.v1";
  const lastIndex = Number(window.sessionStorage.getItem(storageKey));
  const availableIndexes = previewExamples.map((_, index) => index).filter((index) => index !== lastIndex);
  const nextIndex = availableIndexes[Math.floor(Math.random() * availableIndexes.length)] ?? 0;
  window.sessionStorage.setItem(storageKey, String(nextIndex));
  return previewExamples[nextIndex];
}

function SignalRow({ label, status, body }) {
  return (
    <div className="signal-row">
      <span className={`severity-dot ${status.toLowerCase()}`} aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-black text-ink">{label} <span className="sr-only">severity</span><span className="text-xs uppercase tracking-[0.12em] text-slate-500">{status}</span></p>
        <p className="text-sm leading-6 text-slate-700">{body}</p>
      </div>
    </div>
  );
}

function ProblemSection() {
  const [cards, setCards] = useState(problemCardSets[0]);

  useEffect(() => {
    queueMicrotask(() => setCards(selectProblemCardSet()));
  }, []);

  return (
    <section className="section-grid" id="problem">
      <div>
        <p className="eyebrow">Customer friction</p>
        <h2>Customers cannot act on information they cannot trust.</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => <ProblemCard key={card.title} {...card} />)}
      </div>
    </section>
  );
}

function selectProblemCardSet() {
  const storageKey = "streetSignal.problemCardSetIndex.v1";
  const lastIndex = Number(window.sessionStorage.getItem(storageKey));
  const availableIndexes = problemCardSets.map((_, index) => index).filter((index) => index !== lastIndex);
  const nextIndex = availableIndexes[Math.floor(Math.random() * availableIndexes.length)] ?? 0;
  window.sessionStorage.setItem(storageKey, String(nextIndex));
  return problemCardSets[nextIndex];
}

function ProblemCard({ title, body, status, picture }) {
  return (
    <article className="panel-card">
      <div className={`problem-picture ${picture}`} aria-hidden="true">
        <span />
      </div>
      <span className={`severity-pill ${status.toLowerCase()}`}>{status}</span>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="panel-section scroll-mt-24">
      <div className="section-heading">
        <p className="eyebrow">How it works</p>
        <h2>Confirm the right business before the scan begins.</h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-4">
        {howItWorks.map((step, index) => <StepCard key={step} number={index + 1} step={step} />)}
      </div>
    </section>
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

function TrustSection() {
  return (
    <section className="trust-section">
      <div className="section-heading">
        <p className="eyebrow">Trust boundary</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {trustPoints.map((point) => <div key={point} className="trust-point"><span aria-hidden="true">✓</span>{point}</div>)}
      </div>
    </section>
  );
}

function CommercialPath() {
  return (
    <section className="panel-section">
      <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="eyebrow">Commercial path</p>
          <h2>The checkup is free.</h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-700">
            If you want us to fix the issues, we can provide a clearly scoped cleanup plan. Ongoing monitoring is optional.
          </p>
        </div>
        <Link className="primary-button w-full md:w-auto" href="#business-search">Run my free checkup</Link>
      </div>
    </section>
  );
}

function VisibilitySnapshotRequest() {
  const [form, setForm] = useState({ business: "", city: "", website: "", contact: "", notes: "" });
  const [submitted, setSubmitted] = useState(false);

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function submit(event) {
    event.preventDefault();
    const saved = JSON.parse(window.localStorage.getItem(REQUESTS_KEY) || "[]");
    window.localStorage.setItem(REQUESTS_KEY, JSON.stringify([{ ...form, createdAt: new Date().toISOString() }, ...saved]));
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <section className="panel mx-auto max-w-2xl p-8 text-center">
        <p className="eyebrow">Request received</p>
        <h1 className="mt-3 text-3xl font-black text-ink">Your {OFFER} request was saved on this device.</h1>
        <p className="mt-3 leading-7 text-slate-700">
          This request form currently stores submissions in your browser. Configure a real contact destination before using it for customer intake.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="panel p-5 sm:p-7">
        <p className="eyebrow">Free {OFFER}</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-ink sm:text-4xl">See what customers see before they choose you.</h1>
        <p className="mt-4 leading-7 text-slate-700">Send the basics. StreetSignal checks public details that affect trust, visibility, and action.</p>
      </div>

      <form className="panel grid gap-4 p-5 sm:p-7" onSubmit={submit}>
        <Field label="Business name"><input className="input" required value={form.business} onChange={(event) => update("business", event.target.value)} /></Field>
        <Field label="City"><input className="input" required value={form.city} onChange={(event) => update("city", event.target.value)} /></Field>
        <Field label="Website or Google profile link"><input className="input" value={form.website} onChange={(event) => update("website", event.target.value)} /></Field>
        <Field label="Best email or phone"><input className="input" required value={form.contact} onChange={(event) => update("contact", event.target.value)} /></Field>
        <Field label="Anything you already know is wrong?"><textarea className="input min-h-24 resize-y" value={form.notes} onChange={(event) => update("notes", event.target.value)} /></Field>
        <button className="primary-button w-full justify-self-stretch sm:w-auto sm:justify-self-start">Request {OFFER_LABEL}</button>
      </form>
    </section>
  );
}

function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div>
        <p className="font-black text-ink">{BRAND}</p>
        <p className="mt-1">&copy; {year} {BRAND}. Local business presence diagnostics.</p>
      </div>
      <nav className="flex flex-wrap gap-4 font-bold" aria-label="Footer navigation">
        <Link className="link" href="/sample-report">Sample Report</Link>
        <Link className="link" href="/cleanup">Cleanup</Link>
        <Link className="link" href="/privacy">Privacy</Link>
        <Link className="link" href="/faq">FAQ</Link>
        <Link className="link" href="/terms">Terms</Link>
        <a className="link" href={`mailto:${FOOTER_CONTACT_EMAIL}`}>Contact: {FOOTER_CONTACT_EMAIL}</a>
      </nav>
    </footer>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-sm font-bold text-slate-700">
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function navClass(active) {
  return [
    "shrink-0 rounded-md border px-4 py-2 text-sm font-bold transition",
    active ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink hover:border-brand hover:text-brand",
    "disabled:cursor-not-allowed disabled:opacity-40"
  ].join(" ");
}

function buildSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: BRAND,
        url: SITE_URL,
        contactPoint: CONTACT_EMAIL ? [{ "@type": "ContactPoint", email: CONTACT_EMAIL, contactType: "customer support" }] : []
      },
      {
        "@type": "WebApplication",
        name: BRAND,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: SITE_URL,
        description: "Local business public-presence diagnostic checkup for inaccurate details, trust gaps, and customer-action links."
      }
    ]
  };
}
