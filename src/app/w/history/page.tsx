import { pageUser } from "@/server/auth";
import { db } from "@/server/db";
import { docNo, dt, inr } from "@/lib/fmt";

export default async function History() {
  const u = await pageUser();
  const [pur, bat, pay] = await Promise.all([
    db.purchase.findMany({ where: { createdById: u.id }, orderBy: { id: "desc" }, take: 30, include: { vendor: true } }),
    db.productionBatch.findMany({ where: { createdById: u.id }, orderBy: { id: "desc" }, take: 30, include: { product: true } }),
    db.payment.findMany({ where: { createdById: u.id, kind: "LABOUR", batchId: null }, orderBy: { id: "desc" }, take: 30, include: { party: true } }),
  ]);
  const rows = [
    ...pur.map((p) => ({ t: p.createdAt, a: docNo("PUR", p.id), b: `${p.vendor.name} · ${inr(p.total)}`, c: !!p.cancelledAt })),
    ...bat.map((b) => ({ t: b.createdAt, a: docNo("BAT", b.id), b: `${b.product.name} · ${b.qtyProduced} made · ${inr(b.costPerUnit)} each`, c: !!b.cancelledAt })),
    ...pay.map((p) => ({ t: p.createdAt, a: docNo("PAY", p.id), b: `${p.party?.name} · ${inr(p.amount)}`, c: !!p.cancelledAt })),
  ].sort((x, y) => y.t.getTime() - x.t.getTime());
  return (
    <>
      <h1>My entries</h1>
      {rows.map((r, i) => (
        <div className="card" key={i}><b>{r.a}</b> {r.c && <span className="badge red">Cancelled</span>}<div>{r.b}</div><div className="muted">{dt(r.t)}</div></div>
      ))}
      {rows.length === 0 && <p className="muted">Nothing yet.</p>}
    </>
  );
}
