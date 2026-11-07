// Business-intelligence maths. Pure functions over plain numbers, so every figure on the Insights page is unit tested.
// "cur" is the chosen period, "prev" the period of the same length just before it.

export type Trend = "up" | "down" | "flat" | "new" | "none";

const r = (x: number, dp: number) => { const f = 10 ** dp; return Math.round((x + Number.EPSILON) * f) / f; };
const pct = (cur: number, prev: number) => ((cur - prev) / Math.abs(prev)) * 100;

// Changes under 1% count as flat. "new" means there was nothing before to compare with.
export function trendOf(cur: number, prev: number): Trend {
  if (prev === 0) return cur === 0 ? "none" : "new";
  const p = pct(cur, prev);
  return Math.abs(p) < 1 ? "flat" : p > 0 ? "up" : "down";
}
const changeOf = (cur: number | null, prev: number | null) => (cur === null || prev === null || prev === 0 ? null : r(pct(cur, prev), 1));
// Largest rise first; rows with nothing to compare go last.
const byChange = <T extends { changePct: number | null }>(a: T, b: T) => (b.changePct ?? -Infinity) - (a.changePct ?? -Infinity);

// ---------- Q5: which raw materials are becoming more expensive ----------
export type PurchaseLineIn = { itemId: string; name: string; unit: string; qty: number; amount: number };

function avgRates(lines: PurchaseLineIn[]) {
  const m = new Map<string, { name: string; unit: string; qty: number; amount: number }>();
  for (const l of lines) {
    const x = m.get(l.itemId) ?? { name: l.name, unit: l.unit, qty: 0, amount: 0 };
    x.qty += l.qty; x.amount += l.amount; m.set(l.itemId, x);
  }
  return m;
}

// Weighted average purchase rate (total paid / total quantity) in each period.
export function materialPrices(cur: PurchaseLineIn[], prev: PurchaseLineIn[]) {
  const c = avgRates(cur), p = avgRates(prev);
  return [...c.entries()].map(([itemId, x]) => {
    const old = p.get(itemId);
    const curRate = r(x.amount / x.qty, 4);
    const prevRate = old ? r(old.amount / old.qty, 4) : null;
    return { itemId, name: x.name, unit: x.unit, prevRate, curRate, qty: x.qty, changePct: changeOf(curRate, prevRate), trend: prevRate === null ? "new" as Trend : trendOf(curRate, prevRate) };
  }).sort(byChange);
}

// ---------- Q6 and Q7: production ----------
export type BatchIn = {
  productId: string; productName: string; unit: string; good: number;
  material: number; labour: number; other: number;
  uses: { itemId: string; name: string; unit: string; qty: number }[];
};

function perProduct(batches: BatchIn[]) {
  const m = new Map<string, { name: string; unit: string; good: number; material: number; labour: number; other: number; uses: Map<string, { name: string; unit: string; qty: number }> }>();
  for (const b of batches) {
    const x = m.get(b.productId) ?? { name: b.productName, unit: b.unit, good: 0, material: 0, labour: 0, other: 0, uses: new Map() };
    x.good += b.good; x.material += b.material; x.labour += b.labour; x.other += b.other;
    for (const u of b.uses) {
      const y = x.uses.get(u.itemId) ?? { name: u.name, unit: u.unit, qty: 0 };
      y.qty += u.qty; x.uses.set(u.itemId, y);
    }
    m.set(b.productId, x);
  }
  return m;
}

// Raw material used per good unit made, per product and material.
export function consumption(cur: BatchIn[], prev: BatchIn[]) {
  const c = perProduct(cur), p = perProduct(prev);
  const rows = [];
  for (const [productId, x] of c) {
    if (x.good <= 0) continue;
    const old = p.get(productId);
    for (const [itemId, u] of x.uses) {
      const ou = old?.uses.get(itemId);
      const curPerUnit = r(u.qty / x.good, 4);
      const prevPerUnit = ou && old!.good > 0 ? r(ou.qty / old!.good, 4) : null;
      rows.push({
        productId, product: x.name, productUnit: x.unit, itemId, material: u.name, unit: u.unit,
        prevPerUnit, curPerUnit, changePct: changeOf(curPerUnit, prevPerUnit),
        trend: prevPerUnit === null ? "new" as Trend : trendOf(curPerUnit, prevPerUnit),
      });
    }
  }
  return rows.sort(byChange);
}

export type UnitCost = { material: number; labour: number; other: number; total: number };
const unitCost = (x: { good: number; material: number; labour: number; other: number }): UnitCost => ({
  material: r(x.material / x.good, 4), labour: r(x.labour / x.good, 4), other: r(x.other / x.good, 4),
  total: r((x.material + x.labour + x.other) / x.good, 4),
});

