import { pageUser } from "@/server/auth";
import { db } from "@/server/db";
import { ReceiveForm } from "@/components/Forms";

export default async function Receive() {
  await pageUser();
  const [vendors, items] = await Promise.all([
    db.party.findMany({ where: { type: "VENDOR", active: true }, orderBy: { name: "asc" } }),
    db.item.findMany({ where: { type: "RAW_MATERIAL", active: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <>
      <h1>Receive materials</h1>
      <ReceiveForm vendors={vendors.map((v) => ({ id: v.id, name: v.name }))} items={items.map((i) => ({ id: i.id, name: i.name, unit: i.unit }))} />
    </>
  );
}
