// A party statement that reads like a bank statement: every row says in words what happened.
// Pure (no database), so the wording and the running balance are unit tested.
import { dOnly, docNo, inr, num } from "./fmt";

export type StatementParty = "VENDOR" | "CUSTOMER" | "WORKER";

export type StatementBill = {
  id: number; date: Date; total: number; refNo: string | null;
  lines: { name: string; qty: number; unit: string; rate: number }[];
  cancelled: boolean; cancelReason: string | null;
};

export type StatementPayment = {
  id: number; date: Date; amount: number; note: string | null;
  billId: number | null;   // the purchase or sale it was paid against
  withBill: boolean;       // saved together with the bill ("paid now" on the bill screen)
  batchId: number | null; batchProduct: string | null; // labour paid for a production batch
  workFrom: Date | null; workTo: Date | null;          // labour: the days of work this payment covers
  cancelled: boolean; cancelReason: string | null;
};

export type StatementRow = {
  key: string; date: Date | null; title: string; detail: string; voucher: string;
  increase: number | null;  // adds to what is owed (a bill)
  decrease: number | null;  // reduces it (a payment or receipt)
  balance: number | null;   // running balance after this row; null for cancelled rows and labour
  cancelled: boolean;
};

const words = {
  VENDOR: { bill: "Purchase bill", prefix: "PUR", billWord: "bill", withBill: "Paid at the time of purchase", towards: "Payment towards", onAccount: "Payment to vendor", voucher: "Payment" },
  CUSTOMER: { bill: "Sales invoice", prefix: "SAL", billWord: "invoice", withBill: "Received at the time of sale", towards: "Receipt towards", onAccount: "Receipt from customer", voucher: "Receipt" },
  WORKER: { bill: "", prefix: "", billWord: "", withBill: "", towards: "", onAccount: "Labour payment", voucher: "Payment" },
} as const;

const join = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(" · ");
const round2 = (x: number) => Math.round(x * 100) / 100;
const workPeriod = (p: { workFrom: Date | null; workTo: Date | null }) => {
  if (!p.workFrom || !p.workTo) return "";
  const a = dOnly(p.workFrom), b = dOnly(p.workTo);
  return a === b ? `Work on ${a}` : `Work ${a} to ${b}`;
};
export { workPeriod };

// Only entries that add or remove money are listed; the balance starts at zero (there is no opening balance).
export function buildStatement(type: StatementParty, bills: StatementBill[], payments: StatementPayment[]) {
  const w = words[type];
  const keeps = type !== "WORKER";
  type Ev = StatementRow & { order: number; id: number };

  const evs: Ev[] = [
    ...bills.map((b): Ev => ({
      key: `bill-${b.id}`, date: b.date, order: 0, id: b.id, cancelled: b.cancelled,
      title: `${w.bill} ${docNo(w.prefix, b.id)}`,
      detail: join(
        b.lines.map((l) => `${l.name} ${num(l.qty)} ${l.unit} @ ${inr(l.rate)}`).join(", "),
        type === "VENDOR" && b.refNo && `Supplier ref ${b.refNo}`,
        b.cancelled && `Cancelled: ${b.cancelReason ?? "no reason given"}`,
      ),
      voucher: docNo(w.prefix, b.id), increase: b.total, decrease: null, balance: null,
    })),
    ...payments.map((p): Ev => {
      const bill = p.billId ? `${w.billWord} ${docNo(w.prefix, p.billId)}` : "";
      const title = type === "WORKER"
        ? p.batchId ? `Labour for production batch ${docNo("BAT", p.batchId)}${p.batchProduct ? ` (${p.batchProduct})` : ""}` : w.onAccount
        : p.billId ? (p.withBill ? `${w.withBill} (${bill})` : `${w.towards} ${bill}`) : w.onAccount;
      return {
        key: `pay-${p.id}`, date: p.date, order: 1, id: p.id, cancelled: p.cancelled, title,
        detail: join(workPeriod(p), p.note, p.cancelled && `Cancelled: ${p.cancelReason ?? "no reason given"}`),
        voucher: `${w.voucher} no. ${p.id}`, increase: null, decrease: p.amount, balance: null,
      };
    }),
  ].sort((a, b) => a.date!.getTime() - b.date!.getTime() || a.order - b.order || a.id - b.id);

  let bal = 0, paidOut = 0;
  const rows: StatementRow[] = [];
  for (const { order: _o, id: _i, ...r } of evs) {
    if (!r.cancelled) {
      bal = round2(bal + (r.increase ?? 0) - (r.decrease ?? 0));
      paidOut = round2(paidOut + (r.decrease ?? 0));
    }
    rows.push({ ...r, balance: keeps && !r.cancelled ? bal : null });
  }
  // For labour, "closing" is the total paid; for vendors and customers it is what is still owed.
  return { rows, closing: keeps ? bal : paidOut };
}
