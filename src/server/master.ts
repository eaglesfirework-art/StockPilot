// Admin-only master data: items, parties, product mapping, users.
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { UserError } from "./errors";
import { audit, type CancelKind } from "./core";
import { hashPassword, verifyPassword } from "./auth";
import { D } from "../lib/dec";
import { cleanName, nameKey } from "../lib/names";
import { normUnit } from "../lib/units";
import { normalizeIndianPhone, PHONE_MSG } from "../lib/phone";

// Optional Indian mobile number. Saved as +91XXXXXXXXXX. Empty means "no phone".
const phoneOpt = z.string().trim().optional().transform((v, ctx) => {
  if (!v) return undefined;
  const p = normalizeIndianPhone(v);
  if (!p) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: PHONE_MSG }); return z.NEVER; }
  return p;
});

const numStr = z.union([z.string(), z.number()]).transform((v, ctx) => {
  const s = String(v).trim();
  if (s === "" || isNaN(Number(s))) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid number" }); return z.NEVER; }
  return D(s);
});
const optNum = z.union([z.string(), z.number(), z.undefined(), z.null()]).transform((v) =>
  v === undefined || v === null || String(v).trim() === "" ? undefined : D(String(v).trim()),
);

// Item names are unique ignoring case and extra spaces: "flour" cannot be added next to "Flour".
async function sameItemName(c: Pick<Prisma.TransactionClient, "item">, name: string, exceptId?: string) {
  const all = await c.item.findMany({ where: exceptId ? { id: { not: exceptId } } : {}, select: { id: true, name: true } });
  return all.find((x) => nameKey(x.name) === nameKey(name)) ?? null;
}

// A product is added with the raw materials it is made from (at least one). No selling price: the rate is typed when selling.
export async function createItem(userId: string, raw: unknown) {
  const i = z.object({
    name: z.string().transform(cleanName).pipe(z.string().min(1, "Enter a name")),
    type: z.enum(["RAW_MATERIAL", "FINISHED_GOOD"]),
    unit: z.string().trim().min(1, "Enter a unit, e.g. kg"),
    minStock: optNum,
    materialIds: z.array(z.string()).optional(),
  }).parse(raw);
  const product = i.type === "FINISHED_GOOD";
  if (product && !i.materialIds?.length) throw new UserError(NEED_MATERIAL);
  const exists = await sameItemName(db, i.name);
  if (exists) throw new UserError(`An item named "${exists.name}" already exists`);
  const unit = normUnit(i.unit);
  return db.$transaction(async (tx) => {
    const item = await tx.item.create({ data: { name: i.name, type: i.type, unit, minStock: i.minStock ?? 0 } });
    if (product) await applyMapping(tx, userId, item, i.materialIds!);
    await audit(tx, userId, "ITEM_CREATE", "Item", item.id, { name: i.name, type: i.type });
    return item;
  });
}
const NEED_MATERIAL = "Choose at least one raw material this product is made from";

export async function updateItem(userId: string, raw: unknown) {
  const i = z.object({
    id: z.string().min(1),
    name: z.string().transform(cleanName).pipe(z.string().min(1, "Enter a name")),
    unit: z.string().trim().min(1, "Enter a unit, e.g. kg").optional(),
    minStock: optNum, active: z.boolean(),
    materialIds: z.array(z.string()).optional(),
  }).parse(raw);
  return db.$transaction(async (tx) => {
    const cur = await tx.item.findUnique({ where: { id: i.id } });
    if (!cur) throw new UserError("Item not found");
    if (cur.type === "FINISHED_GOOD" && i.materialIds && i.materialIds.length === 0) throw new UserError(NEED_MATERIAL);
    const clash = await sameItemName(tx, i.name, i.id);
    if (clash) throw new UserError(`An item named "${clash.name}" already exists`);
    const unit = i.unit ? normUnit(i.unit) : cur.unit;
    if (unit !== cur.unit && (await tx.stockMovement.count({ where: { itemId: cur.id } })) > 0)
      throw new UserError("Unit cannot change once the item has stock history");
    const item = await tx.item.update({ where: { id: i.id }, data: { name: i.name, unit, minStock: i.minStock ?? 0, active: i.active } });
    if (i.materialIds) await applyMapping(tx, userId, cur, i.materialIds);
    await audit(tx, userId, "ITEM_UPDATE", "Item", i.id, {
      name: i.name, unit, minStock: i.minStock?.toString(), active: i.active,
      ...(i.name !== cur.name && { renamedFrom: cur.name }), ...(unit !== cur.unit && { unitWas: cur.unit }),
    });
    return item;
  });
}

