import { db } from "@/server/db";
import { Pager } from "@/components/Pager";
import { CancelButton } from "@/components/CancelButton";
import { PAGE, pageOf } from "@/server/queries";
import { dOnly, docNo, inr } from "@/lib/fmt";

export default async function Payments({ searchParams }: { searchParams: { page?: string } }) {
  const page = pageOf(searchParams);
  const rows = await db.payment.findMany({ orderBy: { id: "desc" }, take: PAGE + 1, skip: (page - 1) * PAGE, include: { party: true } });
  const label = { CUSTOMER_RECEIPT: "Customer receipt (in)", VENDOR_PAYMENT: "Vendor payment", LABOUR: "Labour", EXPENSE: "Expense" } as const;
  return (
    <>
      <h1>Payments</h1>
      <div className="table-wrap"><table>
        <thead><tr><th>No.</th><th>Date</th><th>Type</th><th>Party</th><th className="r">Amount</th><th>For</th><th>Note</th><th>Status</th><th></th></tr></thead>
        <tbody>{rows.slice(0, PAGE).map((p) => (
          <tr key={p.id} className={p.cancelledAt ? "cancelled" : ""}>
            <td>{docNo("PAY", p.id)}</td><td>{dOnly(p.date)}</td><td>{label[p.kind]}</td><td>{p.party?.name}</td><td className="r">{inr(p.amount)}</td>
            <td>{p.purchaseId ? docNo("PUR", p.purchaseId) : p.saleId ? docNo("SAL", p.saleId) : p.batchId ? docNo("BAT", p.batchId) : ""}</td><td>{p.note}</td>
            <td>{p.cancelledAt ? <span className="badge red" title={p.cancelReason ?? ""}>Cancelled</span> : <span className="badge green">Saved</span>}</td>
            <td>{!p.cancelledAt && <CancelButton kind="payment" id={p.id} />}</td>
          </tr>))}</tbody></table></div>
      <Pager page={page} hasMore={rows.length > PAGE} base="/admin/payments" />
    </>
  );
}
