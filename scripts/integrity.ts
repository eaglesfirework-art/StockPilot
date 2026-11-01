// Run by hand: npm run integrity
// Compares Item.qtyOnHand with the sum of StockMovement.qtyChange.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
async function main() {
  const items = await db.item.findMany();
  const sums = await db.stockMovement.groupBy({ by: ["itemId"], _sum: { qtyChange: true } });
  const map = new Map(sums.map((s) => [s.itemId, s._sum.qtyChange?.toString() ?? "0"]));
  let bad = 0;
  for (const it of items) {
    const logSum = Number(map.get(it.id) ?? 0);
    if (Math.abs(logSum - Number(it.qtyOnHand)) > 0.0005) {
      bad++;
      console.log(`MISMATCH ${it.name}: item says ${it.qtyOnHand}, log says ${logSum}`);
    }
  }
  console.log(bad ? `${bad} problem(s) found.` : `OK: ${items.length} items match their stock log.`);
}
main().finally(() => db.$disconnect());
