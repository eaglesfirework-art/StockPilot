import { db } from "@/server/db";
import { Pager } from "@/components/Pager";
import { CancelButton } from "@/components/CancelButton";
import { PAGE, pageOf } from "@/server/queries";
import { dOnly, docNo, inr, num } from "@/lib/fmt";

export default async function ProductionList({ searchParams }: { searchParams: { page?: string } }) {
  const page = pageOf(searchParams);
  const rows = await db.productionBatch.findMany({ orderBy: { id: "desc" }, take: PAGE + 1, skip: (page - 1) * PAGE, include: { product: true } });
  return (
    <>
      <h1>Production</h1>
      <div className="table-wrap"><table>
        <thead><tr><th>No.</th><th>Date</th><th>Product</th><th className="r">Produced</th><th className="r">Rejected</th><th className="r">Material</th><th className="r">Labour</th><th className="r">Other</th><th className="r">Cost / unit</th><th>Status</th><th></th></tr></thead>
        <tbody>{rows.slice(0, PAGE).map((b) => (
          <tr key={b.id} className={b.cancelledAt ? "cancelled" : ""}>
            <td>{docNo("BAT", b.id)}</td><td>{dOnly(b.date)}</td><td>{b.product.name}</td>
            <td className="r">{num(b.qtyProduced)}</td><td className="r">{num(b.qtyRejected)}</td>
            <td className="r">{inr(b.materialCost)}</td><td className="r">{inr(b.labourCost)}</td><td className="r">{inr(b.otherCost)}</td><td className="r"><b>{inr(b.costPerUnit)}</b></td>
            <td>{b.cancelledAt ? <span className="badge red" title={b.cancelReason ?? ""}>Cancelled</span> : <span className="badge green">Saved</span>}</td>
            <td>{!b.cancelledAt && <CancelButton kind="batch" id={b.id} />}</td>
          </tr>))}</tbody></table></div>
      <Pager page={page} hasMore={rows.length > PAGE} base="/admin/production" />
    </>
  );
}
