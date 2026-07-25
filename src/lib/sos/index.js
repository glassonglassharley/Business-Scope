// Standalone Secretary of State (SoS) business-entity data layer.
//
// NOT wired into scoring or any report yet — that is a separate decision
// to be made after seeing what this data actually looks like across
// states. This module only provides a single normalized entry point.
//
// Every state connector returns the same shape via an `outcome` field:
//   "found"             — { outcome, state, source, legalName, status, entityType, registeredAgent, filingDate }
//   "not_found"         — queried successfully, no matching entity exists
//   "source_error"      — a live connector exists but couldn't be trusted this time
//                          (network/API failure, or the response no longer matches
//                          the schema the connector was built against). This is how
//                          a broken source surfaces itself instead of dying quietly
//                          as an empty result — see scripts/sos-healthcheck.mjs.
//   "unavailable_state" — no connector has been built for this state yet
//
// unavailable_state is deliberately never the result of a failed real
// attempt - it's returned before any connector is invoked, so a state with
// no connector can never be confused with a state that was queried and
// came back empty or broken. See SOS-FEASIBILITY.md for the per-state
// build plan and which states were deliberately left unbuilt and why.

import * as colorado from "./colorado.js";

const CONNECTORS = {
  CO: colorado
};

export const SUPPORTED_STATES = Object.keys(CONNECTORS);

export async function lookup(name, state) {
  const code = String(state || "").toUpperCase();
  const connector = CONNECTORS[code];

  if (!connector) {
    return { outcome: "unavailable_state", state: code };
  }

  return connector.lookup(name, code);
}

// Used by scripts/sos-healthcheck.mjs to run every connector's canary
// query without hardcoding the list of built states in the script itself.
export function getCanaries() {
  return Object.entries(CONNECTORS)
    .filter(([, connector]) => connector.canary)
    .map(([state, connector]) => ({ state, canary: connector.canary }));
}
