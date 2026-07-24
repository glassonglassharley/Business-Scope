"use client";

import { useState } from "react";

const initialForm = {
  name: "",
  businessName: "",
  email: "",
  website: "",
  reportLink: "",
  priorities: ""
};

export function CleanupRequestForm({ contactEmail }) {
  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submit(event) {
    event.preventDefault();
    const subject = encodeURIComponent(`Cleanup plan request: ${form.businessName}`);
    const body = encodeURIComponent([
      `Name: ${form.name}`,
      `Business name: ${form.businessName}`,
      `Email: ${form.email}`,
      `Website: ${form.website || "Not provided"}`,
      `StreetSignal report: ${form.reportLink || "Not provided"}`,
      "",
      "Priorities:",
      form.priorities || "Not provided"
    ].join("\n"));

    window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  }

  return (
    <form id="cleanup-request" className="diagnostic-form grid gap-4" onSubmit={submit}>
      <div>
        <p className="eyebrow">Request cleanup plan</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-ink sm:text-3xl">Tell us what to clean up first.</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name" required>
          <input className="input" required autoComplete="name" value={form.name} onChange={(event) => update("name", event.target.value)} />
        </Field>
        <Field label="Business name" required>
          <input className="input" required autoComplete="organization" value={form.businessName} onChange={(event) => update("businessName", event.target.value)} />
        </Field>
        <Field label="Email" required>
          <input className="input" required type="email" autoComplete="email" value={form.email} onChange={(event) => update("email", event.target.value)} />
        </Field>
        <Field label="Website" hint="optional">
          <input className="input" type="url" inputMode="url" placeholder="https://example.com" value={form.website} onChange={(event) => update("website", event.target.value)} />
        </Field>
        <Field label="Link to StreetSignal report" hint="optional">
          <input className="input" type="url" inputMode="url" placeholder="https://business-scope.vercel.app/..." value={form.reportLink} onChange={(event) => update("reportLink", event.target.value)} />
        </Field>
      </div>

      <Field label="Anything specific you want prioritized" hint="optional">
        <textarea className="input min-h-32 resize-y" value={form.priorities} onChange={(event) => update("priorities", event.target.value)} />
      </Field>

      <button className="primary-button w-full sm:w-auto" type="submit">Request cleanup plan</button>
      {submitted && <p className="text-sm font-bold leading-6 text-slate-700">Your email client should open with the cleanup request filled in.</p>}
    </form>
  );
}

function Field({ label, hint, required = false, children }) {
  return (
    <label className="field-label">
      <span>{label}{required && <span className="text-brand"> *</span>} {hint && <span className="text-xs uppercase tracking-[0.12em] text-slate-500">{hint}</span>}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
