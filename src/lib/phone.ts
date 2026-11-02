export const PHONE_MSG = "Enter a valid Indian mobile number: 10 digits starting with 6-9, with an optional +91";

// "98765 43210", "+91-98765-43210", "091 9876543210" -> "+919876543210". Returns null if it is not an Indian mobile number.
export function normalizeIndianPhone(raw: string): string | null {
  let s = raw.replace(/[\s\-().]/g, "");
  if (s.startsWith("+")) {
    if (!s.startsWith("+91")) return null;
    s = s.slice(3);
  } else if (s.startsWith("0091")) s = s.slice(4);
  else if (s.length === 12 && s.startsWith("91")) s = s.slice(2);
  else if (s.length === 11 && s.startsWith("0")) s = s.slice(1);
  return /^[6-9]\d{9}$/.test(s) ? `+91${s}` : null;
}

export const formatPhone = (p: string | null | undefined) =>
  p && /^\+91\d{10}$/.test(p) ? `+91 ${p.slice(3, 8)} ${p.slice(8)}` : p ?? "";
