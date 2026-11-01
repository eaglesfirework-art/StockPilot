// moveStock is the ONLY code that changes stock.
import { Prisma, MovementReason } from "@prisma/client";
import { UserError } from "./errors";
import { Dec } from "../lib/dec";

export type Tx = Prisma.TransactionClient;

// Lock item rows (sorted, so two people can't deadlock) until the transaction ends.
export async function lockItems(tx: Tx, ids: string[]) {
  const uniq = [...new Set(ids)].sort();
  if (!uniq.length) return;
  await tx.$queryRaw`SELECT id FROM "Item" WHERE id IN (${Prisma.join(uniq)}) ORDER BY id FOR UPDATE`;
}

export async function moveStock(
  tx: Tx,
  a: {
    itemId: string;
    qtyChange: Dec; // + in, - out
    unitCost?: Dec; // used for stock IN only. OUT always leaves at the current average
    reason: MovementReason;
    refType?: string;
    refId?: string;
    note?: string;
    userId: string;
  },
) {
  const item = await tx.item.findUnique({ where: { id: a.itemId } });
  if (!item) throw new UserError("Item not found");
  const before = item.qtyOnHand;
  const change = a.qtyChange;
  if (change.isZero()) throw new UserError("Quantity cannot be zero");
  const after = before.plus(change);
  let unitCost = item.avgCost;
  let newAvg = item.avgCost;

  if (change.gt(0)) {
    unitCost = a.unitCost ?? item.avgCost;
    // R2: weighted average
    newAvg = after.isZero()
      ? item.avgCost
      : before.mul(item.avgCost).plus(change.mul(unitCost)).div(after).toDecimalPlaces(4);
  } else if (after.lt(0)) {
    const need = change.abs().toString();
    throw new UserError(
      a.reason === "REVERSAL"
        ? `Need to remove ${need} ${item.unit} of ${item.name}, only ${before.toString()} in stock`
        : `Only ${before.toString()} ${item.unit} of ${item.name} available`,
    );
  }

  await tx.item.update({ where: { id: item.id }, data: { qtyOnHand: after, avgCost: newAvg } });
  await tx.stockMovement.create({
    data: {
      itemId: item.id, reason: a.reason, qtyChange: change, qtyBefore: before, qtyAfter: after,
      unitCost, refType: a.refType, refId: a.refId, note: a.note, createdById: a.userId,
    },
  });
  return { unitCost, before, after, item };
}
