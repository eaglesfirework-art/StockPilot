// Plan section 6 as an automated test. Needs a real Postgres (the TEST database).
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "../src/server/db";
import { createPurchase, createBatch, createSale, createPayment, cancelDoc, adjustStock } from "../src/server/core";
import { partyBalances, moneyFlow } from "../src/server/queries";
import { UserError } from "../src/server/errors";

const D = "2026-11-01";
let admin: string, flour: string, sugar: string, pack: string, vA: string, vB: string, cC: string, ramesh: string;
let batchId = 0, saleId = 0;

async function item(name: string) { return db.item.findUniqueOrThrow({ where: { name } }); }
const near = (a: unknown, b: number, eps = 0.0001) => expect(Math.abs(Number(a) - b)).toBeLessThan(eps);

beforeAll(async () => {
  if (!/test/i.test(process.env.DATABASE_URL ?? "")) throw new Error("Refusing to run: DATABASE_URL must be a TEST database (name contains 'test').");
  await db.$executeRawUnsafe(
    `TRUNCATE "AuditLog","StockMovement","Payment","SaleLine","Sale","PurchaseLine","Purchase","ProductionBatch","ProductMaterial","Party","Item","User" RESTART IDENTITY CASCADE`,
  );
  admin = (await db.user.create({ data: { name: "Admin", email: "a@t.local", passwordHash: "x", role: "ADMIN" } })).id;
  flour = (await db.item.create({ data: { name: "Flour", type: "RAW_MATERIAL", unit: "kg" } })).id;
  sugar = (await db.item.create({ data: { name: "Sugar", type: "RAW_MATERIAL", unit: "kg" } })).id;
  pack = (await db.item.create({ data: { name: "Biscuit pack", type: "FINISHED_GOOD", unit: "piece" } })).id;
  const extra = (await db.item.create({ data: { name: "Salt", type: "RAW_MATERIAL", unit: "kg" } })).id;
  vA = (await db.party.create({ data: { name: "A", type: "VENDOR" } })).id;
  vB = (await db.party.create({ data: { name: "B", type: "VENDOR" } })).id;
  cC = (await db.party.create({ data: { name: "C", type: "CUSTOMER" } })).id;
  ramesh = (await db.party.create({ data: { name: "Ramesh", type: "WORKER" } })).id;
  await db.productMaterial.createMany({ data: [{ productId: pack, materialId: flour }, { productId: pack, materialId: sugar }] });
  void extra;
});
afterAll(() => db.$disconnect());

describe("section 6 worked example", () => {
  it("steps 1-3: purchases", async () => {
    await createPurchase(admin, { requestId: "test-req-p1", vendorId: vA, date: D, paidNow: 2000, lines: [{ itemId: flour, qty: 100, rate: 40 }] });
    let f = await item("Flour"); near(f.qtyOnHand, 100); near(f.avgCost, 40);
    await createPurchase(admin, { requestId: "test-req-p2", vendorId: vA, date: D, paidNow: 3000, lines: [{ itemId: flour, qty: 100, rate: 44 }] });
    f = await item("Flour"); near(f.qtyOnHand, 200); near(f.avgCost, 42);
    await createPurchase(admin, { requestId: "test-req-p3", vendorId: vB, date: D, paidNow: 1000, lines: [{ itemId: sugar, qty: 20, rate: 50 }] });
    const s = await item("Sugar"); near(s.qtyOnHand, 20); near(s.avgCost, 50);
    const bal = await partyBalances("VENDOR");
    near(bal.find((b) => b.id === vA)!.balance, 3400); near(bal.find((b) => b.id === vB)!.balance, 0);
  });

  it("step 4: batch gives cost per unit 18.4211", async () => {
    const b = await createBatch(admin, {
      requestId: "test-req-b1", productId: pack, date: D, qtyProduced: 400, qtyRejected: 20,
      materials: [{ itemId: flour, qty: 50 }, { itemId: sugar, qty: 20 }],
      labour: [{ partyId: ramesh, amount: 3000 }], expenses: [{ note: "Gas", amount: 900 }],
    });
    batchId = b.id;
    near(b.materialCost, 3100); near(b.labourCost, 3000); near(b.otherCost, 900); expect(b.costPerUnit.toFixed(4)).toBe("18.4211");
    const f = await item("Flour"); near(f.qtyOnHand, 150); near(f.avgCost, 42); near(f.qtyOnHand.mul(f.avgCost), 6300);
    near((await item("Sugar")).qtyOnHand, 0);
    near((await item("Biscuit pack")).qtyOnHand, 380);
  });

  it("step 5: sale, profit, dues and money flow", async () => {
    const s = await createSale(admin, { requestId: "test-req-s1", customerId: cC, date: D, receivedNow: 1000, lines: [{ itemId: pack, qty: 100, rate: 30 }] });
    saleId = s.id;
    const p = await item("Biscuit pack"); near(p.qtyOnHand, 280); near(p.qtyOnHand.mul(p.avgCost), 5157.91, 0.01);
    const line = await db.saleLine.findFirstOrThrow({ where: { saleId } });
    near(line.qty.mul(line.costAtSale), 1842.11, 0.01); near(line.amount.minus(line.qty.mul(line.costAtSale)), 1157.89, 0.01);
    near((await partyBalances("CUSTOMER")).find((b) => b.id === cC)!.balance, 2000);
    const f = await moneyFlow(new Date("2026-01-01"), new Date("2027-01-01"));
    near(f.in, 1000); near(f.out, 9900); near(f.net, -8900); near(f.by.VENDOR_PAYMENT, 6000); near(f.by.LABOUR, 3000); near(f.by.EXPENSE, 900);
  });
});

