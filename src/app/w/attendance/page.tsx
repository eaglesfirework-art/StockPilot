import Link from "next/link";
import { pageUser } from "@/server/auth";
import { db } from "@/server/db";
import { ActionForm } from "@/components/ActionForm";
import { AutoForm } from "@/components/AutoForm";
import { attendanceAction } from "@/server/actions";
import { dayAttendance, dayDate } from "@/server/attendance";
import { dOnly, todayISO } from "@/lib/fmt";

// Mark each labour Present or Absent for one day. Saving again for the same day changes the marks.
export default async function Attendance({ searchParams }: { searchParams: { date?: string } }) {
  const u = await pageUser();
  const today = todayISO();
  const date = searchParams.date && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.date) && searchParams.date <= today ? searchParams.date : today;
  const [workers, saved] = await Promise.all([
    db.party.findMany({ where: { type: "WORKER", active: true }, orderBy: { name: "asc" } }),
    dayAttendance(date),
  ]);
  const marked = workers.filter((w) => saved.has(w.id)).length;
  return (
    <>
      <h1>Labour attendance</h1>
      <AutoForm className="form">
        <label>Date<input type="date" name="date" defaultValue={date} max={today} /></label>
      </AutoForm>
      <p className="muted">
        {dOnly(dayDate(date))} · {marked === 0 ? "Not marked yet. Everyone starts as Present: tap Absent for those who did not come." : `${marked} of ${workers.length} marked. Change any mark and save again.`}
      </p>
      {workers.length === 0 ? (
        <p className="muted">No active labours. {u.role === "ADMIN" ? <Link href="/admin/parties/labours">Add labours</Link> : "Ask the admin to add labours."}</p>
      ) : (
        <ActionForm key={date} action={attendanceAction} label="Save attendance" resetOnOk={false}>
          <input type="hidden" name="date" value={date} />
          <div className="att-list">
            {workers.map((w) => {
              const present = saved.get(w.id) ?? true;
              return (
                <fieldset key={w.id} className="att-row">
                  <legend>{w.name}{!saved.has(w.id) && <span className="badge amber">Not marked</span>}</legend>
                  <div className="att-toggle">
                    <label className="att-p"><input type="radio" name={`m_${w.id}`} value="P" defaultChecked={present} />Present</label>
                    <label className="att-a"><input type="radio" name={`m_${w.id}`} value="A" defaultChecked={!present} />Absent</label>
                  </div>
                </fieldset>
              );
            })}
          </div>
        </ActionForm>
      )}
      {u.role === "ADMIN" && <p><Link href="/admin/parties/labours">See monthly absences and payments</Link></p>}
    </>
  );
}
