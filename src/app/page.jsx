"use client";

import { useEffect, useMemo, useState } from "react";
import { AuditDashboard } from "@/components/AuditDashboard";
import { BusinessSearch } from "@/components/BusinessSearch";
import { NewAuditForm } from "@/components/NewAuditForm";
import { ReportView } from "@/components/ReportView";
import { BRAND, OFFER } from "@/lib/brand";
import { getAudits, saveAudit, seedAuditsIfEmpty } from "@/lib/auditStore";
import { buildAudit } from "@/lib/buildAudit";
import { decodeAuditFromUrl } from "@/lib/shareLinks";

const SETTINGS_KEY = "digitalHealthScore.settings.v1";
const REQUESTS_KEY = "businessScope.requests.v1";
const OFFER_LABEL = OFFER.charAt(0).toUpperCase() + OFFER.slice(1);

const defaultSettings = {
  preparerName: "Your Studio"
};

export default function Home() {
  const [audits, setAudits] = useState([]);
  const [selectedAuditId, setSelectedAuditId] = useState(null);
  const [sharedAudit, setSharedAudit] = useState(null);
  const [view, setView] = useState("splash");
  const [settings, setSettings] = useState(defaultSettings);
  const [ownerMode, setOwnerMode] = useState(false);

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
  }

  function handleSettingsChange(nextSettings) {
    setSettings(nextSettings);
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings));
  }

  return (
    <main className="min-h-screen">
      <header className="no-print sticky top-0 z-20 border-b border-line bg-surface/92 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-stretch gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <button className="text-left" aria-label={`${BRAND} home`} onClick={() => setView("splash")}>
            <span className="block text-2xl font-black uppercase leading-none tracking-[0.16em] text-ink md:text-3xl">{BRAND}</span>
          </button>
          {!sharedAudit && (
            <nav className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:justify-end sm:overflow-visible sm:px-0 sm:pb-0">
              <button className={navClass(view === "splash")} onClick={() => setView("splash")}>Home</button>
              <button className={navClass(view === "request")} onClick={() => setView("request")}>Get {OFFER_LABEL}</button>
              {ownerMode && <button className={navClass(view === "dashboard")} onClick={() => setView("dashboard")}>Pipeline</button>}
              {ownerMode && <button className={navClass(view === "new")} onClick={() => setView("new")}>New Checkup</button>}
              {ownerMode && <button className={navClass(view === "report")} disabled={!selectedAudit} onClick={() => setView("report")}>Sample Report</button>}
            </nav>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-5 sm:py-6">
        {view === "splash" && <PublicHome onRequest={() => setView("request")} onAuditComplete={handleCreateAudit} />}
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
          <ReportView audit={selectedAudit} preparerName={sharedAudit?.preparerName ?? settings.preparerName} prospectMode={Boolean(sharedAudit)} />
        )}
      </div>
    </main>
  );
}

function PublicHome({ onRequest, onAuditComplete }) {
  return (
    <div className="grid gap-5">
      <section className="panel overflow-hidden bg-ink text-white">
        <div className="px-5 py-6 sm:px-7 sm:py-7 md:px-9 md:py-9">
          <h2 className="max-w-4xl text-3xl font-black leading-tight tracking-tight sm:text-4xl md:text-6xl">
            Wrong details send ready customers <span className="text-brand-soft">somewhere else.</span>
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200">
            {BRAND} checks the public details customers rely on before they call, visit, book, or order. You get a plain-English snapshot and the first fixes that matter.
          </p>
          <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
            <button className="primary-button w-full sm:w-auto" onClick={onRequest}>Get my free {OFFER}</button>
            <a className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-white/25 px-5 py-3 text-sm font-black text-white transition hover:border-white hover:bg-white/10 sm:w-auto" href="#sample-snapshot">See a sample {OFFER}</a>
          </div>
          <BusinessSearch onAuditComplete={onAuditComplete} />
        </div>

        <div className="grid border-t border-white/15 bg-white/6 md:grid-cols-3">
          <ProofPoint title="Accuracy" body="Hours, phone, address, services, menus, and links." dark />
          <ProofPoint title="Trust" body="Google profile, reviews, photos, and business details." dark />
          <ProofPoint title="Action" body="Call, quote, booking, ordering, and lead paths." dark />
        </div>
      </section>

      <WhatYouGet />
      <SampleVisibilitySnapshot />
      <SocialProof />
      <FaqSection />
      <NoPressure onRequest={onRequest} />
      <SiteFooter />
    </div>
  );
}