describe("must be blocked", () => {
  const blocked = async (p: Promise<unknown>, text: RegExp) => { await expect(p).rejects.toThrow(text); };

  it("sell more than in stock", () => blocked(createSale(admin, { requestId: "test-req-x1", customerId: cC, date: D, lines: [{ itemId: pack, qty: 300, rate: 30 }] }), /Only 280/));
  it("batch with 0 good units", () => blocked(createBatch(admin, { requestId: "test-req-x2", productId: pack, date: D, qtyProduced: 5, qtyRejected: 5, materials: [{ itemId: flour, qty: 1 }] }), /Good units must be more than 0/));
  it("batch using more flour than in stock", () => blocked(createBatch(admin, { requestId: "test-req-x3", productId: pack, date: D, qtyProduced: 10, materials: [{ itemId: flour, qty: 500 }] }), /Only 150/));
  it("batch using a material that is not mapped", async () => {
    const salt = await item("Salt");
    await blocked(createBatch(admin, { requestId: "test-req-x4", productId: pack, date: D, qtyProduced: 10, materials: [{ itemId: salt.id, qty: 1 }] }), /not mapped/);
  });
  it("purchase with qty 0 or negative", async () => {
    await blocked(createPurchase(admin, { requestId: "test-req-x5", vendorId: vA, date: D, lines: [{ itemId: flour, qty: 0, rate: 10 }] }), /more than 0/);
    await blocked(createPurchase(admin, { requestId: "test-req-x6", vendorId: vA, date: D, lines: [{ itemId: flour, qty: -2, rate: 10 }] }), /more than 0/);
  });
  it("double save makes one entry", async () => {
    const salt = await item("Salt");
    const input = { requestId: "test-req-dbl", vendorId: vA, date: D, lines: [{ itemId: salt.id, qty: 1, rate: 10 }] };
    const [a, b] = await Promise.all([createPurchase(admin, input), createPurchase(admin, input)]);
    expect(a.id).toBe(b.id);
    expect(await db.purchase.count({ where: { requestId: "test-req-dbl" } })).toBe(1);
    await cancelDoc(admin, "purchase", a.id, "test cleanup");
  });
  it("two sales of the last 10 units: one wins, stock never below 0", async () => {
    await adjustStock(admin, { itemId: pack, kind: "ADJUSTMENT", change: "-270", reason: "test: leave 10" });
    const mk = (n: string) => createSale(admin, { requestId: "test-req-" + n, customerId: cC, date: D, lines: [{ itemId: pack, qty: 10, rate: 30 }] });
    const r = await Promise.allSettled([mk("r1"), mk("r2")]);
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect(r.filter((x) => x.status === "rejected")).toHaveLength(1);
    near((await item("Biscuit pack")).qtyOnHand, 0);
    // put the state back to 280 packs at the same cost for the next tests
    const won = await db.sale.findFirstOrThrow({ where: { requestId: { in: ["test-req-r1", "test-req-r2"] } } });
    await cancelDoc(admin, "sale", won.id, "test cleanup");
    await adjustStock(admin, { itemId: pack, kind: "ADJUSTMENT", change: "270", unitCost: "18.4211", reason: "test: restore" });
    near((await item("Biscuit pack")).qtyOnHand, 280);
  });
  it("payment larger than bill due", async () => {
    const p = await db.purchase.findFirstOrThrow({ where: { requestId: "test-req-p2" } });
    await blocked(createPayment(admin, { requestId: "test-req-x7", kind: "VENDOR_PAYMENT", partyId: vA, amount: 99999, date: D, purchaseId: p.id }), /More than the bill due/);
  });
});

describe("cancel rules", () => {
  it("cancel batch is blocked after packs were sold", async () => {
    // stock of packs is 280 now (380 - 100). Batch made 380.
    await expect(cancelDoc(admin, "batch", batchId, "mistake")).rejects.toThrow(/Need to remove 380/);
    expect((await db.productionBatch.findUniqueOrThrow({ where: { id: batchId } })).cancelledAt).toBeNull(); // rolled back
  });
  it("cancel sale, then batch: stock and payments come back", async () => {
    await cancelDoc(admin, "sale", saleId, "wrong customer");
    near((await item("Biscuit pack")).qtyOnHand, 380);
    await cancelDoc(admin, "batch", batchId, "wrong entry");
    const f = await item("Flour"); const s = await item("Sugar");
    near((await item("Biscuit pack")).qtyOnHand, 0);
    near(s.qtyOnHand, 20); near(s.avgCost, 50);
    near(f.avgCost, 42);
    expect(await db.payment.count({ where: { batchId, cancelledAt: null } })).toBe(0);
    expect(await db.payment.count({ where: { saleId, cancelledAt: null } })).toBe(0);
  });
  it("stock quantity always equals the sum of the stock log", async () => {
    for (const it of await db.item.findMany()) {
      const g = await db.stockMovement.aggregate({ where: { itemId: it.id }, _sum: { qtyChange: true } });
      near(g._sum.qtyChange ?? 0, Number(it.qtyOnHand), 0.0005);
    }
  });
  it("UserError is used for blocked cases", async () => {
    await expect(cancelDoc(admin, "batch", batchId, "again")).rejects.toBeInstanceOf(UserError);
  });
});
