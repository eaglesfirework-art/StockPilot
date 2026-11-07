import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { getUser } from "@/server/auth";
import { moneyFlow, partyBalances } from "@/server/queries";
import { ZERO } from "@/lib/dec";
import { docNo } from "@/lib/fmt";
import { dateRange } from "@/lib/filters";

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (rows: unknown[][]) => rows.map((r) => r.map(esc).join(",")).join("\n");
const day = (d: Date) => d.toISOString().slice(0, 10);

export async function GET(req: NextRequest, { params }: { params: { name: string } }) {
  const u = await getUser();
  if (!u || u.role !== "ADMIN") return new Response("Not allowed", { status: 403 });
  const sp = req.nextUrl.searchParams;
  // Without dates, reports cover the last 7 days. Pick wider dates for older data.
  const { gte, lte } = dateRange({ from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined });
  const dateWhere = { date: { gte, lte } };
  let rows: unknown[][] = [];

  switch (params.name) {
    case "stock": {
      const items = await db.item.findMany({ orderBy: { name: "asc" } });
      rows = [["Item", "Unit", "Quantity", "Average cost", "Value", "Minimum", "Low"],
        ...items.map((i) => [i.name, i.unit, i.qtyOnHand, i.avgCost, i.qtyOnHand.mul(i.avgCost).toFixed(2), i.minStock, i.minStock.gt(0) && i.qtyOnHand.lt(i.minStock) ? "LOW" : ""])];
      break;
    }
    case "money-flow": {
      const f = await moneyFlow(gte, lte);
      rows = [["Day", "Money in", "Money out", "Net"], ...f.series.map((s) => [s.day, s.in, s.out, s.in - s.out]),
        ["TOTAL", f.in, f.out, f.net], ["Vendors", "", f.by.VENDOR_PAYMENT, ""], ["Labour", "", f.by.LABOUR, ""], ["Expenses", "", f.by.EXPENSE, ""]];
      break;
    }
    case "purchases": {
      const ps = await db.purchase.findMany({ where: { cancelledAt: null, ...dateWhere }, orderBy: { id: "asc" }, include: { vendor: true, payments: { where: { cancelledAt: null } } } });
      rows = [["Number", "Date", "Vendor", "Total", "Paid", "Due"], ...ps.map((p) => {
        const paid = p.payments.reduce((a, x) => a.plus(x.amount), ZERO);
        return [docNo("PUR", p.id), day(p.date), p.vendor.name, p.total, paid, p.total.minus(paid)];
      })];
      break;
    }
    case "sales": {
      const ss = await db.sale.findMany({ where: { cancelledAt: null, ...dateWhere }, orderBy: { id: "asc" }, include: { customer: true, lines: true, payments: { where: { cancelledAt: null } } } });
      rows = [["Number", "Date", "Customer", "Total", "Received", "Due", "Gross profit"], ...ss.map((s) => {
        const got = s.payments.reduce((a, x) => a.plus(x.amount), ZERO);
        const gp = s.lines.reduce((a, l) => a.plus(l.amount.minus(l.qty.mul(l.costAtSale))), ZERO);
        return [docNo("SAL", s.id), day(s.date), s.customer.name, s.total, got, s.total.minus(got), gp.toFixed(2)];
      })];
      break;
    }
    case "customer-dues":
    case "vendor-dues": {
      const b = await partyBalances(params.name === "customer-dues" ? "CUSTOMER" : "VENDOR");
      rows = [["Party", "Billed", "Paid", "Balance"], ...b.map((p) => [p.name, p.billed, p.paid, p.balance])];
      break;
    }
    case "labour": {
      const ps = await db.payment.findMany({ where: { kind: "LABOUR", cancelledAt: null, ...dateWhere }, orderBy: { id: "asc" }, include: { party: true } });
      rows = [["Date", "Labour", "Amount", "Batch", "Note"], ...ps.map((p) => [day(p.date), p.party?.name, p.amount, p.batchId ? docNo("BAT", p.batchId) : "", p.note])];
      break;
    }
    case "production": {
      const bs = await db.productionBatch.findMany({ where: { cancelledAt: null, ...dateWhere }, orderBy: { id: "asc" }, include: { product: true } });
      rows = [["Batch", "Product", "Date", "Material", "Labour", "Other", "Good units", "Cost per unit"],
        ...bs.map((b) => [docNo("BAT", b.id), b.product.name, day(b.date), b.materialCost, b.labourCost, b.otherCost, b.qtyProduced.minus(b.qtyRejected), b.costPerUnit])];
      break;
    }
    default:
      return new Response("Unknown report", { status: 404 });
  }
  return new Response("\uFEFF" + csv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${params.name}.csv"` },
  });
}
