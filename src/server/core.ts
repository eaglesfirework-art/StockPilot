// All business rules live here. No cookies or screens in this file, so tests can call it directly.
import { z } from "zod";
import { Prisma, ItemType, PaymentKind } from "@prisma/client";
import { db } from "./db";
import { UserError } from "./errors";
import { lockItems, moveStock, Tx } from "./stock";
import { D, Dec, r2, r4, sum, ZERO } from "../lib/dec";
import { docNo, inr } from "../lib/fmt";

const TX = { timeout: 20000, maxWait: 10000 };

// ---------- input validation ----------
const dec = z.union([z.string(), z.number()]).transform((v, ctx) => {
  try {
    const d = D(String(v).trim());
    if (!d.isFinite()) throw new Error();
    return d;
  } catch {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid number" });
    return z.NEVER;
  }
});
const pos = dec.refine((d) => d.gt(0), "Must be more than 0");
const nonneg = dec.refine((d) => d.gte(0), "Cannot be negative");
const date = z.string().min(1, "Choose a date").transform((s, ctx) => {
  const d = new Date(s);
  if (isNaN(d.getTime())) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid date" }); return z.NEVER; }
  return d;
});
const text = z.string().trim().optional().transform((s) => (s ? s : undefined));
const rid = z.string().min(8);

export async function audit(tx: Tx, userId: string | null, action: string, entity?: string, entityId?: string, detail?: object) {
  await tx.auditLog.create({ data: { userId, action, entity, entityId, detail: detail as Prisma.InputJsonValue | undefined } });
}

// A double tap that races past the check hits the unique requestId. Return the first entry instead.
async function once<T>(run: () => Promise<T>, find: () => Promise<T | null>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if ((e as { code?: string })?.code === "P2002") {
      const found = await find();
      if (found) return found;
    }
    throw e;
  }
}

async function loadItems(tx: Tx, ids: string[], type: ItemType) {
  const uniq = [...new Set(ids)];
  const items = await tx.item.findMany({ where: { id: { in: uniq } } });
  if (items.length !== uniq.length) throw new UserError("An item was not found");
  for (const it of items) {
    if (!it.active) throw new UserError(`${it.name} is inactive`);
    if (it.type !== type)
      throw new UserError(type === "RAW_MATERIAL" ? `${it.name} is not a raw material` : `${it.name} is not a finished product`);
  }
  return new Map(items.map((i) => [i.id, i]));
}

async function loadParty(tx: Tx, id: string, type: "VENDOR" | "CUSTOMER" | "WORKER") {
  const p = await tx.party.findUnique({ where: { id } });
  if (!p || p.type !== type || !p.active) throw new UserError(`Choose a valid ${type.toLowerCase()}`);
  return p;
}

async function addPayment(
  tx: Tx,
  p: { requestId: string; kind: PaymentKind; partyId?: string; amount: Dec; date: Date; note?: string; paidTo?: string;
       purchaseId?: number; saleId?: number; batchId?: number; workFrom?: Date; workTo?: Date; userId: string },
) {
  return tx.payment.create({
    data: {
      requestId: p.requestId, kind: p.kind, partyId: p.partyId, amount: p.amount, date: p.date, note: p.note, paidTo: p.paidTo,
      purchaseId: p.purchaseId, saleId: p.saleId, batchId: p.batchId, createdById: p.userId,
      // only labour carries a work period
      ...(p.kind === "LABOUR" && { workFrom: p.workFrom, workTo: p.workTo }),
    },
  });
}

// What we owe a vendor, or a customer owes us, right now: bills minus payments (cancelled ones left out).
// The party row is locked first, so two payments saved at the same moment are checked one after the other.
async function partyDue(tx: Tx, partyId: string, type: "VENDOR" | "CUSTOMER") {
  await tx.$queryRaw`SELECT id FROM "Party" WHERE id = ${partyId} FOR UPDATE`;
  const billed = type === "VENDOR"
    ? (await tx.purchase.aggregate({ _sum: { total: true }, where: { vendorId: partyId, cancelledAt: null } }))._sum.total
    : (await tx.sale.aggregate({ _sum: { total: true }, where: { customerId: partyId, cancelledAt: null } }))._sum.total;
  const paid = (await tx.payment.aggregate({
    _sum: { amount: true }, where: { partyId, cancelledAt: null, kind: type === "VENDOR" ? "VENDOR_PAYMENT" : "CUSTOMER_RECEIPT" },
  }))._sum.amount;
  return (billed ?? ZERO).minus(paid ?? ZERO);
}

