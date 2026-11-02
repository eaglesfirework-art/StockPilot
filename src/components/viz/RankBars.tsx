import Link from "next/link";

// Ranked horizontal bars, one hue, largest first. The amount (and share, if asked) is printed beside each name.
export function RankBars({ rows, color, format, empty, share }: {
  rows: { label: string; value: number; href?: string }[]; color: string; format: (n: number) => string; empty: string; share?: boolean;
}) {
  if (rows.length === 0) return <p className="muted">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  const total = rows.reduce((a, r) => a + r.value, 0) || 1;
  return (
    <ul className="rank">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="rank-head">
            <span className="rank-label">{r.href ? <Link href={r.href}>{r.label}</Link> : r.label}</span>
            <span className="rank-value"><b>{format(r.value)}</b>{share && <span className="rank-share">{Math.round((r.value / total) * 100)}%</span>}</span>
          </div>
          <div className="rank-fill" style={{ background: color, width: `${Math.max(1, (r.value / max) * 100)}%` }} />
        </li>
      ))}
    </ul>
  );
}
