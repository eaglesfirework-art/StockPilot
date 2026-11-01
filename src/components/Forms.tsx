"use client";
import { useState } from "react";
import { EntryShell } from "./EntryShell";
import { receiveAction, productionAction, saleAction } from "@/server/actions";
import { inr, num, todayISO } from "@/lib/fmt";

type Opt = { id: string; name: string; unit?: string };
const n = (s: string) => (s.trim() === "" || isNaN(Number(s)) ? 0 : Number(s));
const Num = ({ v, set, ph }: { v: string; set: (s: string) => void; ph?: string }) => (
  <input inputMode="decimal" placeholder={ph} value={v} onChange={(e) => set(e.target.value)} />
);
const unitOf = (list: Opt[], id: string) => list.find((x) => x.id === id)?.unit ?? "";
const nameOf = (list: Opt[], id: string) => list.find((x) => x.id === id)?.name ?? "";

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
      summary={<>
        <h3>{nameOf(vendors, vendorId)}</h3>
        {lines.map((l, i) => <p key={i}>{nameOf(items, l.itemId)}: {num(l.qty)} {unitOf(items, l.itemId)} × {inr(n(l.rate))} = <b>{inr(n(l.qty) * n(l.rate))}</b></p>)}
        <p>Total <b>{inr(total)}</b> · Paid now <b>{inr(n(paid))}</b> · Due <b>{inr(total - n(paid))}</b></p>
      </>}
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
type Exp = { note: string; amount: string };
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
    labour.every((l) => l.partyId && n(l.amount) > 0) && exps.every((e) => e.note.trim() && n(e.amount) > 0);
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
      summary={<>
        <h3>{nameOf(products, productId)}</h3>
        {mats.filter((m) => n(used[m.id] ?? "") > 0).map((m) => <p key={m.id}>{m.name}: {num(used[m.id])} {m.unit}</p>)}
        <p>Produced {num(produced)} · Rejected {num(rejected || "0")} · <b>Good {num(good)}</b> {unitOf(products, productId)}</p>
        <p>Labour {inr(labTotal)} · Expenses {inr(expTotal)}</p>
        <p className="muted">The exact cost per unit is calculated when you save.</p>
      </>}
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
          <label>Worker<select value={l.partyId} onChange={(e) => setLabour(labour.map((x, k) => (k === i ? { ...x, partyId: e.target.value } : x)))}><option value="">Choose…</option>{workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
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
            <label>Amount (₹)<Num v={e.amount} set={(v) => setExps(exps.map((x, k) => (k === i ? { ...x, amount: v } : x)))} /></label>
          </div>
          <button className="link" onClick={() => setExps(exps.filter((_, k) => k !== i))}>Remove</button>
        </div>
      ))}
      <button className="btn" onClick={() => setExps([...exps, { note: "", amount: "" }])}>+ Add expense</button>
    </EntryShell>
  );
}

// ---------------- Sale (admin) ----------------
type SLine = { itemId: string; qty: string; rate: string };
export function SaleForm({
  customers, products,
}: { customers: Opt[]; products: (Opt & { price: string; stock: string })[] }) {
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
      summary={<>
        <h3>{nameOf(customers, customerId)}</h3>
        {lines.map((l, i) => <p key={i}>{nameOf(products, l.itemId)}: {num(l.qty)} × {inr(n(l.rate))} = <b>{inr(n(l.qty) * n(l.rate))}</b></p>)}
        <p>Total <b>{inr(total)}</b> · Received now <b>{inr(n(received))}</b> · Due <b>{inr(total - n(received))}</b></p>
      </>}
    >
      <label>Customer<select value={customerId} onChange={(e) => setCustomer(e.target.value)}><option value="">Choose…</option>{customers.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
      <label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      {lines.map((l, i) => {
        const p = products.find((x) => x.id === l.itemId);
        return (
          <div className="card line" key={i}>
            <label>Product<select value={l.itemId} onChange={(e) => { const q = products.find((x) => x.id === e.target.value); upd(i, { itemId: e.target.value, rate: q?.price ?? l.rate }); }}><option value="">Choose…</option>{products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
            {p && <p className="muted">In stock: {num(p.stock)} {p.unit}</p>}
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