type PartyType = "VENDOR" | "CUSTOMER" | "WORKER";
const PARTY_WORD: Record<PartyType, string> = { VENDOR: "vendor", CUSTOMER: "customer", WORKER: "labour" };
const article = (w: string) => (/^[aeiou]/.test(w) ? "An" : "A");
const dupName = (type: PartyType, name: string) => new UserError(`${article(PARTY_WORD[type])} ${PARTY_WORD[type]} named "${name}" already exists. Open it from the list instead of adding it again.`);

// Same kind of party with the same name (ignoring case, spaces and punctuation) or the same phone number.
async function assertNoDuplicate(tx: Prisma.TransactionClient, type: PartyType, key: string, phone: string | undefined, exceptId?: string) {
  const not = exceptId ? { id: { not: exceptId } } : {};
  const sameName = await tx.party.findFirst({ where: { type, nameKey: key, ...not } });
  if (sameName) throw dupName(type, sameName.name);
  if (phone) {
    const samePhone = await tx.party.findFirst({ where: { type, phone, ...not } });
    if (samePhone) throw new UserError(`Another ${PARTY_WORD[type]} (${samePhone.name}) already uses this phone number`);
  }
}

// Two saves that race past the check hit the database's unique (type, nameKey) index instead.
async function uniqueName<T>(type: PartyType, name: string, run: () => Promise<T>) {
  try { return await run(); } catch (e) {
    if ((e as { code?: string })?.code === "P2002") throw dupName(type, name);
    throw e;
  }
}

// A party is just a name and phone. What they owe (or we owe) comes only from bills and payments.
export async function createParty(userId: string, raw: unknown) {
  const i = z.object({
    name: z.string().transform(cleanName).pipe(z.string().min(1, "Enter a name")),
    type: z.enum(["VENDOR", "CUSTOMER", "WORKER"]),
    phone: phoneOpt,
  }).parse(raw);
  const key = nameKey(i.name);
  return uniqueName(i.type, i.name, () => db.$transaction(async (tx) => {
    await assertNoDuplicate(tx, i.type, key, i.phone);
    const p = await tx.party.create({ data: { name: i.name, nameKey: key, type: i.type, phone: i.phone } });
    await audit(tx, userId, "PARTY_CREATE", "Party", p.id, { name: i.name, type: i.type });
    return p;
  }));
}

// Product -> raw materials. No quantities here. Quantities are typed in each batch.
async function applyMapping(tx: Prisma.TransactionClient, userId: string, product: { id: string; type: string }, materialIds: string[]) {
  if (product.type !== "FINISHED_GOOD") throw new UserError("Only products can have raw materials");
  const ids = [...new Set(materialIds)];
  const mats = await tx.item.findMany({ where: { id: { in: ids } } });
  if (mats.length !== ids.length || mats.some((m) => m.type !== "RAW_MATERIAL")) throw new UserError("Only raw materials can be chosen");
  await tx.productMaterial.deleteMany({ where: { productId: product.id, materialId: { notIn: ids } } });
  for (const materialId of ids)
    await tx.productMaterial.upsert({ where: { productId_materialId: { productId: product.id, materialId } }, create: { productId: product.id, materialId }, update: {} });
  await audit(tx, userId, "MAPPING_UPDATE", "Item", product.id, { materials: mats.map((m) => m.name) });
}

export async function createUser(adminId: string, raw: unknown) {
  const i = z.object({
    name: z.string().trim().min(1, "Enter a name"),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    phone: phoneOpt,
    role: z.enum(["ADMIN", "WORKER"]),
    password: z.string().min(8, "Password needs at least 8 characters"),
  }).parse(raw);
  if (await db.user.findUnique({ where: { email: i.email } })) throw new UserError("This email is already used");
  const u = await db.user.create({ data: { name: i.name, email: i.email, phone: i.phone, role: i.role, passwordHash: await hashPassword(i.password) } });
  await db.$transaction((tx) => audit(tx, adminId, "USER_CREATE", "User", u.id, { email: i.email, role: i.role }));
  return u;
}

