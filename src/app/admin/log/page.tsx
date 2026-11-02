import Link from "next/link";
import { db } from "@/server/db";
import { DateFilter } from "@/components/DateFilter";
import { Pager } from "@/components/Pager";
import { PAGE, pageOf } from "@/server/queries";
import { dateRange, qs } from "@/lib/filters";
import { dt, inr, num } from "@/lib/fmt";

type SP = { tab?: string; page?: string; from?: string; to?: string; item?: string; user?: string };

export default async function LogPage({ searchParams: sp }: { searchParams: SP }) {
  const tab = sp.tab === "audit" ? "audit" : "stock";
  const page = pageOf(sp);
  const range = dateRange(sp);
  const createdAt = { gte: range.tsGte, lte: range.tsLte };
  const [users, items] = await Promise.all([db.user.findMany(), db.item.findMany({ orderBy: { name: "asc" } })]);
  const who = (id: string | null) => users.find((u) => u.id === id)?.name ?? "";
  const base = `/admin/log${qs({ tab, from: range.from, to: range.to, item: sp.item, user: sp.user })}`;

  const stock = tab === "stock" ? await db.stockMovement.findMany({
    where: { ...(sp.item ? { itemId: sp.item } : {}), ...(sp.user ? { createdById: sp.user } : {}), createdAt },
    orderBy: { id: "desc" }, take: PAGE + 1, skip: (page - 1) * PAGE, include: { item: true },
  }) : [];
  const aud = tab === "audit" ? await db.auditLog.findMany({
    where: { ...(sp.user ? { userId: sp.user } : {}), createdAt },
    orderBy: { id: "desc" }, take: PAGE + 1, skip: (page - 1) * PAGE,
  }) : [];
  const tabHref = (t: string) => `/admin/log${qs({ tab: t, from: sp.from, to: sp.to, user: sp.user })}`;

  return (
    <>
      <h1>Log</h1>
      <div className="tabs"><Link href={tabHref("stock")} className={tab === "stock" ? "on" : ""}>Stock log</Link><Link href={tabHref("audit")} className={tab === "audit" ? "on" : ""}>Audit log</Link></div>
      <DateFilter range={range} hidden={{ tab }}>
        {tab === "stock" && <label>Item<select name="item" defaultValue={sp.item ?? ""}><option value="">All</option>{items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></label>}
        <label>User<select name="user" defaultValue={sp.user ?? ""}><option value="">All</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
      </DateFilter>
      <p className="muted">Log rows cannot be edited or deleted in the app.</p>

      {tab === "stock" ? (
        <div className="table-wrap"><table>
          <thead><tr><th>Time</th><th>Item</th><th className="r">Change</th><th className="r">Before</th><th className="r">After</th><th className="r">Unit cost</th><th>Reason</th><th>Document</th><th>User</th></tr></thead>
          <tbody>{stock.slice(0, PAGE).map((m) => (
            <tr key={m.id}><td>{dt(m.createdAt)}</td><td>{m.item.name}</td><td className="r">{m.qtyChange.gt(0) ? "+" : ""}{num(m.qtyChange)}</td>
              <td className="r">{num(m.qtyBefore)}</td><td className="r">{num(m.qtyAfter)}</td><td className="r">{inr(m.unitCost)}</td>
              <td>{m.reason}</td><td>{m.refType ? `${m.refType} ${m.refId ?? ""}` : ""}</td><td>{who(m.createdById)}</td></tr>))}
            {stock.length === 0 && <tr><td colSpan={9} className="muted">No stock movements in this period.</td></tr>}</tbody></table></div>
      ) : (
        <div className="table-wrap"><table>
          <thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead>
          <tbody>{aud.slice(0, PAGE).map((a) => (
            <tr key={a.id}><td>{dt(a.createdAt)}</td><td>{who(a.userId)}</td><td>{a.action}</td><td>{a.entity} {a.entityId ?? ""}</td>
              <td style={{ whiteSpace: "normal" }}>{a.detail ? JSON.stringify(a.detail) : ""}</td></tr>))}
            {aud.length === 0 && <tr><td colSpan={5} className="muted">No audit entries in this period.</td></tr>}</tbody></table></div>
      )}
      <Pager page={page} hasMore={(tab === "stock" ? stock.length : aud.length) > PAGE} base={base} />
    </>
  );
}
