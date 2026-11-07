import type { Trend } from "@/lib/insights";

// A small change pill: ▲ 15% / ▼ 4% / No change / New. `upIs` says whether a rise is good or bad news.
export function TrendBadge({ trend, pct, upIs = "bad", unit = "%" }: { trend: Trend; pct: number | null; upIs?: "good" | "bad" | "neutral"; unit?: string }) {
  if (trend === "none") return <span className="pill">—</span>;
  if (trend === "new" || pct === null) return <span className="pill">New</span>;
  if (trend === "flat") return <span className="pill">No change</span>;
  const up = trend === "up";
  const tone = upIs === "neutral" ? "" : (up === (upIs === "good")) ? " good" : " bad";
  return (
    <span className={`pill${tone}`}>
      <span aria-hidden>{up ? "▲" : "▼"}</span> {Math.abs(pct)}{unit}<span className="sr-only">{up ? " up" : " down"}</span>
    </span>
  );
}
