/**
 * Partner referral integration.
 *
 * PRIVATE — never import this module (or the pg driver) from any public
 * route. The public-leak regression tests enforce that boundary, and partner
 * vocabulary must not appear anywhere under src/ or scripts/ outside of
 * environment configuration.
 *
 * Thorost's prospecting engine sources local businesses with weak online
 * presence; this module holds the fulfillment-partner plumbing and the
 * outreach copy used when working the pipeline. All partner specifics come
 * from the environment so the repo stays partner-agnostic:
 *
 *   PARTNER_NAME      e.g. "Acme Marketing"
 *   PARTNER_FORM_URL  lead-submission form base URL
 *   PARTNER_AM_ID     attribution ID appended as ?am_id=
 */

function required(name, value) {
  if (!value) {
    throw new Error(`${name} is not set. Add it to .env.local (see .env.example).`);
  }
  return value;
}

export function partnerConfig() {
  return {
    name: process.env.PARTNER_NAME || "Partner",
    formUrl: process.env.PARTNER_FORM_URL || "",
    amId: process.env.PARTNER_AM_ID || "",
  };
}

/** The referral form URL with attribution baked in. Throws if unconfigured. */
export function referralFormUrl() {
  const { formUrl, amId } = partnerConfig();
  required("PARTNER_FORM_URL", formUrl);
  return amId ? `${formUrl}?am_id=${encodeURIComponent(amId)}` : formUrl;
}

/**
 * Build a copy-paste block for the partner's lead submission form.
 * Anything unknown is left blank to fill at submit time.
 */
export function buildReferralSummary(prospect) {
  const lines = [
    `Company Name: ${prospect.businessName || ""}`,
    `Website: ${prospect.website || ""}`,
    `Phone: ${prospect.phone || ""}`,
    `Email: ${prospect.email || ""}`,
    `City: ${prospect.city || ""}`,
  ];
  if (prospect.contactName) lines.unshift(`Contact: ${prospect.contactName}`);
  lines.push(
    `Source: Thorost scan (prospect score ${prospect.prospectScore ?? "n/a"})`
  );
  if (prospect.topDefects?.length) {
    lines.push(`Talking points: ${prospect.topDefects.join("; ")}`);
  }
  if (prospect.notes) lines.push(`Notes: ${prospect.notes}`);
  return lines.join("\n");
}

/**
 * Outreach copy. The soft opener is the validated playbook version — do not
 * pitch in the first message. The partner bridge hands a warm prospect to the
 * fulfillment partner only after they show interest in full marketing help.
 */
export const OUTREACH_TEMPLATES = {
  opener:
    "Hey, I noticed a few online details that may be costing you customers, like hours, listing info, photos, menu/service details, or contact links. I made a quick Business Snapshot for your business. Want me to send it over?",

  followUp:
    "Quick bump — I put together that free Business Snapshot for {business}. It flags the online gaps most likely costing you calls. Want me to send it over? Takes 2 minutes to review.",

  partnerBridge:
    "Glad the snapshot was useful. If you want the bigger marketing picture handled too — ads, funnels, the works — I work with a team that does exactly that for local businesses. Want a quick intro? No pressure either way.",

  breakup:
    "Last note from me — I'll close the loop on my end. If online stuff ever starts costing you noticeable business, the snapshot offer stands. Good luck with {business}.",
};

export function fillTemplate(name, vars = {}) {
  let text = OUTREACH_TEMPLATES[name] || "";
  for (const [key, value] of Object.entries(vars)) {
    text = text.replaceAll(`{${key}}`, String(value));
  }
  return text;
}
