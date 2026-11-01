import { pageUser } from "@/server/auth";
import { db } from "@/server/db";
import { ActionForm } from "@/components/ActionForm";
import { labourAction } from "@/server/actions";
import { todayISO } from "@/lib/fmt";

export default async function Labour() {
  await pageUser();
  const workers = await db.party.findMany({ where: { type: "WORKER", active: true }, orderBy: { name: "asc" } });
  return (
    <>
      <h1>Labour payment</h1>
      <ActionForm action={labourAction} label="Save">
        <label>Worker<select name="partyId" required><option value="">Choose…</option>{workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
        <label>Amount (₹)<input name="amount" inputMode="decimal" required /></label>
        <label>Date<input name="date" type="date" defaultValue={todayISO()} required /></label>
        <label>Note<input name="note" /></label>
      </ActionForm>
    </>
  );
}
