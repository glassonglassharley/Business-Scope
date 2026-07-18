import { seededAudits } from "@/lib/seedAudits";

const STORE_KEY = "digitalHealthScore.audits.v3";

export function getAudits() {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveAudit(audit) {
  const audits = [audit, ...getAudits().filter((existing) => existing.id !== audit.id)];
  window.localStorage.setItem(STORE_KEY, JSON.stringify(audits));
  return audits;
}

export function seedAuditsIfEmpty() {
  if (typeof window === "undefined") return;
  if (!window.localStorage.getItem(STORE_KEY)) {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(seededAudits));
  }
}

// A production database can plug in here by replacing these functions with API calls.
