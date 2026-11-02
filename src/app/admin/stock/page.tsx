import Link from "next/link";
import { db } from "@/server/db";
import { ActionForm } from "@/components/ActionForm";
import { FilterBar } from "@/components/DateFilter";
import { Pager } from "@/components/Pager";
import { adjustAction } from "@/server/actions";
import { LIST_PAGE, pageOf } from "@/server/queries";
import { qs } from "@/lib/filters";
import { inr, num } from "@/lib/fmt";

type SP = { q?: string; type?: string; low?: string; page?: string };

export default async function Stock({ searchParams: sp }: { searchParams: SP }) {
  const all = await db.item.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] });
  const q = sp.q?.trim().toLowerCase() ?? "";
  const type = sp.type === "RAW_MATERIAL" || sp.type === "FINISHED_GOOD" ? sp.type : "";
  const page = pageOf(sp);
  const matches = all.filter((i) =>
    (!q || i.name.toLowerCase().includes(q)) && (!type || i.type === type) &&
    (sp.low !== "1" || (i.minStock.gt(0) && i.qtyOnHand.lt(i.minStock))));
  const items = matches.slice((page - 1) * LIST_PAGE, page * LIST_PAGE);
  return (
    <>
      <h1>Stock</h1>
      <FilterBar clear="/admin/stock">
        <label>Search<input name="q" defaultValue={sp.q ?? ""} placeholder="Item name" /></label>
        <label>Type<select name="type" defaultValue={type}><option value="">All</option><option value="RAW_MATERIAL">Raw materials</option><option value="FINISHED_GOOD">Products</option></select></label>
        <label className="check-label"><span><input type="checkbox" name="low" value="1" defaultChecked={sp.low === "1"} />Low stock only</span></label>
      </FilterBar>
      <div className="table-wrap"><table className="collapsible">
        <thead><tr><th>Item</th><th>Type</th><th className="r">Quantity</th><th className="r">Average cost</th><th className="r">Value</th><th className="r">Minimum</th><th></th><th>Stock log</th></tr></thead>
        <tbody>{items.map((i) => (
          <tr key={i.id} className={i.active ? "" : "cancelled"}>
            <td><Link href={`/admin/stock/${i.id}`}>{i.name}</Link></td>
            <td>{i.type === "RAW_MATERIAL" ? "Raw material" : "Product"}</td>
            <td className="r">{num(i.qtyOnHand)} {i.unit}</td><td className="r">{inr(i.avgCost)}</td>
            <td className="r">{inr(i.qtyOnHand.mul(i.avgCost))}</td><td className="r">{num(i.minStock)} {i.unit}</td>
            <td>{i.minStock.gt(0) && i.qtyOnHand.lt(i.minStock) && <span className="badge amber">Low</span>}</td>
            <td><Link href={`/admin/stock/${i.id}`}>View log</Link></td>
          </tr>))}
          {items.length === 0 && <tr><td colSpan={8} className="muted">No items match these filters.</td></tr>}</tbody></table></div>
      <Pager page={page} hasMore={matches.length > page * LIST_PAGE} base={`/admin/stock${qs({ q: sp.q, type, low: sp.low === "1" ? "1" : "" })}`} />

      <h2>Adjust stock</h2>
      <p className="muted">For opening stock, damage or a count error. Enter the cost per unit when adding stock. A reason is required and is saved in the log.</p>
      <ActionForm action={adjustAction} label="Adjust" className="form inline">
        <label>Item<select name="itemId" required><option value="">Choose…</option>{all.filter((i) => i.active).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
        <label>Kind<select name="kind"><option value="ADJUSTMENT">Adjustment</option><option value="OPENING">Opening stock</option></select></label>
        <label>Change (+ or −)<input name="change" inputMode="decimal" placeholder="e.g. 100 or -5" required /></label>
        <label>Cost per unit (₹)<input name="unitCost" inputMode="decimal" /></label>
        <label>Reason<input name="reason" required /></label>
      </ActionForm>
    </>
  );
}
