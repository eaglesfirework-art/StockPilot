import { db } from "@/server/db";
import { ActionForm } from "@/components/ActionForm";
import { itemAction, itemUpdateAction } from "@/server/actions";

export default async function Items() {
  const items = await db.item.findMany({ orderBy: [{ type: "asc" }, { name: "asc" }] });
  return (
    <>
      <h1>Items</h1>
      <h2>Add raw material or finished product</h2>
      <ActionForm action={itemAction} label="Add item" className="form inline">
        <label>Name<input name="name" required /></label>
        <label>Type<select name="type"><option value="RAW_MATERIAL">Raw material</option><option value="FINISHED_GOOD">Finished product</option></select></label>
        <label>Unit (kg, piece…)<input name="unit" required /></label>
        <label>Minimum stock<input name="minStock" inputMode="decimal" /></label>
        <label>Selling price (₹, products)<input name="sellingPrice" inputMode="decimal" /></label>
      </ActionForm>
      <p className="muted">Stock quantity is never typed here. Use Receive materials, Production, or Stock → Adjust.</p>

      <h2>All items</h2>
      {items.map((i) => (
        <div className="card" key={i.id}>
          <ActionForm action={itemUpdateAction} label="Save" className="form inline" resetOnOk={false}>
            <input type="hidden" name="id" value={i.id} />
            <div style={{ flex: "1 1 200px" }}><b>{i.name}</b><div className="muted">{i.type === "RAW_MATERIAL" ? "Raw material" : "Finished product"} · {i.unit}</div></div>
            <label>Minimum<input name="minStock" inputMode="decimal" defaultValue={i.minStock.toString()} /></label>
            <label>Selling price<input name="sellingPrice" inputMode="decimal" defaultValue={i.sellingPrice?.toString() ?? ""} /></label>
            <label style={{ flex: "0 0 auto" }}><input type="checkbox" name="active" defaultChecked={i.active} />Active</label>
          </ActionForm>
        </div>
      ))}
    </>
  );
}
