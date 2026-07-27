"use client";

import { useEffect, useState } from "react";

const initialForm = {
  name: "",
  businessName: "",
  email: "",
  website: "",
  reportLink: "",
  priorities: ""
};

const PACKAGES = {
  sandbox: { label: "Sandbox Fix", price: "$49", description: "Full cleanup built and shown, with a few fixes live." },
  full: { label: "Full Cleanup", price: "$297", description: "Makes every fixed issue live." }
};

export function CleanupRequestForm() {
  const [form, setForm] = useState(initialForm);
  const [packageChoice, setPackageChoice] = useState("full");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // The two pricing cards on this page link to #cleanup-request-sandbox /
  // #cleanup-request-full (anchors placed right above this form) so the
  // right package is pre-selected on arrival; the generic hero/final-cta
  // CTAs still use #cleanup-request and fall back to Full Cleanup. Both
  // buttons are on this same page, so a click only changes the URL hash
  // without remounting the form - a mount-only effect would miss it, so
  // this also listens for hashchange.
  useEffect(() => {
    function syncFromHash() {
      if (window.location.hash === "#cleanup-request-sandbox") setPackageChoice("sandbox");
      else if (window.location.hash === "#cleanup-request-full") setPackageChoice("full");
    }
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ package: packageChoice, ...form })
      });
      const data = await response.json();
      if (!response.ok || !data.ok || !data.url) {
        throw new Error(data.error || "Checkout failed. Please try again.");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form id="cleanup-request" className="diagnostic-form grid gap-4" onSubmit={submit}>
      <div>
        <p className="eyebrow">Request cleanup plan</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-ink sm:text-3xl">Tell us what to clean up first.</h2>
      </div>

      <Field label="Which service?" required>
        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          {Object.entries(PACKAGES).map(([value, pkg]) => (
            <button
              key={value}
              type="button"
              className={`confirmation-card ${packageChoice === value ? "active" : ""}`}
              onClick={() => setPackageChoice(value)}
              aria-pressed={packageChoice === value}
            >
              <span className="block text-sm font-black text-ink">{pkg.label} — {pkg.price}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-700">{pkg.description}</span>
            </button>
          ))}
        </div>
      </Field>

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
        <Field label="Link to Thorost report" hint="optional">
          <input className="input" type="url" inputMode="url" placeholder="https://business-scope.vercel.app/..." value={form.reportLink} onChange={(event) => update("reportLink", event.target.value)} />
        </Field>
      </div>

      <Field label="Anything specific you want prioritized" hint="optional">
        <textarea className="input min-h-32 resize-y" value={form.priorities} onChange={(event) => update("priorities", event.target.value)} />
      </Field>

      <button className="primary-button w-full sm:w-auto" type="submit" disabled={loading}>
        {loading ? "Redirecting to payment…" : `Pay ${PACKAGES[packageChoice].price} for ${PACKAGES[packageChoice].label}`}
      </button>
      {error && <p className="text-sm font-bold leading-6 text-red-600">{error}</p>}
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
