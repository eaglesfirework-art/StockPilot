import { describe, expect, it } from "vitest";
import { normalizeIndianPhone, formatPhone } from "../src/lib/phone";
import { dateRange, presets, qs, todayIST } from "../src/lib/filters";

describe("Indian phone numbers", () => {
  it.each([
    ["9876543210", "+919876543210"],
    ["98765 43210", "+919876543210"],
    ["+91 98765-43210", "+919876543210"],
    ["919876543210", "+919876543210"],
    ["09876543210", "+919876543210"],
    ["0091 9876543210", "+919876543210"],
    ["(+91) 6123456789", "+916123456789"],
    ["9123456789", "+919123456789"],
  ])("accepts %s", (raw, want) => expect(normalizeIndianPhone(raw)).toBe(want));

  it.each(["", "12345", "5876543210", "98765432100", "+44 7911 123456", "+1 9876543210", "abcdefghij", "98765 4321"])(
    "rejects %s", (raw) => expect(normalizeIndianPhone(raw)).toBeNull());

  it("formats for display", () => expect(formatPhone("+919876543210")).toBe("+91 98765 43210"));
});

describe("date range", () => {
  it("defaults to the last 7 days including today", () => {
    const r = dateRange({});
    expect(r.isDefault).toBe(true);
    expect(r.to).toBe(todayIST());
    expect((Date.parse(r.to) - Date.parse(r.from)) / 864e5).toBe(6);
  });
  it("uses given dates, swaps a reversed range and ignores junk", () => {
    expect(dateRange({ from: "2026-11-01", to: "2026-11-03" })).toMatchObject({ from: "2026-11-01", to: "2026-11-03", isDefault: false });
    expect(dateRange({ from: "2026-11-05", to: "2026-11-01" })).toMatchObject({ from: "2026-11-01", to: "2026-11-05" });
    expect(dateRange({ from: "2026-02-31", to: "nope" }).isDefault).toBe(true);
  });
  it("defaults the missing end relative to the given one", () => {
    expect(dateRange({ to: "2026-11-10" })).toMatchObject({ from: "2026-11-04", to: "2026-11-10" });
  });
  it("bounds documents by UTC day and timestamps by India day", () => {
    const r = dateRange({ from: "2026-11-01", to: "2026-11-01" });
    expect(r.gte.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(r.lte.toISOString()).toBe("2026-11-01T23:59:59.999Z");
    expect(r.tsGte.toISOString()).toBe("2026-10-31T18:30:00.000Z");
  });
  it("builds query strings without empty values", () => expect(qs({ a: "1", b: "", c: undefined, d: "x y" })).toBe("?a=1&d=x+y"));
});

describe("quick ranges", () => {
  it("covers today, 7 and 30 days, this month and the whole of last month", () => {
    const by = Object.fromEntries(presets().map((p) => [p.label, p]));
    const today = todayIST();
    expect(Object.keys(by)).toEqual(["Today", "Last 7 days", "Last 30 days", "This month", "Last month"]);
    expect(by["Today"]).toMatchObject({ from: today, to: today });
    expect(by["This month"]).toMatchObject({ from: `${today.slice(0, 7)}-01`, to: today });
    const lm = by["Last month"];
    expect(lm.from.endsWith("-01")).toBe(true);
    expect(lm.from.slice(0, 7)).toBe(lm.to.slice(0, 7));
    expect(Date.parse(lm.to) + 864e5).toBe(Date.parse(by["This month"].from));
  });
});

import { addDays, buckets, bucketIndex, compactINR, daysInclusive, labelStep, niceTicks, pctChange, previousPeriod } from "../src/lib/analytics";

describe("dashboard helpers", () => {
  it("builds the previous period of the same length", () => {
    expect(previousPeriod("2026-10-28", "2026-11-03")).toEqual({ from: "2026-10-21", to: "2026-10-27", days: 7 });
    expect(previousPeriod("2026-11-01", "2026-11-30")).toMatchObject({ from: "2026-10-02", to: "2026-10-31", days: 30 });
    expect(daysInclusive("2026-11-03", "2026-11-03")).toBe(1);
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });
  it("computes percent change without dividing by zero", () => {
    expect(pctChange(150, 100)).toBe(50);
    expect(pctChange(50, 100)).toBe(-50);
    expect(pctChange(0, 0)).toBe(0);
    expect(pctChange(10, 0)).toBeNull();
    expect(pctChange(-50, -100)).toBe(50);
  });
  it("buckets by day, week and month and finds the right column", () => {
    const d = buckets("2026-10-28", "2026-11-03");
    expect(d).toHaveLength(7);
    expect(bucketIndex(d, "2026-11-01")).toBe(4);
    expect(bucketIndex(d, "2026-12-01")).toBe(-1);
    const w = buckets("2026-09-01", "2026-11-03");
    expect(w[0].start).toBe("2026-09-01");
    expect(w[w.length - 1].end).toBe("2026-11-03");
    expect(w.every((b) => b.start <= b.end)).toBe(true);
    const m = buckets("2026-01-01", "2026-11-03");
    expect(m).toHaveLength(11);
    expect(m[0]).toMatchObject({ start: "2026-01-01", end: "2026-01-31" });
    expect(m[10].end).toBe("2026-11-03");
  });
  it("picks round axis ticks, including below zero", () => {
    expect(niceTicks(0, 225100).ticks).toEqual([0, 50000, 100000, 150000, 200000, 250000]);
    expect(niceTicks(0, 0).ticks).toEqual([0, 1]);
    const t = niceTicks(-300, 900);
    expect(t.lo).toBeLessThanOrEqual(-300);
    expect(t.hi).toBeGreaterThanOrEqual(900);
    expect(t.ticks).toContain(0);
  });
  it("formats compact rupees and spaces labels", () => {
    expect([compactINR(0), compactINR(950), compactINR(25000), compactINR(150000), compactINR(25000000), compactINR(-50000)]).toEqual(["₹0", "₹950", "₹25K", "₹1.5L", "₹2.5Cr", "-₹50K"]);
    expect([labelStep(7, 10), labelStep(30, 10), labelStep(30, 5)]).toEqual([1, 3, 6]);
  });
});
