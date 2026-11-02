import Link from "next/link";
import { db } from "@/server/db";
import { Pager } from "@/components/Pager";
import { DocActions } from "@/components/DocActions";
import { PAGE } from "@/server/queries";
import { qs, type Range } from "@/lib/filters";
import { dOnly, docNo, inr, num } from "@/lib/fmt";
import { ZERO } from "@/lib/dec";

export type Filters = { range: Range; status: "saved" | "cancelled" | ""; q: string; page: number };
type Props = { f: Filters };

const status = (cancelledAt: Date | null, reason: string | null) =>
  cancelledAt ? <span className="badge red" title={reason ?? ""}>Cancelled</span> : <span className="badge green">Saved</span>;
const paging = (f: Filters) => ({ take: PAGE + 1, skip: (f.page - 1) * PAGE });
const dateWhere = (f: Filters) => ({ date: { gte: f.range.gte, lte: f.range.lte } });
const statusWhere = (f: Filters) => (f.status === "saved" ? { cancelledAt: null } : f.status === "cancelled" ? { cancelledAt: { not: null } } : {});
const ci = (q: string) => ({ contains: q, mode: "insensitive" as const });
const base = (tab: string, f: Filters) => `/admin/transactions${qs({ tab, from: f.range.from, to: f.range.to, status: f.status, q: f.q })}`;
const empty = (cols: number) => <tr><td colSpan={cols} className="muted">Nothing in this period with these filters.</td></tr>;

export async function PurchasesList({ f }: Props) {
  const rows = await db.purchase.findMany({
    where: {
      ...dateWhere(f), ...statusWhere(f),
      ...(f.q && { OR: [{ vendor: { name: ci(f.q) } }, { note: ci(f.q) }, { lines: { some: { item: { name: ci(f.q) } } } }] }),
    },
    orderBy: { id: "desc" }, ...paging(f),
    include: { vendor: true, payments: { where: { cancelledAt: null } }, lines: { include: { item: true } } },
  });
  return (
    <>
      <div className="table-wrap"><table className="collapsible">
        <thead><tr><th>No.</th><th>Date</th><th>Vendor</th><th>Items</th><th className="r">Total</th><th className="r">Paid</th><th className="r">Due</th><th>Note</th><th>Status</th><th></th></tr></thead>
        <tbody>{rows.slice(0, PAGE).map((p) => {
          const paid = p.payments.reduce((a, x) => a.plus(x.amount), ZERO);
          return (
            <tr key={p.id} className={p.cancelledAt ? "cancelled" : ""}>
              <td>{docNo("PUR", p.id)}</td><td>{dOnly(p.date)}</td><td className="keep">{p.vendor.name}</td>
              <td>{p.lines.map((l) => `${l.item.name} ${l.qty}`).join(", ")}</td>
              <td className="r">{inr(p.total)}</td><td className="r">{inr(paid)}</td><td className="r">{inr(p.total.minus(paid))}</td>
              <td>{p.note}</td>
              <td>{status(p.cancelledAt, p.cancelReason)}</td>
              <td>{!p.cancelledAt && <DocActions kind="purchase" id={p.id} label={docNo("PUR", p.id)} note={p.note ?? ""} />}</td>
            </tr>);
        })}{rows.length === 0 && empty(10)}</tbody></table></div>
      <Pager page={f.page} hasMore={rows.length > PAGE} base={base("purchases", f)} />
    </>
  );
}

export async function SalesList({ f }: Props) {
  const rows = await db.sale.findMany({
    where: {
      ...dateWhere(f), ...statusWhere(f),
      ...(f.q && { OR: [{ customer: { name: ci(f.q) } }, { note: ci(f.q) }, { lines: { some: { item: { name: ci(f.q) } } } }] }),
    },
    orderBy: { id: "desc" }, ...paging(f),
    include: { customer: true, payments: { where: { cancelledAt: null } }, lines: { include: { item: true } } },
  });
  return (
    <>
      <p><Link className="btn primary" href="/admin/sales/new">New sale</Link></p>
      <div className="table-wrap"><table className="collapsible">
        <thead><tr><th>No.</th><th>Date</th><th>Customer</th><th>Items</th><th className="r">Total</th><th className="r">Received</th><th className="r">Due</th><th className="r">Gross profit</th><th>Note</th><th>Status</th><th></th></tr></thead>
        <tbody>{rows.slice(0, PAGE).map((s) => {
          const got = s.payments.reduce((a, x) => a.plus(x.amount), ZERO);
          const profit = s.lines.reduce((a, l) => a.plus(l.amount.minus(l.qty.mul(l.costAtSale))), ZERO);
          return (
            <tr key={s.id} className={s.cancelledAt ? "cancelled" : ""}>
              <td>{docNo("SAL", s.id)}</td><td>{dOnly(s.date)}</td><td className="keep">{s.customer.name}</td>
              <td>{s.lines.map((l) => `${l.item.name} ${l.qty}`).join(", ")}</td>
              <td className="r">{inr(s.total)}</td><td className="r">{inr(got)}</td><td className="r">{inr(s.total.minus(got))}</td><td className="r">{inr(profit)}</td>
              <td>{s.note}</td>
              <td>{status(s.cancelledAt, s.cancelReason)}</td>
              <td>{!s.cancelledAt && <DocActions kind="sale" id={s.id} label={docNo("SAL", s.id)} note={s.note ?? ""} />}</td>
            </tr>);
        })}{rows.length === 0 && empty(11)}</tbody></table></div>
      <Pager page={f.page} hasMore={rows.length > PAGE} base={base("sales", f)} />
    </>
  );
}