const nameField = z.string().trim().min(1, "Enter a name");
const emailField = z.string().trim().toLowerCase().email("Enter a valid email");

async function otherActiveAdmins(id: string) {
  return db.user.count({ where: { role: "ADMIN", active: true, id: { not: id } } });
}

export async function updateUser(adminId: string, raw: unknown) {
  const i = z.object({
    id: z.string().min(1), name: nameField, email: emailField, phone: phoneOpt,
    role: z.enum(["ADMIN", "WORKER"]), active: z.boolean(),
    password: z.string().optional().refine((v) => !v || v.length >= 8, "New password needs at least 8 characters"),
  }).parse(raw);
  const cur = await db.user.findUnique({ where: { id: i.id } });
  if (!cur) throw new UserError("User not found");
  if (i.email !== cur.email && (await db.user.findUnique({ where: { email: i.email } }))) throw new UserError("This email is already used");
  const losesAdmin = cur.role === "ADMIN" && cur.active && (i.role !== "ADMIN" || !i.active);
  if (losesAdmin && i.id === adminId) throw new UserError("You cannot deactivate yourself or remove your own admin role");
  if (losesAdmin && (await otherActiveAdmins(i.id)) === 0) throw new UserError("Keep at least one active admin");
  const passwordHash = i.password ? await hashPassword(i.password) : undefined;
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: i.id }, data: { name: i.name, email: i.email, phone: i.phone ?? null, role: i.role, active: i.active, ...(passwordHash && { passwordHash }) } });
    await audit(tx, adminId, "USER_UPDATE", "User", i.id, { email: i.email, role: i.role, active: i.active, ...(passwordHash && { passwordReset: true }) });
  });
}

// Ids of users who have saved anything (entries or log rows). These can only be deactivated, never deleted.
export async function usersWithActivity() {
  const by = (rows: { createdById: string }[]) => rows.map((r) => r.createdById);
  const [aud, sm, pu, sa, pa, ba] = await Promise.all([
    db.auditLog.groupBy({ by: ["userId"] }),
    db.stockMovement.groupBy({ by: ["createdById"] }), db.purchase.groupBy({ by: ["createdById"] }), db.sale.groupBy({ by: ["createdById"] }),
    db.payment.groupBy({ by: ["createdById"] }), db.productionBatch.groupBy({ by: ["createdById"] }),
  ]);
  return new Set([...aud.map((r) => r.userId ?? ""), ...by(sm), ...by(pu), ...by(sa), ...by(pa), ...by(ba)]);
}

export async function deleteUser(adminId: string, id: string) {
  if (id === adminId) throw new UserError("You cannot delete yourself");
  const cur = await db.user.findUnique({ where: { id } });
  if (!cur) throw new UserError("User not found");
  if (cur.role === "ADMIN" && cur.active && (await otherActiveAdmins(id)) === 0) throw new UserError("Keep at least one active admin");
  if ((await usersWithActivity()).has(id)) throw new UserError(`${cur.name} has activity in the system. Deactivate instead.`);
  await db.$transaction(async (tx) => {
    await tx.user.delete({ where: { id } });
    await audit(tx, adminId, "USER_DELETE", "User", id, { email: cur.email, name: cur.name });
  });
}

export async function updateProfile(userId: string, raw: unknown) {
  const i = z.object({ name: nameField, phone: phoneOpt }).parse(raw);
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { name: i.name, phone: i.phone ?? null } });
    await audit(tx, userId, "PROFILE_UPDATE", "User", userId, { name: i.name, phone: i.phone ?? null });
  });
}

export async function changePassword(userId: string, raw: unknown) {
  const i = z.object({
    current: z.string().min(1, "Enter your current password"),
    next: z.string().min(8, "New password needs at least 8 characters"),
    confirm: z.string(),
  }).parse(raw);
  if (i.next !== i.confirm) throw new UserError("The new passwords do not match");
  if (i.next === i.current) throw new UserError("The new password must be different");
  const u = await db.user.findUnique({ where: { id: userId } });
  if (!u || !(await verifyPassword(i.current, u.passwordHash))) throw new UserError("Current password is wrong");
  const passwordHash = await hashPassword(i.next);
  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { passwordHash } });
    await audit(tx, userId, "PASSWORD_CHANGE", "User", userId);
  });
}

