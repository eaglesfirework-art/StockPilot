import Link from "next/link";
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
import { formatPhone } from "@/lib/phone";
import { buildStatement } from "@/lib/statement";
import { dOnly, docNo, inr, owed, todayISO } from "@/lib/fmt";

const lineSel = { select: { qty: true, rate: true, item: { select: { name: true, unit: true } } } } as const;

export default async function Statement({ params, searchParams }: { params: { id: string }; searchParams: { from?: string; to?: string; page?: string } }) {
  const p = await db.party.findUnique({ where: { id: params.id } });
  if (!p) notFound();
  const cust = p.type === "CUSTOMER", vend = p.type === "VENDOR", owes = cust || vend;
  const range = dateRange(searchParams, 90);
  const page = pageOf(searchParams);

  const rawBills = vend
    ? (await db.purchase.findMany({ where: { vendorId: p.id }, include: { lines: lineSel } })).map((b) => ({ ...b, refNo: b.refNo }))
    : cust ? (await db.sale.findMany({ where: { customerId: p.id }, include: { lines: lineSel } })).map((b) => ({ ...b, refNo: null as string | null })) : [];
  const pays = await db.payment.findMany({ where: { partyId: p.id }, include: { batch: { select: { product: { select: { name: true } } } } } });

  const st = buildStatement(p.type,
    rawBills.map((b) => ({
      id: b.id, date: b.date, total: Number(b.total), refNo: b.refNo, cancelled: !!b.cancelledAt, cancelReason: b.cancelReason,
      lines: b.lines.map((l) => ({ name: l.item.name, unit: l.item.unit, qty: Number(l.qty), rate: Number(l.rate) })),
    })),
    pays.map((x) => ({
      id: x.id, date: x.date, amount: Number(x.amount), note: x.note, billId: x.purchaseId ?? x.saleId ?? null,
      withBill: x.requestId.endsWith(":pay"), batchId: x.batchId, batchProduct: x.batch?.product.name ?? null, workFrom: x.workFrom, workTo: x.workTo,
      cancelled: !!x.cancelledAt, cancelReason: x.cancelReason,
    })),
  );

  // Only entries that add or remove money. Rows before the chosen period are folded into "brought forward".
  const dated = st.rows.filter((r) => r.date);
  const before = dated.filter((r) => r.date! < range.gte && r.balance !== null);
  const inPeriod = dated.filter((r) => r.date! >= range.gte && r.date! <= range.lte);
  const shown = inPeriod.slice((page - 1) * PAGE, page * PAGE);
  const startBal = before.length ? before[before.length - 1].balance! : 0;
  const totals = inPeriod.filter((r) => !r.cancelled).reduce((a, r) => ({ inc: a.inc + (r.increase ?? 0), dec: a.dec + (r.decrease ?? 0) }), { inc: 0, dec: 0 });

  // Customers can still settle a particular invoice. Vendor payments are always "on account" (the bill choice was removed).
  const open: { id: number; label: string }[] = [];
  if (cust)
    for (const b of rawBills.filter((x) => !x.cancelledAt)) {
      const { due } = await db.$transaction((tx) => billDue(tx, "sale", b.id));
      if (due.gt(ZERO)) open.push({ id: b.id, label: `${docNo("SAL", b.id)} · due ${inr(due)}` });
    }

  const kind = vend ? "Vendor" : cust ? "Customer" : "Labour";
  const back = vend ? "vendors" : cust ? "customers" : "labours";
  return (
    <>
      <nav className="crumbs"><Link href={`/admin/parties/${back}`}>{kind}s</Link><span aria-hidden>/</span><span>{p.name}</span></nav>
      <header className="page-head">
        <h1>{p.name}</h1>
        <p className="muted">{kind}{p.phone && ` · ${formatPhone(p.phone)}`}{!p.active && " · Inactive"}</p>
      </header>

      <div className="kpis">
        {owes && <div className="kpi"><div className="kpi-label">{cust ? "Owes us now" : "We owe now"}</div><div className="kpi-value" data-testid="closing-balance">{owed(st.closing)}</div></div>}
        <div className="kpi"><div className="kpi-label">{owes ? (vend ? "Bills in period" : "Invoices in period") : "Paid in period"}</div><div className="kpi-value">{inr(owes ? totals.inc : totals.dec)}</div></div>
        {owes && <div className="kpi"><div className="kpi-label">{vend ? "Paid in period" : "Received in period"}</div><div className="kpi-value">{inr(totals.dec)}</div></div>}
      </div>

      {owes && (
        <div className="pay-box">
          <section className="viz-card">
            <h3 className="viz-title">{cust ? "Record customer receipt" : "Record vendor payment"}</h3>
            <p className="viz-sub">{vend ? "Reduces what we owe this vendor." : "Reduces what this customer owes us."}</p>
            <ActionForm action={partyPaymentAction} label={cust ? "Save receipt" : "Save payment"} className="form inline">
              <input type="hidden" name="partyId" value={p.id} />
              <label>Amount (₹)<input name="amount" inputMode="decimal" required /></label>
              <label>Date<input name="date" type="date" defaultValue={todayISO()} required /></label>
              {cust && <label>Against invoice (optional)<select name="billId"><option value="">On account</option>{open.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>}
              <label>Note<input name="note" placeholder={vend ? "e.g. cash, UPI ref" : "e.g. cheque no."} /></label>
            </ActionForm>
          </section>
        </div>
      )}

      <h2>Statement</h2>
      <DateFilter range={range} />
      <div className="table-wrap"><table className="statement">
        <thead><tr><th>Date</th><th>Description</th><th>Voucher</th><th className="r">{vend ? "Billed" : cust ? "Invoiced" : ""}</th><th className="r">{vend ? "Paid" : cust ? "Received" : "Paid"}</th>{owes && <th className="r">Balance</th>}</tr></thead>
        <tbody>
          {owes && before.length > 0 && (
            <tr className="opening">
              <td>{dOnly(range.gte)}</td>
              <td><b>Balance brought forward</b><div className="sub">Bills minus payments before this period</div></td>
              <td></td><td></td><td></td><td className="r"><b>{owed(startBal)}</b></td>
            </tr>
          )}
          {shown.map((r) => (
            <tr key={r.key} className={r.cancelled ? "cancelled" : ""}>
              <td>{dOnly(r.date!)}</td>
              <td><b>{r.title}</b>{r.detail && <div className="sub">{r.detail}</div>}</td>
              <td className="muted">{r.voucher}</td>
              <td className="r">{r.increase !== null ? inr(r.increase) : ""}</td>
              <td className="r">{r.decrease !== null ? inr(r.decrease) : ""}</td>
              {owes && <td className="r">{r.cancelled ? <span className="badge red">Cancelled</span> : owed(r.balance!)}</td>}
            </tr>
          ))}
          {shown.length === 0 && <tr><td colSpan={owes ? 6 : 5} className="muted">No entries in this period.</td></tr>}
        </tbody>
      </table></div>
      <Pager page={page} hasMore={inPeriod.length > page * PAGE} base={`/admin/party/${p.id}${qs({ from: range.from, to: range.to })}`} />
      {owes && <p className="muted">Balance = {vend ? "bills" : "invoices"} − {vend ? "payments" : "receipts"}. Cancelled entries are shown struck through and do not count.</p>}
    </>
  );
}
