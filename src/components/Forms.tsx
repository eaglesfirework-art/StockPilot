"use client";
import { useState } from "react";
import { EntryShell } from "./EntryShell";
import { DocPreview, type PreviewTotal } from "./ui/DocPreview";
import { receiveAction, productionAction, saleAction } from "@/server/actions";
import { inr, num, todayISO } from "@/lib/fmt";

// cost = current average cost per unit, stock = quantity on hand (raw materials in the production form)
type Opt = { id: string; name: string; unit?: string; cost?: string; stock?: string };
const n = (s: string) => (s.trim() === "" || isNaN(Number(s)) ? 0 : Number(s));
const Num = ({ v, set, ph }: { v: string; set: (s: string) => void; ph?: string }) => (
  <input inputMode="decimal" placeholder={ph} value={v} onChange={(e) => set(e.target.value)} />
);
const unitOf = (list: Opt[], id: string) => list.find((x) => x.id === id)?.unit ?? "";
const nameOf = (list: Opt[], id: string) => list.find((x) => x.id === id)?.name ?? "";

// Totals block and paid/unpaid badge shared by the purchase bill and sales invoice previews.
const money = (total: number, now: number, nowLabel: string): PreviewTotal[] => [
  { label: "Total", value: inr(total), strong: true },
  { label: nowLabel, value: inr(now) },
  { label: "Balance due", value: inr(total - now), tone: total - now > 0 ? "warn" : "ok" },
];
const payStatus = (total: number, now: number) =>
  now >= total ? { label: "Paid in full", tone: "ok" as const }
  : now > 0 ? { label: "Part paid", tone: "warn" as const }
  : { label: "Unpaid · on credit", tone: "warn" as const };