// Cost of one good unit, split into material, labour and other expenses.
export function unitCosts(cur: BatchIn[], prev: BatchIn[]) {
  const c = perProduct(cur), p = perProduct(prev);
  const rows = [];
  for (const [productId, x] of c) {
    if (x.good <= 0) continue;
    const old = p.get(productId);
    const now = unitCost(x);
    const before = old && old.good > 0 ? unitCost(old) : null;
    const exact = (x.material + x.labour + x.other) / x.good;
    const exactPrev = before ? (old!.material + old!.labour + old!.other) / old!.good : null;
    rows.push({
      productId, name: x.name, unit: x.unit, good: x.good, cur: now, prev: before,
      changePct: exactPrev ? r(pct(exact, exactPrev), 1) : null,
      trend: exactPrev === null ? "new" as Trend : trendOf(exact, exactPrev),
    });
  }
  return rows.sort(byChange);
}

// ---------- Q8: is profitability improving or declining ----------
export type ProfitIn = { sales: { amount: number; cost: number }[]; overhead: number };

function pnl(x: ProfitIn) {
  const revenue = r(x.sales.reduce((a, s) => a + s.amount, 0), 2);
  const cogs = r(x.sales.reduce((a, s) => a + s.cost, 0), 2);
  const gross = r(revenue - cogs, 2), net = r(gross - x.overhead, 2);
  const gm = revenue ? (gross / revenue) * 100 : 0, nm = revenue ? (net / revenue) * 100 : 0;
  return { out: { revenue, cogs, gross, grossMargin: r(gm, 1), overhead: r(x.overhead, 2), net, netMargin: r(nm, 1) }, nm };
}

// Gross = sales minus the cost of the goods sold. Net also takes off labour and expenses not tied to a batch
// (batch labour and expenses are already inside the cost of goods).
export function profitability(cur: ProfitIn, prev: ProfitIn) {
  const c = pnl(cur), p = pnl(prev);
  const hasPrev = p.out.revenue !== 0;
  const marginChange = hasPrev ? r(c.nm - p.nm, 1) : null;
  const trend: Trend = !hasPrev ? (c.out.revenue ? "new" : "none") : Math.abs(c.nm - p.nm) < 0.5 ? "flat" : c.nm > p.nm ? "up" : "down";
  return { cur: c.out, prev: p.out, marginChange, netChange: hasPrev ? r(c.out.net - p.out.net, 2) : null, trend };
}

// ---------- Q9: where the money is going ----------
export type PaymentIn = { kind: "VENDOR_PAYMENT" | "CUSTOMER_RECEIPT" | "LABOUR" | "EXPENSE"; amount: number; payee: string; batchId: number | null; note: string | null };

const KIND_LABEL = { VENDOR_PAYMENT: "Vendors (raw materials)", LABOUR: "Labour", EXPENSE: "Other expenses" } as const;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function spending(pays: PaymentIn[]) {
  const out = pays.filter((p) => p.kind !== "CUSTOMER_RECEIPT") as (PaymentIn & { kind: keyof typeof KIND_LABEL })[];
  const total = r(out.reduce((a, p) => a + p.amount, 0), 2);
  const share = (v: number) => (total ? r((v / total) * 100, 1) : 0);
  const kinds = new Map<keyof typeof KIND_LABEL, number>();
  const payees = new Map<string, number>();
  for (const p of out) {
    kinds.set(p.kind, (kinds.get(p.kind) ?? 0) + p.amount);
    const who = p.kind === "EXPENSE" ? `${cap(p.note?.trim() || "other")} (expense)` : p.payee || "Unknown";
    payees.set(who, (payees.get(who) ?? 0) + p.amount);
  }
  return {
    total,
    byKind: [...kinds.entries()].map(([key, v]) => ({ key, label: KIND_LABEL[key], value: r(v, 2), share: share(v) })).sort((a, b) => b.value - a.value),
    topPayees: [...payees.entries()].map(([label, v]) => ({ label, value: r(v, 2), share: share(v) })).sort((a, b) => b.value - a.value).slice(0, 8),
  };
}

// ---------- Dashboard profit (kept simple on purpose) ----------
// Profit = what we sold - raw materials we bought - labour we paid, for the chosen dates.
// Other expenses (gas, electricity…) are not taken off here; the Insights page has the full picture.
export function simpleProfit(x: { sales: number; materials: number; labour: number }) {
  const sales = r(x.sales, 2), materials = r(x.materials, 2), labour = r(x.labour, 2);
  return { sales, materials, labour, profit: r(sales - materials - labour, 2) };
}
