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

// ---- No minus signs on screen: a value below zero is said in words instead. ----
const num0 = (v: Numish) => Number(v.toString());
// What someone owes. Balances cannot go below zero any more; older data that does is shown as an advance.
export const owed = (v: Numish) => (num0(v) < 0 ? `${inr(-num0(v))} advance` : inr(v));
// Profit that may be a loss: "₹500.00" or "₹500.00 loss". Pass inr0 for whole rupees.
export const pl = (v: Numish, f: (x: number) => string = inr) => (num0(v) < 0 ? `${f(-num0(v))} loss` : f(num0(v)));
// Net cash: "₹8,900 in" or "₹8,900 out".
export const netCash = (v: Numish, f: (x: number) => string = inr) => `${f(Math.abs(num0(v)))} ${num0(v) < 0 ? "out" : "in"}`;
// A margin that may be negative: "12.5%" or "4.1% loss".
export const marginTxt = (v: number) => (v < 0 ? `${Math.abs(v)}% loss` : `${v}%`);
