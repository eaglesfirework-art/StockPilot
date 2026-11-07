import Link from "next/link";
import { DateFilter } from "@/components/DateFilter";
import { Kpi } from "@/components/viz/Kpi";
import { RankBars } from "@/components/viz/RankBars";
import { TrendBadge } from "@/components/ui/TrendBadge";
import { businessInsights } from "@/server/insights";
import { dateRange } from "@/lib/filters";
import { inr, inr0, marginTxt, num, pl } from "@/lib/fmt";

const money = (v: number) => inr(v);
const q4 = (v: number) => v.toLocaleString("en-IN", { maximumFractionDigits: 4 });
const word = (t: string, up: string, down: string, flat = "about the same") => (t === "up" ? up : t === "down" ? down : flat);

// One card per business question. The title is the question; the first line is the answer in words; the table is the evidence.
function Q({ n, q, answer, children, id }: { n: number; q: string; answer: React.ReactNode; children?: React.ReactNode; id: string }) {
  return (
    <section className="viz-card q" id={id} aria-labelledby={`${id}-t`}>
      <div className="q-num">Q{n}</div>
      <h3 className="viz-title" id={`${id}-t`}>{q}</h3>
      <p className="q-answer" data-testid={`${id}-answer`}>{answer}</p>
      {children}
    </section>
  );
}

