// The nine business questions, answered from saved entries for one date range and the period of the same length before it.
// Cancelled entries are always left out. The maths lives in src/lib/insights.ts (unit tested); this file only loads rows.
import { db } from "./db";
import { partyBalances } from "./queries";
import { previousPeriod } from "../lib/analytics";
import { dateRange, type Range } from "../lib/filters";
import { consumption, materialPrices, profitability, simpleProfit, spending, trendOf, unitCosts, type BatchIn, type PaymentIn } from "../lib/insights";

const r2 = (x: number) => Math.round(x * 100) / 100;

// Dues "as of today" (bills minus payments, all time): the total and the largest five.
function owedSummary(rows: Awaited<ReturnType<typeof partyBalances>>) {
  const pos = rows.filter((x) => x.balance.gt(0)).sort((a, b) => b.balance.comparedTo(a.balance));
  return { total: r2(pos.reduce((a, x) => a + Number(x.balance), 0)), count: pos.length, top: pos.slice(0, 5).map((x) => ({ id: x.id, name: x.name, value: Number(x.balance) })) };
}

async function period(gte: Date, lte: Date) {
  const date = { gte, lte };
  const [pays, purchases, sales, batches] = await Promise.all([
    db.payment.findMany({ where: { cancelledAt: null, date }, select: { kind: true, amount: true, batchId: true, note: true, party: { select: { name: true } } } }),
    db.purchaseLine.findMany({ where: { purchase: { cancelledAt: null, date } }, select: { qty: true, amount: true, item: { select: { id: true, name: true, unit: true } } } }),
    db.saleLine.findMany({ where: { sale: { cancelledAt: null, date } }, select: { qty: true, amount: true, costAtSale: true } }),
    db.productionBatch.findMany({ where: { cancelledAt: null, date }, include: { product: { select: { name: true, unit: true } } } }),
  ]);
  // Materials used by each batch are read from the stock log (the PRODUCTION_USE rows of that batch).
  const uses = batches.length
    ? await db.stockMovement.findMany({
        where: { refType: "Batch", reason: "PRODUCTION_USE", refId: { in: batches.map((b) => String(b.id)) } },
        select: { refId: true, qtyChange: true, item: { select: { id: true, name: true, unit: true } } },
      })
    : [];
  const batchIn: BatchIn[] = batches.map((b) => ({
    productId: b.productId, productName: b.product.name, unit: b.product.unit,
    good: Number(b.qtyProduced.minus(b.qtyRejected)), material: Number(b.materialCost), labour: Number(b.labourCost), other: Number(b.otherCost),
    uses: uses.filter((u) => u.refId === String(b.id)).map((u) => ({ itemId: u.item.id, name: u.item.name, unit: u.item.unit, qty: -Number(u.qtyChange) })),
  }));
  const payIn: PaymentIn[] = pays.map((p) => ({ kind: p.kind, amount: Number(p.amount), payee: p.party?.name ?? "", batchId: p.batchId, note: p.note }));
  const sum = (k: string) => r2(payIn.filter((p) => p.kind === k).reduce((a, p) => a + p.amount, 0));
  return {
    batchIn, payIn,
    lines: purchases.map((l) => ({ itemId: l.item.id, name: l.item.name, unit: l.item.unit, qty: Number(l.qty), amount: Number(l.amount) })),
    profitIn: {
      sales: sales.map((s) => ({ amount: Number(s.amount), cost: Number(s.qty.mul(s.costAtSale)) })),
      overhead: r2(payIn.filter((p) => (p.kind === "LABOUR" || p.kind === "EXPENSE") && p.batchId === null).reduce((a, p) => a + p.amount, 0)),
    },
    cashOut: r2(sum("VENDOR_PAYMENT") + sum("LABOUR") + sum("EXPENSE")),
    cashIn: sum("CUSTOMER_RECEIPT"),
    billed: r2(purchases.reduce((a, l) => a + Number(l.amount), 0)),
    sales: r2(sales.reduce((a, l) => a + Number(l.amount), 0)),
  };
}

export async function businessInsights(range: Range) {
  const p = previousPeriod(range.from, range.to);
  const prevRange = dateRange({ from: p.from, to: p.to });
  const [cur, prev, cust, vend] = await Promise.all([
    period(range.gte, range.lte), period(prevRange.gte, prevRange.lte), partyBalances("CUSTOMER"), partyBalances("VENDOR"),
  ]);
  // Dues are "as of today": the outstanding balance at start + bills - payments, over all time.
  return {
    range: { from: range.from, to: range.to }, prevRange: { from: prevRange.from, to: prevRange.to }, days: p.days,
    // Q1: cash paid out, and purchase bills received (paid or not)
    spent: { cash: cur.cashOut, prevCash: prev.cashOut, billed: cur.billed, prevBilled: prev.billed, trend: trendOf(cur.cashOut, prev.cashOut) },
    // Q2: cash received from customers, and sales invoiced
    earned: { cash: cur.cashIn, prevCash: prev.cashIn, sales: cur.sales, prevSales: prev.sales, trend: trendOf(cur.sales, prev.sales) },
    receivable: owedSummary(cust), // Q3
    payable: owedSummary(vend),    // Q4
    prices: materialPrices(cur.lines, prev.lines),       // Q5
    consumption: consumption(cur.batchIn, prev.batchIn), // Q6
    unitCosts: unitCosts(cur.batchIn, prev.batchIn),     // Q7
    profit: profitability(cur.profitIn, prev.profitIn),  // Q8
    spending: spending(cur.payIn),                       // Q9
  };
}

export type Insights = Awaited<ReturnType<typeof businessInsights>>;

// The simple dashboard: profit for the chosen dates (and the period before), plus who owes what today.
export async function dashboardSummary(range: Range) {
  const p = previousPeriod(range.from, range.to);
  const prevRange = dateRange({ from: p.from, to: p.to });
  const [cur, prev, cust, vend] = await Promise.all([
    period(range.gte, range.lte), period(prevRange.gte, prevRange.lte), partyBalances("CUSTOMER"), partyBalances("VENDOR"),
  ]);
  const of = (x: Awaited<ReturnType<typeof period>>) =>
    simpleProfit({ sales: x.sales, materials: x.billed, labour: x.payIn.filter((y) => y.kind === "LABOUR").reduce((a, y) => a + y.amount, 0) });
  return {
    range: { from: range.from, to: range.to }, prevRange: { from: prevRange.from, to: prevRange.to }, days: p.days,
    cur: of(cur), prev: of(prev),
    receivable: owedSummary(cust), payable: owedSummary(vend),
  };
}
