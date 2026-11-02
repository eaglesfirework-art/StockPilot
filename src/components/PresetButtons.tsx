"use client";
import type { Preset } from "@/lib/filters";

// Quick ranges. Clicking one fills the From and To boxes straight away and applies the filter.
export function PresetButtons({ presets, active }: { presets: Preset[]; active: string }) {
  function pick(e: React.MouseEvent<HTMLButtonElement>, p: Preset) {
    const form = e.currentTarget.form;
    if (!form) return;
    (form.elements.namedItem("from") as HTMLInputElement).value = p.from;
    (form.elements.namedItem("to") as HTMLInputElement).value = p.to;
    form.requestSubmit();
  }
  return (
    <div className="presets" role="group" aria-label="Quick date ranges">
      {presets.map((p) => (
        <button key={p.label} type="button" className={`chip${p.label === active ? " on" : ""}`} aria-pressed={p.label === active} onClick={(e) => pick(e, p)}>{p.label}</button>
      ))}
    </div>
  );
}
