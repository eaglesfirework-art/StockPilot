import Link from "next/link";
import { DateFilter } from "@/components/DateFilter";
import { Kpi } from "@/components/viz/Kpi";
import { RankBars } from "@/components/viz/RankBars";
import { dashboardSummary } from "@/server/insights";
import { dateRange } from "@/lib/filters";
import { inr, inr0 } from "@/lib/fmt";

// The label says Profit or Loss; the amount is plain (no minus sign), green for profit and red for loss.
const abs = (v: number) => inr(Math.abs(v));
const abs0 = (v: number) => inr0(Math.abs(v));

// Kept simple on purpose: one profit number (sales - raw materials bought - labour) and who owes what.
export default async function Dashboard({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const range = dateRange(searchParams, 30);
  const d = await dashboardSummary(range);
  const { cur, prev } = d;
  const vs = `previous ${d.days} days`;
  const loss = cur.profit < 0;

  return (
    <>
      <header className="page-head">
        <h1>Dashboard</h1>
        <p className="muted">Profit for the chosen dates, and what is owed today. For more detail open <Link href="/admin/insights">Insights</Link>.</p>
      </header>
      <DateFilter range={range} />

      <div className="kpis dash-kpis">
        <div data-testid="dash-profit">
          <Kpi label={loss ? "Loss" : "Profit"} value={abs0(cur.profit)} note="Sales − raw materials bought − labour" cur={cur.profit} prev={prev.profit} fmt={abs0} vs={vs} signColors />
        </div>
        <div className="kpi" data-testid="dash-receivable">
          <div className="kpi-label">Customers owe me</div>
          <div className="kpi-value">{inr0(d.receivable.total)}</div>
          <div className="kpi-note">{d.receivable.count ? `${d.receivable.count} customer${d.receivable.count === 1 ? "" : "s"}, as of today` : "Nothing to collect"}</div>
          <Link className="kpi-link" href="/admin/parties/customers?due=1">See who →</Link>
        </div>
        <div className="kpi" data-testid="dash-payable">
          <div className="kpi-label">I need to pay vendors</div>
          <div className="kpi-value">{inr0(d.payable.total)}</div>
          <div className="kpi-note">{d.payable.count ? `${d.payable.count} vendor${d.payable.count === 1 ? "" : "s"}, as of today` : "Nothing to pay"}</div>
          <Link className="kpi-link" href="/admin/parties/vendors?due=1">See who →</Link>
        </div>
      </div>

      <section className="viz-card block" aria-labelledby="calc-t">
        <h3 className="viz-title" id="calc-t">How the profit is worked out</h3>
        <p className="viz-sub">{d.range.from} to {d.range.to}, compared with the {vs} ({d.prevRange.from} to {d.prevRange.to})</p>
        <div className="table-wrap"><table className="calc" data-testid="dash-calc">
          <thead><tr><th></th><th></th><th className="r">This period</th><th className="r">Previous period</th></tr></thead>
          <tbody>
            <tr><td className="op"></td><td>Sales <span className="muted">(what we sold)</span></td><td className="r">{inr(cur.sales)}</td><td className="r">{inr(prev.sales)}</td></tr>
            <tr><td className="op">less</td><td>Raw materials bought <span className="muted">(purchase bills)</span></td><td className="r">{inr(cur.materials)}</td><td className="r">{inr(prev.materials)}</td></tr>
            <tr><td className="op">less</td><td>Labour charges</td><td className="r">{inr(cur.labour)}</td><td className="r">{inr(prev.labour)}</td></tr>
            <tr className="total-row">
              <td className="op">=</td><td><b>{loss ? "Loss" : "Profit"}</b></td>
              <td className={`r ${loss ? "bad-t" : "good-t"}`}><b>{abs(cur.profit)}</b></td>
              <td className={`r ${prev.profit < 0 ? "bad-t" : prev.profit > 0 ? "good-t" : ""}`}>{abs(prev.profit)}</td>
            </tr>
          </tbody>
        </table></div>
        <p className="muted">Counted when the bill or sale is entered, paid or not. Other expenses (gas, electricity…) are not included here.</p>
      </section>

      <div className="viz-grid">
        <section className="viz-card">
          <h3 className="viz-title">Customers who owe me</h3>
          <p className="viz-sub">{inr0(d.receivable.total)} to collect · largest first</p>
          <RankBars rows={d.receivable.top.map((p) => ({ label: p.name, value: p.value, href: `/admin/party/${p.id}` }))} color="var(--v-in)" format={inr0} empty="No customer owes anything." />
        </section>
        <section className="viz-card">
          <h3 className="viz-title">Vendors I need to pay</h3>
          <p className="viz-sub">{inr0(d.payable.total)} to pay · largest first</p>
          <RankBars rows={d.payable.top.map((p) => ({ label: p.name, value: p.value, href: `/admin/party/${p.id}` }))} color="var(--v-out)" format={inr0} empty="Nothing is owed to vendors." />
        </section>
      </div>
    </>
  );
}
