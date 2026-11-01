"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { db } from "./db";
import { UserError } from "./errors";
import { checkLogin, endSession, requireAdmin, requireUser, startSession } from "./auth";
import { adjustStock, audit, cancelDoc, CancelKind, createBatch, createPayment, createPurchase, createSale } from "./core";
import { createItem, createParty, createUser, setMapping, setUserActive, updateItem } from "./master";
import type { Result } from "../lib/types";
import { docNo } from "../lib/fmt";

async function run(fn: () => Promise<string>): Promise<Result> {
  try {
    const message = await fn();
    revalidatePath("/", "layout");
    return { ok: true, message };
  } catch (e) {
    if (e instanceof UserError) return { ok: false, message: e.message };
    if (e instanceof ZodError) return { ok: false, message: e.issues[0]?.message ?? "Check the form" };
    console.error(e);
    return { ok: false, message: "Something went wrong. Nothing was saved." };
  }
}
const s = (fd: FormData, k: string) => String(fd.get(k) ?? "");

// ----- login / logout -----
export async function loginAction(_p: Result | null, fd: FormData): Promise<Result> {
  let role = "WORKER";
  try {
    const u = await checkLogin(s(fd, "email"), s(fd, "password"));
    await startSession(u);
    await db.$transaction((tx) => audit(tx, u.id, "LOGIN"));
    role = u.role;
  } catch (e) {
    return { ok: false, message: e instanceof UserError ? e.message : "Could not log in" };
  }
  redirect(role === "ADMIN" ? "/admin" : "/w");
}
export async function logoutAction() {
  endSession();
  redirect("/login");
}

// ----- worker or admin entries -----
export async function receiveAction(input: unknown) {
  return run(async () => { const u = await requireUser(); const p = await createPurchase(u.id, input); return `${docNo("PUR", p.id)} saved`; });
}
export async function productionAction(input: unknown) {
  return run(async () => {
    const u = await requireUser(); const b = await createBatch(u.id, input);
    return `${docNo("BAT", b.id)} saved. Cost per unit ₹${b.costPerUnit.toFixed(2)}`;
  });
}
export async function labourAction(_p: Result | null, fd: FormData) {
  return run(async () => {
    const u = await requireUser();
    const p = await createPayment(u.id, {
      requestId: s(fd, "requestId"), kind: "LABOUR", partyId: s(fd, "partyId"), amount: s(fd, "amount"), date: s(fd, "date"), note: s(fd, "note"),
    });
    return `${docNo("PAY", p.id)} saved`;
  });
}

// ----- admin only -----
export async function saleAction(input: unknown) {
  return run(async () => { const u = await requireAdmin(); const x = await createSale(u.id, input); return `${docNo("SAL", x.id)} saved`; });
}
export async function partyPaymentAction(_p: Result | null, fd: FormData) {
  return run(async () => {
    const u = await requireAdmin();
    const party = await db.party.findUnique({ where: { id: s(fd, "partyId") } });
    if (!party || party.type === "WORKER") throw new UserError("Choose a customer or vendor");
    const bill = s(fd, "billId");
    const p = await createPayment(u.id, {
      requestId: s(fd, "requestId"), partyId: party.id, amount: s(fd, "amount"), date: s(fd, "date"), note: s(fd, "note"),
      kind: party.type === "VENDOR" ? "VENDOR_PAYMENT" : "CUSTOMER_RECEIPT",
      purchaseId: bill && party.type === "VENDOR" ? Number(bill) : undefined,
      saleId: bill && party.type === "CUSTOMER" ? Number(bill) : undefined,
    });
    return `${docNo("PAY", p.id)} saved`;
  });
}
export async function cancelAction(kind: CancelKind, id: number, reason: string) {
  return run(async () => { const u = await requireAdmin(); const n = await cancelDoc(u.id, kind, id, reason); return `${n} cancelled`; });
}
export async function adjustAction(_p: Result | null, fd: FormData) {
  return run(async () => {
    const u = await requireAdmin();
    await adjustStock(u.id, {
      itemId: s(fd, "itemId"), kind: s(fd, "kind"), change: s(fd, "change"),
      unitCost: s(fd, "unitCost") || undefined, reason: s(fd, "reason"),
    });
    return "Stock updated";
  });
}
export async function itemAction(_p: Result | null, fd: FormData) {
  return run(async () => {
    const u = await requireAdmin();
    await createItem(u.id, { name: s(fd, "name"), type: s(fd, "type"), unit: s(fd, "unit"), minStock: s(fd, "minStock"), sellingPrice: s(fd, "sellingPrice") });
    return "Item added";
  });
}
export async function itemUpdateAction(_p: Result | null, fd: FormData) {
  return run(async () => {
    const u = await requireAdmin();
    await updateItem(u.id, { id: s(fd, "id"), minStock: s(fd, "minStock"), sellingPrice: s(fd, "sellingPrice"), active: fd.get("active") === "on" });
    return "Saved";
  });
}
export async function partyAction(_p: Result | null, fd: FormData) {
  return run(async () => {
    const u = await requireAdmin();
    await createParty(u.id, { name: s(fd, "name"), type: s(fd, "type"), phone: s(fd, "phone"), openingBalance: s(fd, "openingBalance") });
    return "Added";
  });
}
export async function mappingAction(_p: Result | null, fd: FormData) {
  return run(async () => {
    const u = await requireAdmin();
    await setMapping(u.id, s(fd, "productId"), fd.getAll("m").map(String));
    return "Mapping saved";
  });
}
export async function userAction(_p: Result | null, fd: FormData) {
  return run(async () => {
    const u = await requireAdmin();
    await createUser(u.id, { name: s(fd, "name"), email: s(fd, "email"), role: s(fd, "role"), password: s(fd, "password") });
    return "User created";
  });
}
export async function userToggleAction(_p: Result | null, fd: FormData) {
  return run(async () => {
    const u = await requireAdmin();
    await setUserActive(u.id, s(fd, "id"), s(fd, "active") === "true");
    return "Saved";
  });
}
