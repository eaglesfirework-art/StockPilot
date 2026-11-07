import { db } from "@/server/db";
import { SaleForm } from "@/components/Forms";

export default async function NewSale() {
  const [customers, products, recent] = await Promise.all([
    db.party.findMany({ where: { type: "CUSTOMER", active: true }, orderBy: { name: "asc" } }),
    db.item.findMany({ where: { type: "FINISHED_GOOD", active: true }, orderBy: { name: "asc" } }),
    // There is no fixed selling price: show the rate each product was last sold at, as a hint only.
    db.saleLine.findMany({ where: { sale: { cancelledAt: null } }, orderBy: { id: "desc" }, distinct: ["itemId"], select: { itemId: true, rate: true } }),
  ]);
  const last = new Map(recent.map((r) => [r.itemId, r.rate.toString()]));
  return (
    <div style={{ maxWidth: 560 }}>
      <h1>New sale</h1>
      <SaleForm
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
        products={products.map((p) => ({ id: p.id, name: p.name, unit: p.unit, lastRate: last.get(p.id) ?? "", stock: p.qtyOnHand.toString() }))}
      />
    </div>
  );
}