// ---------- W1: receive materials ----------
const PurchaseIn = z.object({
  requestId: rid,
  vendorId: z.string().min(1, "Choose a vendor"),
  date,
  refNo: text,
  note: text,
  paidNow: nonneg.optional(),
  lines: z.array(z.object({ itemId: z.string().min(1, "Choose an item"), qty: pos, rate: pos })).min(1, "Add at least one item"),
});

export async function createPurchase(userId: string, raw: unknown) {
  const i = PurchaseIn.parse(raw);
  return once(
    () =>
      db.$transaction(async (tx) => {
        const dup = await tx.purchase.findUnique({ where: { requestId: i.requestId } });
        if (dup) return dup;
        await loadParty(tx, i.vendorId, "VENDOR");
        await loadItems(tx, i.lines.map((l) => l.itemId), "RAW_MATERIAL");
        const lines = i.lines.map((l) => ({ ...l, amount: r2(l.qty.mul(l.rate)) }));
        const total = sum(lines.map((l) => l.amount));
        const paid = i.paidNow ?? ZERO;
        if (paid.gt(total)) throw new UserError("Paid now cannot be more than the total");
        await lockItems(tx, lines.map((l) => l.itemId));

        const purchase = await tx.purchase.create({
          data: {
            requestId: i.requestId, vendorId: i.vendorId, date: i.date, refNo: i.refNo, note: i.note,
            total, createdById: userId,
            lines: { create: lines.map((l) => ({ itemId: l.itemId, qty: l.qty, rate: l.rate, amount: l.amount })) },
          },
        });
        for (const l of lines)
          await moveStock(tx, {
            itemId: l.itemId, qtyChange: l.qty, unitCost: l.rate, reason: "PURCHASE",
            refType: "Purchase", refId: String(purchase.id), userId,
          });
        if (paid.gt(0))
          await addPayment(tx, {
            requestId: i.requestId + ":pay", kind: "VENDOR_PAYMENT", partyId: i.vendorId, amount: paid,
            date: i.date, purchaseId: purchase.id, userId,
          });
        return purchase;
      }, TX),
    () => db.purchase.findUnique({ where: { requestId: i.requestId } }),
  );
}

// ---------- A4: sale (admin) ----------
const SaleIn = z.object({
  requestId: rid,
  customerId: z.string().min(1, "Choose a customer"),
  date,
  note: text,
  receivedNow: nonneg.optional(),
  lines: z.array(z.object({ itemId: z.string().min(1, "Choose a product"), qty: pos, rate: pos })).min(1, "Add at least one product"),
});

export async function createSale(userId: string, raw: unknown) {
  const i = SaleIn.parse(raw);
  return once(
    () =>
      db.$transaction(async (tx) => {
        const dup = await tx.sale.findUnique({ where: { requestId: i.requestId } });
        if (dup) return dup;
        await loadParty(tx, i.customerId, "CUSTOMER");
        await loadItems(tx, i.lines.map((l) => l.itemId), "FINISHED_GOOD");
        const lines = i.lines.map((l) => ({ ...l, amount: r2(l.qty.mul(l.rate)) }));
        const total = sum(lines.map((l) => l.amount));
        const received = i.receivedNow ?? ZERO;
        if (received.gt(total)) throw new UserError("Received now cannot be more than the total");
        await lockItems(tx, lines.map((l) => l.itemId));

        const sale = await tx.sale.create({
          data: { requestId: i.requestId, customerId: i.customerId, date: i.date, note: i.note, total, createdById: userId },
        });
        for (const l of lines) {
          const m = await moveStock(tx, {
            itemId: l.itemId, qtyChange: l.qty.neg(), reason: "SALE", refType: "Sale", refId: String(sale.id), userId,
          });
          await tx.saleLine.create({
            data: { saleId: sale.id, itemId: l.itemId, qty: l.qty, rate: l.rate, amount: l.amount, costAtSale: m.unitCost },
          });
        }
        if (received.gt(0))
          await addPayment(tx, {
            requestId: i.requestId + ":pay", kind: "CUSTOMER_RECEIPT", partyId: i.customerId, amount: received,
            date: i.date, saleId: sale.id, userId,
          });
        return sale;
      }, TX),
    () => db.sale.findUnique({ where: { requestId: i.requestId } }),
  );
}

