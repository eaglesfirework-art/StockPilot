// Read-only functions. The dashboard, the lists and the CSV reports all use these, so numbers agree.
import { db } from "./db";
import { D, Dec, ZERO } from "../lib/dec";
import { bucketIndex, buckets, previousPeriod } from "../lib/analytics";
import { dateRange, type Range } from "../lib/filters";

export type PartyKind = "CUSTOMER" | "VENDOR" | "WORKER";

export async function partyBalances(type: PartyKind) {
  const parties = await db.party.findMany({ where: { type }, orderBy: { name: "asc" } });
  const billed = new Map<string, Dec>();
  const paid = new Map<string, Dec>();
  if (type === "CUSTOMER") {
    for (const r of await db.sale.groupBy({ by: ["customerId"], where: { cancelledAt: null }, _sum: { total: true } })) billed.set(r.customerId, r._sum.total ?? ZERO);
  } else if (type === "VENDOR") {
    for (const r of await db.purchase.groupBy({ by: ["vendorId"], where: { cancelledAt: null }, _sum: { total: true } })) billed.set(r.vendorId, r._sum.total ?? ZERO);
  }
  const kind = type === "CUSTOMER" ? "CUSTOMER_RECEIPT" : type === "VENDOR" ? "VENDOR_PAYMENT" : "LABOUR";
  for (const r of await db.payment.groupBy({ by: ["partyId"], where: { cancelledAt: null, kind }, _sum: { amount: true } }))
    if (r.partyId) paid.set(r.partyId, r._sum.amount ?? ZERO);
  return parties.map((p) => {
    const b = billed.get(p.id) ?? ZERO, pd = paid.get(p.id) ?? ZERO;
    return { id: p.id, name: p.name, phone: p.phone, active: p.active, opening: p.openingBalance, billed: b, paid: pd,
      balance: type === "WORKER" ? ZERO : p.openingBalance.plus(b).minus(pd) };
  });
}

export async function moneyFlow(from: Date, to: Date) {
  const pays = await db.payment.findMany({ where: { cancelledAt: null, date: { gte: from, lte: to } }, select: { kind: true, amount: true, date: true } });
  const by: Record<string, Dec> = { CUSTOMER_RECEIPT: ZERO, VENDOR_PAYMENT: ZERO, LABOUR: ZERO, EXPENSE: ZERO };
  const days = new Map<string, { in: number; out: number }>();
  for (const p of pays) {
    by[p.kind] = by[p.kind].plus(p.amount);
    const k = p.date.toISOString().slice(0, 10);
    const d = days.get(k) ?? { in: 0, out: 0 };
    if (p.kind === "CUSTOMER_RECEIPT") d.in += Number(p.amount); else d.out += Number(p.amount);
    days.set(k, d);
  }
  const money_in = by.CUSTOMER_RECEIPT;
  const money_out = by.VENDOR_PAYMENT.plus(by.LABOUR).plus(by.EXPENSE);
  const series = [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ day, ...v }));
  return { in: money_in, out: money_out, net: money_in.minus(money_out), by, series };
}

type PeriodData = Awaited<ReturnType<typeof periodData>>;

async function periodData(gte: Date, lte: Date) {
  const inRange = { gte, lte };
  const [pays, sales, batches] = await Promise.all([
    db.payment.findMany({ where: { cancelledAt: null, date: inRange }, select: { kind: true, amount: true, date: true } }),
    db.sale.findMany({
      where: { cancelledAt: null, date: inRange },
      select: { date: true, lines: { select: { qty: true, amount: true, costAtSale: true, item: { select: { id: true, name: true, unit: true } } } } },
    }),
    db.productionBatch.findMany({
      where: { cancelledAt: null, date: inRange },
      select: { qtyProduced: true, qtyRejected: true, materialCost: true, labourCost: true, otherCost: true, product: { select: { id: true, name: true, unit: true, sellingPrice: true } } },
    }),
  ]);
  return { pays, sales, batches };
}

const n = (d: Dec) => Number(d.toFixed(2));

function totalsOf(d: PeriodData) {
  let inn = ZERO, out = ZERO, vendors = ZERO, labour = ZERO, expenses = ZERO, sales = ZERO, cost = ZERO, produced = ZERO, rejected = ZERO;
  for (const p of d.pays) {
    if (p.kind === "CUSTOMER_RECEIPT") inn = inn.plus(p.amount);
    else {
      out = out.plus(p.amount);
      if (p.kind === "VENDOR_PAYMENT") vendors = vendors.plus(p.amount); else if (p.kind === "LABOUR") labour = labour.plus(p.amount); else expenses = expenses.plus(p.amount);
    }
  }
  for (const s of d.sales) for (const l of s.lines) { sales = sales.plus(l.amount); cost = cost.plus(l.qty.mul(l.costAtSale)); }
  for (const b of d.batches) { produced = produced.plus(b.qtyProduced); rejected = rejected.plus(b.qtyRejected); }
  const profit = sales.minus(cost);
  return {
    moneyIn: n(inn), moneyOut: n(out), net: n(inn.minus(out)), sales: n(sales), profit: n(profit),
    margin: sales.isZero() ? 0 : Number(profit.div(sales).mul(100).toFixed(1)),
    good: n(produced.minus(rejected)), produced: n(produced), rejected: n(rejected),
    rejectPct: produced.isZero() ? 0 : Number(rejected.div(produced).mul(100).toFixed(1)),
    outBy: { vendors: n(vendors), labour: n(labour), expenses: n(expenses) },
  };
}

