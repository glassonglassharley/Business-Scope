// Standalone Secretary of State (SoS) data-layer tests.
//
// This is NOT wired into scoring - these tests only prove the data layer
// itself is honest: a live, known-real entity returns real normalized
// data; a nonexistent entity is cleanly not_found; and any state without a
// built connector is unavailable_state without ever attempting a request
// (proving unbuilt states can't be confused with empty results).
//
// The Colorado test hits the real state-published API (data.colorado.gov)
// - no mocking - because the whole point is proving the connector actually
// works against the real data source, not a stand-in for it.

import assert from "node:assert/strict";
import { test } from "node:test";

const { lookup, SUPPORTED_STATES } = await import("../src/lib/sos/index.js");

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
