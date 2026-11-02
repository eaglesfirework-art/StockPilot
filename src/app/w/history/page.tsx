import Link from "next/link";
import { pageUser } from "@/server/auth";
import { db } from "@/server/db";
import { pageOf } from "@/server/queries";
import { docNo, dt, inr } from "@/lib/fmt";

const SIZE = 15;

export default async function History({ searchParams }: { searchParams: { page?: string } }) {
  const u = await pageUser();
  const page = pageOf(searchParams);
  const take = page * SIZE + 1; // enough from each source to fill this page after merging
  const [pur, bat, pay] = await Promise.all([
    db.purchase.findMany({ where: { createdById: u.id }, orderBy: { createdAt: "desc" }, take, include: { vendor: true } }),
    db.productionBatch.findMany({ where: { createdById: u.id }, orderBy: { createdAt: "desc" }, take, include: { product: true } }),
    db.payment.findMany({ where: { createdById: u.id, kind: "LABOUR", batchId: null }, orderBy: { createdAt: "desc" }, take, include: { party: true } }),
  ]);
  const all = [
    ...pur.map((p) => ({ t: p.createdAt, a: docNo("PUR", p.id), b: `${p.vendor.name} · ${inr(p.total)}`, c: !!p.cancelledAt })),
    ...bat.map((b) => ({ t: b.createdAt, a: docNo("BAT", b.id), b: `${b.product.name} · ${b.qtyProduced} made · ${inr(b.costPerUnit)} each`, c: !!b.cancelledAt })),
    ...pay.map((p) => ({ t: p.createdAt, a: docNo("PAY", p.id), b: `${p.party?.name} · ${inr(p.amount)}`, c: !!p.cancelledAt })),
  ].sort((x, y) => y.t.getTime() - x.t.getTime());
  const rows = all.slice((page - 1) * SIZE, page * SIZE);
  return (
    <>
      <h1>My entries</h1>
      {rows.map((r) => (
        <div className="card" key={r.a}><b>{r.a}</b> {r.c && <span className="badge red">Cancelled</span>}<div>{r.b}</div><div className="muted">{dt(r.t)}</div></div>
      ))}
      {rows.length === 0 && <p className="muted">{page > 1 ? "No more entries." : "Nothing yet."}</p>}
      <div className="pager">
        {page > 1 && <Link href={`/w/history?page=${page - 1}`}>← Newer</Link>}
        <span>Page {page}</span>
        {all.length > page * SIZE && <Link href={`/w/history?page=${page + 1}`}>Older →</Link>}
      </div>
    </>
  );
}
