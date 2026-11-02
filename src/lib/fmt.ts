// Pure formatting helpers. Safe for both server and client code.
type Numish = number | string | { toString(): string };

export const inr = (v: Numish) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(v.toString()));

export const inr0 = (v: Numish) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(v.toString()));

export const num = (v: Numish) =>
  Number(v.toString()).toLocaleString("en-IN", { maximumFractionDigits: 3 });

export const dt = (d: Date | string) =>
  new Date(d).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

export const dOnly = (d: Date | string) =>
  new Date(d).toLocaleDateString("en-IN", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });

export const docNo = (prefix: string, id: number | string) => `${prefix}-${id}`;

export const todayISO = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

// crypto.randomUUID only works on https/localhost, so keep a fallback for phones on http.
export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "r" + Math.random().toString(16).slice(2) + Date.now().toString(16);
