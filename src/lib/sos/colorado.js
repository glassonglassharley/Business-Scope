// Colorado Secretary of State business-entity connector.
//
// Backed by the official state-published open-data API (Socrata SODA),
// confirmed live during the Phase 1 feasibility census (see
// SOS-FEASIBILITY.md) — this is a real government dataset, not a scrape:
//   https://data.colorado.gov/resource/4ykn-tg5h.json ("Business Entities
//   in Colorado")
//
// Field mapping was taken from the dataset's own published column schema
// (https://data.colorado.gov/api/views/4ykn-tg5h.json), not guessed.
// Registered agents can be an individual (agentfirstname/middlename/
// lastname/suffix) or an organization (agentorganizationname) — both are
// real, mutually-exclusive shapes the dataset actually returns.

const DATASET_URL = "https://data.colorado.gov/resource/4ykn-tg5h.json";

// The fields a well-formed record must have at least one of. If Socrata
// ever renames/removes these columns, real query results stop containing
// any of them — that's the signal this connector's schema assumption has
// broken, distinct from a query that legitimately finds nothing.
const EXPECTED_FIELDS = ["entityname", "entitystatus", "entitytype", "entityformdate"];

// A known-real, decades-old, extremely stable entity used by
// scripts/sos-healthcheck.mjs to detect when this connector silently
// stops working (schema drift, API deprecation, etc.).
export const canary = { name: "Google LLC", state: "CO" };

export async function lookup(name, state, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;

  if (String(state).toUpperCase() !== "CO") {
    throw new Error(`colorado connector called with state "${state}", expected "CO"`);
  }
  if (!name || !name.trim()) {
    return { outcome: "not_found", state: "CO", source: "colorado" };
  }

  const target = name.trim().toUpperCase();

  let records;
  try {
    records = await queryByName(target, fetchImpl);
  } catch (error) {
    return { outcome: "source_error", state: "CO", source: "colorado", message: error?.message || "Colorado SoS lookup failed." };
  }

  if (!Array.isArray(records)) {
    return { outcome: "source_error", state: "CO", source: "colorado", message: "Colorado SoS API returned an unexpected response shape (not an array) — the API contract may have changed." };
  }

  if (records.length > 0 && !records.some(hasExpectedShape)) {
    return { outcome: "source_error", state: "CO", source: "colorado", message: "Colorado SoS API response no longer matches the expected schema (entityname/entitystatus/entitytype/entityformdate are all missing) — the dataset may have changed." };
  }

  const exactMatch = records.find((record) => (record.entityname || "").trim().toUpperCase() === target);
  const record = exactMatch || (records.length === 1 ? records[0] : null);

  if (!record) {
    return { outcome: "not_found", state: "CO", source: "colorado" };
  }

  return {
    outcome: "found",
    state: "CO",
    source: "colorado",
    legalName: record.entityname || null,
    status: record.entitystatus || null,
    entityType: record.entitytype || null,
    registeredAgent: registeredAgentName(record),
    filingDate: record.entityformdate || null
  };
}

async function queryByName(target, fetchImpl) {
  const url = `${DATASET_URL}?$q=${encodeURIComponent(target)}&$limit=5`;
  const response = await fetchImpl(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Colorado SoS API HTTP ${response.status}`);
  }
  return response.json();
}

function hasExpectedShape(record) {
  return EXPECTED_FIELDS.some((key) => key in record);
}

function registeredAgentName(record) {
  if (record.agentorganizationname) return record.agentorganizationname;
  const parts = [record.agentfirstname, record.agentmiddlename, record.agentlastname, record.agentsuffix].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}