function WhatYouGet() {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-line bg-surface p-5">
        <p className="eyebrow">What you get</p>
        <h3 className="mt-3 text-2xl font-black text-ink">A plain-English snapshot, not a generic marketing report.</h3>
      </div>
      <div className="grid md:grid-cols-3">
        <PreviewLine label="Score" value="A simple 0-100 signal" />
        <PreviewLine label="Gaps" value="What may be costing calls, visits, or orders" />
        <PreviewLine label="Priorities" value="The first fixes that matter most" />
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
        <h2 className="mt-3 text-3xl font-black text-ink">Your {OFFER} request is ready.</h2>
        <p className="mt-3 leading-7 text-slate-700">
          This working version saves requests in the browser for now. The next production step is connecting this form to email or a small database.
        </p>
      </section>
    );
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="panel p-5 sm:p-7">
        <p className="eyebrow">Free {OFFER}</p>
        <h2 className="mt-3 text-3xl font-black tracking-tight text-ink sm:text-4xl">See what customers see before they choose you.</h2>
        <p className="mt-4 leading-7 text-slate-700">
          Send the basics. We check the public details that affect trust, visibility, and action.
        </p>
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

function ProofPoint({ title, body, dark = false }) {
  return (
    <div className={dark ? "border-b border-white/15 p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 md:border-white/15" : "border-b border-line p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"}>
      <h3 className={dark ? "font-black text-white" : "font-black text-ink"}>{title}</h3>
      <p className={dark ? "mt-2 text-sm leading-6 text-slate-300" : "mt-2 text-sm leading-6 text-slate-600"}>{body}</p>
    </div>
  );
}

function SampleVisibilitySnapshot() {
  return (
    <section id="sample-snapshot" className="scroll-mt-28 overflow-hidden rounded-lg border border-line bg-surface">
      <div className="border-b border-line bg-nested-surface p-5">
        <p className="eyebrow">See what your snapshot looks like</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          A real snapshot example (business name hidden). Green is working, red is costing you customers.
        </p>
      </div>

      <div className="p-5">
        <div className="rounded-lg border border-line bg-nested-surface p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Overall readiness</p>
              <p className="mt-2 text-sm font-black text-signal-amber sm:max-w-[220px]">Findable, but leaking calls.</p>
            </div>
            <ScoreGauge score={61} />
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <CategorySample
            title="Accuracy"
            score="72"
            items={[
              { status: "working", text: "Phone and address consistent across Google and site" },
              { status: "costing", text: "Hours on Google don't match the website" },
              { status: "costing", text: "Menu link returns a 404" }
            ]}
          />
          <CategorySample
            title="Trust"
            score="35"
            items={[
              { status: "costing", text: "Only 9 Google reviews; competitor has 140+" },
              { status: "costing", text: "No photos added in the last 12 months" },
              { status: "working", text: "Business category set correctly" }
            ]}
          />
          <CategorySample
            title="Action"
            score="63"
            items={[
              { status: "working", text: "Click-to-call works on mobile" },
              { status: "costing", text: "No booking or quote path \u2014 customers must phone during business hours" }
            ]}
          />
        </div>

        <div className="mt-4 rounded-lg border border-line bg-nested-surface p-4">
          <h4 className="font-black text-ink">Fix these first</h4>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
            <li>Correct your Google hours (customers turned away = lost trips)</li>
            <li>Add a quote/booking button so people can act after hours</li>
            <li>Ask your last 20 happy customers for a review</li>
          </ol>
        </div>
      </div>
    </section>
  );
}

function SocialProof() {
  return (
    <section className="panel p-5">
      <p className="eyebrow">Founder note</p>
      <h3 className="mt-3 text-2xl font-black text-ink">Why I built {BRAND}</h3>
      <blockquote className="mt-3 rounded-lg border border-line bg-nested-surface p-4 text-sm leading-6 text-slate-700">
        <p>
          I kept watching good local businesses lose customers over small, fixable things: wrong hours on Google, a dead menu link, a phone number that didn&apos;t match. Stuff the owner had no idea was costing them. {BRAND}{" "}is the snapshot I wish those businesses had: plain-English, no jargon, no sales pressure. Just a clear picture of what&apos;s leaking customers and what to fix first.
        </p>
      </blockquote>
      <p className="mt-4 text-sm leading-6 text-slate-700">
        Built for small businesses that need practical online cleanup, not another confusing marketing dashboard.
      </p>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-line bg-surface p-5">
        <p className="eyebrow">Questions</p>
        <h3 className="mt-3 text-2xl font-black text-ink">How the snapshot works</h3>
      </div>
      <div className="divide-y divide-line bg-surface">
        <FaqItem
          question="How is my score calculated?"
          answer="Your snapshot looks at the things a customer actually notices before they call, visit, or order: grouped into a few areas: your Google Business Profile, the accuracy of your details (hours, phone, address), your reviews, your website, how easily you show up in local &quot;near me&quot; searches, and how simple it is for someone to reach you. Each area is weighted and adds up to a single 0-100 score. Restaurants and food businesses get an extra area for menus and online ordering."
        />
        <FaqItem
          question={`Does ${BRAND} scan my business automatically?`}
          answer="Not yet, and that's on purpose. Right now a real person reviews your business the way a customer would and records what they find, so the score reflects a human judgment call, not a bot guessing. Automatic pre-filling (pulling some details straight from Google) is something we may add later, but the snapshot itself will always be a plain-English read, not a raw data dump."
        />
        <FaqItem
          question="What do the colors mean?"
          answer="Green (71-100) means that area is working. Amber (41-70) means it needs attention. Red (0-40) means it's likely costing you customers right now."
        />
        <FaqItem
          question="Is the sample on the homepage a real business?"
          answer="No, it's an illustrative example so you can see what a finished snapshot looks like. Your own snapshot is based on your actual details."
        />
        <details className="group p-5">
          <summary className="cursor-pointer list-none font-black text-ink focus:outline-none focus:ring-2 focus:ring-brand/20">
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true" className="text-brand">+</span>
              How long does it take and what does it cost?
            </span>
          </summary>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            TODO: Add the real timing and pricing answer before publishing this FAQ item.
          </p>
        </details>
      </div>
    </section>
  );
}

