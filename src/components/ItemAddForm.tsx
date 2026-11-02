"use client";
import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { itemAction } from "@/server/actions";
import { UNITS } from "@/lib/units";

export type ItemKind = "RAW_MATERIAL" | "FINISHED_GOOD";
const OTHER = "__other";
const DEFAULT_UNIT = "kg";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn primary" disabled={pending}>{pending ? "Adding…" : label}</button>;
}

export function ItemAddForm({ kind }: { kind: ItemKind }) {
  const [state, formAction] = useFormState(itemAction, null);
  const [unitSel, setUnitSel] = useState(DEFAULT_UNIT);
  const [custom, setCustom] = useState("");
  const ref = useRef<HTMLFormElement>(null);
  const finished = kind === "FINISHED_GOOD";

  useEffect(() => {
    if (!state?.ok) return;
    ref.current?.reset();
    setUnitSel(DEFAULT_UNIT); setCustom("");
  }, [state]);

  const unitLabel = unitSel === OTHER ? custom.trim() : unitSel;
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
      {finished && <label>Selling price (₹ per {unitLabel || "unit"})<input name="sellingPrice" inputMode="decimal" /></label>}
      <Submit label={finished ? "Add product" : "Add raw material"} />
      <p className="muted" style={{ flexBasis: "100%", margin: 0 }}>
        {finished
          ? "Made in production batches and sold to customers. After adding it, tick its raw materials in the list below."
          : "Bought from vendors and used up in production batches."}
      </p>
      {state && <p className={state.ok ? "msg ok" : "msg err"} style={{ flexBasis: "100%", margin: 0 }}>{state.message}</p>}
    </form>
  );
}