// ---------- W3: production batch ----------
const BatchIn = z.object({
  requestId: rid,
  productId: z.string().min(1, "Choose a product"),
  date,
  note: text,
  materials: z.array(z.object({ itemId: z.string().min(1), qty: pos })).min(1, "Enter the materials used"),
  qtyProduced: pos,
  qtyRejected: nonneg.optional(),
  labour: z.array(z.object({ partyId: z.string().min(1, "Choose a labour"), amount: pos, note: text })).default([]),
  expenses: z.array(z.object({ note: z.string().trim().min(1, "Describe the expense"), paidTo: z.string().trim().min(1, "Enter who was paid"), amount: pos })).default([]),
});

export async function createBatch(userId: string, raw: unknown) {
  const i = BatchIn.parse(raw);
  const rejected = i.qtyRejected ?? ZERO;
  const good = i.qtyProduced.minus(rejected);
  if (good.lte(0)) throw new UserError("Good units must be more than 0");

  return once(
    () =>
      db.$transaction(async (tx) => {
        const dup = await tx.productionBatch.findUnique({ where: { requestId: i.requestId } });
        if (dup) return dup;
        const product = (await loadItems(tx, [i.productId], "FINISHED_GOOD")).get(i.productId)!;
        await loadItems(tx, i.materials.map((m) => m.itemId), "RAW_MATERIAL");

        // The material must be mapped to this product (set by the admin).
        const mapped = await tx.productMaterial.findMany({ where: { productId: i.productId }, include: { material: true } });
        const allowed = new Set(mapped.map((m) => m.materialId));
        for (const m of i.materials) {
          if (!allowed.has(m.itemId)) {
            const it = await tx.item.findUnique({ where: { id: m.itemId } });
            throw new UserError(`${it?.name} is not mapped to ${product.name}. Ask the admin to add it.`);
          }
        }
        for (const l of i.labour) await loadParty(tx, l.partyId, "WORKER");

        await lockItems(tx, [i.productId, ...i.materials.map((m) => m.itemId)]);

        const batch = await tx.productionBatch.create({
          data: {
            requestId: i.requestId, productId: i.productId, date: i.date, note: i.note,
            qtyProduced: i.qtyProduced, qtyRejected: rejected,
            materialCost: 0, labourCost: 0, otherCost: 0, costPerUnit: 0, createdById: userId,
          },
        });
        const ref = { refType: "Batch", refId: String(batch.id) };

        // 1-2. Check stock and reduce materials at the current average cost.
        let materialCost = ZERO;
        for (const m of i.materials) {
          const r = await moveStock(tx, { itemId: m.itemId, qtyChange: m.qty.neg(), reason: "PRODUCTION_USE", ...ref, userId });
          materialCost = materialCost.plus(m.qty.mul(r.unitCost));
        }
        materialCost = r2(materialCost);

        // 3. Labour and expenses are payments linked to the batch.
        let labourCost = ZERO, otherCost = ZERO;
        for (const [n, l] of i.labour.entries()) {
          await addPayment(tx, { requestId: `${i.requestId}:L${n}`, kind: "LABOUR", partyId: l.partyId, amount: l.amount, date: i.date, note: l.note, batchId: batch.id, workFrom: i.date, workTo: i.date, userId });
          labourCost = labourCost.plus(l.amount);
        }
        for (const [n, e] of i.expenses.entries()) {
          await addPayment(tx, { requestId: `${i.requestId}:E${n}`, kind: "EXPENSE", amount: e.amount, date: i.date, note: e.note, paidTo: e.paidTo, batchId: batch.id, userId });
          otherCost = otherCost.plus(e.amount);
        }

        // 4-6. Cost per unit, then add finished goods at that cost.
        const costPerUnit = r4(materialCost.plus(labourCost).plus(otherCost).div(good));
        await moveStock(tx, { itemId: i.productId, qtyChange: good, unitCost: costPerUnit, reason: "PRODUCTION_OUTPUT", ...ref, userId });

        return tx.productionBatch.update({
          where: { id: batch.id },
          data: { materialCost, labourCost: r2(labourCost), otherCost: r2(otherCost), costPerUnit },
        });
      }, TX),
    () => db.productionBatch.findUnique({ where: { requestId: i.requestId } }),
  );
}

