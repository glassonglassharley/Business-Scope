"use client";

import { useMemo, useState } from "react";
import { bandForScore, formatDate } from "@/lib/scoring";

export function AuditDashboard({ audits, selectedAuditId, onSelect, settings, onSettingsChange }) {
  const [sortMode, setSortMode] = useState("opportunity");

  const sortedAudits = useMemo(() => {
    return [...audits].sort((a, b) => {
      if (sortMode === "recent") return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortMode === "highest") return b.score.total - a.score.total;
      return a.score.total - b.score.total;
    });
  }, [audits, sortMode]);

  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line px-5 py-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="eyebrow">Prospect pipeline</p>
            <h2 className="mt-1 text-2xl font-black text-ink">Checkup Pipeline</h2>
            <p className="mt-1 text-sm text-slate-600">Lowest scores are the clearest cleanup opportunities.</p>
          </div>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            Sort
            <select className="rounded-md border border-line bg-surface px-3 py-2" value={sortMode} onChange={(event) => setSortMode(event.target.value)}>
              <option value="opportunity">Lowest score first</option>
              <option value="highest">Highest score first</option>
              <option value="recent">Newest first</option>
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-paper text-xs uppercase tracking-[0.12em] text-slate-500">
                <th className="px-5 py-3">Business</th>
                <th className="px-3 py-3">Industry</th>
                <th className="px-3 py-3">Score</th>
                <th className="px-3 py-3">Signal</th>
                <th className="px-3 py-3">Date</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {sortedAudits.map((audit) => {
                const band = bandForScore(audit.score.total);
                return (
                  <tr key={audit.id} className={`border-b border-line ${selectedAuditId === audit.id ? "bg-paper" : "bg-surface"}`}>
                    <td className="px-5 py-4">
                      <div className="font-black text-ink">{audit.businessName}</div>
                      <div className="text-sm text-slate-600">{audit.city}</div>
                    </td>
                    <td className="px-3 py-4 text-sm font-semibold text-slate-700">{audit.industry}</td>
                    <td className="px-3 py-4">
                      <span className="text-2xl font-black">{audit.score.total}</span>
                      <span className="text-sm text-slate-500">/100</span>
                    </td>
                    <td className="px-3 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-black ${band.badgeClass}`}>{band.label}</span>
                    </td>
                    <td className="px-3 py-4 text-sm text-slate-600">{formatDate(audit.createdAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <button className="rounded-md border border-brand px-3 py-2 text-sm font-black text-brand hover:bg-brand hover:text-white" onClick={() => onSelect(audit.id)}>
                        Open Report
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="grid gap-5">
        <div className="panel p-5">
          <p className="eyebrow">Settings</p>
          <label className="mt-4 block text-sm font-bold text-slate-700">
            Prepared by
            <input className="mt-2 w-full rounded-md border border-line px-3 py-2" value={settings.preparerName} onChange={(event) => onSettingsChange({ ...settings, preparerName: event.target.value })} />
          </label>
        </div>
        <div className="panel p-5 text-sm leading-6 text-slate-700">
          <p className="font-black text-ink">V1 note</p>
          <p className="mt-2">Snapshots are stored in this browser. Shared reports work online because the report data is encoded into the share link.</p>
        </div>
      </aside>
    </section>
  );
}
