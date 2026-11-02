import Link from "next/link";
import { DateFilter } from "@/components/DateFilter";
import { ColumnChart } from "@/components/viz/ColumnChart";
import { Kpi } from "@/components/viz/Kpi";
import { RankBars } from "@/components/viz/RankBars";
import { analytics } from "@/server/queries";
import { compactINR } from "@/lib/analytics";
import { dateRange } from "@/lib/filters";
import { inr, inr0, num } from "@/lib/fmt";

const signed = (v: number) => `${v < 0 ? "−" : "+"}${inr(Math.abs(v))}`;

export default async function Dashboard({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const range = dateRange(searchParams);
  const a = await analytics(range);
  const { now, before } = a;
  const vs = a.days === 1 ? "previous day" : `previous ${a.days} days`;
  const outRows = [
    { label: "Vendors", value: now.outBy.vendors }, { label: "Labour", value: now.outBy.labour }, { label: "Other expenses", value: now.outBy.expenses },
  ].filter((r) => r.value > 0).sort((x, y) => y.value - x.value);

  return (
    <>
      <h1>Dashboard</h1>
      <DateFilter range={range} />

      <div className="kpis">
        <Kpi label="Sales" value={inr0(now.sales)} cur={now.sales} prev={before.sales} fmt={inr0} vs={vs} />
        <Kpi label="Gross profit" value={inr0(now.profit)} note={`${now.margin}% margin`} cur={now.profit} prev={before.profit} fmt={inr0} vs={vs} />
        <Kpi label="Money in" value={inr0(now.moneyIn)} cur={now.moneyIn} prev={before.moneyIn} fmt={inr0} vs={vs} />
        <Kpi label="Money out" value={inr0(now.moneyOut)} cur={now.moneyOut} prev={before.moneyOut} goodWhen="none" fmt={inr0} vs={vs} />
        <Kpi label="Net cash" value={inr0(now.net)} cur={now.net} prev={before.net} fmt={inr0} vs={vs} />
        <Kpi label="Units made" value={num(now.good)} note={`${now.rejectPct}% rejected`} cur={now.good} prev={before.good} fmt={num} vs={vs} />
      </div>

      <div className="viz-grid">
        <ColumnChart
          title="Cash in and out" subtitle="Customer receipts against payments to vendors, labour and expenses"
          series={[{ name: "Money in", color: "var(--v-in)" }, { name: "Money out", color: "var(--v-out)" }]}
          points={a.series.map((s) => ({ label: s.label, tip: s.tip, values: [s.in, s.out] }))} format={inr0} axis={compactINR}
        />
        <ColumnChart
          title="Sales and gross profit" subtitle="What was sold, and what was left after the cost of making it"
          series={[{ name: "Sales", color: "var(--v-sales)" }, { name: "Gross profit", color: "var(--v-profit)" }]}
          points={a.series.map((s) => ({ label: s.label, tip: s.tip, values: [s.sales, s.profit] }))} format={inr0} axis={compactINR}
        />
      </div>

      <div className="viz-grid thirds">
        <section className="viz-card viz">
          <h3 className="viz-title">Where the money went</h3>
          <p className="viz-sub">{inr0(now.moneyOut)} paid out in this period</p>
          <RankBars rows={outRows} color="var(--v-out)" format={inr0} share empty="Nothing was paid out in this period." />
        </section>
        <section className="viz-card viz">
          <h3 className="viz-title">Customers owe us</h3>
          <p className="viz-sub">{inr0(a.receivable.total)} in total, today</p>
          <RankBars rows={a.receivable.top.map((p) => ({ label: p.name, value: p.value, href: `/admin/party/${p.id}` }))} color="var(--v-in)" format={inr0} empty="No customer owes anything." />
        </section>
        <section className="viz-card viz">
          <h3 className="viz-title">We owe vendors</h3>
          <p className="viz-sub">{inr0(a.payable.total)} in total, today</p>
          <RankBars rows={a.payable.top.map((p) => ({ label: p.name, value: p.value, href: `/admin/party/${p.id}` }))} color="var(--v-out)" format={inr0} empty="Nothing is owed to vendors." />
        </section>
      </div>

      <div className="viz-grid">
        <section className="viz-card viz">
          <h3 className="viz-title">Products sold</h3>
          <p className="viz-sub">Best sellers in this period, by sales</p>
          <div className="table-wrap"><table className="collapsible">
            <thead><tr><th>Product</th><th className="r">Sold</th><th className="r">Sales</th><th className="r">Gross profit</th><th className="r">Margin</th></tr></thead>
            <tbody>
              {a.products.map((p) => (
                <tr key={p.name}><td><b>{p.name}</b></td><td className="r">{num(p.qty)} {p.unit}</td><td className="r">{inr(p.revenue)}</td>
                  <td className={`r ${p.profit < 0 ? "bad-t" : ""}`}>{inr(p.profit)}</td><td className="r">{p.margin}%</td></tr>
              ))}
              {a.products.length === 0 && <tr><td colSpan={5} className="muted">No sales in this period.</td></tr>}
            </tbody>
          </table></div>
        </section>
        <section className="viz-card viz">
          <h3 className="viz-title">Stock</h3>
          <p className="viz-sub">Value at average cost, today</p>
          <dl className="facts">
            <div><dt>Raw materials</dt><dd>{inr0(a.stock.raw)}</dd></div>
            <div><dt>Finished goods</dt><dd>{inr0(a.stock.finished)}</dd></div>
            <div className="total"><dt>Total</dt><dd>{inr0(a.stock.raw + a.stock.finished)}</dd></div>
          </dl>
          <h4 className="viz-subhead">Low stock</h4>
          <p className="viz-sub">{a.low.length === 0 ? "Everything is above its minimum." : `${a.low.length} below the minimum you set`}</p>
          <ul className="lowlist">
            {a.low.map((i) => {
              const out = i.qty <= 0, crit = i.ratio < 0.5;
              return (
                <li key={i.id}>
                  <div className="rank-head">
                    <Link href={`/admin/stock/${i.id}`}>{i.name}</Link>
                    <span className="rank-value"><b>{num(i.qty)}</b> of {num(i.min)} {i.unit}</span>
                  </div>
                  <div className="meter" role="img" aria-label={`${num(i.qty)} of ${num(i.min)} ${i.unit}`}>
                    <i style={{ width: `${Math.max(0, Math.min(100, i.ratio * 100))}%`, background: crit ? "var(--crit)" : "var(--warn)" }} />
                  </div>
                  <span className={`sev ${crit ? "crit" : "warn"}`}><span aria-hidden>{crit ? "✕" : "▲"}</span> {out ? "Out of stock" : crit ? "Very low" : "Low"}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      <section className="viz-card viz block">
        <h3 className="viz-title">Production cost</h3>
        <p className="viz-sub">What one good unit cost to make, against its selling price</p>
        <div className="table-wrap"><table className="collapsible">
          <thead><tr><th>Product</th><th className="r">Batches</th><th className="r">Good units</th><th className="r">Rejected</th><th className="r">Cost / unit</th><th className="r">Price</th><th className="r">Margin / unit</th></tr></thead>
          <tbody>
            {a.production.map((p) => (
              <tr key={p.name}><td><b>{p.name}</b></td><td className="r">{p.batches}</td><td className="r">{num(p.good)} {p.unit}</td><td className="r">{p.rejectPct}%</td>
                <td className="r">{inr(p.cost)}</td><td className="r">{p.price === null ? "—" : inr(p.price)}</td>
                <td className={`r ${p.perUnit !== null && p.perUnit < 0 ? "bad-t" : p.perUnit !== null ? "good-t" : ""}`}>{p.perUnit === null ? "—" : signed(p.perUnit)}</td></tr>
            ))}
            {a.production.length === 0 && <tr><td colSpan={7} className="muted">No production in this period.</td></tr>}
          </tbody>
        </table></div>
      </section>
    </>
  );
}
