import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { DateFilter } from "@/components/DateFilter";
import { Pager } from "@/components/Pager";
import { PAGE, pageOf } from "@/server/queries";
import { dateRange, qs } from "@/lib/filters";
import { dt, inr, num } from "@/lib/fmt";

export default async function ItemLog({ params, searchParams }: { params: { id: string }; searchParams: { page?: string; from?: string; to?: string } }) {
  const item = await db.item.findUnique({ where: { id: params.id } });
  if (!item) notFound();
  const page = pageOf(searchParams);
  const range = dateRange(searchParams);
  const rows = await db.stockMovement.findMany({ where: { itemId: item.id, createdAt: { gte: range.tsGte, lte: range.tsLte } }, orderBy: { id: "desc" }, take: PAGE + 1, skip: (page - 1) * PAGE });
  const users = await db.user.findMany();
  const who = (id: string) => users.find((u) => u.id === id)?.name ?? "";
  return (
    <>
      <h1>{item.name}</h1>
      <p>On hand: <b>{num(item.qtyOnHand)} {item.unit}</b> · Average cost {inr(item.avgCost)} · Value {inr(item.qtyOnHand.mul(item.avgCost))}</p>
      <DateFilter range={range} />
      <div className="table-wrap"><table>
        <thead><tr><th>Time</th><th className="r">Change</th><th className="r">Before</th><th className="r">After</th><th className="r">Unit cost</th><th>Reason</th><th>Document</th><th>Note</th><th>User</th></tr></thead>
        <tbody>{rows.slice(0, PAGE).map((m) => (
          <tr key={m.id}><td>{dt(m.createdAt)}</td><td className="r">{m.qtyChange.gt(0) ? "+" : ""}{num(m.qtyChange)}</td>
            <td className="r">{num(m.qtyBefore)}</td><td className="r">{num(m.qtyAfter)}</td><td className="r">{inr(m.unitCost)}</td>
            <td>{m.reason}</td><td>{m.refType ? `${m.refType} ${m.refId ?? ""}` : ""}</td><td>{m.note}</td><td>{who(m.createdById)}</td></tr>))}
          {rows.length === 0 && <tr><td colSpan={9} className="muted">No movements in this period.</td></tr>}</tbody></table></div>
      <Pager page={page} hasMore={rows.length > PAGE} base={`/admin/stock/${item.id}${qs({ from: range.from, to: range.to })}`} />
    </>
  );
}
