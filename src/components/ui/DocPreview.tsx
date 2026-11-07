import type { ReactNode } from "react";
import { dOnly } from "@/lib/fmt";

// An invoice-style preview shown on the Review step, before anything is saved.
// Used for purchase bills, sales invoices and production batch sheets.
export type PreviewTable = {
  title?: string;
  head: string[];
  right?: number[];              // indexes of columns that hold numbers (right aligned)
  rows: { cells: ReactNode[]; warn?: string }[];
  empty?: string;
};
export type PreviewTotal = { label: string; value: string; strong?: boolean; tone?: "ok" | "warn" | "bad" };

export function DocPreview({ kind, date, party, meta = [], tables, totals, status, footnote }: {
  kind: string;                                   // "Purchase bill", "Sales invoice", "Production batch"
  date: string;                                   // yyyy-mm-dd
  party?: { label: string; name: string };        // "Vendor" / "Bill to" …
  meta?: [string, ReactNode][];                   // extra facts under the date
  tables: PreviewTable[];
  totals: PreviewTotal[];
  status?: { label: string; tone: "ok" | "warn" | "bad" };
  footnote?: ReactNode;
}) {
  return (
    <article className="doc" aria-label={`${kind} preview`}>
      <header className="doc-head">
        <div className="brand-mark"><span className="logo" aria-hidden>▲</span>StockPilot</div>
        <div className="doc-kind">
          <h2>{kind}</h2>
          <span className="pill">Draft · not saved yet</span>
        </div>
      </header>

      <div className="doc-parties">
        {party && (
          <div>
            <div className="doc-label">{party.label}</div>
            <div className="doc-party">{party.name || "—"}</div>
          </div>
        )}
        <dl className="doc-meta">
          <div><dt>Date</dt><dd>{date ? dOnly(date) : "—"}</dd></div>
          {meta.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
      </div>

      {tables.map((t, ti) => (
        <section key={ti} className="doc-section">
          {t.title && <h3 className="doc-label">{t.title}</h3>}
          <table className="doc-table">
            <thead><tr>{t.head.map((h, i) => <th key={i} className={t.right?.includes(i) ? "r" : undefined}>{h}</th>)}</tr></thead>
            <tbody>
              {t.rows.map((r, ri) => (
                <tr key={ri} className={r.warn ? "warn" : undefined}>
                  {r.cells.map((c, ci) => (
                    <td key={ci} className={t.right?.includes(ci) ? "r" : undefined}>
                      {c}{ci === 0 && r.warn && <div className="doc-warn">⚠ {r.warn}</div>}
                    </td>
                  ))}
                </tr>
              ))}
              {t.rows.length === 0 && <tr><td colSpan={t.head.length} className="muted">{t.empty ?? "Nothing added."}</td></tr>}
            </tbody>
          </table>
        </section>
      ))}

      <div className="doc-foot">
        <div className="doc-note">
          {status && <span className={`pill ${status.tone === "ok" ? "good" : status.tone === "bad" ? "bad" : "warnp"}`}>{status.label}</span>}
          {footnote && <p className="muted">{footnote}</p>}
        </div>
        <dl className="doc-totals">
          {totals.map((t) => (
            <div key={t.label} className={`${t.strong ? "strong" : ""} ${t.tone ?? ""}`}><dt>{t.label}</dt><dd>{t.value}</dd></div>
          ))}
        </dl>
      </div>
    </article>
  );
}
