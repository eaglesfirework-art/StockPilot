import { db } from "@/server/db";
import { Pager } from "@/components/Pager";
import { CancelButton } from "@/components/CancelButton";
import { PAGE, pageOf } from "@/server/queries";
import { dOnly, docNo, inr } from "@/lib/fmt";
import { ZERO } from "@/lib/dec";

export default async function Purchases({ searchParams }: { searchParams: { page?: string } }) {
  const page = pageOf(searchParams);
  const rows = await db.purchase.findMany({
    orderBy: { id: "desc" }, take: PAGE + 1, skip: (page - 1) * PAGE,
    include: { vendor: true, payments: { where: { cancelledAt: null } }, lines: { include: { item: true } } },
  });
  return (
    <>
      <h1>Purchases</h1>
      <div className="table-wrap"><table>
        <thead><tr><th>No.</th><th>Date</th><th>Vendor</th><th>Items</th><th className="r">Total</th><th className="r">Paid</th><th className="r">Due</th><th>Status</th><th></th></tr></thead>
        <tbody>{rows.slice(0, PAGE).map((p) => {
          const paid = p.payments.reduce((a, x) => a.plus(x.amount), ZERO);
          return (
            <tr key={p.id} className={p.cancelledAt ? "cancelled" : ""}>
              <td>{docNo("PUR", p.id)}</td><td>{dOnly(p.date)}</td><td>{p.vendor.name}</td>
              <td>{p.lines.map((l) => `${l.item.name} ${l.qty}`).join(", ")}</td>
              <td className="r">{inr(p.total)}</td><td className="r">{inr(paid)}</td><td className="r">{inr(p.total.minus(paid))}</td>
              <td>{p.cancelledAt ? <span className="badge red" title={p.cancelReason ?? ""}>Cancelled</span> : <span className="badge green">Saved</span>}</td>
              <td>{!p.cancelledAt && <CancelButton kind="purchase" id={p.id} />}</td>
            </tr>);
        })}</tbody></table></div>
      <Pager page={page} hasMore={rows.length > PAGE} base="/admin/purchases" />
    </>
  );
}