// ---------- payments ----------
const PaymentIn = z.object({
  requestId: rid,
  kind: z.enum(["VENDOR_PAYMENT", "CUSTOMER_RECEIPT", "LABOUR"]),
  partyId: z.string().min(1, "Choose a party"),
  amount: pos,
  date,
  note: text,
  purchaseId: z.number().int().optional(),
  saleId: z.number().int().optional(),
  batchId: z.number().int().optional(),
  workFrom: z.string().optional().transform((s) => (s ? new Date(s) : undefined)),
  workTo: z.string().optional().transform((s) => (s ? new Date(s) : undefined)),
});

export async function billDue(tx: Tx, kind: "purchase" | "sale", id: number) {
  const bill: any = kind === "purchase" ? await tx.purchase.findUnique({ where: { id } }) : await tx.sale.findUnique({ where: { id } });
  if (!bill || bill.cancelledAt) throw new UserError("Bill not found or cancelled");
  const paid = await tx.payment.aggregate({
    _sum: { amount: true },
    where: { cancelledAt: null, ...(kind === "purchase" ? { purchaseId: id } : { saleId: id }) },
  });
  return { bill, due: bill.total.minus(paid._sum.amount ?? ZERO) };
}

export async function createPayment(userId: string, raw: unknown) {
  const i = PaymentIn.parse(raw);
  if (i.kind === "LABOUR") {
    // A labour payment says which days of work it is for.
    if (!i.workFrom || !i.workTo || isNaN(+i.workFrom) || isNaN(+i.workTo)) throw new UserError("Enter the work period: the From and To dates of the work being paid for");
    if (i.workFrom > i.workTo) throw new UserError("Work period: From cannot be after To");
  } else { i.workFrom = undefined; i.workTo = undefined; }
  return once(
    () =>
      db.$transaction(async (tx) => {
        const dup = await tx.payment.findUnique({ where: { requestId: i.requestId } });
        if (dup) return dup;
        const partyType = i.kind === "VENDOR_PAYMENT" ? "VENDOR" : i.kind === "CUSTOMER_RECEIPT" ? "CUSTOMER" : "WORKER";
        const party = await loadParty(tx, i.partyId, partyType);
        if (i.purchaseId) {
          if (i.kind !== "VENDOR_PAYMENT") throw new UserError("A bill can only be paid by a vendor payment");
          const { bill, due } = await billDue(tx, "purchase", i.purchaseId);
          if (bill.vendorId !== i.partyId) throw new UserError("That bill belongs to another vendor");
          if (i.amount.gt(due)) throw new UserError(`More than the bill due (${due.toString()})`);
        }
        if (i.saleId) {
          if (i.kind !== "CUSTOMER_RECEIPT") throw new UserError("A sale can only be paid by a customer receipt");
          const { bill, due } = await billDue(tx, "sale", i.saleId);
          if (bill.customerId !== i.partyId) throw new UserError("That sale belongs to another customer");
          if (i.amount.gt(due)) throw new UserError(`More than the bill due (${due.toString()})`);
        }
        if (partyType !== "WORKER") {
          // Never pay more than is owed in total: a balance must not go below zero.
          const due = await partyDue(tx, party.id, partyType);
          if (i.amount.gt(due)) {
            if (partyType === "VENDOR") throw new UserError(due.gt(0) ? `We owe ${party.name} only ${inr(due)}. A payment cannot be more than that.` : `We owe ${party.name} nothing right now, so there is nothing to pay.`);
            throw new UserError(due.gt(0) ? `${party.name} owes us only ${inr(due)}. A receipt cannot be more than that.` : `${party.name} owes us nothing right now, so there is nothing to receive.`);
          }
        }
        return addPayment(tx, { ...i, userId });
      }, TX),
    () => db.payment.findUnique({ where: { requestId: i.requestId } }),
  );
}

// ---------- A5: cancel and stock adjustment ----------
export type CancelKind = "purchase" | "sale" | "batch" | "payment";
const REF: Record<Exclude<CancelKind, "payment">, string> = { purchase: "Purchase", sale: "Sale", batch: "Batch" };
const PREFIX: Record<CancelKind, string> = { purchase: "PUR", sale: "SAL", batch: "BAT", payment: "PAY" };

