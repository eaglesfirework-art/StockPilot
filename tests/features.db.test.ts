// Written before the implementation. Needs the TEST database (npm run test:setup).
// 1) duplicate parties and items are blocked, 2) a product needs at least one raw material and no selling price,
// 3) labour payments carry a work period, 4) businessInsights answers the nine business questions with exact numbers.
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { db } from "../src/server/db";
import { createBatch, createPayment, createPurchase, createSale } from "../src/server/core";
import { createItem, createParty, updateItem, updateParty } from "../src/server/master";
import { businessInsights } from "../src/server/insights";
import { partyBalances } from "../src/server/queries";
import { dateRange } from "../src/lib/filters";

let admin = "", flour = "", sugar = "", pack = "";
const ids: Record<string, string> = {};
let n = 0;
const rid = () => `test-ins-${++n}`;

beforeAll(async () => {
  if (!/test/i.test(process.env.DATABASE_URL ?? "")) throw new Error("Refusing to run: DATABASE_URL must be a TEST database.");
  await db.$executeRawUnsafe(
    `TRUNCATE "AuditLog","StockMovement","Payment","SaleLine","Sale","PurchaseLine","Purchase","ProductionBatch","ProductMaterial","Party","Item","User" RESTART IDENTITY CASCADE`,
  );
  admin = (await db.user.create({ data: { name: "Admin", email: "a@t.local", passwordHash: "x", role: "ADMIN" } })).id;
  flour = (await db.item.create({ data: { name: "Flour", type: "RAW_MATERIAL", unit: "kg" } })).id;
  sugar = (await db.item.create({ data: { name: "Sugar", type: "RAW_MATERIAL", unit: "kg" } })).id;
  pack = (await db.item.create({ data: { name: "Biscuit pack", type: "FINISHED_GOOD", unit: "piece" } })).id;
  await db.productMaterial.createMany({ data: [{ productId: pack, materialId: flour }, { productId: pack, materialId: sugar }] });
});
afterAll(() => db.$disconnect());

describe("duplicate vendors are blocked", () => {
  it("creates a vendor once", async () => {
    ids.anand = (await createParty(admin, { name: "Anand Flour Mills", type: "VENDOR", phone: "98765 43210" })).id;
    ids.shree = (await createParty(admin, { name: "Shree Sugar Traders", type: "VENDOR" })).id;
  });
  it("blocks the same name typed differently", async () => {
    await expect(createParty(admin, { name: "  anand   FLOUR mills. ", type: "VENDOR" })).rejects.toThrow(/vendor named "Anand Flour Mills" already exists/i);
    expect(await db.party.count({ where: { type: "VENDOR" } })).toBe(2);
  });
  it("blocks a second vendor with the same phone", async () => {
    await expect(createParty(admin, { name: "Anand Mills Branch", type: "VENDOR", phone: "+91 9876543210" })).rejects.toThrow(/already uses this phone/i);
  });
  it("blocks renaming a vendor onto another vendor's name", async () => {
    await expect(updateParty(admin, { id: ids.shree, name: "ANAND flour mills", active: true })).rejects.toThrow(/already exists/i);
  });
  it("allows the same name for a different kind of party", async () => {
    ids.anandCustomer = (await createParty(admin, { name: "Anand Flour Mills", type: "CUSTOMER" })).id;
    expect(ids.anandCustomer).toBeTruthy();
  });
  it("blocks two saves racing with the same name (database index)", async () => {
    const r = await Promise.allSettled([createParty(admin, { name: "Race Vendor", type: "VENDOR" }), createParty(admin, { name: "race vendor", type: "VENDOR" })]);
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(await db.party.count({ where: { nameKey: "race vendor" } })).toBe(1);
  });
});

describe("duplicate items are blocked (found by the Playwright run)", () => {
  it("rejects 'flour' when 'Flour' exists, on create and on rename", async () => {
    await expect(createItem(admin, { name: " flour ", type: "RAW_MATERIAL", unit: "kg" })).rejects.toThrow(/item named "Flour" already exists/);
    await expect(updateItem(admin, { id: sugar, name: "FLOUR", active: true })).rejects.toThrow(/already exists/);
  });
});

