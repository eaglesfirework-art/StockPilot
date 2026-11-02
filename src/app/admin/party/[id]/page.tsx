import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { ActionForm } from "@/components/ActionForm";
import { DateFilter } from "@/components/DateFilter";
import { Pager } from "@/components/Pager";
import { partyPaymentAction } from "@/server/actions";
import { billDue } from "@/server/core";
import { ZERO } from "@/lib/dec";
import { PAGE, pageOf } from "@/server/queries";
import { dateRange, qs } from "@/lib/filters";
import { dOnly, docNo, inr, todayISO } from "@/lib/fmt";

export default async function Statement({ params, searchParams }: { params: { id: string }; searchParams: { from?: string; to?: string; page?: string } }) {
  const p = await db.party.findUnique({ where: { id: params.id } });
  if (!p) notFound();
  const cust = p.type === "CUSTOMER", vend = p.type === "VENDOR";
  const range = dateRange(searchParams);
  const page = pageOf(searchParams);

  const bills = vend
    ? await db.purchase.findMany({ where: { vendorId: p.id } })
    : cust ? await db.sale.findMany({ where: { customerId: p.id } }) : [];
  const pays = await db.payment.findMany({ where: { partyId: p.id } });

  type Row = { date: Date; id: number; doc: string; label: string; amt: number; cancelled: boolean };
  const rows: Row[] = [
    ...bills.map((b) => ({ date: b.date, id: b.id, doc: docNo(vend ? "PUR" : "SAL", b.id), label: vend ? "Purchase" : "Sale", amt: Number(b.total), cancelled: !!b.cancelledAt })),
    ...pays.map((x) => ({ date: x.date, id: x.id, doc: docNo("PAY", x.id), label: x.kind.replace("_", " ").toLowerCase(), amt: -Number(x.amount), cancelled: !!x.cancelledAt })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime() || a.doc.localeCompare(b.doc));

  let running = Number(p.openingBalance);
  const withBal = rows.map((r) => { if (!r.cancelled) running += r.amt; return { ...r, bal: running }; });
  const inPeriod = withBal.filter((r) => r.date >= range.gte && r.date <= range.lte);
  const inRange = inPeriod.slice((page - 1) * PAGE, page * PAGE);
  const broughtForward = withBal.filter((r) => r.date < range.gte && !r.cancelled).reduce((a, r) => a + r.amt, Number(p.openingBalance));

  // Open bills for the "pay this bill" choice
  const open: { id: number; label: string }[] = [];
  if (vend || cust) {
    for (const b of bills.filter((x) => !x.cancelledAt)) {
      const { due } = await db.$transaction((tx) => billDue(tx, vend ? "purchase" : "sale", b.id));
      if (due.gt(ZERO)) open.push({ id: b.id, label: `${docNo(vend ? "PUR" : "SAL", b.id)} · due ${inr(due)}` });
    }
  }

  return (
    <>
      <h1>{p.name}</h1>
      <p className="muted">{p.type === "WORKER" ? "labour" : p.type.toLowerCase()} {p.phone && `· ${p.phone}`}</p>
      {!p.type.startsWith("W") && <p>{cust ? "Owes us" : "We owe"}: <b>{inr(running)}</b></p>}

      {(vend || cust) && (
        <>
          <h2>{cust ? "Record customer receipt" : "Record vendor payment"}</h2>
          <ActionForm action={partyPaymentAction} label="Save" className="form inline">
            <input type="hidden" name="partyId" value={p.id} />
            <label>Amount (₹)<input name="amount" inputMode="decimal" required /></label>
            <label>Date<input name="date" type="date" defaultValue={todayISO()} required /></label>
            <label>For bill (optional)<select name="billId"><option value="">Just on account</option>{open.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
            <label>Note<input name="note" /></label>
          </ActionForm>
        </>
      )}

      <h2>Statement</h2>
      <DateFilter range={range} />
      <div className="table-wrap"><table>
        <thead><tr><th>Date</th><th>Document</th><th>Type</th><th className="r">Amount</th>{(vend || cust) && <th className="r">Balance</th>}</tr></thead>
        <tbody>
          {(vend || cust) && <tr><td></td><td>{range.gte.getTime() <= (withBal[0]?.date.getTime() ?? Infinity) ? "Opening balance" : "Balance brought forward"}</td><td></td><td></td><td className="r">{inr(broughtForward)}</td></tr>}
          {inRange.map((r) => (
            <tr key={r.doc} className={r.cancelled ? "cancelled" : ""}>
              <td>{dOnly(r.date)}</td><td>{r.doc}</td><td>{r.label}</td><td className="r">{inr(Math.abs(r.amt))}</td>{(vend || cust) && <td className="r">{r.cancelled ? "" : inr(r.bal)}</td>}
            </tr>))}
          {inRange.length === 0 && <tr><td colSpan={vend || cust ? 5 : 4} className="muted">No entries in this period.</td></tr>}
        </tbody></table></div>
      <Pager page={page} hasMore={inPeriod.length > page * PAGE} base={`/admin/party/${p.id}${qs({ from: range.from, to: range.to })}`} />
    </>
  );
}
