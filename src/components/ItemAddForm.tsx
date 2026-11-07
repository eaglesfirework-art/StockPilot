"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { itemAction } from "@/server/actions";
import { UNITS } from "@/lib/units";

export type ItemKind = "RAW_MATERIAL" | "FINISHED_GOOD";
const OTHER = "__other";
const DEFAULT_UNIT = "kg";

function Submit({ label, disabled }: { label: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button className="btn primary" disabled={pending || disabled}>{pending ? "Adding…" : label}</button>;
}

// Raw material: name, unit, minimum. Product: the same plus the raw materials it is made from (at least one).
// A product has no selling price here: the rate is typed on each sale.
export function ItemAddForm({ kind, materials = [] }: { kind: ItemKind; materials?: { id: string; name: string; unit: string }[] }) {
  const [state, formAction] = useFormState(itemAction, null);
  const [unitSel, setUnitSel] = useState(DEFAULT_UNIT);
  const [custom, setCustom] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const ref = useRef<HTMLFormElement>(null);
  const finished = kind === "FINISHED_GOOD";

  useEffect(() => {
    if (!state?.ok) return;
    ref.current?.reset();
    setUnitSel(DEFAULT_UNIT); setCustom(""); setPicked([]);
  }, [state]);

  const unitLabel = unitSel === OTHER ? custom.trim() : unitSel;
  const noMaterials = finished && materials.length === 0;
  const toggle = (id: string, on: boolean) => setPicked((p) => (on ? [...p, id] : p.filter((x) => x !== id)));
  return (
    <form ref={ref} action={formAction} className="form inline">
      <input type="hidden" name="type" value={kind} />
      <label>Name<input name="name" required /></label>
      <label>Unit
        <select defaultValue={DEFAULT_UNIT} name={unitSel === OTHER ? undefined : "unit"} onChange={(e) => setUnitSel(e.target.value)}>
          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          <option value={OTHER}>Other…</option>
        </select>
      </label>
      {unitSel === OTHER && <label>Custom unit<input name="unit" required autoFocus value={custom} onChange={(e) => setCustom(e.target.value)} /></label>}
      <label>Minimum stock{unitLabel && ` (${unitLabel})`}<input name="minStock" inputMode="decimal" placeholder="0 = no alert" /></label>
      {finished && (
        <fieldset className="checks">
          <legend>Made from (choose at least one raw material)</legend>
          {materials.map((m) => (
            <label key={m.id} className="check">
              <input type="checkbox" name="m" value={m.id} checked={picked.includes(m.id)} onChange={(e) => toggle(m.id, e.target.checked)} />{m.name} ({m.unit})
            </label>
          ))}
          {noMaterials && <p className="muted">No raw materials yet. <Link href="/admin/raw-materials">Add a raw material first</Link>.</p>}
        </fieldset>
      )}
      <Submit label={finished ? "Add product" : "Add raw material"} disabled={noMaterials} />
      <p className="muted" style={{ flexBasis: "100%", margin: 0 }}>
        {finished
          ? "Made in production batches from the raw materials ticked above. The selling rate is entered on each sale."
          : "Bought from vendors and used up in production batches."}
      </p>
      {state && <p className={state.ok ? "msg ok" : "msg err"} style={{ flexBasis: "100%", margin: 0 }}>{state.message}</p>}
    </form>
  );
}
