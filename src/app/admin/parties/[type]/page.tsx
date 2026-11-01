import Link from "next/link";
import { notFound } from "next/navigation";
import { partyBalances, PartyKind } from "@/server/queries";
import { ActionForm } from "@/components/ActionForm";
import { partyAction } from "@/server/actions";
import { inr } from "@/lib/fmt";

const TYPES: Record<string, { kind: PartyKind; title: string }> = {
  customers: { kind: "CUSTOMER", title: "Customers" }, vendors: { kind: "VENDOR", title: "Vendors" }, workers: { kind: "WORKER", title: "Workers" },
};

export default async function Parties({ params }: { params: { type: string } }) {
  const t = TYPES[params.type];
  if (!t) notFound();
  const rows = await partyBalances(t.kind);
  const worker = t.kind === "WORKER";
  return (
    <>
      <h1>{t.title}</h1>
      <div className="table-wrap"><table>
        <thead><tr><th>Name</th><th>Phone</th>{!worker && <><th className="r">Opening</th><th className="r">Billed</th></>}<th className="r">{worker ? "Total paid" : "Paid"}</th>{!worker && <th className="r">{t.kind === "CUSTOMER" ? "Owes us" : "We owe"}</th>}</tr></thead>
        <tbody>{rows.map((p) => (
          <tr key={p.id} className={p.active ? "" : "cancelled"}>
            <td><Link href={`/admin/party/${p.id}`}>{p.name}</Link></td><td>{p.phone}</td>
            {!worker && <><td className="r">{inr(p.opening)}</td><td className="r">{inr(p.billed)}</td></>}
            <td className="r">{inr(p.paid)}</td>{!worker && <td className="r"><b>{inr(p.balance)}</b></td>}
          </tr>))}</tbody></table></div>

      <h2>Add {t.title.toLowerCase().slice(0, -1)}</h2>
      <ActionForm action={partyAction} label="Add" className="form inline">
        <input type="hidden" name="type" value={t.kind} />
        <label>Name<input name="name" required /></label>
        <label>Phone<input name="phone" /></label>
        {!worker && <label>Opening balance (₹){t.kind === "CUSTOMER" ? " they owe" : " we owe"}<input name="openingBalance" inputMode="decimal" /></label>}
      </ActionForm>
    </>
  );
}
