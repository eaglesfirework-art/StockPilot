import { pageUser } from "@/server/auth";
import { db } from "@/server/db";
import { ProductionForm } from "@/components/Forms";

export default async function Production() {
  await pageUser();
  const [products, maps, workers] = await Promise.all([
    db.item.findMany({ where: { type: "FINISHED_GOOD", active: true }, orderBy: { name: "asc" } }),
    db.productMaterial.findMany({ include: { material: true }, orderBy: { id: "asc" } }),
    db.party.findMany({ where: { type: "WORKER", active: true }, orderBy: { name: "asc" } }),
  ]);
  const mapping: Record<string, { id: string; name: string; unit: string; cost: string; stock: string }[]> = {};
  for (const m of maps) if (m.material.active) (mapping[m.productId] ??= []).push({ id: m.material.id, name: m.material.name, unit: m.material.unit, cost: m.material.avgCost.toString(), stock: m.material.qtyOnHand.toString() });
  return (
    <>
      <h1>Production</h1>
      <ProductionForm
        products={products.map((p) => ({ id: p.id, name: p.name, unit: p.unit }))}
        mapping={mapping} workers={workers.map((w) => ({ id: w.id, name: w.name }))}
      />
    </>
  );
}