export async function ProductionList({ f }: Props) {
  const rows = await db.productionBatch.findMany({
    where: { ...dateWhere(f), ...statusWhere(f), ...(f.q && { OR: [{ product: { name: ci(f.q) } }, { note: ci(f.q) }] }) },
    orderBy: { id: "desc" }, ...paging(f), include: { product: true },
  });
  return (
    <>
      <div className="table-wrap"><table className="collapsible">
        <thead><tr><th>No.</th><th>Date</th><th>Product</th><th className="r">Produced</th><th className="r">Rejected</th><th className="r">Material</th><th className="r">Labour</th><th className="r">Other</th><th className="r">Cost / unit</th><th>Note</th><th>Status</th><th></th></tr></thead>
        <tbody>{rows.slice(0, PAGE).map((b) => (
          <tr key={b.id} className={b.cancelledAt ? "cancelled" : ""}>
            <td>{docNo("BAT", b.id)}</td><td>{dOnly(b.date)}</td><td className="keep">{b.product.name}</td>
            <td className="r">{num(b.qtyProduced)}</td><td className="r">{num(b.qtyRejected)}</td>
            <td className="r">{inr(b.materialCost)}</td><td className="r">{inr(b.labourCost)}</td><td className="r">{inr(b.otherCost)}</td><td className="r"><b>{inr(b.costPerUnit)}</b></td>
            <td>{b.note}</td>
            <td>{status(b.cancelledAt, b.cancelReason)}</td>
            <td>{!b.cancelledAt && <DocActions kind="batch" id={b.id} label={docNo("BAT", b.id)} note={b.note ?? ""} />}</td>
          </tr>))}{rows.length === 0 && empty(12)}</tbody></table></div>
      <Pager page={f.page} hasMore={rows.length > PAGE} base={base("production", f)} />
    </>
  );
}

const PAYMENT_LABEL = { CUSTOMER_RECEIPT: "Customer receipt (in)", VENDOR_PAYMENT: "Vendor payment", LABOUR: "Labour", EXPENSE: "Expense" } as const;

export async function PaymentsList({ f }: Props) {
  const rows = await db.payment.findMany({
    where: { ...dateWhere(f), ...statusWhere(f), ...(f.q && { OR: [{ party: { name: ci(f.q) } }, { note: ci(f.q) }] }) },
    orderBy: { id: "desc" }, ...paging(f), include: { party: true },
  });
  return (
    <>
      <div className="table-wrap"><table className="collapsible">
        <thead><tr><th>No.</th><th>Date</th><th>Type</th><th>Party</th><th className="r">Amount</th><th>For</th><th>Note</th><th>Status</th><th></th></tr></thead>
        <tbody>{rows.slice(0, PAGE).map((p) => (
          <tr key={p.id} className={p.cancelledAt ? "cancelled" : ""}>
            <td>{docNo("PAY", p.id)}</td><td>{dOnly(p.date)}</td><td>{PAYMENT_LABEL[p.kind]}</td><td className="keep">{p.party?.name}</td><td className="r">{inr(p.amount)}</td>
            <td>{p.purchaseId ? docNo("PUR", p.purchaseId) : p.saleId ? docNo("SAL", p.saleId) : p.batchId ? docNo("BAT", p.batchId) : ""}</td>
            <td>{p.note}</td>
            <td>{status(p.cancelledAt, p.cancelReason)}</td>
            <td>{!p.cancelledAt && <DocActions kind="payment" id={p.id} label={docNo("PAY", p.id)} note={p.note ?? ""} />}</td>
          </tr>))}{rows.length === 0 && empty(9)}</tbody></table></div>
      <Pager page={f.page} hasMore={rows.length > PAGE} base={base("payments", f)} />
    </>
  );
}
