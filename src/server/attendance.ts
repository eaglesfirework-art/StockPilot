// Labour attendance: one Present/Absent mark per labour per day, plus month totals for the Labours screens.
import { z } from "zod";
import { db } from "./db";
import { UserError } from "./errors";
import { audit } from "./core";
import { D, Dec, ZERO } from "../lib/dec";
import { todayISO } from "../lib/fmt";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_MONTH = /^\d{4}-\d{2}$/;

// Dates are stored as UTC midnight, the same as every other date in the app.
export const dayDate = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

// "2026-11" -> 1 Nov 2026 .. 30 Nov 2026 (both inclusive). Anything else -> the current month.
export function monthRange(raw?: string) {
  const month = raw && ISO_MONTH.test(raw) ? raw : todayISO().slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(y, m, 0));
  const label = from.toLocaleDateString("en-IN", { timeZone: "UTC", month: "long", year: "numeric" });
  return { month, from, to, label, days: to.getUTCDate() };
}

const AttendanceIn = z.object({
  date: z.string().regex(ISO_DAY, "Choose a date"),
  marks: z.array(z.object({ partyId: z.string().min(1), present: z.boolean() })).min(1, "Mark at least one labour"),
});

export async function saveAttendance(userId: string, raw: unknown) {
  const i = AttendanceIn.parse(raw);
  if (i.date > todayISO()) throw new UserError("Attendance cannot be marked for a future date");
  const date = dayDate(i.date);
  const ids = [...new Set(i.marks.map((m) => m.partyId))];
  const found = await db.party.count({ where: { id: { in: ids }, type: "WORKER" } });
  if (found !== ids.length) throw new UserError("Labour not found");
  return db.$transaction(async (tx) => {
    for (const m of i.marks)
      await tx.attendance.upsert({
        where: { partyId_date: { partyId: m.partyId, date } },
        create: { partyId: m.partyId, date, present: m.present, markedById: userId },
        update: { present: m.present, markedById: userId },
      });
    const absent = i.marks.filter((m) => !m.present).length;
    await audit(tx, userId, "ATTENDANCE", "Attendance", i.date, { present: i.marks.length - absent, absent, absentIds: i.marks.filter((m) => !m.present).map((m) => m.partyId) });
    return { date: i.date, present: i.marks.length - absent, absent };
  });
}

// The marks already saved for one day: partyId -> present?
export async function dayAttendance(iso: string) {
  const rows = await db.attendance.findMany({ where: { date: dayDate(iso) } });
  return new Map(rows.map((r) => [r.partyId, r.present]));
}

export type LabourMonth = { present: number; absent: number; paid: Dec; absentDates: Date[] };

// For each labour: days present / absent in the month, and labour money paid in the month (by payment date, cancelled ones left out).
export async function labourMonth(month?: string, partyId?: string) {
  const r = monthRange(month);
  const [marks, pays] = await Promise.all([
    db.attendance.findMany({ where: { date: { gte: r.from, lte: r.to }, ...(partyId ? { partyId } : {}) }, orderBy: { date: "asc" } }),
    db.payment.groupBy({
      by: ["partyId"], _sum: { amount: true },
      where: { kind: "LABOUR", cancelledAt: null, date: { gte: r.from, lt: new Date(r.to.getTime() + 86400000) }, ...(partyId ? { partyId } : { partyId: { not: null } }) },
    }),
  ]);
  const out = new Map<string, LabourMonth>();
  const get = (id: string) => { let x = out.get(id); if (!x) out.set(id, (x = { present: 0, absent: 0, paid: ZERO, absentDates: [] })); return x; };
  for (const m of marks) {
    const x = get(m.partyId);
    if (m.present) x.present++; else { x.absent++; x.absentDates.push(m.date); }
  }
  for (const p of pays) if (p.partyId) get(p.partyId).paid = D(p._sum.amount ?? 0);
  return { range: r, byParty: out };
}
