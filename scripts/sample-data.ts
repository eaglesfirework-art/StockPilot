// npm run sample-data  -> fills an EMPTY database with ~12 weeks of realistic history, ending today.
// Every entry goes through the same business functions the screens use (createPurchase, createBatch, ...),
// so stock, average cost and balances are exactly what the app would produce. Safe: refuses if entries exist.
// Story it tells: flour and ghee get dearer, the newer batches use a little more sugar, labour rises,
// so cost per unit climbs and the margin slips, while one customer falls behind on payments.
import bcrypt from "bcryptjs";
import { db } from "../src/server/db";
import { createBatch, createPayment, createPurchase, createSale } from "../src/server/core";
import { createItem, createParty } from "../src/server/master";
import { addDays } from "../src/lib/analytics";
import { todayIST } from "../src/lib/filters";

let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
const round = (x: number, dp = 0) => Math.round(x * 10 ** dp) / 10 ** dp;
let n = 0;
const rid = () => `sample-${String(++n).padStart(5, "0")}`;

async function main() {
  if ((await db.purchase.count()) + (await db.sale.count()) + (await db.productionBatch.count()) > 0)
    throw new Error("This database already has entries. Sample data is only loaded into an empty database.");

  const pw = (p: string) => bcrypt.hash(p, 10);
  const user = async (name: string, email: string, role: "ADMIN" | "WORKER", p: string) =>
    (await db.user.findUnique({ where: { email } })) ?? db.user.create({ data: { name, email, role, passwordHash: await pw(p) } });
  const admin = await user("Asha Admin", "admin@stockpilot.local", "ADMIN", "admin12345");
  const ravi = await user("Ravi Kumar", "ravi@stockpilot.local", "WORKER", "worker12345");
  const suresh = await user("Suresh Patil", "suresh@stockpilot.local", "WORKER", "worker12345");

  const item = (name: string, type: "RAW_MATERIAL" | "FINISHED_GOOD", unit: string, minStock: number, materialIds: string[] = []) =>
    createItem(admin.id, { name, type, unit, minStock: String(minStock), materialIds });
  const flour = await item("Wheat flour", "RAW_MATERIAL", "kg", 150);
  const sugar = await item("Sugar", "RAW_MATERIAL", "kg", 60);
  const ghee = await item("Ghee", "RAW_MATERIAL", "kg", 25);
  const box = await item("Packing box", "RAW_MATERIAL", "piece", 300);
  const mats = [flour.id, sugar.id, ghee.id, box.id];
  const biscuit = await item("Butter biscuit pack", "FINISHED_GOOD", "piece", 200, mats);
  const cookie = await item("Cookie jar", "FINISHED_GOOD", "piece", 60, mats);

  const party = (name: string, type: "VENDOR" | "CUSTOMER" | "WORKER", phone = "") => createParty(admin.id, { name, type, phone });
  const vFlour = await party("Anand Flour Mills", "VENDOR", "98765 43210");
  const vSugar = await party("Shree Sugar Traders", "VENDOR", "98220 11223");
  const vDairy = await party("Gokul Dairy Ghee", "VENDOR", "99700 55667");
  const vPack = await party("PackRight Boxes", "VENDOR");
  const customers = [
    await party("Metro Mart", "CUSTOMER", "90040 12345"),
    await party("City Bakers", "CUSTOMER", "90040 22345"),
    await party("FreshMart Superstore", "CUSTOMER"),
    await party("Hotel Sagar", "CUSTOMER"),
  ];
  const ramesh = await party("Ramesh team", "WORKER");
  const lata = await party("Lata (packing)", "WORKER");

  const today = todayIST();
  const start = addDays(today, -83); // 12 weeks
  const weeks = 12;
  for (let w = 0; w < weeks; w++) {
    const t = w / (weeks - 1); // 0 -> 1 over the period
    const day = (d: number) => { const x = addDays(start, w * 7 + d); return x > today ? today : x; };
    const by = w % 2 ? ravi.id : suresh.id;

    // Purchases (Monday): flour 38 -> 46, ghee 520 -> 610, sugar steady-ish, boxes flat.
    await createPurchase(by, { requestId: rid(), vendorId: vFlour.id, date: day(0), refNo: `AFM-${1200 + w}`, paidNow: String(round(400 * (38 + 8 * t) * pick([0.5, 0.7, 1]))), lines: [{ itemId: flour.id, qty: 400, rate: round(38 + 8 * t + rnd(), 2) }] });
    await createPurchase(by, { requestId: rid(), vendorId: vSugar.id, date: day(0), paidNow: w % 3 ? "0" : String(150 * 44), lines: [{ itemId: sugar.id, qty: 150, rate: round(44 + rnd() * 1.5, 2) }] });
    if (w % 2 === 0) await createPurchase(by, { requestId: rid(), vendorId: vDairy.id, date: day(1), paidNow: String(round(60 * (520 + 90 * t))), lines: [{ itemId: ghee.id, qty: 60, rate: round(520 + 90 * t, 2) }] });
    if (w % 3 === 0) await createPurchase(by, { requestId: rid(), vendorId: vPack.id, date: day(1), paidNow: "9000", lines: [{ itemId: box.id, qty: 3000, rate: 3 }] });

    // Production (Tue, Thu): the later batches use a bit more sugar and ghee per unit; labour rate rises.
    for (const d of [1, 3]) {
      const good = 900 + Math.round(rnd() * 200);
      await createBatch(suresh.id, {
        requestId: rid(), productId: biscuit.id, date: day(d), qtyProduced: good + 20, qtyRejected: 20,
        materials: [{ itemId: flour.id, qty: round(good * 0.11, 1) }, { itemId: sugar.id, qty: round(good * (0.04 + 0.008 * t), 1) }, { itemId: ghee.id, qty: round(good * (0.012 + 0.002 * t), 2) }, { itemId: box.id, qty: good + 20 }],
        labour: [{ partyId: ramesh.id, amount: round(good * (2.2 + 0.5 * t)) }], expenses: [{ note: "Gas", amount: round(450 + 100 * t) }],
      });
    }
    const jars = 120 + Math.round(rnd() * 40);
    await createBatch(ravi.id, {
      requestId: rid(), productId: cookie.id, date: day(2), qtyProduced: jars, materials: [{ itemId: flour.id, qty: round(jars * 0.35, 1) }, { itemId: sugar.id, qty: round(jars * 0.12, 1) }, { itemId: ghee.id, qty: round(jars * 0.08, 2) }, { itemId: box.id, qty: jars }],
      labour: [{ partyId: lata.id, amount: round(jars * 9) }], expenses: [{ note: "Electricity", amount: 300 }],
    });

    // Sales (Wed, Fri, Sat). Prices held, so the margin is squeezed. Hotel Sagar pays late.
    for (const d of [2, 4, 5]) {
      const c = pick(customers);
      const qty = 350 + Math.round(rnd() * 250); // ~1,300 sold a week against ~1,950 made
      const total = qty * 32;
      const paysNow = c.name === "Hotel Sagar" ? 0 : pick([0, 0.5, 1]);
      await createSale(admin.id, { requestId: rid(), customerId: c.id, date: day(d), receivedNow: String(round(total * paysNow)), lines: [{ itemId: biscuit.id, qty, rate: 32 }] });
    }
    await createSale(admin.id, { requestId: rid(), customerId: customers[2].id, date: day(5), receivedNow: "0", lines: [{ itemId: cookie.id, qty: Math.round(jars * 0.8), rate: 120 }] });

    // Weekly settling up (Saturday): customers pay part of what they owe, we pay vendors on account.
    for (const c of customers.slice(0, 3)) await createPayment(admin.id, { requestId: rid(), kind: "CUSTOMER_RECEIPT", partyId: c.id, amount: String(4000 + Math.round(rnd() * 6000)), date: day(6) });
    if (w % 2) await createPayment(admin.id, { requestId: rid(), kind: "VENDOR_PAYMENT", partyId: vSugar.id, amount: "6000", date: day(6), note: "on account" });
    if (w % 4 === 3) await createPayment(admin.id, { requestId: rid(), kind: "VENDOR_PAYMENT", partyId: vFlour.id, amount: "10000", date: day(6), note: "NEFT" });
    if (w % 3 === 1) await createPayment(ravi.id, { requestId: rid(), kind: "LABOUR", partyId: ramesh.id, amount: "1500", date: day(6), note: "weekly wages", workFrom: day(0), workTo: day(5) });
  }
  console.log(`Sample data loaded: ${n} entries over 12 weeks ending ${today}.`);
  console.log("Logins: admin@stockpilot.local / admin12345 · ravi@stockpilot.local, suresh@stockpilot.local / worker12345");
}
main().catch((e) => { console.error(e.message ?? e); process.exitCode = 1; }).finally(() => db.$disconnect());