export default async function Insights({ searchParams }: { searchParams: { from?: string; to?: string } }) {
  const range = dateRange(searchParams, 30);
  const i = await businessInsights(range);
  const vs = `previous ${i.days} days (${i.prevRange.from} to ${i.prevRange.to})`;
  const priceUp = i.prices.filter((p) => p.trend === "up");
  const useUp = i.consumption.filter((c) => c.trend === "up");
  const p = i.profit;

  return (
    <>
      <header className="page-head">
        <h1>Business insights</h1>
        <p className="muted">Nine questions about the business, answered from saved entries. Each figure is compared with the {vs}. Cancelled entries are left out.</p>
      </header>
      <DateFilter range={range} />

      <div className="kpis" aria-label="Headline numbers">
        <Kpi label="Q1 · Money spent (paid out)" value={inr0(i.spent.cash)} note={`${inr0(i.spent.billed)} of purchase bills received`} cur={i.spent.cash} prev={i.spent.prevCash} goodWhen="none" fmt={inr0} vs="previous period" />
        <Kpi label="Q2 · Money earned (received)" value={inr0(i.earned.cash)} note={`${inr0(i.earned.sales)} of sales invoiced`} cur={i.earned.cash} prev={i.earned.prevCash} fmt={inr0} vs="previous period" />
        <div className="kpi"><div className="kpi-label">Q3 · Customers owe us</div><div className="kpi-value">{inr0(i.receivable.total)}</div><div className="kpi-note">{i.receivable.count} customer{i.receivable.count === 1 ? "" : "s"}, as of today</div></div>
        <div className="kpi"><div className="kpi-label">Q4 · We owe vendors</div><div className="kpi-value">{inr0(i.payable.total)}</div><div className="kpi-note">{i.payable.count} vendor{i.payable.count === 1 ? "" : "s"}, as of today</div></div>
      </div>

      <div className="viz-grid">
        <Q n={1} id="q-spent" q="How much money is being spent?"
          answer={<><b>{inr(i.spent.cash)}</b> was paid out in this period, {word(i.spent.trend, "more than", "less than")} {inr(i.spent.prevCash)} before. Purchase bills worth <b>{inr(i.spent.billed)}</b> came in (paid or not).</>}>
          <dl className="facts">
            <div><dt>Paid out (cash)</dt><dd>{inr(i.spent.cash)} <span className="was">was {inr(i.spent.prevCash)}</span></dd></div>
            <div><dt>Purchase bills received</dt><dd>{inr(i.spent.billed)} <span className="was">was {inr(i.spent.prevBilled)}</span></dd></div>
          </dl>
        </Q>
        <Q n={2} id="q-earned" q="How much money is being earned?"
          answer={<>Customers paid <b>{inr(i.earned.cash)}</b> in this period against <b>{inr(i.earned.sales)}</b> of sales, {word(i.earned.trend, "up from", "down from", "close to")} {inr(i.earned.prevSales)} of sales before.</>}>
          <dl className="facts">
            <div><dt>Received from customers</dt><dd>{inr(i.earned.cash)} <span className="was">was {inr(i.earned.prevCash)}</span></dd></div>
            <div><dt>Sales invoiced</dt><dd>{inr(i.earned.sales)} <span className="was">was {inr(i.earned.prevSales)}</span></dd></div>
          </dl>
        </Q>
        <Q n={3} id="q-receivable" q="How much do customers owe us?"
          answer={i.receivable.total ? <><b>{inr(i.receivable.total)}</b> is still to be collected{i.receivable.top[0] && <>; the largest is <b>{i.receivable.top[0].name}</b> at {inr(i.receivable.top[0].value)}</>}.</> : "No customer owes anything right now."}>
          <RankBars rows={i.receivable.top.map((x) => ({ label: x.name, value: x.value, href: `/admin/party/${x.id}` }))} color="var(--v-in)" format={inr0} empty="Nothing to collect." />
        </Q>
        <Q n={4} id="q-payable" q="How much do we owe vendors?"
          answer={i.payable.total ? <><b>{inr(i.payable.total)}</b> is due to vendors (bills minus payments){i.payable.top[0] && <>; the largest is <b>{i.payable.top[0].name}</b> at {inr(i.payable.top[0].value)}</>}.</> : "Nothing is owed to vendors right now."}>
          <RankBars rows={i.payable.top.map((x) => ({ label: x.name, value: x.value, href: `/admin/party/${x.id}` }))} color="var(--v-out)" format={inr0} empty="Nothing is owed." />
        </Q>
      </div>

      <Q n={5} id="q-prices" q="Which raw materials are becoming more expensive?"
        answer={priceUp.length ? <><b>{priceUp.map((x) => `${x.name} (+${x.changePct}%)`).join(", ")}</b> cost more per unit than in the previous period.</> : i.prices.length ? "No raw material got more expensive in this period." : "No raw materials were bought in this period."}>
        <div className="table-wrap"><table>
          <thead><tr><th>Raw material</th><th className="r">Avg rate before</th><th className="r">Avg rate now</th><th className="r">Bought now</th><th className="r">Change</th></tr></thead>
          <tbody>
            {i.prices.map((x) => (
              <tr key={x.itemId}><td><b>{x.name}</b></td><td className="r">{x.prevRate === null ? "—" : `${money(x.prevRate)}/${x.unit}`}</td><td className="r">{money(x.curRate)}/{x.unit}</td><td className="r">{num(x.qty)} {x.unit}</td><td className="r"><TrendBadge trend={x.trend} pct={x.changePct} upIs="bad" /></td></tr>
            ))}
            {i.prices.length === 0 && <tr><td colSpan={5} className="muted">No purchases in this period.</td></tr>}
          </tbody>
        </table></div>
        <p className="muted">Average rate = total amount on purchase bills ÷ total quantity bought, in each period.</p>
      </Q>

      <Q n={6} id="q-consumption" q="Is production consuming more raw materials than before?"
        answer={useUp.length ? <>Yes. Per good unit, more <b>{useUp.map((x) => `${x.material} (+${x.changePct}%) for ${x.product}`).join(", ")}</b> was used than before.</> : i.consumption.length ? "No. Material used per good unit is the same or lower than before." : "No production in this period."}>
        <div className="table-wrap"><table>
          <thead><tr><th>Product</th><th>Raw material</th><th className="r">Used per unit before</th><th className="r">Used per unit now</th><th className="r">Change</th></tr></thead>
          <tbody>
            {i.consumption.map((x) => (
              <tr key={`${x.productId}-${x.itemId}`}><td><b>{x.product}</b></td><td>{x.material}</td><td className="r">{x.prevPerUnit === null ? "—" : `${q4(x.prevPerUnit)} ${x.unit}`}</td><td className="r">{q4(x.curPerUnit)} {x.unit}</td><td className="r"><TrendBadge trend={x.trend} pct={x.changePct} upIs="bad" /></td></tr>
            ))}
            {i.consumption.length === 0 && <tr><td colSpan={5} className="muted">No production batches in this period.</td></tr>}
          </tbody>
        </table></div>
        <p className="muted">Per unit = material used in batches ÷ good units made (rejected units excluded).</p>
      </Q>

      <Q n={7} id="q-unitcost" q="How are production costs changing?"
        answer={i.unitCosts.length ? <>{i.unitCosts.map((x, k) => <span key={x.productId}>{k > 0 && "; "}One <b>{x.name}</b> now costs <b>{money(x.cur.total)}</b> to make{x.prev ? <>, {word(x.trend, "up", "down", "no change")} from {money(x.prev.total)}{x.changePct !== null && x.trend !== "flat" && ` (${x.changePct > 0 ? "+" : ""}${Math.abs(x.changePct)}%)`}</> : " (nothing to compare with)"}</span>)}.</> : "No production in this period."}>
        <div className="table-wrap"><table>
          <thead><tr><th>Product</th><th className="r">Material / unit</th><th className="r">Labour / unit</th><th className="r">Other / unit</th><th className="r">Total / unit</th><th className="r">Before</th><th className="r">Change</th></tr></thead>
          <tbody>
            {i.unitCosts.map((x) => (
              <tr key={x.productId}><td><b>{x.name}</b></td><td className="r">{money(x.cur.material)}</td><td className="r">{money(x.cur.labour)}</td><td className="r">{money(x.cur.other)}</td><td className="r"><b>{money(x.cur.total)}</b></td><td className="r">{x.prev ? money(x.prev.total) : "—"}</td><td className="r"><TrendBadge trend={x.trend} pct={x.changePct} upIs="bad" /></td></tr>
            ))}
            {i.unitCosts.length === 0 && <tr><td colSpan={7} className="muted">No production batches in this period.</td></tr>}
          </tbody>
        </table></div>
      </Q>

      <div className="viz-grid">
        <Q n={8} id="q-profit" q="Is profitability improving or declining?"
          answer={p.trend === "none" ? "No sales in this period." : p.trend === "new" ? <>Net profit is <b>{pl(p.cur.net)}</b> ({marginTxt(p.cur.netMargin)} margin). There were no sales before to compare with.</> :
            <>{p.trend === "up" ? "Improving" : p.trend === "down" ? "Declining" : "Steady"}: net margin is <b>{marginTxt(p.cur.netMargin)}</b> against {marginTxt(p.prev.netMargin)} before ({p.marginChange! >= 0 ? "up" : "down"} {Math.abs(p.marginChange!)} points). Net profit {pl(p.cur.net)} vs {pl(p.prev.net)}.</>}>
          <div className="table-wrap"><table>
            <thead><tr><th></th><th className="r">Before</th><th className="r">Now</th></tr></thead>
            <tbody>
              <tr><td>Sales</td><td className="r">{inr(p.prev.revenue)}</td><td className="r">{inr(p.cur.revenue)}</td></tr>
              <tr><td>Cost of goods sold</td><td className="r">{inr(p.prev.cogs)}</td><td className="r">{inr(p.cur.cogs)}</td></tr>
              <tr><td><b>Gross profit</b></td><td className="r">{pl(p.prev.gross)} <span className="was">{marginTxt(p.prev.grossMargin)}</span></td><td className="r"><b>{pl(p.cur.gross)}</b> <span className="was">{marginTxt(p.cur.grossMargin)}</span></td></tr>
              <tr><td>Labour &amp; expenses outside batches</td><td className="r">{inr(p.prev.overhead)}</td><td className="r">{inr(p.cur.overhead)}</td></tr>
              <tr><td><b>Net profit</b></td><td className="r">{pl(p.prev.net)} <span className="was">{marginTxt(p.prev.netMargin)}</span></td><td className="r"><b>{pl(p.cur.net)}</b> <span className="was">{marginTxt(p.cur.netMargin)}</span></td></tr>
            </tbody>
          </table></div>
        </Q>
        <Q n={9} id="q-spending" q="Where is the business's money going?"
          answer={i.spending.total ? <>Of <b>{inr(i.spending.total)}</b> paid out, the most went to <b>{i.spending.byKind[0].label.toLowerCase()}</b> ({i.spending.byKind[0].share}%).</> : "Nothing was paid out in this period."}>
          <RankBars rows={i.spending.byKind.map((k) => ({ label: k.label, value: k.value }))} color="var(--v-out)" format={inr0} share empty="Nothing paid out." />
          {i.spending.topPayees.length > 0 && <>
            <h4 className="viz-subhead">Paid to</h4>
            <RankBars rows={i.spending.topPayees.map((k) => ({ label: k.label, value: k.value }))} color="var(--ink-3)" format={inr0} share empty="" />
          </>}
        </Q>
      </div>
      <p className="muted">Need the rows behind a number? See <Link href="/admin/transactions">Transactions</Link> or download a CSV from <Link href="/admin/reports">Reports</Link>.</p>
    </>
  );
}
