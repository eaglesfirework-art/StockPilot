export const COOKIE = "sp_session";
export function authKey() {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s ?? "dev-only-secret-change-me-32-characters!!");
}
