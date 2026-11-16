// Needs the TEST database (npm run test:setup).
// Labour attendance: marks are saved once per labour per day, can be changed, and the month view counts absences and pay.
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { db } from "../src/server/db";
import { createPayment } from "../src/server/core";
import { labourMonth, monthRange, saveAttendance } from "../src/server/attendance";

let manager = "", ram = "", shyam = "", vendor = "";
let n = 0;
const rid = () => `test-att-${++n}`;

beforeAll(async () => {
  if (!/test/i.test(process.env.DATABASE_URL ?? "")) throw new Error("Refusing to run: DATABASE_URL must be a TEST database.");
  await db.$executeRawUnsafe(
    `TRUNCATE "AuditLog","StockMovement","Payment","SaleLine","Sale","PurchaseLine","Purchase","ProductionBatch","ProductMaterial","Attendance","Party","Item","User" RESTART IDENTITY CASCADE`,
  );
  manager = (await db.user.create({ data: { name: "Manager", email: "m@t.local", passwordHash: "x", role: "WORKER" } })).id;
  ram = (await db.party.create({ data: { name: "Ram", nameKey: "ram", type: "WORKER" } })).id;
  shyam = (await db.party.create({ data: { name: "Shyam", nameKey: "shyam", type: "WORKER" } })).id;
  vendor = (await db.party.create({ data: { name: "Anand", nameKey: "anand", type: "VENDOR" } })).id;
});
afterAll(() => db.$disconnect());

describe("labour attendance", () => {
  it("saves a day and changing it again keeps one mark per labour", async () => {
    await saveAttendance(manager, { date: "2026-10-05", marks: [{ partyId: ram, present: true }, { partyId: shyam, present: false }] });
    await saveAttendance(manager, { date: "2026-10-05", marks: [{ partyId: ram, present: false }, { partyId: shyam, present: true }] });
    const rows = await db.attendance.findMany({ where: { date: new Date("2026-10-05T00:00:00Z") }, orderBy: { partyId: "asc" } });
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.partyId === ram)?.present).toBe(false);
    expect(rows.find((r) => r.partyId === shyam)?.present).toBe(true);
    expect(await db.auditLog.count({ where: { action: "ATTENDANCE" } })).toBe(2);
  });

  it("refuses future dates and parties that are not labours", async () => {
    await expect(saveAttendance(manager, { date: "2999-01-01", marks: [{ partyId: ram, present: true }] })).rejects.toThrow(/future/);
    await expect(saveAttendance(manager, { date: "2026-10-06", marks: [{ partyId: vendor, present: true }] })).rejects.toThrow(/Labour not found/);
  });

  it("counts absent days and pay inside the chosen month only", async () => {
    await saveAttendance(manager, { date: "2026-10-06", marks: [{ partyId: ram, present: false }, { partyId: shyam, present: true }] });
    await saveAttendance(manager, { date: "2026-10-31", marks: [{ partyId: ram, present: true }] });
    await saveAttendance(manager, { date: "2026-11-01", marks: [{ partyId: ram, present: false }] }); // next month: not counted
    await createPayment(manager, { requestId: rid(), kind: "LABOUR", partyId: ram, amount: "1500", date: "2026-10-10", workFrom: "2026-10-01", workTo: "2026-10-07" });
    await createPayment(manager, { requestId: rid(), kind: "LABOUR", partyId: ram, amount: "700", date: "2026-10-31", workFrom: "2026-10-08", workTo: "2026-10-14" });
    await createPayment(manager, { requestId: rid(), kind: "LABOUR", partyId: ram, amount: "900", date: "2026-11-02", workFrom: "2026-10-15", workTo: "2026-10-21" });

    const { range, byParty } = await labourMonth("2026-10");
    expect(range.label).toBe("October 2026");
    const r = byParty.get(ram)!;
    expect(r.absent).toBe(2);
    expect(r.present).toBe(1);
    expect(r.absentDates.map((d) => d.toISOString().slice(0, 10))).toEqual(["2026-10-05", "2026-10-06"]);
    expect(r.paid.toString()).toBe("2200");
    expect(byParty.get(shyam)).toMatchObject({ present: 2, absent: 0 });

    const one = await labourMonth("2026-11", ram);
    expect(one.byParty.get(ram)).toMatchObject({ absent: 1 });
    expect(one.byParty.get(ram)!.paid.toString()).toBe("900");
  });

  it("falls back to the current month for a bad month value", () => {
    expect(monthRange("nonsense").month).toMatch(/^\d{4}-\d{2}$/);
    expect(monthRange("2024-02").days).toBe(29);
  });
});
