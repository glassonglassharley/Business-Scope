// Standalone Secretary of State (SoS) data-layer tests.
//
// This is NOT wired into scoring - these tests only prove the data layer
// itself is honest: a live, known-real entity returns real normalized
// data; a nonexistent entity is cleanly not_found; a source that stops
// matching its expected schema reports source_error instead of silently
// returning wrong/empty data; and any state without a built connector is
// unavailable_state without ever attempting a request.
//
// The "real data" tests hit the real state-published API
// (data.colorado.gov) - no mocking - because the whole point is proving
// the connector actually works against the real data source. The
// structure-change tests inject a fake fetch, because the whole point
// there is proving the self-detection works BEFORE the real API ever
// actually breaks - it can't wait for a live outage to prove itself.

import assert from "node:assert/strict";
import { test } from "node:test";

const { lookup, getCanaries, SUPPORTED_STATES } = await import("../src/lib/sos/index.js");
const colorado = await import("../src/lib/sos/colorado.js");

function jsonResponse(body, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body };
}

test("Colorado connector returns real normalized data for a known-real entity", async () => {
  const result = await lookup("Google LLC", "CO");

  assert.equal(result.outcome, "found");
  assert.equal(result.state, "CO");
  assert.equal(result.source, "colorado");
  assert.equal(result.legalName, "Google LLC");
  assert.equal(result.status, "Good Standing");
  assert.equal(result.entityType, "FLLC");
  assert.equal(result.registeredAgent, "CORPORATION SERVICE COMPANY");
  assert.match(result.filingDate, /^2003-08-28/);
});

test("Colorado connector is case-insensitive on the entity name", async () => {
  const result = await lookup("google llc", "CO");
  assert.equal(result.outcome, "found");
  assert.equal(result.legalName, "Google LLC");
});

test("Colorado connector reports not_found for a fabricated business name, not an error", async () => {
  const result = await lookup("Zzyzzqqvvnonexistent Fictional Entity Corp Streetsignal Test", "CO");
  assert.equal(result.outcome, "not_found");
  assert.equal(result.state, "CO");
  assert.equal(result.source, "colorado");
});

test("lookup() rejects an empty business name as not_found rather than querying", async () => {
  const result = await lookup("", "CO");
  assert.equal(result.outcome, "not_found");
});

test("a state with no connector is unavailable_state, never a silent empty result", async () => {
  const result = await lookup("Google LLC", "NY");
  assert.deepEqual(result, { outcome: "unavailable_state", state: "NY" });
});

test("unavailable_state never triggers a network call", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("fetch should never be called for a state with no connector");
  };
  try {
    const result = await lookup("Google LLC", "TX");
    assert.equal(result.outcome, "unavailable_state");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("state codes are handled case-insensitively", async () => {
  const result = await lookup("Google LLC", "co");
  assert.equal(result.outcome, "found");
});

test("SUPPORTED_STATES lists exactly the connectors that are actually live", () => {
  assert.deepEqual(SUPPORTED_STATES, ["CO"]);
});

// ---------------------------------------------------------------------------
// Self-detection: a broken/changed source must report source_error, never
// silently look like not_found or (worse) return garbage as "found".
// ---------------------------------------------------------------------------

test("Colorado connector reports source_error when the API schema no longer matches (structure drift)", async () => {
  const fetchImpl = async () => jsonResponse([{ some_new_field: "the state renamed every column" }]);
  const result = await colorado.lookup("Google LLC", "CO", { fetchImpl });

  assert.equal(result.outcome, "source_error");
  assert.equal(result.state, "CO");
  assert.match(result.message, /schema/i);
});

test("Colorado connector reports source_error when the response isn't an array", async () => {
  const fetchImpl = async () => jsonResponse({ error: "unexpected object instead of a result array" });
  const result = await colorado.lookup("Google LLC", "CO", { fetchImpl });

  assert.equal(result.outcome, "source_error");
  assert.match(result.message, /unexpected response shape/i);
});

test("Colorado connector reports source_error on a non-2xx HTTP response, not not_found", async () => {
  const fetchImpl = async () => jsonResponse({}, false);
  const result = await colorado.lookup("Google LLC", "CO", { fetchImpl });

  assert.equal(result.outcome, "source_error");
  assert.match(result.message, /HTTP 500/);
});

test("Colorado connector reports source_error when the network request itself throws", async () => {
  const fetchImpl = async () => {
    throw new Error("getaddrinfo ENOTFOUND data.colorado.gov");
  };
  const result = await colorado.lookup("Google LLC", "CO", { fetchImpl });

  assert.equal(result.outcome, "source_error");
  assert.match(result.message, /ENOTFOUND/);
});

test("Colorado connector still resolves not_found normally when the schema is intact but nothing matches", async () => {
  const fetchImpl = async () => jsonResponse([]);
  const result = await colorado.lookup("Google LLC", "CO", { fetchImpl });
  assert.equal(result.outcome, "not_found");
});

// ---------------------------------------------------------------------------
// Health-check plumbing
// ---------------------------------------------------------------------------

test("getCanaries() exposes exactly the live connectors' canaries", () => {
  const canaries = getCanaries();
  assert.deepEqual(canaries, [{ state: "CO", canary: { name: "Google LLC", state: "CO" } }]);
});
