// Admin-only master data: items, parties, product mapping, users.
import { z } from "zod";
import { db } from "./db";
import { UserError } from "./errors";
import { audit } from "./core";
import { hashPassword } from "./auth";
import { D } from "../lib/dec";

const numStr = z.union([z.string(), z.number()]).transform((v, ctx) => {
  const s = String(v).trim();
  if (s === "" || isNaN(Number(s))) { ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid number" }); return z.NEVER; }
  return D(s);
});
const optNum = z.union([z.string(), z.number(), z.undefined(), z.null()]).transform((v) =>
  v === undefined || v === null || String(v).trim() === "" ? undefined : D(String(v).trim()),
);

export async function createItem(userId: string, raw: unknown) {
  const i = z.object({
    name: z.string().trim().min(1, "Enter a name"),
    type: z.enum(["RAW_MATERIAL", "FINISHED_GOOD"]),
    unit: z.string().trim().min(1, "Enter a unit, e.g. kg"),
    minStock: optNum, sellingPrice: optNum,
  }).parse(raw);
  const exists = await db.item.findUnique({ where: { name: i.name } });
  if (exists) throw new UserError("An item with this name already exists");
  return db.$transaction(async (tx) => {
    const item = await tx.item.create({ data: { name: i.name, type: i.type, unit: i.unit, minStock: i.minStock ?? 0, sellingPrice: i.sellingPrice } });
    await audit(tx, userId, "ITEM_CREATE", "Item", item.id, { name: i.name, type: i.type });
    return item;
  });
}

export async function updateItem(userId: string, raw: unknown) {
  const i = z.object({ id: z.string().min(1), minStock: optNum, sellingPrice: optNum, active: z.boolean() }).parse(raw);
  return db.$transaction(async (tx) => {
    const item = await tx.item.update({ where: { id: i.id }, data: { minStock: i.minStock ?? 0, sellingPrice: i.sellingPrice ?? null, active: i.active } });
    await audit(tx, userId, "ITEM_UPDATE", "Item", i.id, { minStock: i.minStock?.toString(), sellingPrice: i.sellingPrice?.toString(), active: i.active });
    return item;
  });
}

export async function createParty(userId: string, raw: unknown) {
  const i = z.object({
    name: z.string().trim().min(1, "Enter a name"),
    type: z.enum(["VENDOR", "CUSTOMER", "WORKER"]),
    phone: z.string().trim().optional(),
    openingBalance: optNum,
  }).parse(raw);
  return db.$transaction(async (tx) => {
    const p = await tx.party.create({ data: { name: i.name, type: i.type, phone: i.phone || undefined, openingBalance: i.openingBalance ?? 0 } });
    await audit(tx, userId, "PARTY_CREATE", "Party", p.id, { name: i.name, type: i.type });
    return p;
  });
}

// Product -> raw materials. No quantities here. Quantities are typed in each batch.
export async function setMapping(userId: string, productId: string, materialIds: string[]) {
  const product = await db.item.findUnique({ where: { id: productId } });
  if (!product || product.type !== "FINISHED_GOOD") throw new UserError("Choose a finished product");
  const mats = await db.item.findMany({ where: { id: { in: materialIds } } });
  if (mats.length !== new Set(materialIds).size || mats.some((m) => m.type !== "RAW_MATERIAL"))
    throw new UserError("Only raw materials can be mapped");
  return db.$transaction(async (tx) => {
    await tx.productMaterial.deleteMany({ where: { productId, materialId: { notIn: materialIds } } });
    for (const materialId of materialIds)
      await tx.productMaterial.upsert({ where: { productId_materialId: { productId, materialId } }, create: { productId, materialId }, update: {} });
    await audit(tx, userId, "MAPPING_UPDATE", "Item", productId, { materials: mats.map((m) => m.name) });
  });
}

export async function createUser(adminId: string, raw: unknown) {
  const i = z.object({
    name: z.string().trim().min(1, "Enter a name"),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    role: z.enum(["ADMIN", "WORKER"]),
    password: z.string().min(8, "Password needs at least 8 characters"),
  }).parse(raw);
  if (await db.user.findUnique({ where: { email: i.email } })) throw new UserError("This email is already used");
  const u = await db.user.create({ data: { name: i.name, email: i.email, role: i.role, passwordHash: await hashPassword(i.password) } });
  await db.$transaction((tx) => audit(tx, adminId, "USER_CREATE", "User", u.id, { email: i.email, role: i.role }));
  return u;
}

export async function setUserActive(adminId: string, userId: string, active: boolean) {
  if (userId === adminId && !active) throw new UserError("You cannot deactivate yourself");
  await db.user.update({ where: { id: userId }, data: { active } });
  await db.$transaction((tx) => audit(tx, adminId, active ? "USER_ACTIVATE" : "USER_DEACTIVATE", "User", userId));
}
