import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { COOKIE, authKey } from "./lib/secret";

// First gate: no valid cookie -> login. Workers cannot open /admin.
// Every page and action still checks again on the server.
export async function middleware(req: NextRequest) {
  const token = req.cookies.get(COOKIE)?.value;
  let role: string | null = null;
  if (token) {
    try {
      role = String((await jwtVerify(token, authKey())).payload.role);
    } catch { /* invalid token */ }
  }
  const path = req.nextUrl.pathname;
  if (!role) return NextResponse.redirect(new URL("/login", req.url));
  if (path.startsWith("/admin") && role !== "ADMIN") return NextResponse.redirect(new URL("/w", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/w/:path*"] };