describe("a product is added without a selling price and needs at least one raw material", () => {
  it("refuses a product with no raw material", async () => {
    await expect(createItem(admin, { name: "Cookie jar", type: "FINISHED_GOOD", unit: "piece", materialIds: [] }))
      .rejects.toThrow(/Choose at least one raw material/);
    expect(await db.item.count({ where: { name: "Cookie jar" } })).toBe(0);
  });
  it("refuses a 'raw material' that is really a product", async () => {
    await expect(createItem(admin, { name: "Cookie jar", type: "FINISHED_GOOD", unit: "piece", materialIds: [pack] }))
      .rejects.toThrow(/Only raw materials can be chosen/);
  });
  it("saves the product and its raw materials together", async () => {
    const jar = await createItem(admin, { name: "Cookie jar", type: "FINISHED_GOOD", unit: "piece", materialIds: [flour, sugar] });
    const maps = await db.productMaterial.findMany({ where: { productId: jar.id } });
    expect(maps.map((m) => m.materialId).sort()).toEqual([flour, sugar].sort());
    ids.jar = jar.id;
  });
  it("will not let an edit take away the last raw material", async () => {
    await expect(updateItem(admin, { id: ids.jar, name: "Cookie jar", active: true, materialIds: [] })).rejects.toThrow(/at least one raw material/);
    await updateItem(admin, { id: ids.jar, name: "Cookie jar", active: true, materialIds: [flour] });
    expect(await db.productMaterial.count({ where: { productId: ids.jar } })).toBe(1);
  });
});

describe("labour payments record the work period", () => {
  beforeAll(async () => { ids.lata = (await createParty(admin, { name: "Lata", type: "WORKER" })).id; });
  const base = () => ({ requestId: rid(), kind: "LABOUR", partyId: ids.lata, amount: 700, date: "2026-08-08" });
  it("needs both dates, and From cannot be after To", async () => {
    await expect(createPayment(admin, base())).rejects.toThrow(/work period/i);
    await expect(createPayment(admin, { ...base(), workFrom: "2026-08-07", workTo: "2026-08-01" })).rejects.toThrow(/cannot be after/i);
  });
  it("saves the period", async () => {
    const p = await createPayment(admin, { ...base(), workFrom: "2026-08-01", workTo: "2026-08-07" });
    expect(p.workFrom?.toISOString().slice(0, 10)).toBe("2026-08-01");
    expect(p.workTo?.toISOString().slice(0, 10)).toBe("2026-08-07");
  });
  it("vendor and customer payments do not carry a work period", async () => {
    // a small bill first, so there is something to pay (payments can never exceed what is owed)
    const v = (await createParty(admin, { name: "Work Period Test Vendor", type: "VENDOR" })).id;
    const bill = await createPurchase(admin, { requestId: rid(), vendorId: v, date: "2026-08-08", lines: [{ itemId: flour, qty: 1, rate: 10 }] });
    const p = await createPayment(admin, { requestId: rid(), kind: "VENDOR_PAYMENT", partyId: v, amount: 1, date: "2026-08-08", workFrom: "2026-08-01", workTo: "2026-08-07" });
    expect(p.workFrom).toBeNull();
    const { cancelDoc } = await import("../src/server/core");
    await cancelDoc(admin, "payment", p.id, "test entry");
    await cancelDoc(admin, "purchase", bill.id, "test entry");
  });
});

