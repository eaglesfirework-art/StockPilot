import Link from "next/link";
import type { ReactNode } from "react";
import { AutoForm } from "@/components/AutoForm";
import { PresetButtons } from "@/components/PresetButtons";
import { presets, type Range } from "@/lib/filters";

type Params = Record<string, string | undefined>;

// Filters live in the URL and apply as soon as a value changes (no Apply button).
// `hidden` travels with the form (for example the tab). The quick ranges fill the From and To boxes.
export function DateFilter({ range, hidden = {}, children }: { range: Range; hidden?: Params; children?: ReactNode }) {
  const quick = presets();
  const active = quick.find((p) => p.from === range.from && p.to === range.to)?.label ?? "";
  return (
    <AutoForm key={`${range.from}_${range.to}`}>
      {Object.entries(hidden).map(([k, v]) => v && <input key={k} type="hidden" name={k} value={v} />)}
      <label className="date">From<input type="date" name="from" defaultValue={range.from} /></label>
      <label className="date">To<input type="date" name="to" defaultValue={range.to} /></label>
      {children}
      <PresetButtons presets={quick} active={active} />
      <p className="muted">{range.isDefault ? "Showing the last 7 days (default): " : "Showing "}{range.from} to {range.to}</p>
    </AutoForm>
  );
}

// Search and dropdown filters for lists that are not about dates.
export function FilterBar({ clear, children }: { clear: string; children: ReactNode }) {
  return (
    <AutoForm>
      {children}
      <Link className="clear-link" href={clear}>Clear filters</Link>
    </AutoForm>
  );
}
