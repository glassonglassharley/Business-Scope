"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuditDashboard } from "@/components/AuditDashboard";
import { BusinessSearch } from "@/components/BusinessSearch";
import { NewAuditForm } from "@/components/NewAuditForm";
import { ReportView } from "@/components/ReportView";
import { BRAND, CONTACT_EMAIL, OFFER, SITE_DESCRIPTOR, SITE_URL } from "@/lib/brand";
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

const problemCards = [
  { title: "Conflicting business hours", body: "Conflicting hours can cause customers to arrive when the business is closed.", status: "High", picture: "clock" },
  { title: "Broken booking or ordering links", body: "A broken booking link can stop an interested customer at the final step.", status: "Critical", picture: "link" },
  { title: "Missing services or categories", body: "Missing services can keep the business from appearing for the searches customers actually use.", status: "Medium", picture: "services" },
  { title: "Inconsistent phone, address, or website details", body: "Conflicting contact details make customers hesitate, call the wrong number, or choose a competitor.", status: "High", picture: "contact" }
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
          <p className="eyebrow">{SITE_DESCRIPTOR}</p>
          <h1>Find the online mistakes costing you calls, visits, and bookings.</h1>
          <p className="hero-subcopy">
            {BRAND} checks the public details customers see before they contact your business—from hours and phone numbers to reviews, menus, websites, and booking links.
          </p>
          <p className="mt-3 text-sm font-bold text-slate-700">No account or listing access required.</p>
        </div>
        <DiagnosticPreview checkedDate={checkedDate} />
        <div className="hero-form-wrap">
          <BusinessSearch onAuditComplete={onAuditComplete} />
        </div>
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
  return (
    <aside className="diagnostic-preview" aria-label="Compact diagnostic result preview">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Diagnostic preview</p>
          <h2 className="mt-2 text-xl font-black text-ink">Public presence signal</h2>
        </div>
        <div className="score-orb" aria-label="Sample score 68 out of 100">68</div>
      </div>
      <div className="mt-5 grid gap-3">
        <SignalRow label="Booking link" status="Critical" body="Error returned on mobile." />
        <SignalRow label="Hours" status="High" body="Saturday mismatch found." />
        <SignalRow label="Services" status="Medium" body="Two core services missing." />
      </div>
      <div className="mt-5 rounded-xl border border-line bg-nested-surface p-4 text-sm leading-6 text-slate-700">
        <strong className="text-ink">Fix First:</strong> Repair the booking link because it directly blocks customer action.
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Sample checked: {checkedDate}</p>
    </aside>
  );
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
  return (
    <section className="section-grid" id="problem">
      <div>
        <p className="eyebrow">Customer friction</p>
        <h2>Customers cannot act on information they cannot trust.</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {problemCards.map((card) => <ProblemCard key={card.title} {...card} />)}
      </div>
    </section>
  );
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