describe("business insights (previous period: September, this period: October)", () => {
  beforeAll(async () => {
    ids.metro = (await createParty(admin, { name: "Metro Mart", type: "CUSTOMER" })).id;
    ids.city = (await createParty(admin, { name: "City Bakers", type: "CUSTOMER" })).id;
    ids.ramesh = (await createParty(admin, { name: "Ramesh team", type: "WORKER" })).id;
    // September
    await createPurchase(admin, { requestId: rid(), vendorId: ids.anand, date: "2026-09-05", paidNow: 4000, lines: [{ itemId: flour, qty: 100, rate: 40 }] });
    await createPurchase(admin, { requestId: rid(), vendorId: ids.shree, date: "2026-09-05", paidNow: 2500, lines: [{ itemId: sugar, qty: 50, rate: 50 }] });
    await createBatch(admin, { requestId: rid(), productId: pack, date: "2026-09-06", qtyProduced: 400, materials: [{ itemId: flour, qty: 50 }, { itemId: sugar, qty: 20 }],
      labour: [{ partyId: ids.ramesh, amount: 2000 }], expenses: [{ note: "gas", paidTo: "Gas supplier", amount: 500 }] });
    await createSale(admin, { requestId: rid(), customerId: ids.metro, date: "2026-09-07", receivedNow: 9000, lines: [{ itemId: pack, qty: 300, rate: 30 }] });
    // October: prices up, more material per pack
    await createPurchase(admin, { requestId: rid(), vendorId: ids.anand, date: "2026-10-10", paidNow: 2000, lines: [{ itemId: flour, qty: 100, rate: 46 }] });
    await createPurchase(admin, { requestId: rid(), vendorId: ids.shree, date: "2026-10-10", lines: [{ itemId: sugar, qty: 50, rate: 56 }] });
    await createBatch(admin, { requestId: rid(), productId: pack, date: "2026-10-12", qtyProduced: 400, materials: [{ itemId: flour, qty: 60 }, { itemId: sugar, qty: 25 }],
      labour: [{ partyId: ids.ramesh, amount: 2400 }], expenses: [{ note: "gas", paidTo: "Gas supplier", amount: 600 }] });
    await createSale(admin, { requestId: rid(), customerId: ids.city, date: "2026-10-15", receivedNow: 2000, lines: [{ itemId: pack, qty: 200, rate: 32 }] });
    await createPayment(admin, { requestId: rid(), kind: "LABOUR", partyId: ids.ramesh, amount: 500, date: "2026-10-17", note: "advance", workFrom: "2026-10-13", workTo: "2026-10-17" });
    await createPayment(admin, { requestId: rid(), kind: "VENDOR_PAYMENT", partyId: ids.anand, amount: 1000, date: "2026-10-18" });
    await createPayment(admin, { requestId: rid(), kind: "CUSTOMER_RECEIPT", partyId: ids.city, amount: 1500, date: "2026-10-19" });
  });

  const get = () => businessInsights(dateRange({ from: "2026-10-01", to: "2026-10-30" }));

  it("Q1 how much money is being spent", async () => {
    const i = await get();
    expect(i.spent).toMatchObject({ cash: 6500, prevCash: 9000, billed: 7400, prevBilled: 6500 });
  });
  it("Q2 how much money is being earned", async () => {
    const i = await get();
    expect(i.earned).toMatchObject({ cash: 3500, prevCash: 9000, sales: 6400, prevSales: 9000 });
  });
  it("Q3 how much customers owe us", async () => {
    const i = await get();
    expect(i.receivable.total).toBe(2900);
    expect(i.receivable.top).toEqual([{ id: ids.city, name: "City Bakers", value: 2900 }]);
  });
  it("Q4 how much we owe vendors (bills minus payments only, no opening balance)", async () => {
    const i = await get();
    // Shree: 2500 + 2800 (50 kg @ 56) - 2500 paid = 2800. Anand: 4000 + 4600 (100 kg @ 46) - 4000 - 2000 - 1000 = 1600.
    expect(i.payable.total).toBe(4400);
    expect(i.payable.top.map((p) => [p.name, p.value])).toEqual([["Shree Sugar Traders", 2800], ["Anand Flour Mills", 1600]]);
    const bal = await partyBalances("VENDOR");
    expect(Number(bal.find((b) => b.id === ids.shree)!.balance)).toBe(2800);
  });
  it("Q5 which raw materials are becoming more expensive", async () => {
    const i = await get();
    expect(i.prices.map((r) => [r.name, r.prevRate, r.curRate, r.changePct])).toEqual([["Flour", 40, 46, 15], ["Sugar", 50, 56, 12]]);
  });
  it("Q6 is production consuming more raw material than before", async () => {
    const i = await get();
    expect(i.consumption.map((r) => [r.material, r.prevPerUnit, r.curPerUnit, r.changePct])).toEqual([["Sugar", 0.05, 0.0625, 25], ["Flour", 0.125, 0.15, 20]]);
  });
  it("Q7 how production costs are changing", async () => {
    const [r] = (await get()).unitCosts;
    expect(r.prev!.total).toBe(13.75);
    expect(r.cur).toEqual({ material: 9.9594, labour: 6, other: 1.5, total: 17.4594 });
  });
  it("Q8 is profitability improving or declining", async () => {
    const p = (await get()).profit;
    expect(p.cur).toMatchObject({ revenue: 6400, cogs: 3343.5, gross: 3056.5, overhead: 500, net: 2556.5 });
    expect(p.prev).toMatchObject({ revenue: 9000, cogs: 4125, net: 4875 });
    expect(p.trend).toBe("down");
  });
  it("Q9 where the money is going", async () => {
    const s = (await get()).spending;
    expect(s.total).toBe(6500);
    expect(s.byKind.map((k) => [k.label, k.value])).toEqual([["Vendors (raw materials)", 3000], ["Labour", 2900], ["Other expenses", 600]]);
  });
  it("ignores cancelled entries", async () => {
    const extra = await createPurchase(admin, { requestId: rid(), vendorId: ids.anand, date: "2026-10-20", paidNow: 100, lines: [{ itemId: flour, qty: 1, rate: 999 }] });
    const { cancelDoc } = await import("../src/server/core");
    await cancelDoc(admin, "purchase", extra.id, "test entry");
    const i = await get();
    expect(i.spent.cash).toBe(6500);
    expect(i.prices[0].curRate).toBe(46);
  });
});

