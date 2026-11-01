import Link from "next/link";
import { dashboard, rangeOf } from "@/server/queries";
import { inr, num } from "@/lib/fmt";

export default async function Dashboard({ searchParams }: { searchParams: { range?: string; from?: string; to?: string } }) {
  const r = rangeOf(searchParams.range ?? "month", searchParams.from, searchParams.to);
  const d = await dashboard(r.from, r.to);
  const max = Math.max(1, ...d.flow.series.flatMap((s) => [s.in, s.out]));
  const R = (k: string, l: string) => <Link key={k} href={`/admin?range=${k}`} className={(searchParams.range ?? "month") === k && !searchParams.from ? "on" : ""}>{l}</Link>;
  return (
    <>
      <h1>Dashboard</h1>
      <div className="tabs">{R("today", "Today")}{R("7d", "7 days")}{R("month", "This month")}</div>
      <form className="form inline" method="get">
        <label>From<input type="date" name="from" defaultValue={searchParams.from} /></label>
        <label>To<input type="date" name="to" defaultValue={searchParams.to} /></label>
        <button className="btn">Custom range</button>
      </form>
      <p className="muted">{r.label}</p>

      <div className="cards">
        <div className="card"><div className="muted">Money in</div><div className="big">{inr(d.flow.in)}</div></div>
        <div className="card"><div className="muted">Money out</div><div className="big">{inr(d.flow.out)}</div></div>
        <div className="card"><div className="muted">Net</div><div className="big" style={{ color: d.flow.net.lt(0) ? "var(--err)" : "var(--ok)" }}>{inr(d.flow.net)}</div></div>
      </div>

      <div className="card">
        <b>Money in and out by day</b>
        <div className="legend"><span><i style={{ background: "var(--ok)" }} />In</span><span><i style={{ background: "var(--err)" }} />Out</span></div>
        <div className="bars">
          {d.flow.series.map((s) => (
            <div className="day" key={s.day}>
              <div className="pair">
                <div className="b in" title={inr(s.in)} style={{ height: `${(s.in / max) * 100}%` }} />
                <div className="b out" title={inr(s.out)} style={{ height: `${(s.out / max) * 100}%` }} />
              </div>{s.day.slice(5)}
            </div>
          ))}
          {d.flow.series.length === 0 && <span className="muted">No payments in this period.</span>}
        </div>
      </div>

      <h2>Money out by type</h2>
      <div className="cards">
        <div className="card"><div className="muted">Vendors</div><div className="big">{inr(d.flow.by.VENDOR_PAYMENT)}</div></div>
        <div className="card"><div className="muted">Labour</div><div className="big">{inr(d.flow.by.LABOUR)}</div></div>
        <div className="card"><div className="muted">Expenses</div><div className="big">{inr(d.flow.by.EXPENSE)}</div></div>
      </div>

      <div className="cards">
        <div className="card"><b>Customers owe us: {inr(d.custOwe.total)}</b>
          {d.custOwe.top.map((p) => <div key={p.id}><Link href={`/admin/party/${p.id}`}>{p.name}</Link> — {inr(p.balance)}</div>)}</div>
        <div className="card"><b>We owe vendors: {inr(d.vendOwe.total)}</b>
          {d.vendOwe.top.map((p) => <div key={p.id}><Link href={`/admin/party/${p.id}`}>{p.name}</Link> — {inr(p.balance)}</div>)}</div>
        <div className="card"><b>Stock value</b>
          <div>Raw materials: {inr(d.stockValue.raw)}</div><div>Finished goods: {inr(d.stockValue.fg)}</div></div>
      </div>

      <h2>Low stock</h2>
      {d.low.length === 0 ? <p className="muted">Nothing is below its minimum.</p> : (
        <div className="table-wrap"><table><thead><tr><th>Item</th><th className="r">On hand</th><th className="r">Minimum</th></tr></thead>
          <tbody>{d.low.map((i) => <tr key={i.id}><td><Link href={`/admin/stock/${i.id}`}>{i.name}</Link></td><td className="r">{num(i.qtyOnHand)} {i.unit}</td><td className="r">{num(i.minStock)} {i.unit}</td></tr>)}</tbody></table></div>
      )}
    </>
  );
}