export async function updateParty(userId: string, raw: unknown) {
  const i = z.object({
    id: z.string().min(1), name: z.string().transform(cleanName).pipe(z.string().min(1, "Enter a name")), phone: phoneOpt,
    active: z.boolean(),
  }).parse(raw);
  const cur = await db.party.findUnique({ where: { id: i.id } });
  if (!cur) throw new UserError("Not found");
  const key = nameKey(i.name);
  await uniqueName(cur.type, i.name, () => db.$transaction(async (tx) => {
    await assertNoDuplicate(tx, cur.type, key, i.phone, cur.id);
    await tx.party.update({ where: { id: i.id }, data: { name: i.name, nameKey: key, phone: i.phone ?? null, active: i.active } });
    await audit(tx, userId, "PARTY_UPDATE", "Party", i.id, { name: i.name, phone: i.phone ?? null, active: i.active, ...(i.name !== cur.name && { renamedFrom: cur.name }) });
  }));
}

export async function deleteParty(userId: string, id: string) {
  const p = await db.party.findUnique({ where: { id }, include: { _count: { select: { purchases: true, sales: true, payments: true } } } });
  if (!p) throw new UserError("Not found");
  const c = p._count;
  if (c.purchases + c.sales + c.payments > 0) throw new UserError(`${p.name} has transactions. Mark it inactive instead.`);
  await db.$transaction(async (tx) => {
    await tx.party.delete({ where: { id } });
    await audit(tx, userId, "PARTY_DELETE", "Party", id, { name: p.name, type: p.type });
  });
}

export async function deleteItem(userId: string, id: string) {
  const it = await db.item.findUnique({ where: { id }, include: { _count: { select: { movements: true, purchaseLines: true, saleLines: true, batches: true } } } });
  if (!it) throw new UserError("Item not found");
  const c = it._count;
  if (c.movements + c.purchaseLines + c.saleLines + c.batches > 0) throw new UserError(`${it.name} has history. Mark it inactive instead.`);
  await db.$transaction(async (tx) => {
    await tx.productMaterial.deleteMany({ where: { OR: [{ productId: id }, { materialId: id }] } });
    await tx.item.delete({ where: { id } });
    await audit(tx, userId, "ITEM_DELETE", "Item", id, { name: it.name, type: it.type });
  });
}

// Only the free-text note can be changed on a saved entry. Stock and money are calculated from entries, so those are cancelled and re-entered.
export async function updateDocNote(userId: string, kind: CancelKind, id: number, noteRaw: string) {
  const note = noteRaw.trim().slice(0, 500) || null;
  await db.$transaction(async (tx) => {
    let before: string | null = null;
    const frozen = () => new UserError("This entry is cancelled and cannot be changed");
    const missing = () => new UserError("Entry not found");
    if (kind === "purchase") {
      const r = await tx.purchase.findUnique({ where: { id } }); if (!r) throw missing(); if (r.cancelledAt) throw frozen();
      before = r.note; await tx.purchase.update({ where: { id }, data: { note } });
    } else if (kind === "sale") {
      const r = await tx.sale.findUnique({ where: { id } }); if (!r) throw missing(); if (r.cancelledAt) throw frozen();
      before = r.note; await tx.sale.update({ where: { id }, data: { note } });
    } else if (kind === "batch") {
      const r = await tx.productionBatch.findUnique({ where: { id } }); if (!r) throw missing(); if (r.cancelledAt) throw frozen();
      before = r.note; await tx.productionBatch.update({ where: { id }, data: { note } });
    } else {
      const r = await tx.payment.findUnique({ where: { id } }); if (!r) throw missing(); if (r.cancelledAt) throw frozen();
      before = r.note; await tx.payment.update({ where: { id }, data: { note } });
    }
    await audit(tx, userId, "NOTE_EDIT", kind, String(id), { before, after: note });
  });
}
