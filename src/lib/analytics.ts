// Pure helpers for the dashboard: periods, time buckets, chart scales. No database, safe for server and client.
const DAY = 864e5;
const ms = (d: string) => Date.parse(`${d}T00:00:00Z`);
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

export const addDays = (d: string, n: number) => iso(ms(d) + n * DAY);
export const daysInclusive = (from: string, to: string) => Math.round((ms(to) - ms(from)) / DAY) + 1;

// The period of the same length that ends the day before `from`.
export function previousPeriod(from: string, to: string) {
  const days = daysInclusive(from, to);
  const pTo = addDays(from, -1);
  return { from: addDays(pTo, -(days - 1)), to: pTo, days };
}

// null means "there was nothing to compare with" (previous period was zero, this one is not).
export function pctChange(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null;
  return ((cur - prev) / Math.abs(prev)) * 100;
}

const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Date(ms(d)).toLocaleDateString("en-IN", { timeZone: "UTC", ...o });

export type Bucket = { start: string; end: string; label: string; tip: string };

// Daily up to 45 days, weekly up to 180 days, monthly beyond, so a chart never has more than about 60 columns.
export function buckets(from: string, to: string): Bucket[] {
  const n = daysInclusive(from, to);
  const out: Bucket[] = [];
  if (n <= 45) {
    for (let d = from; d <= to; d = addDays(d, 1))
      out.push({ start: d, end: d, label: fmt(d, { day: "numeric", month: "short" }), tip: fmt(d, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) });
  } else if (n <= 180) {
    for (let s = from; s <= to; s = addDays(s, 7)) {
      const e = addDays(s, 6) < to ? addDays(s, 6) : to;
      out.push({ start: s, end: e, label: fmt(s, { day: "numeric", month: "short" }), tip: `${fmt(s, { day: "numeric", month: "short" })} to ${fmt(e, { day: "numeric", month: "short", year: "numeric" })}` });
    }
  } else {
    for (let s = from; s <= to; ) {
      const monthEnd = addDays(`${addDays(`${s.slice(0, 7)}-01`, 32).slice(0, 7)}-01`, -1);
      const e = monthEnd < to ? monthEnd : to;
      out.push({ start: s, end: e, label: fmt(s, { month: "short", year: "2-digit" }), tip: fmt(s, { month: "long", year: "numeric" }) });
      s = addDays(e, 1);
    }
  }
  return out;
}

export function bucketIndex(bs: Bucket[], day: string) {
  return bs.findIndex((b) => day >= b.start && day <= b.end);
}

// Round axis ticks (0, 25K, 50K...) that cover min..max. min <= 0 <= max.
export function niceTicks(min: number, max: number, target = 4) {
  const lo0 = Math.min(0, min), hi0 = Math.max(0, max);
  if (hi0 === lo0) return { lo: 0, hi: 1, step: 1, ticks: [0, 1] };
  const span = hi0 - lo0;
  const k = Math.floor(Math.log10(span / target));
  const candidates = [-1, 0, 1].flatMap((e) => [1, 2, 2.5, 5].map((m) => m * 10 ** (k + e)));
  const step = candidates.find((s) => Math.ceil(span / s - 1e-9) <= target + 1) ?? candidates[candidates.length - 1];
  const lo = Math.floor(lo0 / step) * step, hi = Math.ceil(hi0 / step) * step;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step / 1000; t += step) ticks.push(Math.round(t * 1e6) / 1e6);
  return { lo, hi, step, ticks };
}

// Axis style: ₹500, ₹25K, ₹1.5L, ₹2Cr (Indian units).
export function compactINR(v: number) {
  const a = Math.abs(v), sign = v < 0 ? "-" : "";
  const f = (x: number) => String(Math.round(x * 10) / 10);
  if (a >= 1e7) return `${sign}₹${f(a / 1e7)}Cr`;
  if (a >= 1e5) return `${sign}₹${f(a / 1e5)}L`;
  if (a >= 1e3) return `${sign}₹${f(a / 1e3)}K`;
  return `${sign}₹${f(a)}`;
}

// Which x labels to print so they never collide: at most `max` of `n`.
export const labelStep = (n: number, max: number) => Math.max(1, Math.ceil(n / max));
