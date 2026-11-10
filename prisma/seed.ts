// npm run seed            -> 2 users + sample master data (items, parties, mapping)
// SEED_DEMO=1 npm run seed -> also posts the worked example from the plan (steps 1-5)
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createPurchase, createBatch, createSale } from "../src/server/core";

const db = new PrismaClient();

async function main() {
  const admin = await db.user.upsert({
    where: { email: "admin@stockpilot.local" }, update: {},
    create: { name: "Admin", email: "admin@stockpilot.local", role: "ADMIN", passwordHash: await bcrypt.hash("admin12345", 10) },
  });
  await db.user.upsert({
    where: { email: "worker@stockpilot.local" }, update: {},
    create: { name: "Suresh (manager)", email: "worker@stockpilot.local", role: "WORKER", passwordHash: await bcrypt.hash("worker12345", 10) },
  });

  const flour = await db.item.upsert({ where: { name: "Flour" }, update: {}, create: { name: "Flour", type: "RAW_MATERIAL", unit: "kg", minStock: 50 } });
  const sugar = await db.item.upsert({ where: { name: "Sugar" }, update: {}, create: { name: "Sugar", type: "RAW_MATERIAL", unit: "kg", minStock: 10 } });
  const pack = await db.item.upsert({ where: { name: "Biscuit pack" }, update: {}, create: { name: "Biscuit pack", type: "FINISHED_GOOD", unit: "piece" } });
  for (const m of [flour, sugar])
    await db.productMaterial.upsert({ where: { productId_materialId: { productId: pack.id, materialId: m.id } }, update: {}, create: { productId: pack.id, materialId: m.id } });

  const party = async (name: string, type: "VENDOR" | "CUSTOMER" | "WORKER") =>
    (await db.party.findFirst({ where: { name, type } })) ?? db.party.create({ data: { name, type } });
  const A = await party("Vendor A (flour)", "VENDOR");
  const B = await party("Vendor B (sugar)", "VENDOR");
  const C = await party("Customer C", "CUSTOMER");
  const ramesh = await party("Ramesh (team)", "WORKER");
  console.log("Base data ready. Logins: admin@stockpilot.local / admin12345, worker@stockpilot.local / worker12345");

  if (process.env.SEED_DEMO === "1") {
    if ((await db.purchase.count()) > 0) return console.log("Demo skipped: documents already exist.");
    const d = new Date().toISOString().slice(0, 10);
    await createPurchase(admin.id, { requestId: "demo-pur-1", vendorId: A.id, date: d, paidNow: 2000, lines: [{ itemId: flour.id, qty: 100, rate: 40 }] });
    await createPurchase(admin.id, { requestId: "demo-pur-2", vendorId: A.id, date: d, paidNow: 3000, lines: [{ itemId: flour.id, qty: 100, rate: 44 }] });
    await createPurchase(admin.id, { requestId: "demo-pur-3", vendorId: B.id, date: d, paidNow: 1000, lines: [{ itemId: sugar.id, qty: 20, rate: 50 }] });
    await createBatch(admin.id, {
      requestId: "demo-bat-1", productId: pack.id, date: d, qtyProduced: 400, qtyRejected: 20,
      materials: [{ itemId: flour.id, qty: 50 }, { itemId: sugar.id, qty: 20 }],
      labour: [{ partyId: ramesh.id, amount: 3000 }], expenses: [{ note: "Gas", paidTo: "Gas supplier", amount: 900 }],
    });
    await createSale(admin.id, { requestId: "demo-sal-1", customerId: C.id, date: d, receivedNow: 1000, lines: [{ itemId: pack.id, qty: 100, rate: 30 }] });
    console.log("Demo data posted (plan section 6, steps 1-5).");
  }
}
main().finally(() => db.$disconnect());