// Everything the dashboard shows for one date range, plus the previous period of the same length for comparison.
export async function analytics(range: Range) {
  const prev = previousPeriod(range.from, range.to);
  const prevRange = dateRange({ from: prev.from, to: prev.to });
  const [cur, old, items, cust, vend] = await Promise.all([
    periodData(range.gte, range.lte), periodData(prevRange.gte, prevRange.lte),
    db.item.findMany({ where: { active: true } }), partyBalances("CUSTOMER"), partyBalances("VENDOR"),
  ]);

  const bs = buckets(range.from, range.to);
  const series = bs.map((b) => ({ ...b, in: 0, out: 0, sales: 0, profit: 0 }));
  const day = (d: Date) => d.toISOString().slice(0, 10);
  for (const p of cur.pays) {
    const i = bucketIndex(bs, day(p.date));
    if (i < 0) continue;
    if (p.kind === "CUSTOMER_RECEIPT") series[i].in += Number(p.amount); else series[i].out += Number(p.amount);
  }
  const sold = new Map<string, { name: string; unit: string; qty: number; revenue: number; profit: number }>();
  for (const s of cur.sales) {
    const i = bucketIndex(bs, day(s.date));
    for (const l of s.lines) {
      const profit = Number(l.amount.minus(l.qty.mul(l.costAtSale)));
      if (i >= 0) { series[i].sales += Number(l.amount); series[i].profit += profit; }
      const row = sold.get(l.item.id) ?? { name: l.item.name, unit: l.item.unit, qty: 0, revenue: 0, profit: 0 };
      row.qty += Number(l.qty); row.revenue += Number(l.amount); row.profit += profit;
      sold.set(l.item.id, row);
    }
  }
  const made = new Map<string, { name: string; unit: string; price: number | null; batches: number; produced: number; rejected: number; cost: number }>();
  for (const b of cur.batches) {
    const row = made.get(b.product.id) ?? { name: b.product.name, unit: b.product.unit, price: b.product.sellingPrice ? Number(b.product.sellingPrice) : null, batches: 0, produced: 0, rejected: 0, cost: 0 };
    row.batches += 1; row.produced += Number(b.qtyProduced); row.rejected += Number(b.qtyRejected);
    row.cost += Number(b.materialCost.plus(b.labourCost).plus(b.otherCost));
    made.set(b.product.id, row);
  }

  const top = (rows: typeof cust) => rows.filter((r) => r.balance.gt(0)).sort((a, b) => b.balance.comparedTo(a.balance)).slice(0, 5).map((r) => ({ id: r.id, name: r.name, value: n(r.balance) }));
  const owed = (rows: typeof cust) => n(rows.reduce((a, r) => (r.balance.gt(0) ? a.plus(r.balance) : a), ZERO));
  const stockValue = (t: string) => n(items.filter((i) => i.type === t).reduce((a, i) => a.plus(i.qtyOnHand.mul(i.avgCost)), ZERO));

  return {
    days: prev.days, prevRange,
    now: totalsOf(cur), before: totalsOf(old),
    series: series.map((s) => ({ ...s, in: r2n(s.in), out: r2n(s.out), sales: r2n(s.sales), profit: r2n(s.profit) })),
    products: [...sold.values()].map((p) => ({ ...p, revenue: r2n(p.revenue), profit: r2n(p.profit), margin: p.revenue ? Math.round((p.profit / p.revenue) * 1000) / 10 : 0 })).sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    production: [...made.values()].map((p) => {
      const good = p.produced - p.rejected, cpu = good > 0 ? p.cost / good : 0;
      return { name: p.name, unit: p.unit, batches: p.batches, good: Math.round(good * 1000) / 1000, rejectPct: p.produced ? Math.round((p.rejected / p.produced) * 1000) / 10 : 0, cost: r2n(cpu), price: p.price, perUnit: p.price === null ? null : r2n(p.price - cpu) };
    }).sort((a, b) => b.good - a.good),
    receivable: { total: owed(cust), top: top(cust) }, payable: { total: owed(vend), top: top(vend) },
    stock: { raw: stockValue("RAW_MATERIAL"), finished: stockValue("FINISHED_GOOD") },
    low: items.filter((i) => i.minStock.gt(0) && i.qtyOnHand.lt(i.minStock))
      .map((i) => ({ id: i.id, name: i.name, unit: i.unit, qty: Number(i.qtyOnHand), min: Number(i.minStock), ratio: Number(i.qtyOnHand.div(i.minStock)) }))
      .sort((a, b) => a.ratio - b.ratio),
  };
}
const r2n = (x: number) => Math.round(x * 100) / 100;

export const PAGE = 50;
export const LIST_PAGE = 20; // lists that people edit: items, parties, users, stock
export const pageOf = (sp: { page?: string }) => Math.max(1, Number(sp.page ?? 1) || 1);
export { D };