export async function cancelDoc(userId: string, kind: CancelKind, id: number, reasonRaw: string) {
  const reason = z.string().trim().min(3, "Give a reason (at least 3 letters)").parse(reasonRaw);
  return db.$transaction(async (tx) => {
    const data = { cancelledAt: new Date(), cancelReason: reason };
    const where = { id, cancelledAt: null };
    // Claim the document first. If someone else cancelled it already, count is 0.
    const claimed =
      kind === "purchase" ? await tx.purchase.updateMany({ where, data })
      : kind === "sale" ? await tx.sale.updateMany({ where, data })
      : kind === "batch" ? await tx.productionBatch.updateMany({ where, data })
      : await tx.payment.updateMany({ where, data });
    if (claimed.count === 0) throw new UserError("Not found, or already cancelled");

    if (kind !== "payment") {
      const moves = await tx.stockMovement.findMany({
        where: { refType: REF[kind], refId: String(id), reason: { not: "REVERSAL" } },
        orderBy: { id: "asc" },
      });
      await lockItems(tx, moves.map((m) => m.itemId));
      for (const m of moves) {
        // R12: stock-in leaves at the current average. R13: stock-out comes back at its original cost.
        await moveStock(tx, {
          itemId: m.itemId, qtyChange: m.qtyChange.neg(), unitCost: m.qtyChange.lt(0) ? m.unitCost : undefined,
          reason: "REVERSAL", refType: REF[kind], refId: String(id), note: `Cancel ${docNo(PREFIX[kind], id)}`, userId,
        });
      }
      // R14: linked payments are cancelled too.
      const link = kind === "purchase" ? { purchaseId: id } : kind === "sale" ? { saleId: id } : { batchId: id };
      await tx.payment.updateMany({ where: { ...link, cancelledAt: null }, data });

      // A bill that was already paid off "on account" cannot be cancelled on its own:
      // the party would then show as owing less than zero. The payment has to be cancelled first.
      if (kind !== "batch") {
        const doc = kind === "purchase"
          ? { partyId: (await tx.purchase.findUniqueOrThrow({ where: { id } })).vendorId, type: "VENDOR" as const }
          : { partyId: (await tx.sale.findUniqueOrThrow({ where: { id } })).customerId, type: "CUSTOMER" as const };
        const due = await partyDue(tx, doc.partyId, doc.type);
        if (due.lt(0)) {
          const party = await tx.party.findUniqueOrThrow({ where: { id: doc.partyId } });
          throw new UserError(doc.type === "VENDOR"
            ? `Cannot cancel ${docNo("PUR", id)}: ${party.name} has already been paid ${inr(due.neg())} towards it. Cancel the payment first (Transactions → Payments), then this bill.`
            : `Cannot cancel ${docNo("SAL", id)}: ${party.name} has already paid ${inr(due.neg())} towards it. Cancel the receipt first (Transactions → Payments), then this sale.`);
        }
      }
    }
    await audit(tx, userId, "CANCEL", kind, String(id), { reason });
    return docNo(PREFIX[kind], id);
  }, TX);
}

const AdjustIn = z.object({
  itemId: z.string().min(1, "Choose an item"),
  kind: z.enum(["OPENING", "ADJUSTMENT"]),
  change: dec.refine((d) => !d.isZero(), "Change cannot be zero"),
  unitCost: nonneg.optional(),
  reason: z.string().trim().min(3, "Give a reason"),
});

export async function adjustStock(userId: string, raw: unknown) {
  const i = AdjustIn.parse(raw);
  return db.$transaction(async (tx) => {
    await lockItems(tx, [i.itemId]);
    const item = await tx.item.findUnique({ where: { id: i.itemId } });
    if (!item) throw new UserError("Item not found");
    if (i.change.gt(0) && !i.unitCost && item.avgCost.isZero()) throw new UserError("Enter the cost per unit for new stock");
    const r = await moveStock(tx, {
      itemId: i.itemId, qtyChange: i.change, unitCost: i.unitCost, reason: i.kind,
      refType: "Adjustment", note: i.reason, userId,
    });
    await audit(tx, userId, "STOCK_ADJUSTMENT", "Item", i.itemId, { change: i.change.toString(), reason: i.reason, before: r.before.toString(), after: r.after.toString() });
    return r;
  }, TX);
}
