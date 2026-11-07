// Date-range and query-string helpers shared by every history page. Safe for server and client.
const DAY = 864e5;
const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const validDay = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) && isoDay(Date.parse(`${s}T00:00:00Z`)) === s ? s : undefined);
const shift = (day: string, days: number) => isoDay(Date.parse(`${day}T00:00:00Z`) + days * DAY);

export const todayIST = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

export type Range = {
  from: string; to: string; isDefault: boolean;
  gte: Date; lte: Date;       // for document dates (stored as UTC midnight)
  tsGte: Date; tsLte: Date;   // for timestamps such as createdAt (India time day)
};

// Default is the last `days` days up to and including today (India time).
export function dateRange(sp: { from?: string; to?: string }, days = 7): Range {
  const today = todayIST();
  const f = validDay(sp.from), t = validDay(sp.to);
  let to = t ?? today;
  let from = f ?? shift(to, -(days - 1));
  if (from > to) [from, to] = [to, from];
  return {
    from, to, isDefault: !f && !t,
    gte: new Date(`${from}T00:00:00Z`), lte: new Date(`${to}T23:59:59.999Z`),
    tsGte: new Date(`${from}T00:00:00+05:30`), tsLte: new Date(`${to}T23:59:59.999+05:30`),
  };
}

export type Preset = { label: string; from: string; to: string };

export function presets(): Preset[] {
  const today = todayIST();
  const monthStart = `${today.slice(0, 7)}-01`;
  return [
    { label: "Today", from: today, to: today },
    { label: "Last 7 days", from: shift(today, -6), to: today },
    { label: "Last 30 days", from: shift(today, -29), to: today },
    { label: "This month", from: monthStart, to: today },
    { label: "Last month", from: `${shift(monthStart, -1).slice(0, 7)}-01`, to: shift(monthStart, -1) },
  ];
}

export function qs(o: Record<string, string | undefined | null>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
}

// Labour payments whose work days overlap the chosen range (work started on or before its end, and ended on or after its start).
export const workPeriodWhere = (r: Pick<Range, "gte" | "lte">) => ({ workFrom: { lte: r.lte }, workTo: { gte: r.gte } });
