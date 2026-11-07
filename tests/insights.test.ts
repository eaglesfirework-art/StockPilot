// Written before the implementation. Pure business-intelligence maths, checked against hand-worked numbers.
// The figures are the same story the Playwright dry run enters through the screens (see e2e/journey.spec.ts).
import { describe, expect, it } from "vitest";
import { consumption, materialPrices, profitability, simpleProfit, spending, trendOf, unitCosts, type BatchIn } from "../src/lib/insights";

const flour = { itemId: "f", name: "Flour", unit: "kg" };
const sugar = { itemId: "s", name: "Sugar", unit: "kg" };
const ghee = { itemId: "g", name: "Ghee", unit: "kg" };

describe("trend", () => {
  it("classifies a change", () => {
    expect(trendOf(115, 100)).toBe("up");
    expect(trendOf(85, 100)).toBe("down");
    expect(trendOf(100.5, 100)).toBe("flat");
    expect(trendOf(10, 0)).toBe("new");
    expect(trendOf(0, 0)).toBe("none");
  });
});

describe("which raw materials are becoming more expensive", () => {
  const rows = materialPrices(
    [{ ...flour, qty: 100, amount: 4600 }, { ...sugar, qty: 50, amount: 2800 }, { ...ghee, qty: 10, amount: 5000 }],
    [{ ...flour, qty: 60, amount: 2400 }, { ...flour, qty: 40, amount: 1600 }, { ...sugar, qty: 50, amount: 2500 }],
  );
  it("compares the weighted average rate with the previous period, biggest rise first", () => {
    expect(rows.map((r) => [r.name, r.prevRate, r.curRate, r.changePct, r.trend])).toEqual([
      ["Flour", 40, 46, 15, "up"],
      ["Sugar", 50, 56, 12, "up"],
      ["Ghee", null, 500, null, "new"],
    ]);
  });
});

const prevBatch: BatchIn = { productId: "p", productName: "Biscuit pack", unit: "piece", good: 400, material: 3000, labour: 2000, other: 500,
  uses: [{ ...flour, qty: 50 }, { ...sugar, qty: 20 }] };
const curBatch: BatchIn = { productId: "p", productName: "Biscuit pack", unit: "piece", good: 400, material: 3983.75, labour: 2400, other: 600,
  uses: [{ ...flour, qty: 60 }, { ...sugar, qty: 25 }] };

describe("is production consuming more raw material than before", () => {
  it("compares material used per good unit", () => {
    const rows = consumption([curBatch], [prevBatch]);
    expect(rows.map((r) => [r.material, r.prevPerUnit, r.curPerUnit, r.changePct, r.trend])).toEqual([
      ["Sugar", 0.05, 0.0625, 25, "up"],
      ["Flour", 0.125, 0.15, 20, "up"],
    ]);
  });
  it("adds up several batches of the same product", () => {
    const half = { ...curBatch, good: 200, uses: [{ ...flour, qty: 30 }, { ...sugar, qty: 12.5 }] };
    const rows = consumption([half, half], [prevBatch]);
    expect(rows.find((r) => r.material === "Flour")!.curPerUnit).toBe(0.15);
  });
});

describe("how production costs are changing", () => {
  it("splits cost per good unit into material, labour and other", () => {
    const [r] = unitCosts([curBatch], [prevBatch]);
    expect(r.prev).toEqual({ material: 7.5, labour: 5, other: 1.25, total: 13.75 });
    expect(r.cur).toEqual({ material: 9.9594, labour: 6, other: 1.5, total: 17.4594 });
    expect(r.changePct).toBe(27);
    expect(r.trend).toBe("up");
  });
});

describe("is profitability improving or declining", () => {
  it("compares gross and net margin, net after labour and expenses outside batches", () => {
    const p = profitability(
      { sales: [{ amount: 6400, cost: 3343.5 }], overhead: 500 },
      { sales: [{ amount: 9000, cost: 4125 }], overhead: 0 },
    );
    expect(p.cur).toEqual({ revenue: 6400, cogs: 3343.5, gross: 3056.5, grossMargin: 47.8, overhead: 500, net: 2556.5, netMargin: 39.9 });
    expect(p.prev).toEqual({ revenue: 9000, cogs: 4125, gross: 4875, grossMargin: 54.2, overhead: 0, net: 4875, netMargin: 54.2 });
    expect(p.marginChange).toBe(-14.2); // percentage points of net margin, from unrounded margins
    expect(p.trend).toBe("down");
  });
});

describe("where the money is going", () => {
  it("groups money out by type and by who was paid", () => {
    const s = spending([
      { kind: "VENDOR_PAYMENT", amount: 2000, payee: "Anand Flour Mills", batchId: null, note: null },
      { kind: "VENDOR_PAYMENT", amount: 1000, payee: "Anand Flour Mills", batchId: null, note: "on account" },
      { kind: "LABOUR", amount: 2400, payee: "Ramesh team", batchId: 2, note: null },
      { kind: "LABOUR", amount: 500, payee: "Ramesh team", batchId: null, note: "advance" },
      { kind: "EXPENSE", amount: 600, payee: "", batchId: 2, note: "gas" },
      { kind: "CUSTOMER_RECEIPT", amount: 2000, payee: "City Bakers", batchId: null, note: null },
    ]);
    expect(s.total).toBe(6500);
    expect(s.byKind).toEqual([
      { key: "VENDOR_PAYMENT", label: "Vendors (raw materials)", value: 3000, share: 46.2 },
      { key: "LABOUR", label: "Labour", value: 2900, share: 44.6 },
      { key: "EXPENSE", label: "Other expenses", value: 600, share: 9.2 },
    ]);
    expect(s.topPayees.map((p) => [p.label, p.value])).toEqual([["Anand Flour Mills", 3000], ["Ramesh team", 2900], ["Gas (expense)", 600]]);
  });
});

describe("dashboard profit (kept simple on purpose)", () => {
  it("is sales minus raw materials bought minus labour", () => {
    expect(simpleProfit({ sales: 9000, materials: 6500, labour: 2000 })).toEqual({ sales: 9000, materials: 6500, labour: 2000, profit: 500 });
    expect(simpleProfit({ sales: 6400, materials: 7400, labour: 2900 }).profit).toBe(-3900);
    expect(simpleProfit({ sales: 0.1, materials: 0.2, labour: 0 }).profit).toBe(-0.1); // no floating-point dust
  });
});
