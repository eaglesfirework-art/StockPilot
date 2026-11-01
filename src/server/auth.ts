import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { UserError } from "./errors";
import { COOKIE, authKey } from "../lib/secret";

export async function startSession(u: { id: string; role: string }) {
  const token = await new SignJWT({ role: u.role })
    .setSubject(u.id).setProtectedHeader({ alg: "HS256" }).setExpirationTime("12h").sign(authKey());
  cookies().set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12,
  });
}

export function endSession() {
  cookies().delete(COOKIE);
}

export async function getUser() {
  const t = cookies().get(COOKIE)?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, authKey());
    const u = await db.user.findUnique({ where: { id: String(payload.sub) } });
    return u && u.active ? u : null;
  } catch {
    return null;
  }
}

// The two helpers used by every action (checked on the server, never only by hiding buttons).
export async function requireUser() {
  const u = await getUser();
  if (!u) throw new UserError("Please log in again");
  return u;
}
export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== "ADMIN") throw new UserError("Not allowed");
  return u;
}

// For pages: redirect instead of throwing.
export async function pageUser(role?: "ADMIN") {
  const u = await getUser();
  if (!u) redirect("/login");
  if (role === "ADMIN" && u.role !== "ADMIN") redirect("/w");
  return u;
}

// Login with a simple rate limit: 5 wrong tries per email per 15 minutes.
const fails = new Map<string, { n: number; until: number }>();
export async function checkLogin(emailRaw: string, password: string) {
  const email = emailRaw.trim().toLowerCase();
  const f = fails.get(email);
  if (f && f.n >= 5 && Date.now() < f.until) throw new UserError("Too many tries. Wait 15 minutes.");
  const u = await db.user.findUnique({ where: { email } });
  const ok = u && u.active && (await bcrypt.compare(password, u.passwordHash));
  if (!ok || !u) {
    fails.set(email, { n: (f && Date.now() < f.until ? f.n : 0) + 1, until: Date.now() + 15 * 60 * 1000 });
    throw new UserError("Wrong email or password");
  }
  fails.delete(email);
  return u;
}

export const hashPassword = (p: string) => bcrypt.hash(p, 10);
