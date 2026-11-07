import { pageUser } from "@/server/auth";
import { db } from "@/server/db";
import { ActionForm } from "@/components/ActionForm";
import { labourAction } from "@/server/actions";
import { todayISO } from "@/lib/fmt";

// A labour payment records who was paid, how much, on which date, and for which days of work (From - To).
export default async function Labour() {
  await pageUser();
  const workers = await db.party.findMany({ where: { type: "WORKER", active: true }, orderBy: { name: "asc" } });
  return (
    <>
      <h1>Labour payment</h1>
      <ActionForm action={labourAction} label="Save">
        <label>Labour<select name="partyId" required><option value="">Choose…</option>{workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
        <label>Amount (₹)<input name="amount" inputMode="decimal" required /></label>
        <label>Payment date<input name="date" type="date" defaultValue={todayISO()} required /></label>
        <fieldset className="card">
          <legend className="muted">Work period being paid for</legend>
          <div className="row2">
            <label>Work from<input name="workFrom" type="date" required /></label>
            <label>Work to<input name="workTo" type="date" required /></label>
          </div>
          <p className="muted">For one day of work, choose the same date in both.</p>
        </fieldset>
        <label>Note<input name="note" placeholder="e.g. advance, weekly wages" /></label>
      </ActionForm>
    </>
  );
}
