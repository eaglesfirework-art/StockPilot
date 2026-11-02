import { Fragment } from "react";
import { db } from "@/server/db";
import { FilterBar } from "@/components/DateFilter";
import { ItemAddForm, type ItemKind } from "@/components/ItemAddForm";
import { Pager } from "@/components/Pager";
import { RowActions } from "@/components/RowActions";
import { itemDeleteAction, itemUpdateAction } from "@/server/actions";
import { LIST_PAGE, pageOf } from "@/server/queries";
import { qs } from "@/lib/filters";
import { UNITS } from "@/lib/units";
import { inr, num } from "@/lib/fmt";

export type ItemFilters = { q?: string; status?: string; page?: string };

export async function ItemList({ kind, searchParams: sp }: { kind: ItemKind; searchParams: ItemFilters }) {
  const finished = kind === "FINISHED_GOOD";
  const q = sp.q?.trim() ?? "";
  const status = sp.status === "active" || sp.status === "inactive" ? sp.status : "";
  const page = pageOf(sp);
  const [found, materials] = await Promise.all([
    db.item.findMany({
      where: { type: kind, ...(q && { name: { contains: q, mode: "insensitive" } }), ...(status && { active: status === "active" }) },
      orderBy: [{ active: "desc" }, { name: "asc" }], take: LIST_PAGE + 1, skip: (page - 1) * LIST_PAGE,
      include: { _count: { select: { movements: true, purchaseLines: true, saleLines: true, batches: true } } },
    }),
    finished ? db.item.findMany({ where: { type: "RAW_MATERIAL" }, orderBy: { name: "asc" } }) : [],
  ]);
  const rows = found.slice(0, LIST_PAGE);
  const maps = finished ? await db.productMaterial.findMany({ where: { productId: { in: rows.map((r) => r.id) } } }) : [];
  const cols = finished ? 7 : 6;
  const path = finished ? "/admin/products" : "/admin/raw-materials";
  const entity = finished ? "product" : "raw material";

  return (
    <>
      <h1>{finished ? "Products" : "Raw Materials"}</h1>
      <h2>{finished ? "Add product" : "Add raw material"}</h2>
      <ItemAddForm kind={kind} />

      <h2>{finished ? "All products" : "All raw materials"}</h2>
      <FilterBar clear={path}>
        <label>Search name<input name="q" defaultValue={q} placeholder="Type part of a name" /></label>
        <label>Status
          <select name="status" defaultValue={status}><option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        </label>
      </FilterBar>
      <datalist id="units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
      <div className="table-wrap"><table className="collapsible">
        <thead><tr>
          <th>Name</th><th>Unit</th><th className="r">On hand</th><th className="r">Minimum</th>{finished && <th className="r">Selling price</th>}<th>Status</th><th></th>
        </tr></thead>
        <tbody>
          {rows.map((i) => {
            const c = i._count;
            const locked = c.movements > 0;
            const used = c.movements + c.purchaseLines + c.saleLines + c.batches > 0;
            const mapped = new Set(maps.filter((m) => m.productId === i.id).map((m) => m.materialId));
            const chosen = materials.filter((m) => mapped.has(m.id));
            return (
              <Fragment key={i.id}>
                <tr className={i.active ? "" : "inactive"}>
                  <td><b>{i.name}</b></td><td>{i.unit}</td>
                  <td className="r">{num(i.qtyOnHand)} {i.unit}</td><td className="r">{num(i.minStock)} {i.unit}</td>
                  {finished && <td className="r">{i.sellingPrice ? inr(i.sellingPrice) : "—"}</td>}
                  <td>{i.active ? <span className="badge green">Active</span> : <span className="badge red">Inactive</span>}</td>
                  <td>
                    <RowActions
                      id={i.id} name={i.name} entity={entity} updateAction={itemUpdateAction} deleteAction={itemDeleteAction}
                      deleteBlock={used ? "It has been used in stock, purchases, sales or production. Mark it inactive instead (Edit, then untick Active)." : null}
                      fields={
                        <>
                          <label>Name<input name="name" defaultValue={i.name} required /></label>
                          <label>Unit
                            {locked
                              ? <input defaultValue={i.unit} disabled title="Locked because the item has stock history" />
                              : <input name="unit" defaultValue={i.unit} list="units" required />}
                          </label>
                          <label>Minimum stock ({i.unit})<input name="minStock" inputMode="decimal" defaultValue={i.minStock.toString()} /></label>
                          {finished && <label>Selling price (₹ per {i.unit})<input name="sellingPrice" inputMode="decimal" defaultValue={i.sellingPrice?.toString() ?? ""} /></label>}
                          <label className="check span2"><input type="checkbox" name="active" defaultChecked={i.active} />Active (inactive items are hidden from entry forms)</label>
                          {finished && (
                            <fieldset className="span2">
                              <legend>Made from (raw materials)</legend>
                              <input type="hidden" name="withMapping" value="1" />
                              <div className="chips">
                                {materials.filter((m) => m.active || mapped.has(m.id)).map((m) => (
                                  <label key={m.id} className="check"><input type="checkbox" name="m" value={m.id} defaultChecked={mapped.has(m.id)} />{m.name} ({m.unit}){!m.active && " · inactive"}</label>
                                ))}
                                {materials.length === 0 && <span className="muted">No raw materials yet. Add some on the Raw Materials page.</span>}
                              </div>
                              <p className="muted">No quantities here. Workers type the quantity used in every production batch.</p>
                            </fieldset>
                          )}
                          {locked && <p className="muted span2">The unit is locked because this item has stock history.</p>}
                        </>
                      }
                    />
                  </td>
                </tr>
                {finished && (
                  <tr className={`mapping${i.active ? "" : " inactive"}`}>
                    <td colSpan={cols}>
                      <span className="muted">Made from:</span>{" "}
                      {chosen.length > 0 ? chosen.map((m) => `${m.name} (${m.unit})`).join(", ") : <span className="muted">no raw materials chosen yet. Use Edit to choose them.</span>}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
          {rows.length === 0 && <tr><td colSpan={cols} className="muted">{q || status ? "Nothing matches these filters." : `No ${finished ? "products" : "raw materials"} yet. Add one above.`}</td></tr>}
        </tbody>
      </table></div>
      <Pager page={page} hasMore={found.length > LIST_PAGE} base={`${path}${qs({ q, status })}`} />
      <p className="muted">
        Inactive items are hidden from entry forms but keep their history. An item can be deleted only if it has never been used.
        Minimum stock raises a "Low" alert on the Stock page and dashboard. Stock quantity is not typed here: use Receive materials, Production, or Stock → Adjust.
      </p>
    </>
  );
}
