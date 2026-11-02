import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { LIST_PAGE, pageOf, partyBalances, PartyKind } from "@/server/queries";
import { ActionForm } from "@/components/ActionForm";
import { FilterBar } from "@/components/DateFilter";
import { Pager } from "@/components/Pager";
import { RowActions } from "@/components/RowActions";
import { partyAction, partyDeleteAction, partyUpdateAction } from "@/server/actions";
import { qs } from "@/lib/filters";
import { formatPhone } from "@/lib/phone";
import { inr } from "@/lib/fmt";

const TYPES: Record<string, { kind: PartyKind; title: string }> = {
  customers: { kind: "CUSTOMER", title: "Customers" }, vendors: { kind: "VENDOR", title: "Vendors" }, labours: { kind: "WORKER", title: "Labours" },
};
type SP = { q?: string; status?: string; due?: string; page?: string };

export default async function Parties({ params, searchParams: sp }: { params: { type: string }; searchParams: SP }) {
  const t = TYPES[params.type];
  if (!t) notFound();
  const worker = t.kind === "WORKER";
  const q = sp.q?.trim().toLowerCase() ?? "";
  const status = sp.status === "active" || sp.status === "inactive" ? sp.status : "";
  const dueOnly = sp.due === "1" && !worker;
  const page = pageOf(sp);
  const [all, counts] = await Promise.all([
    partyBalances(t.kind),
    db.party.findMany({ where: { type: t.kind }, select: { id: true, _count: { select: { purchases: true, sales: true, payments: true } } } }),
  ]);
  const used = new Map(counts.map((c) => [c.id, c._count.purchases + c._count.sales + c._count.payments]));
  const digits = /^[\d\s+()-]+$/.test(q) ? q.replace(/\D/g, "") : ""; // only search phones when the text looks like a number
  const matches = all.filter((p) =>
    (!q || p.name.toLowerCase().includes(q) || (digits.length > 0 && (p.phone ?? "").includes(digits))) &&
    (!status || p.active === (status === "active")) && (!dueOnly || p.balance.gt(0)));
  const rows = matches.slice((page - 1) * LIST_PAGE, page * LIST_PAGE);
  const label = t.title.toLowerCase();
  const cols = worker ? 5 : 8;
  return (
    <>
      <h1>{t.title}</h1>
      <FilterBar clear={`/admin/parties/${params.type}`}>
        <label>Search<input name="q" defaultValue={sp.q ?? ""} placeholder="Name or phone" /></label>
        <label>Status<select name="status" defaultValue={status}><option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
        {!worker && <label className="check-label"><span><input type="checkbox" name="due" value="1" defaultChecked={dueOnly} />{t.kind === "CUSTOMER" ? "Only those who owe us" : "Only those we owe"}</span></label>}
      </FilterBar>
      <div className="table-wrap"><table className="collapsible">
        <thead><tr><th>Name</th><th>Phone</th>{!worker && <><th className="r">Opening</th><th className="r">Billed</th></>}<th className="r">{worker ? "Total paid" : "Paid"}</th>{!worker && <th className="r">{t.kind === "CUSTOMER" ? "Owes us" : "We owe"}</th>}<th>Status</th><th></th></tr></thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className={p.active ? "" : "inactive"}>
              <td><Link href={`/admin/party/${p.id}`}><b>{p.name}</b></Link></td><td>{formatPhone(p.phone) || "—"}</td>
              {!worker && <><td className="r">{inr(p.opening)}</td><td className="r">{inr(p.billed)}</td></>}
              <td className="r">{inr(p.paid)}</td>{!worker && <td className="r"><b>{inr(p.balance)}</b></td>}
              <td>{p.active ? <span className="badge green">Active</span> : <span className="badge red">Inactive</span>}</td>
              <td>
                <RowActions
                  id={p.id} name={p.name} entity={label.slice(0, -1)} updateAction={partyUpdateAction} deleteAction={partyDeleteAction}
                  deleteBlock={(used.get(p.id) ?? 0) > 0 ? "It has bills or payments. Mark it inactive instead (Edit, then untick Active)." : null}
                  fields={
                    <>
                      <label>Name<input name="name" defaultValue={p.name} required /></label>
                      <label>Mobile (India)<input name="phone" type="tel" inputMode="tel" defaultValue={formatPhone(p.phone)} placeholder="98765 43210" /></label>
                      {!worker && <label>Opening balance (₹){t.kind === "CUSTOMER" ? " they owe" : " we owe"}<input name="openingBalance" inputMode="decimal" defaultValue={p.opening.toString()} /></label>}
                      <label className="check"><input type="checkbox" name="active" defaultChecked={p.active} />Active</label>
                    </>
                  }
                >
                  <Link className="icon-link" href={`/admin/party/${p.id}`}>Statement</Link>
                </RowActions>
              </td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={cols} className="muted">{all.length === 0 ? `No ${label} yet. Add one below.` : "Nothing matches these filters."}</td></tr>}
        </tbody>
      </table></div>
      <Pager page={page} hasMore={matches.length > page * LIST_PAGE} base={`/admin/parties/${params.type}${qs({ q: sp.q, status, due: dueOnly ? "1" : "" })}`} />
      <p className="muted">Click a name or Statement to see bills and payments. A party can be deleted only if it has no transactions.</p>

      <h2>Add {label.slice(0, -1)}</h2>
      <ActionForm action={partyAction} label="Add" className="form inline">
        <input type="hidden" name="type" value={t.kind} />
        <label>Name<input name="name" required /></label>
        <label>Mobile (India, optional)<input name="phone" type="tel" inputMode="tel" placeholder="98765 43210" /></label>
        {!worker && <label>Opening balance (₹){t.kind === "CUSTOMER" ? " they owe" : " we owe"}<input name="openingBalance" inputMode="decimal" /></label>}
      </ActionForm>
    </>
  );
}
