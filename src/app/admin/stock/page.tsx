import Link from "next/link";
import { db } from "@/server/db";
import { ActionForm } from "@/components/ActionForm";
import { adjustAction } from "@/server/actions";
import { inr, num } from "@/lib/fmt";

export default async function Stock() {
  const items = await db.item.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] });
  return (
    <>
      <h1>Stock</h1>
      <div className="table-wrap"><table>
        <thead><tr><th>Item</th><th>Type</th><th className="r">Quantity</th><th className="r">Average cost</th><th className="r">Value</th><th className="r">Minimum</th><th></th></tr></thead>
        <tbody>{items.map((i) => (
          <tr key={i.id} className={i.active ? "" : "cancelled"}>
            <td><Link href={`/admin/stock/${i.id}`}>{i.name}</Link></td>
            <td>{i.type === "RAW_MATERIAL" ? "Raw material" : "Finished"}</td>
            <td className="r">{num(i.qtyOnHand)} {i.unit}</td><td className="r">{inr(i.avgCost)}</td>
            <td className="r">{inr(i.qtyOnHand.mul(i.avgCost))}</td><td className="r">{num(i.minStock)}</td>
            <td>{i.minStock.gt(0) && i.qtyOnHand.lt(i.minStock) && <span className="badge amber">Low</span>}</td>
          </tr>))}</tbody></table></div>

      <h2>Adjust stock</h2>
      <p className="muted">For opening stock, damage or a count error. A reason is required and is saved in the log.</p>
      <ActionForm action={adjustAction} label="Adjust" className="form inline">
        <label>Item<select name="itemId" required><option value="">Choose…</option>{items.filter((i) => i.active).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></label>
        <label>Kind<select name="kind"><option value="ADJUSTMENT">Adjustment</option><option value="OPENING">Opening stock</option></select></label>
        <label>Change (+ or −)<input name="change" inputMode="decimal" placeholder="e.g. 100 or -5" required /></label>
        <label>Cost per unit (for stock added)<input name="unitCost" inputMode="decimal" /></label>
        <label>Reason<input name="reason" required /></label>
      </ActionForm>
    </>
  );
}
