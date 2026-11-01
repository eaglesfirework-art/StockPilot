import { db } from "@/server/db";
import { SaleForm } from "@/components/Forms";

export default async function NewSale() {
  const [customers, products] = await Promise.all([
    db.party.findMany({ where: { type: "CUSTOMER", active: true }, orderBy: { name: "asc" } }),
    db.item.findMany({ where: { type: "FINISHED_GOOD", active: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <div style={{ maxWidth: 560 }}>
      <h1>New sale</h1>
      <SaleForm
        customers={customers.map((c) => ({ id: c.id, name: c.name }))}
        products={products.map((p) => ({ id: p.id, name: p.name, unit: p.unit, price: p.sellingPrice?.toString() ?? "", stock: p.qtyOnHand.toString() }))}
      />
    </div>
  );
}
