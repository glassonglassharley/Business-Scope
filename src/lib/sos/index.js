// Standalone Secretary of State (SoS) business-entity data layer.
//
// NOT wired into scoring or any report yet — that is a separate decision
// to be made after seeing what this data actually looks like across
// states. This module only provides a single normalized entry point.
//
// Every state connector returns the same shape via an `outcome` field:
//   "found"             — { outcome, state, source, legalName, status, entityType, registeredAgent, filingDate }
//   "not_found"         — queried successfully, no matching entity exists
//   "unavailable"       — a live connector exists but the request itself failed (network/API error)
//   "unavailable_state" — no connector has been built for this state yet
//
// unavailable_state is deliberately never the result of a failed real
// attempt - it's returned before any connector is invoked, so a state with
// no connector can never be confused with a state that was queried and
// came back empty. See SOS-FEASIBILITY.md for the per-state build plan;
// only Colorado has a live connector today.

import { lookup as lookupColorado } from "./colorado.js";

const CONNECTORS = {
  CO: lookupColorado
};

export const SUPPORTED_STATES = Object.keys(CONNECTORS);

export async function lookup(name, state) {
  const code = String(state || "").toUpperCase();
  const connector = CONNECTORS[code];

  if (!connector) {
    return { outcome: "unavailable_state", state: code };
  }

  return connector(name, code);
}
