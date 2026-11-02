import { labelStep, niceTicks } from "@/lib/analytics";

export type ChartSeries = { name: string; color: string };
export type ChartPoint = { label: string; tip: string; values: number[] };

// Grouped columns over time on one axis. Bars are thin with a rounded end, a hairline grid, a legend, a hover/focus tooltip
// that lists every series for that period, and a table view with the same numbers.
export function ColumnChart({ title, subtitle, series, points, format, axis }: {
  title: string; subtitle: string; series: ChartSeries[]; points: ChartPoint[]; format: (n: number) => string; axis: (n: number) => string;
}) {
  const all = points.flatMap((p) => p.values);
  const empty = all.every((v) => v === 0);
  const t = niceTicks(Math.min(0, ...all), Math.max(0, ...all));
  const range = t.hi - t.lo;
  const pos = (v: number) => ((v - t.lo) / range) * 100;
  const n = points.length;
  const stepWide = labelStep(n, 10), stepNarrow = labelStep(n, 5);
  const totals = series.map((_, i) => points.reduce((a, p) => a + p.values[i], 0));

  return (
    <figure className="viz-card viz">
      <figcaption>
        <h3 className="viz-title">{title}</h3>
        <p className="viz-sub">{subtitle}</p>
      </figcaption>
      <ul className="legend">{series.map((s) => <li key={s.name}><i style={{ background: s.color }} />{s.name}</li>)}</ul>
      {empty ? (
        <p className="muted viz-empty">No activity in this period.</p>
      ) : (
        <div className="plot" role="group" aria-label={`${title}. ${subtitle}`}>
          <div className="yaxis" aria-hidden>
            {t.ticks.map((tick) => <span key={tick} style={{ bottom: `${pos(tick)}%` }}>{axis(tick)}</span>)}
          </div>
          <div className="area">
            {t.ticks.map((tick) => <div key={tick} className={`gridline${tick === 0 ? " zero" : ""}`} style={{ bottom: `${pos(tick)}%` }} />)}
            <div className="cols">
              {points.map((p, i) => (
                <div key={i} className="col" tabIndex={0} aria-label={`${p.tip}. ${series.map((s, k) => `${s.name} ${format(p.values[k])}`).join(", ")}`}>
                  <div className="pair">
                    {series.map((s, k) => {
                      const v = p.values[k];
                      if (v === 0) return <div key={s.name} className="bw" />;
                      const a = pos(Math.min(0, v)), b = pos(Math.max(0, v));
                      return (
                        <div key={s.name} className="bw">
                          <div className={`cbar${v < 0 ? " neg" : ""}`} style={{ background: s.color, bottom: `${a}%`, height: `${b - a}%` }} />
                        </div>
                      );
                    })}
                  </div>
                  <span className={`xl${i % stepWide === 0 ? " sd" : ""}${i % stepNarrow === 0 ? " sm" : ""}`} aria-hidden>{p.label}</span>
                  <div className={`tip${i < n * 0.25 ? " l" : i > n * 0.75 ? " r" : ""}`} aria-hidden>
                    <div className="tip-date">{p.tip}</div>
                    {series.map((s, k) => (
                      <div key={s.name} className="tip-row"><i className="tip-key" style={{ background: s.color }} /><b>{format(p.values[k])}</b><span>{s.name}</span></div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <details className="table-view">
        <summary>Table view</summary>
        <div className="table-wrap"><table>
          <thead><tr><th>Period</th>{series.map((s) => <th key={s.name} className="r">{s.name}</th>)}</tr></thead>
          <tbody>
            {points.map((p, i) => <tr key={i}><td>{p.tip}</td>{p.values.map((v, k) => <td key={k} className="r">{format(v)}</td>)}</tr>)}
            <tr><td><b>Total</b></td>{totals.map((v, k) => <td key={k} className="r"><b>{format(v)}</b></td>)}</tr>
          </tbody>
        </table></div>
      </details>
    </figure>
  );
}
