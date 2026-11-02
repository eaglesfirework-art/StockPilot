import { pctChange } from "@/lib/analytics";

// A stat tile: label, value, and the change against the previous period of the same length.
// goodWhen says which direction is good news ("none" for costs, where up is neither good nor bad).
export function Kpi({ label, value, note, cur, prev, goodWhen = "up", fmt, vs }: {
  label: string; value: string; note?: string; cur: number; prev: number; goodWhen?: "up" | "down" | "none"; fmt: (n: number) => string; vs: string;
}) {
  const pct = pctChange(cur, prev);
  let delta: React.ReactNode;
  if (pct === null) delta = <span className="delta">Nothing to compare with</span>;
  else if (Math.abs(pct) < 0.05) delta = <span className="delta"><span aria-hidden>▬</span> No change <span className="was">vs {fmt(prev)}</span></span>;
  else {
    const up = pct > 0;
    const tone = goodWhen === "none" ? "" : up === (goodWhen === "up") ? " good" : " bad";
    delta = (
      <span className={`delta${tone}`}>
        <span aria-hidden>{up ? "▲" : "▼"}</span> <b>{Math.abs(pct) < 10 ? Math.abs(pct).toFixed(1) : Math.round(Math.abs(pct))}%</b>
        <span className="sr-only">{up ? " up" : " down"}</span> <span className="was">vs {fmt(prev)} in the {vs}</span>
      </span>
    );
  }
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {note && <div className="kpi-note">{note}</div>}
      {delta}
    </div>
  );
}
