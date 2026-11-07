"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { db } from "./db";
import { UserError } from "./errors";
import { checkLogin, endSession, requireAdmin, requireUser, startSession } from "./auth";
import { adjustStock, audit, cancelDoc, CancelKind, createBatch, createPayment, createPurchase, createSale } from "./core";
import {
  changePassword, createItem, createParty, createUser, deleteItem, deleteParty, deleteUser,
  updateDocNote, updateItem, updateParty, updateProfile, updateUser,
} from "./master";
import type { Result } from "../lib/types";
import { docNo, inr } from "../lib/fmt";
import { ZERO } from "../lib/dec";
import { workPeriod } from "../lib/statement";

async function run(fn: () => Promise<string | Omit<Result, "ok">>): Promise<Result> {
  try {
    const r = await fn();
    revalidatePath("/", "layout");
    return typeof r === "string" ? { ok: true, message: r } : { ok: true, ...r };
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
      workFrom: s(fd, "workFrom"), workTo: s(fd, "workTo"),
    });
    const who = await db.party.findUnique({ where: { id: p.partyId ?? "" } });
    return `Labour payment of ${inr(p.amount)} to ${who?.name ?? "labour"} saved (payment no. ${p.id}). ${workPeriod(p)}.`;
  });
}

// ----- admin only -----
// After a sale: say what was billed, what came in and what is still due, and link to that customer's payment page.
export async function saleAction(input: unknown) {
  return run(async () => {
    const u = await requireAdmin();
    const x = await createSale(u.id, input);
    const [customer, got] = await Promise.all([
      db.party.findUniqueOrThrow({ where: { id: x.customerId } }),
      db.payment.aggregate({ _sum: { amount: true }, where: { saleId: x.id, cancelledAt: null } }),
    ]);
    const received = got._sum.amount ?? ZERO, due = x.total.minus(received);
    const message = `${docNo("SAL", x.id)} saved for ${customer.name}. Total ${inr(x.total)}, received ${inr(received)}, ` +
      (due.gt(0) ? `${inr(due)} still due.` : "fully paid.");
    return {
      message,
      link: { href: `/admin/party/${customer.id}`, label: due.gt(0) ? `Record payment from ${customer.name} →` : `Open ${customer.name}'s account →` },
    };
  });
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
    return `${party.type === "VENDOR" ? "Payment" : "Receipt"} of ${inr(p.amount)} ${party.type === "VENDOR" ? "to" : "from"} ${party.name} saved (${party.type === "VENDOR" ? "payment" : "receipt"} no. ${p.id})`;
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
    const it = await createItem(u.id, { name: s(fd, "name"), type: s(fd, "type"), unit: s(fd, "unit"), minStock: s(fd, "minStock"), materialIds: fd.getAll("m").map(String) });
    return `${it.name} added to ${it.type === "RAW_MATERIAL" ? "Raw Materials" : "Products"}`;
  });
}
export async function itemUpdateAction(_p: Result | null, fd: FormData) {
  return run(async () => {
    const u = await requireAdmin();
    await updateItem(u.id, {
      id: s(fd, "id"), name: s(fd, "name"), unit: fd.has("unit") ? s(fd, "unit") : undefined,
      minStock: s(fd, "minStock"), active: fd.get("active") === "on",
      materialIds: fd.get("withMapping") === "1" ? fd.getAll("m").map(String) : undefined,
    });
    return "Saved";
  });
}
export async function partyAction(_p: Result | null, fd: FormData) {
  return run(async () => {
    const u = await requireAdmin();
    await createParty(u.id, { name: s(fd, "name"), type: s(fd, "type"), phone: s(fd, "phone") });
    return "Added";
  });
}
export async function userAction(_p: Result | null, fd: FormData) {
  return run(async () => {
    const u = await requireAdmin();
    await createUser(u.id, { name: s(fd, "name"), email: s(fd, "email"), phone: s(fd, "phone"), role: s(fd, "role"), password: s(fd, "password") });
    return "User created";
  });
}
export async function userUpdateAction(_p: Result | null, fd: FormData) {
  return run(async () => {
    const u = await requireAdmin();
    await updateUser(u.id, {
      id: s(fd, "id"), name: s(fd, "name"), email: s(fd, "email"), phone: s(fd, "phone"), role: s(fd, "role"),
      active: fd.get("active") === "on", password: s(fd, "password"),
    });
    return "Saved";
  });
}
export async function userDeleteAction(_p: Result | null, fd: FormData) {
  return run(async () => { const u = await requireAdmin(); await deleteUser(u.id, s(fd, "id")); return "User deleted"; });
}
export async function partyUpdateAction(_p: Result | null, fd: FormData) {
  return run(async () => {
    const u = await requireAdmin();
    await updateParty(u.id, { id: s(fd, "id"), name: s(fd, "name"), phone: s(fd, "phone"), active: fd.get("active") === "on" });
    return "Saved";
  });
}
export async function partyDeleteAction(_p: Result | null, fd: FormData) {
  return run(async () => { const u = await requireAdmin(); await deleteParty(u.id, s(fd, "id")); return "Deleted"; });
}
export async function itemDeleteAction(_p: Result | null, fd: FormData) {
  return run(async () => { const u = await requireAdmin(); await deleteItem(u.id, s(fd, "id")); return "Deleted"; });
}
export async function noteAction(kind: CancelKind, id: number, note: string) {
  return run(async () => { const u = await requireAdmin(); await updateDocNote(u.id, kind, id, note); return "Note saved"; });
}

// ----- my profile (any logged-in user, own record only) -----
export async function profileAction(_p: Result | null, fd: FormData) {
  return run(async () => { const u = await requireUser(); await updateProfile(u.id, { name: s(fd, "name"), phone: s(fd, "phone") }); return "Profile saved"; });
}
export async function passwordAction(_p: Result | null, fd: FormData) {
  return run(async () => {
    const u = await requireUser();
    await changePassword(u.id, { current: s(fd, "current"), next: s(fd, "next"), confirm: s(fd, "confirm") });
    return "Password changed";
  });
}