describe("simple dashboard: profit = sales - raw materials bought - labour, plus who owes what", () => {
  it("October", async () => {
    const { dashboardSummary } = await import("../src/server/insights");
    const d = await dashboardSummary(dateRange({ from: "2026-10-01", to: "2026-10-30" }));
    // sales 6400 - raw materials 4600 + 2800 - labour 2400 (batch) + 500 (advance) = -3900
    expect(d.cur).toEqual({ sales: 6400, materials: 7400, labour: 2900, profit: -3900 });
    // September: 9000 - (4000 + 2500) - 2000 = 500
    expect(d.prev).toEqual({ sales: 9000, materials: 6500, labour: 2000, profit: 500 });
    expect(d.receivable.total).toBe(2900);
    expect(d.payable.total).toBe(4400);
    expect(d.receivable.top[0]).toMatchObject({ name: "City Bakers", value: 2900 });
    expect(d.payable.top.map((p) => p.name)).toEqual(["Shree Sugar Traders", "Anand Flour Mills"]);
  });
});

describe("work period on labour paid inside a production batch", () => {
  it("is the batch date", async () => {
    const p = await db.payment.findFirstOrThrow({ where: { kind: "LABOUR", batchId: { not: null }, amount: 2400 } });
    expect(p.workFrom?.toISOString().slice(0, 10)).toBe("2026-10-12");
    expect(p.workTo?.toISOString().slice(0, 10)).toBe("2026-10-12");
  });
});

describe("filtering labour payments by work period", () => {
  it("finds payments whose work days overlap the chosen dates", async () => {
    const { workPeriodWhere } = await import("../src/lib/filters");
    const r = dateRange({ from: "2026-10-15", to: "2026-10-20" });
    const found = await db.payment.findMany({ where: { kind: "LABOUR", cancelledAt: null, ...workPeriodWhere(r) }, select: { amount: true } });
    // the 13-17 Oct advance overlaps; the batch labour on 12 Oct and 6 Sep does not
    expect(found.map((p) => Number(p.amount))).toEqual([500]);
  });
});

describe("no negative balances: nobody is ever shown as owing less than zero", () => {
  it("a vendor payment cannot be more than what we owe", async () => {
    // Anand: bills 8600 - payments 7000 = 1600
    await expect(createPayment(admin, { requestId: rid(), kind: "VENDOR_PAYMENT", partyId: ids.anand, amount: 1600.01, date: "2026-10-25" }))
      .rejects.toThrow("We owe Anand Flour Mills only ₹1,600.00. A payment cannot be more than that.");
  });
  it("a customer receipt cannot be more than what they owe", async () => {
    await expect(createPayment(admin, { requestId: rid(), kind: "CUSTOMER_RECEIPT", partyId: ids.city, amount: 3000, date: "2026-10-25" }))
      .rejects.toThrow("City Bakers owes us only ₹2,900.00. A receipt cannot be more than that.");
    await expect(createPayment(admin, { requestId: rid(), kind: "CUSTOMER_RECEIPT", partyId: ids.metro, amount: 1, date: "2026-10-25" }))
      .rejects.toThrow("Metro Mart owes us nothing right now, so there is nothing to receive.");
  });
  it("two payments at the same moment cannot together go past what is owed", async () => {
    const v = (await createParty(admin, { name: "Race Pay Vendor", type: "VENDOR" })).id;
    await createPurchase(admin, { requestId: rid(), vendorId: v, date: "2026-10-25", lines: [{ itemId: flour, qty: 10, rate: 10 }] }); // owe 100
    const r = await Promise.allSettled([60, 60].map((amount) => createPayment(admin, { requestId: rid(), kind: "VENDOR_PAYMENT", partyId: v, amount, date: "2026-10-25" })));
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    const bal = await partyBalances("VENDOR");
    expect(Number(bal.find((b) => b.id === v)!.balance)).toBe(40);
  });
  it("cancelling a bill that was already paid off on account is refused", async () => {
    const { cancelDoc } = await import("../src/server/core");
    const v = (await createParty(admin, { name: "Cancel Test Vendor", type: "VENDOR" })).id;
    const bill = await createPurchase(admin, { requestId: rid(), vendorId: v, date: "2026-10-26", lines: [{ itemId: flour, qty: 10, rate: 30 }] }); // owe 300
    await createPayment(admin, { requestId: rid(), kind: "VENDOR_PAYMENT", partyId: v, amount: 300, date: "2026-10-26" });
    await expect(cancelDoc(admin, "purchase", bill.id, "wrong bill")).rejects.toThrow(/Cancel the payment first/);
    expect((await db.purchase.findUniqueOrThrow({ where: { id: bill.id } })).cancelledAt).toBeNull();
  });
  it("no party balance in the system is below zero", async () => {
    for (const t of ["VENDOR", "CUSTOMER"] as const)
      for (const b of await partyBalances(t)) expect(Number(b.balance)).toBeGreaterThanOrEqual(0);
  });
});