function FaqItem({ question, answer }) {
  return (
    <details className="group p-5">
      <summary className="cursor-pointer list-none font-black text-ink focus:outline-none focus:ring-2 focus:ring-brand/20">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="text-brand">+</span>
          {question}
        </span>
      </summary>
      <p className="mt-3 text-sm leading-6 text-slate-700">{answer}</p>
    </details>
  );
}
function NoPressure({ onRequest }) {
  return (
    <section className="panel p-5">
      <p className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">No pressure</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        The first {OFFER} is just a starting point. If the gaps are useful, we can talk about fixing them.
      </p>
      <button className="primary-button mt-4 w-full sm:w-auto" onClick={onRequest}>Get my free {OFFER}</button>
    </section>
  );
}

function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="flex flex-col gap-3 border-t border-line px-1 py-5 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-black text-ink">{BRAND}</p>
        <p className="mt-1">&copy; {year} {BRAND}. All rights reserved.</p>
      </div>
      <nav className="flex gap-4 font-bold">
        <a className="hover:text-brand" href="/privacy">Privacy</a>
        {/* TODO: Replace hello@example.com with the real inbox. */}
        <a className="hover:text-brand" href="mailto:hello@example.com">Contact</a>
      </nav>
    </footer>
  );
}
function CategorySample({ title, score, items }) {
  const band = getScoreBand(score);

  return (
    <div className={`rounded-lg border border-line border-l-4 bg-nested-surface p-4 ${band.borderClass}`}>
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-black text-ink">{title}</h4>
        <span className={`text-sm font-black ${band.textClass}`}>{score}</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/10" aria-label={`${title} score ${score} out of 100`}>
        <div className={`h-full rounded-full ${band.fillClass}`} style={{ width: `${score}%` }} />
      </div>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <StatusItem key={item.text} status={item.status} text={item.text} />
        ))}
      </div>
    </div>
  );
}

function ScoreGauge({ score }) {
  const band = getScoreBand(score);
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="flex items-center gap-4">
      <svg className="h-28 w-28" viewBox="0 0 120 120" role="img" aria-label={`Overall readiness score ${score} out of 100`}>
        <circle className="stroke-ink/10" cx="60" cy="60" r={radius} fill="none" strokeWidth="12" />
        <circle
          className={band.strokeClass}
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
        />
        <text className={`fill-current text-2xl font-black ${band.textClass}`} x="60" y="57" textAnchor="middle">{score}</text>
        <text className="fill-current text-[11px] font-black uppercase tracking-wide text-slate-500" x="60" y="76" textAnchor="middle">/ 100</text>
      </svg>
    </div>
  );
}

function StatusItem({ status, text }) {
  const isWorking = status === "working";
  return (
    <div className="flex gap-2 text-sm leading-5 text-slate-700">
      <span
        aria-label={isWorking ? "Working" : "Costing customers"}
        className={isWorking ? "font-black text-signal-green" : "font-black text-signal-red"}
      >
        {isWorking ? "\u2713" : "\u2717"}
      </span>
      <span><strong>{isWorking ? "Working:" : "Needs fix:"}</strong> {text}</span>
    </div>
  );
}

function getScoreBand(score) {
  if (score >= 71) {
    return {
      borderClass: "border-l-signal-green",
      fillClass: "bg-signal-green",
      strokeClass: "stroke-signal-green",
      textClass: "text-signal-green"
    };
  }

  if (score >= 41) {
    return {
      borderClass: "border-l-signal-amber",
      fillClass: "bg-signal-amber",
      strokeClass: "stroke-signal-amber",
      textClass: "text-signal-amber"
    };
  }

  return {
    borderClass: "border-l-signal-red",
    fillClass: "bg-signal-red",
    strokeClass: "stroke-signal-red",
    textClass: "text-signal-red"
  };
}
function PreviewLine({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <span className="max-w-[260px] text-right text-sm font-bold leading-5 text-ink">{value}</span>
    </div>
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
