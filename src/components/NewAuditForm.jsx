"use client";

import { useState } from "react";

const initialForm = {
  businessName: "",
  city: "",
  industry: "Cleaning",
  websiteStatus: "none",
  mobileFriendly: false,
  loadsFast: false,
  hasSsl: false,
  gbpClaimed: false,
  gbpHours: false,
  gbpPhotos: false,
  gbpDescription: false,
  gbpPrimaryCategory: false,
  hoursAccurate: false,
  phoneAccurate: false,
  addressAccurate: false,
  servicesAccurate: false,
  averageRating: 3.7,
  reviewCount: 6,
  mapsTopThree: false,
  menuAccurate: false,
  deliveryAppsListed: false,
  deliveryItemsHavePhotos: false,
  onlineOrderingWorks: false,
  clickToCall: false,
  quoteForm: false,
  repliesFast: false,
  dataSource: "manual",
  googlePlaces: null,
  placesScoreBreakdown: null,
  websiteAudit: null
};

export function NewAuditForm({ onSubmit }) {
  const [form, setForm] = useState(initialForm);
  const [placesStatus, setPlacesStatus] = useState("idle");
  const [placesMessage, setPlacesMessage] = useState("");
  const isFoodBusiness = form.industry === "Restaurant / Food Service";

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function scanGooglePlaces() {
    setPlacesStatus("loading");
    setPlacesMessage("");

    try {
      const response = await fetch("/api/places/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: form.businessName,
          city: form.city,
          industry: form.industry
        })
      });
      const body = await response.json();

      if (!response.ok || !body.ok) {
        setPlacesStatus("error");
        setPlacesMessage(body.error?.message || "Google Places lookup failed.");
        return;
      }

      const prospect = body.prospect;
      const websiteAuditResult = await scanWebsiteForPlace(body.place);
      setForm((current) => ({
        ...current,
        businessName: prospect.businessName || current.businessName,
        city: prospect.city || current.city,
        industry: prospect.industry || current.industry,
        websiteStatus: prospect.website.status,
        hasSsl: prospect.website.hasSsl,
        gbpClaimed: prospect.googleBusinessProfile.claimed,
        gbpHours: prospect.googleBusinessProfile.hoursListed,
        gbpPhotos: prospect.googleBusinessProfile.photosPresent,
        gbpPrimaryCategory: prospect.googleBusinessProfile.primaryCategorySet,
        hoursAccurate: prospect.accuracy.hoursAccurate,
        phoneAccurate: prospect.accuracy.phoneAccurate,
        addressAccurate: prospect.accuracy.addressAccurate,
        servicesAccurate: prospect.accuracy.servicesAccurate,
        averageRating: prospect.reviews.averageRating,
        reviewCount: prospect.reviews.count,
        clickToCall: prospect.contact.clickToCall,
        dataSource: "google_places",
        googlePlaces: body.place,
        placesScoreBreakdown: body.scoreBreakdown,
        websiteAudit: websiteAuditResult.audit
      }));
      setPlacesStatus("success");
      setPlacesMessage(websiteAuditResult.ok
        ? "Google Places data added. Website technical scan added where measurable."
        : "Google Places data added. Website scan could not finish, so you can still continue with the available data.");
    } catch (error) {
      setPlacesStatus("error");
      setPlacesMessage(error?.message || "Google Places lookup failed.");
    }
  }

  async function scanWebsiteForPlace(place) {
    try {
      const response = await fetch("/api/website/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place })
      });
      const body = await response.json();
      if (!response.ok || !body.ok) return { ok: false, audit: null };
      return { ok: true, audit: body.audit };
    } catch {
      return { ok: false, audit: null };
    }
  }

  function submit(event) {
    event.preventDefault();
    onSubmit(form);
    setForm(initialForm);
    setPlacesStatus("idle");
    setPlacesMessage("");
  }

  return (
    <form className="grid gap-5 lg:grid-cols-2" onSubmit={submit}>
      <section className="rounded-lg border border-line bg-surface p-5  lg:col-span-2">
        <h2 className="text-2xl font-bold">New Checkup</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Field label="Business Name">
            <input required className="input" value={form.businessName} onChange={(event) => update("businessName", event.target.value)} placeholder="Clearflow Plumbing" />
          </Field>
          <Field label="City">
            <input required className="input" value={form.city} onChange={(event) => update("city", event.target.value)} placeholder="Riverside, CA" />
          </Field>
          <Field label="Industry">
            <select className="input" value={form.industry} onChange={(event) => update("industry", event.target.value)}>
              <option>Cleaning</option>
              <option>HVAC</option>
              <option>Plumbing</option>
              <option>Landscaping</option>
              <option>Restaurant / Food Service</option>
              <option>Auto Services</option>
              <option>Beauty / Wellness</option>
              <option>Other Local Business</option>
            </select>
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="secondary-button px-4 py-2" type="button" onClick={scanGooglePlaces} disabled={placesStatus === "loading" || !form.businessName.trim()}>
            {placesStatus === "loading" ? "Scanning Google Places..." : "Scan Google Places"}
          </button>
          {placesMessage && <p className={placesStatus === "error" ? "text-sm font-bold text-signal-red" : "text-sm font-bold text-signal-green"}>{placesMessage}</p>}
        </div>
      </section>

      <Panel title="Website">
        <Field label="Website status">
          <select className="input" value={form.websiteStatus} onChange={(event) => update("websiteStatus", event.target.value)}>
            <option value="none">None</option>
            <option value="exists-but-outdated">Exists but outdated</option>
            <option value="modern">Modern</option>
          </select>
        </Field>
        <Check label="Mobile-friendly" name="mobileFriendly" form={form} update={update} />
        <Check label="Loads fast" name="loadsFast" form={form} update={update} />
        <Check label="Has SSL / HTTPS" name="hasSsl" form={form} update={update} />
      </Panel>

      <Panel title="Google Business Profile">
        <Check label="Claimed" name="gbpClaimed" form={form} update={update} />
        <Check label="Hours listed" name="gbpHours" form={form} update={update} />
        <Check label="Photos present" name="gbpPhotos" form={form} update={update} />
        <Check label="Description filled" name="gbpDescription" form={form} update={update} />
        <Check label="Primary category set" name="gbpPrimaryCategory" form={form} update={update} />
      </Panel>

      <Panel title="Business Info Accuracy">
        <Check label="Hours are accurate across Google, website, and major listings" name="hoursAccurate" form={form} update={update} />
        <Check label="Phone number is correct and consistent" name="phoneAccurate" form={form} update={update} />
        <Check label="Address / service area is correct" name="addressAccurate" form={form} update={update} />
        <Check label={isFoodBusiness ? "Menu basics are accurate wherever customers see them" : "Services and offers are accurate wherever customers see them"} name="servicesAccurate" form={form} update={update} />
      </Panel>

      <Panel title="Reviews">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Average rating">
            <input className="input" type="number" min="0" max="5" step="0.1" value={form.averageRating} onChange={(event) => update("averageRating", Number(event.target.value))} />
          </Field>
          <Field label="Review count">
            <input className="input" type="number" min="0" value={form.reviewCount} onChange={(event) => update("reviewCount", Number(event.target.value))} />
          </Field>
        </div>
      </Panel>

      <Panel title="Visibility and Lead Readiness">
        <Check label={`Appears in Google Maps top-3 for "${form.industry.toLowerCase()} near me"`} name="mapsTopThree" form={form} update={update} />
        <Check label="Click-to-call available" name="clickToCall" form={form} update={update} />
        <Check label={isFoodBusiness ? "Contact / catering inquiry form" : "Contact / quote form"} name="quoteForm" form={form} update={update} />
        <Check label="Replies to leads within about 5 minutes" name="repliesFast" form={form} update={update} />
      </Panel>

      {isFoodBusiness && (
        <Panel title="Menu and Ordering Presence">
          <Check label="Website menu is accurate and current" name="menuAccurate" form={form} update={update} />
          <Check label="Uber Eats / delivery apps are listed and active" name="deliveryAppsListed" form={form} update={update} />
          <Check label="Delivery app menu items have photos" name="deliveryItemsHavePhotos" form={form} update={update} />
          <Check label="Online ordering flow works without confusion" name="onlineOrderingWorks" form={form} update={update} />
        </Panel>
      )}

      <div className="lg:col-span-2">
        <button className="rounded-md bg-brand px-5 py-3 font-bold text-white hover:bg-brand/90">
          Generate Digital Health Report
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Panel({ title, children }) {
  return (
    <section className="rounded-lg border border-line bg-surface p-5 ">
      <h3 className="text-xl font-bold">{title}</h3>
      <div className="mt-4 grid gap-3">{children}</div>
    </section>
  );
}

function Check({ label, name, form, update }) {
  return (
    <label className="flex items-start gap-3 rounded-md border border-line bg-paper px-3 py-3 text-sm font-semibold text-slate-700">
      <input className="mt-1 h-4 w-4 accent-brand" type="checkbox" checked={form[name]} onChange={(event) => update(name, event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

