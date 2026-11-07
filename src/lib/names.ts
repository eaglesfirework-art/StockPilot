// Name helpers for duplicate checks. "  Anand  FLOUR mills. " and "Anand Flour Mills" are the same party.
// The same rule runs in prisma/checks.sql to fill nameKey for rows saved before this column existed.

// Tidy a typed name for saving: trim and collapse spaces, keep the user's capitals.
export const cleanName = (s: string) => s.replace(/\s+/g, " ").trim();

// The comparison key: lower case, any run of punctuation or spaces becomes one space.
export function nameKey(s: string) {
  const k = s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return k || s.trim().toLowerCase();
}
