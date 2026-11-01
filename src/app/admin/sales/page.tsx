import Link from "next/link";
import { db } from "@/server/db";
import { Pager } from "@/components/Pager";
import { CancelButton } from "@/components/CancelButton";
import { PAGE, pageOf } from "@/server/queries";
import { dOnly, docNo, inr } from "@/lib/fmt";
import { ZERO } from "@/lib/dec";

export default async function Sales({ searchParams }: { searchParams: { page?: string } }) {
  const page = pageOf(searchParams);
  const rows = await db.sale.findMany({
    orderBy: { id: "desc" }, take: PAGE + 1, skip: (page - 1) * PAGE,
    include: { customer: true, payments: { where: { cancelledAt: null } }, lines: { include: { item: true } } },
  });
  return (
    <>
      <h1>Sales</h1>
      <p><Link className="btn primary" href="/admin/sales/new">New sale</Link></p>
      <div className="table-wrap"><table>
        <thead><tr><th>No.</th><th>Date</th><th>Customer</th><th>Items</th><th className="r">Total</th><th className="r">Received</th><th className="r">Due</th><th className="r">Gross profit</th><th>Status</th><th></th></tr></thead>
        <tbody>{rows.slice(0, PAGE).map((s) => {
          const got = s.payments.reduce((a, x) => a.plus(x.amount), ZERO);
          const profit = s.lines.reduce((a, l) => a.plus(l.amount.minus(l.qty.mul(l.costAtSale))), ZERO);
          return (
            <tr key={s.id} className={s.cancelledAt ? "cancelled" : ""}>
              <td>{docNo("SAL", s.id)}</td><td>{dOnly(s.date)}</td><td>{s.customer.name}</td>
              <td>{s.lines.map((l) => `${l.item.name} ${l.qty}`).join(", ")}</td>
              <td className="r">{inr(s.total)}</td><td className="r">{inr(got)}</td><td className="r">{inr(s.total.minus(got))}</td><td className="r">{inr(profit)}</td>
              <td>{s.cancelledAt ? <span className="badge red" title={s.cancelReason ?? ""}>Cancelled</span> : <span className="badge green">Saved</span>}</td>
              <td>{!s.cancelledAt && <CancelButton kind="sale" id={s.id} />}</td>
            </tr>);
        })}</tbody></table></div>
      <Pager page={page} hasMore={rows.length > PAGE} base="/admin/sales" />
    </>
  );
}