// ---------------- Receive materials ----------------
type PLine = { itemId: string; qty: string; rate: string };
export function ReceiveForm({ vendors, items }: { vendors: Opt[]; items: Opt[] }) {
  const [vendorId, setVendor] = useState("");
  const [date, setDate] = useState(todayISO());
  const [refNo, setRef] = useState("");
  const [paid, setPaid] = useState("");
  const [lines, setLines] = useState<PLine[]>([{ itemId: "", qty: "", rate: "" }]);
  const upd = (i: number, p: Partial<PLine>) => setLines(lines.map((l, k) => (k === i ? { ...l, ...p } : l)));
  const total = lines.reduce((a, l) => a + n(l.qty) * n(l.rate), 0);
  const valid = !!vendorId && lines.length > 0 && lines.every((l) => l.itemId && n(l.qty) > 0 && n(l.rate) > 0);
  const reset = () => { setVendor(""); setRef(""); setPaid(""); setLines([{ itemId: "", qty: "", rate: "" }]); };

  return (
    <EntryShell
      valid={valid} onSaved={reset}
      submit={(requestId) => receiveAction({ requestId, vendorId, date, refNo, paidNow: paid || undefined, lines })}
      summary={
        <DocPreview
          kind="Purchase bill" date={date} party={{ label: "Vendor", name: nameOf(vendors, vendorId) }}
          meta={refNo.trim() ? [["Supplier ref", refNo.trim()]] : []}
          tables={[{
            head: ["Item", "Quantity", "Rate", "Amount"], right: [1, 2, 3],
            rows: lines.map((l) => ({ cells: [<b key="n">{nameOf(items, l.itemId)}</b>, `${num(l.qty)} ${unitOf(items, l.itemId)}`, inr(n(l.rate)), inr(n(l.qty) * n(l.rate))] })),
          }]}
          totals={money(total, n(paid), "Paid now")}
          status={payStatus(total, n(paid))}
          footnote="Saving adds these materials to stock at the rates above."
        />
      }
    >
      <label>Vendor<select value={vendorId} onChange={(e) => setVendor(e.target.value)}><option value="">Choose…</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
      <div className="row2">
        <label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label>Reference no. (optional)<input value={refNo} onChange={(e) => setRef(e.target.value)} /></label>
      </div>
      {lines.map((l, i) => (
        <div className="card line" key={i}>
          <label>Item<select value={l.itemId} onChange={(e) => upd(i, { itemId: e.target.value })}><option value="">Choose…</option>{items.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <div className="row2">
            <label>Quantity {unitOf(items, l.itemId) && `(${unitOf(items, l.itemId)})`}<Num v={l.qty} set={(v) => upd(i, { qty: v })} /></label>
            <label>Rate (₹)<Num v={l.rate} set={(v) => upd(i, { rate: v })} /></label>
          </div>
          {lines.length > 1 && <button className="link" onClick={() => setLines(lines.filter((_, k) => k !== i))}>Remove</button>}
        </div>
      ))}
      <button className="btn" onClick={() => setLines([...lines, { itemId: "", qty: "", rate: "" }])}>+ Add item</button>
      <p className="total">Total {inr(total)}</p>
      <label>Paid now (₹, optional)<Num v={paid} set={setPaid} /></label>
    </EntryShell>
  );
}

// ---------------- Production batch ----------------
type Lab = { partyId: string; amount: string; note: string };
type Exp = { note: string; paidTo: string; amount: string };
export function ProductionForm({
  products, mapping, workers,
}: { products: Opt[]; mapping: Record<string, Opt[]>; workers: Opt[] }) {
  const [productId, setProduct] = useState("");
  const [date, setDate] = useState(todayISO());
  const [used, setUsed] = useState<Record<string, string>>({});
  const [produced, setProduced] = useState("");
  const [rejected, setRejected] = useState("");
  const [labour, setLabour] = useState<Lab[]>([]);
  const [exps, setExps] = useState<Exp[]>([]);

  const mats = mapping[productId] ?? [];
  const usedLines = mats.filter((m) => n(used[m.id] ?? "") > 0).map((m) => ({ itemId: m.id, qty: used[m.id] }));
  const good = n(produced) - n(rejected);
  const valid = !!productId && usedLines.length > 0 && good > 0 &&
    labour.every((l) => l.partyId && n(l.amount) > 0) && exps.every((e) => e.note.trim() && e.paidTo.trim() && n(e.amount) > 0);
  const labTotal = labour.reduce((a, l) => a + n(l.amount), 0);
  const expTotal = exps.reduce((a, e) => a + n(e.amount), 0);
  const reset = () => { setProduct(""); setUsed({}); setProduced(""); setRejected(""); setLabour([]); setExps([]); };

  return (
    <EntryShell
      valid={valid} onSaved={reset}
      submit={(requestId) => productionAction({
        requestId, productId, date, materials: usedLines, qtyProduced: produced, qtyRejected: rejected || undefined,
        labour: labour.map((l) => ({ ...l, note: l.note || undefined })), expenses: exps,
      })}
      summary={(() => {
        const usedMats = mats.filter((m) => n(used[m.id] ?? "") > 0);
        const matCost = usedMats.reduce((a, m) => a + n(used[m.id]) * n(m.cost ?? "0"), 0);
        const totalCost = matCost + labTotal + expTotal;
        const pu = unitOf(products, productId);
        return (
          <DocPreview
            kind="Production batch" date={date} party={{ label: "Product", name: nameOf(products, productId) }}
            meta={[["Made", `${num(produced)} ${pu}`], ["Rejected", `${num(rejected || "0")} ${pu}`], ["Good units", <b key="g">{num(good)} {pu}</b>]]}
            tables={[
              {
                title: "Raw materials used", head: ["Material", "Quantity", "Avg cost", "Est. amount"], right: [1, 2, 3],
                rows: usedMats.map((m) => ({
                  cells: [<b key="n">{m.name}</b>, `${num(used[m.id])} ${m.unit}`, inr(n(m.cost ?? "0")), inr(n(used[m.id]) * n(m.cost ?? "0"))],
                  warn: n(used[m.id]) > n(m.stock ?? "0") ? `Only ${num(m.stock ?? "0")} ${m.unit} in stock` : undefined,
                })),
              },
              {
                title: "Labour and other expenses", head: ["Paid to / for", "Note", "Amount"], right: [2], empty: "No labour or expenses added.",
                rows: [
                  ...labour.map((l) => ({ cells: [<b key="n">{nameOf(workers, l.partyId)}</b>, l.note || "Labour", inr(n(l.amount))] })),
                  ...exps.map((e) => ({ cells: [<b key="n">{e.note}</b>, `Paid to ${e.paidTo}`, inr(n(e.amount))] })),
                ],
              },
            ]}
            totals={[
              { label: "Materials (est.)", value: inr(matCost) },
              { label: "Labour", value: inr(labTotal) },
              { label: "Other expenses", value: inr(expTotal) },
              { label: "Total cost (est.)", value: inr(totalCost), strong: true },
              { label: `Cost per good ${pu || "unit"} (est.)`, value: good > 0 ? inr(totalCost / good) : "—" },
            ]}
            footnote="Materials are valued at today's average stock cost. The exact cost per unit is worked out when you save."
          />
        );
      })()}
    >
      <label>Product<select value={productId} onChange={(e) => { setProduct(e.target.value); setUsed({}); }}><option value="">Choose…</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>

      {productId && mats.length === 0 && <p className="msg err">No raw materials are mapped to this product. Ask the admin to map them.</p>}
      {mats.length > 0 && <h3>Materials used</h3>}
      {mats.map((m) => (
        <label key={m.id}>{m.name} ({m.unit})
          <Num v={used[m.id] ?? ""} set={(v) => setUsed({ ...used, [m.id]: v })} ph="0 if not used" /></label>
      ))}

      <h3>Output</h3>
      <div className="row2">
        <label>Produced {unitOf(products, productId) && `(${unitOf(products, productId)})`}<Num v={produced} set={setProduced} /></label>
        <label>Rejected<Num v={rejected} set={setRejected} /></label>
      </div>
      <p className="muted">Good units: {good > 0 ? num(good) : "—"}</p>

      <h3>Labour</h3>
      {labour.map((l, i) => (
        <div className="card line" key={i}>
          <label>Labour<select value={l.partyId} onChange={(e) => setLabour(labour.map((x, k) => (k === i ? { ...x, partyId: e.target.value } : x)))}><option value="">Choose…</option>{workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
          <div className="row2">
            <label>Amount (₹)<Num v={l.amount} set={(v) => setLabour(labour.map((x, k) => (k === i ? { ...x, amount: v } : x)))} /></label>
            <label>Note<input value={l.note} onChange={(e) => setLabour(labour.map((x, k) => (k === i ? { ...x, note: e.target.value } : x)))} /></label>
          </div>
          <button className="link" onClick={() => setLabour(labour.filter((_, k) => k !== i))}>Remove</button>
        </div>
      ))}
      <button className="btn" onClick={() => setLabour([...labour, { partyId: "", amount: "", note: "" }])}>+ Add labour</button>

      <h3>Other expenses</h3>
      {exps.map((e, i) => (
        <div className="card line" key={i}>
          <div className="row2">
            <label>What for<input value={e.note} onChange={(ev) => setExps(exps.map((x, k) => (k === i ? { ...x, note: ev.target.value } : x)))} /></label>
            <label>Paid to (name)<input value={e.paidTo} onChange={(ev) => setExps(exps.map((x, k) => (k === i ? { ...x, paidTo: ev.target.value } : x)))} /></label>
          </div>
          <label>Amount (₹)<Num v={e.amount} set={(v) => setExps(exps.map((x, k) => (k === i ? { ...x, amount: v } : x)))} /></label>
          <button className="link" onClick={() => setExps(exps.filter((_, k) => k !== i))}>Remove</button>
        </div>
      ))}
      <button className="btn" onClick={() => setExps([...exps, { note: "", paidTo: "", amount: "" }])}>+ Add expense</button>
    </EntryShell>
  );
}

// ---------------- Sale (admin) ----------------
type SLine = { itemId: string; qty: string; rate: string };
export function SaleForm({
  customers, products,
}: { customers: Opt[]; products: (Opt & { lastRate: string; stock: string })[] }) {
  const [customerId, setCustomer] = useState("");
  const [date, setDate] = useState(todayISO());
  const [received, setReceived] = useState("");
  const [lines, setLines] = useState<SLine[]>([{ itemId: "", qty: "", rate: "" }]);
  const upd = (i: number, p: Partial<SLine>) => setLines(lines.map((l, k) => (k === i ? { ...l, ...p } : l)));
  const total = lines.reduce((a, l) => a + n(l.qty) * n(l.rate), 0);
  const valid = !!customerId && lines.every((l) => l.itemId && n(l.qty) > 0 && n(l.rate) > 0);
  const reset = () => { setCustomer(""); setReceived(""); setLines([{ itemId: "", qty: "", rate: "" }]); };

  return (
    <EntryShell
      valid={valid} onSaved={reset}
      submit={(requestId) => saleAction({ requestId, customerId, date, receivedNow: received || undefined, lines })}
      summary={
        <DocPreview
          kind="Sales invoice" date={date} party={{ label: "Bill to", name: nameOf(customers, customerId) }}
          tables={[{
            head: ["Product", "Quantity", "Rate", "Amount"], right: [1, 2, 3],
            rows: lines.map((l) => {
              const p = products.find((x) => x.id === l.itemId);
              const short = p && n(l.qty) > n(p.stock);
              return {
                cells: [<b key="n">{p?.name}</b>, `${num(l.qty)} ${p?.unit ?? ""}`, inr(n(l.rate)), inr(n(l.qty) * n(l.rate))],
                warn: short ? `Only ${num(p!.stock)} ${p!.unit} in stock` : undefined,
              };
            }),
          }]}
          totals={money(total, n(received), "Received now")}
          status={payStatus(total, n(received))}
          footnote="Saving takes these products out of stock. You can record the rest of the payment from the customer's page."
        />
      }
    >
      <label>Customer<select value={customerId} onChange={(e) => setCustomer(e.target.value)}><option value="">Choose…</option>{customers.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
      <label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      {lines.map((l, i) => {
        const p = products.find((x) => x.id === l.itemId);
        return (
          <div className="card line" key={i}>
            <label>Product<select value={l.itemId} onChange={(e) => upd(i, { itemId: e.target.value })}><option value="">Choose…</option>{products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
            {p && <p className="muted">In stock: {num(p.stock)} {p.unit}{p.lastRate && ` · last sold at ${inr(n(p.lastRate))} per ${p.unit}`}</p>}
            <div className="row2">
              <label>Quantity<Num v={l.qty} set={(v) => upd(i, { qty: v })} /></label>
              <label>Rate (₹)<Num v={l.rate} set={(v) => upd(i, { rate: v })} /></label>
            </div>
            {lines.length > 1 && <button className="link" onClick={() => setLines(lines.filter((_, k) => k !== i))}>Remove</button>}
          </div>
        );
      })}
      <button className="btn" onClick={() => setLines([...lines, { itemId: "", qty: "", rate: "" }])}>+ Add product</button>
      <p className="total">Total {inr(total)}</p>
      <label>Received now (₹, optional)<Num v={received} set={setReceived} /></label>
    </EntryShell>
  );
}
