// Read-only functions. The dashboard, the lists and the CSV reports all use these, so numbers agree.
import { db } from "./db";
import { D, Dec, ZERO } from "../lib/dec";

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

const IST = "+05:30";
export function rangeOf(range: string, from?: string, to?: string) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const start = (d: string) => new Date(`${d}T00:00:00${IST}`);
  if (from && to) return { from: start(from), to: new Date(`${to}T23:59:59.999${IST}`), label: `${from} to ${to}` };
  if (range === "today") return { from: start(today), to: new Date(), label: "Today" };
  if (range === "7d") return { from: new Date(start(today).getTime() - 6 * 864e5), to: new Date(), label: "Last 7 days" };
  return { from: start(today.slice(0, 7) + "-01"), to: new Date(), label: "This month" };
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

export async function dashboard(from: Date, to: Date) {
  const [flow, cust, vend, items] = await Promise.all([
    moneyFlow(from, to), partyBalances("CUSTOMER"), partyBalances("VENDOR"), db.item.findMany({ where: { active: true } }),
  ]);
  const top = (rows: typeof cust) => rows.filter((r) => r.balance.gt(0)).sort((a, b) => b.balance.comparedTo(a.balance)).slice(0, 5);
  const total = (rows: typeof cust) => rows.reduce((a, r) => (r.balance.gt(0) ? a.plus(r.balance) : a), ZERO);
  const value = (t: string) => items.filter((i) => i.type === t).reduce((a, i) => a.plus(i.qtyOnHand.mul(i.avgCost)), ZERO);
  return {
    flow,
    custOwe: { total: total(cust), top: top(cust) },
    vendOwe: { total: total(vend), top: top(vend) },
    stockValue: { raw: value("RAW_MATERIAL"), fg: value("FINISHED_GOOD") },
    low: items.filter((i) => i.minStock.gt(0) && i.qtyOnHand.lt(i.minStock)),
  };
}

export const PAGE = 50;
export const pageOf = (sp: { page?: string }) => Math.max(1, Number(sp.page ?? 1) || 1);
export { D };
