import Link from "next/link";
import { pageUser } from "@/server/auth";
import { db } from "@/server/db";
import { docNo, dt, inr } from "@/lib/fmt";
import { workPeriod } from "@/lib/statement";

export default async function WorkerHome() {
  const u = await pageUser();
  const [pur, bat, pay] = await Promise.all([
    db.purchase.findMany({ where: { createdById: u.id }, orderBy: { id: "desc" }, take: 3, include: { vendor: true } }),
    db.productionBatch.findMany({ where: { createdById: u.id }, orderBy: { id: "desc" }, take: 3, include: { product: true } }),
    db.payment.findMany({ where: { createdById: u.id, kind: "LABOUR", batchId: null }, orderBy: { id: "desc" }, take: 3, include: { party: true } }),
  ]);
  return (
    <>
      <div className="bigbtns">
        <Link href="/w/receive">Receive materials</Link>
        <Link href="/w/production">Production</Link>
        <Link href="/w/labour">Labour payment</Link>
      </div>
      <h3>My recent entries</h3>
      {[...pur.map((p) => ({ t: p.createdAt, s: `${docNo("PUR", p.id)} · ${p.vendor.name} · ${inr(p.total)}`, c: !!p.cancelledAt })),
        ...bat.map((b) => ({ t: b.createdAt, s: `${docNo("BAT", b.id)} · ${b.product.name} · ${b.qtyProduced} made`, c: !!b.cancelledAt })),
        ...pay.map((p) => ({ t: p.createdAt, s: `Labour payment to ${p.party?.name} · ${inr(p.amount)} · ${workPeriod(p)}${p.note ? ` · ${p.note}` : ""}`, c: !!p.cancelledAt }))]
        .sort((a, b) => b.t.getTime() - a.t.getTime()).map((r, i) => (
          <div className="card" key={i}><span style={r.c ? { textDecoration: "line-through" } : undefined}>{r.s}</span>
            <div className="muted">{dt(r.t)}{r.c && " · Cancelled"}</div></div>
        ))}
      <p><Link href="/w/history">See all my entries</Link></p>
    </>
  );
}
