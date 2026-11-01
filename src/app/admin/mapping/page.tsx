import { db } from "@/server/db";
import { ActionForm } from "@/components/ActionForm";
import { mappingAction } from "@/server/actions";

export default async function Mapping() {
  const [products, materials, maps] = await Promise.all([
    db.item.findMany({ where: { type: "FINISHED_GOOD", active: true }, orderBy: { name: "asc" } }),
    db.item.findMany({ where: { type: "RAW_MATERIAL", active: true }, orderBy: { name: "asc" } }),
    db.productMaterial.findMany(),
  ]);
  return (
    <>
      <h1>Product mapping</h1>
      <p className="muted">Tick the raw materials each product is made from. No quantities here: workers type the quantity used in every batch.</p>
      {products.length === 0 && <p>Add a finished product first (Items).</p>}
      {products.map((p) => {
        const on = new Set(maps.filter((m) => m.productId === p.id).map((m) => m.materialId));
        return (
          <div className="card" key={p.id}>
            <ActionForm action={mappingAction} label="Save mapping" resetOnOk={false}>
              <input type="hidden" name="productId" value={p.id} />
              <h3 style={{ marginTop: 0 }}>{p.name}</h3>
              {materials.map((m) => (
                <label key={m.id} style={{ color: "var(--ink)" }}><input type="checkbox" name="m" value={m.id} defaultChecked={on.has(m.id)} />{m.name} ({m.unit})</label>
              ))}
              {materials.length === 0 && <p className="muted">No raw materials yet.</p>}
            </ActionForm>
          </div>
        );
      })}
    </>
  );
}
