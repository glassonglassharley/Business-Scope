// Runs every SoS connector's canary query (a known-real entity that should
// always be found) and reports which connectors still work vs. which have
// silently broken (site changed, schema drifted, blocked). This is the
// mechanism that makes a rotting scraper/API surface itself instead of
// quietly returning empty results forever - see src/lib/sos/index.js.
//
// Maintains a small on-disk ledger (sos-health-log.json, committed to the
// repo) so a currently-failing connector still shows the last time it
// was actually known to work, instead of losing that history the moment
// it breaks.
//
// Usage: node scripts/sos-healthcheck.mjs
// Exit code 1 if any built connector's canary fails.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { lookup, getCanaries } from "../src/lib/sos/index.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEDGER_PATH = path.join(projectRoot, "sos-health-log.json");

function loadLedger() {
  if (!existsSync(LEDGER_PATH)) return {};
  try {
    return JSON.parse(readFileSync(LEDGER_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveLedger(ledger) {
  writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2) + "\n");
}

function pad(value, width) {
  return String(value).padEnd(width);
}

async function main() {
  const ledger = loadLedger();
  const canaries = getCanaries();
  const now = new Date().toISOString();
  const rows = [];
  let anyFailed = false;

  for (const { state, canary } of canaries) {
    let result;
    try {
      result = await lookup(canary.name, state);
    } catch (error) {
      result = { outcome: "source_error", message: error?.message || "threw synchronously" };
    }

    const entry = ledger[state] || { lastGood: null, lastStatus: null };
    const ok = result.outcome === "found";

    if (ok) {
      entry.lastGood = now;
      entry.lastStatus = "ok";
    } else {
      entry.lastStatus = `fail (${result.outcome})`;
      anyFailed = true;
    }

    ledger[state] = entry;
    rows.push({
      state,
      lastGood: entry.lastGood || "never",
      status: ok ? "OK" : `FAIL (${result.outcome}${result.message ? `: ${result.message}` : ""})`
    });
  }

  saveLedger(ledger);

  console.log(pad("STATE", 7) + pad("LAST GOOD", 26) + "STATUS");
  console.log("-".repeat(70));
  for (const row of rows) {
    console.log(pad(row.state, 7) + pad(row.lastGood, 26) + row.status);
  }
  console.log("-".repeat(70));

  if (canaries.length === 0) {
    console.log("No connectors with a canary are registered.");
  } else if (anyFailed) {
    console.log(`${rows.filter((r) => r.status !== "OK").length}/${rows.length} connector(s) failing their canary check.`);
    process.exitCode = 1;
  } else {
    console.log(`All ${rows.length} connector(s) healthy.`);
  }
}

await main();
