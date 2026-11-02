"use client";
import { useState } from "react";
import type { Preset } from "@/lib/filters";

export function ReportDownloads({ reports, presets, initial }: { reports: [string, string, string][]; presets: Preset[]; initial: { from: string; to: string } }) {
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const active = presets.find((p) => p.from === from && p.to === to)?.label ?? "";
  const query = new URLSearchParams({ ...(from && { from }), ...(to && { to }) }).toString();
  return (
    <>
      <div className="form inline filters">
        <p className="muted" style={{ flexBasis: "100%", margin: 0 }}>Reports cover the dates below (the last 7 days by default). Stock summary and dues ignore the dates.</p>
        <label className="date">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="date">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <div className="presets" role="group" aria-label="Quick date ranges">
          {presets.map((p) => (
            <button key={p.label} type="button" className={`chip${p.label === active ? " on" : ""}`} aria-pressed={p.label === active} onClick={() => { setFrom(p.from); setTo(p.to); }}>{p.label}</button>
          ))}
        </div>
      </div>
      {reports.map(([k, title, desc]) => (
        <div className="card report" key={k}>
          <div><b>{title}</b><div className="muted">{desc}</div></div>
          <a className="btn" href={`/api/csv/${k}${query ? `?${query}` : ""}`}>Download CSV</a>
        </div>
      ))}
    </>
  );
}
