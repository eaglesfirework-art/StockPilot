// The party statement reads like a bank statement: plain descriptions, only entries that add or remove money
// (no opening/outstanding balance), and labour payments show the days of work they cover.
import { describe, expect, it } from "vitest";
import { buildStatement, type StatementBill, type StatementPayment } from "../src/lib/statement";
import { cleanName, nameKey } from "../src/lib/names";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const bill = (p: Partial<Omit<StatementBill, "date">> & { id: number; date: string; total: number }): StatementBill => ({
  refNo: null, lines: [], cancelled: false, cancelReason: null, ...p, date: d(p.date),
});
const pay = (p: Partial<Omit<StatementPayment, "date">> & { id: number; date: string; amount: number }): StatementPayment => ({
  note: null, billId: null, withBill: false, batchId: null, batchProduct: null, workFrom: null, workTo: null, cancelled: false, cancelReason: null, ...p, date: d(p.date),
});

describe("duplicate-safe names", () => {
  it("treats case, extra spaces and punctuation as the same name", () => {
    expect(nameKey("  Anand  Flour Mills ")).toBe("anand flour mills");
    expect(nameKey("ANAND FLOUR MILLS.")).toBe(nameKey("Anand Flour Mills"));
    expect(nameKey("Shree-Sugar Traders")).toBe(nameKey("Shree Sugar Traders"));
    expect(nameKey("Metro Mart")).not.toBe(nameKey("Metro Mart 2"));
  });
  it("tidies a name for saving without changing its case", () => {
    expect(cleanName("  Anand   Flour Mills ")).toBe("Anand Flour Mills");
  });
});

describe("vendor statement", () => {
  const s = buildStatement("VENDOR",
    [
      bill({ id: 12, date: "2026-10-01", total: 4000, refNo: "INV-77", lines: [{ name: "Flour", qty: 100, unit: "kg", rate: 40 }] }),
      bill({ id: 13, date: "2026-10-05", total: 2750, lines: [{ name: "Sugar", qty: 50, unit: "kg", rate: 55 }], cancelled: true, cancelReason: "wrong vendor" }),
    ],
    [
      pay({ id: 3, date: "2026-10-01", amount: 2000, billId: 12, withBill: true }),
      pay({ id: 7, date: "2026-10-03", amount: 500, billId: 12 }),
      pay({ id: 9, date: "2026-10-04", amount: 300, note: "cash" }),
    ]);

  it("lists only entries that add or remove money, each described in words (no opening/outstanding row)", () => {
    expect(s.rows.map((r) => r.title)).toEqual([
      "Purchase bill PUR-12",
      "Paid at the time of purchase (bill PUR-12)",
      "Payment towards bill PUR-12",
      "Payment to vendor",
      "Purchase bill PUR-13",
    ]);
    expect(s.rows.some((r) => /^PAY-|Outstanding/.test(r.title))).toBe(false);
  });
  it("lists what was bought and the supplier reference", () => {
    expect(s.rows[0].detail).toBe("Flour 100 kg @ ₹40.00 · Supplier ref INV-77");
    expect(s.rows[3].detail).toBe("cash");
    expect(s.rows[1].voucher).toBe("Payment no. 3");
  });
  it("keeps a running balance from zero and ignores cancelled rows", () => {
    expect(s.rows.map((r) => r.balance)).toEqual([4000, 2000, 1500, 1200, null]);
    expect(s.rows[4]).toMatchObject({ cancelled: true, increase: 2750 });
    expect(s.rows[4].detail).toContain("Cancelled: wrong vendor");
    expect(s.closing).toBe(1200);
  });
  it("puts bills before payments on the same day", () => {
    expect(s.rows[0].key).toBe("bill-12");
    expect(s.rows[1].key).toBe("pay-3");
  });
});

describe("customer statement", () => {
  it("uses invoice and receipt wording", () => {
    const s = buildStatement("CUSTOMER",
      [bill({ id: 7, date: "2026-10-02", total: 3000, lines: [{ name: "Biscuit pack", qty: 100, unit: "piece", rate: 30 }] })],
      [pay({ id: 4, date: "2026-10-02", amount: 1000, billId: 7, withBill: true }), pay({ id: 5, date: "2026-10-03", amount: 400, billId: 7 }), pay({ id: 6, date: "2026-10-04", amount: 100 })]);
    expect(s.rows.map((r) => r.title)).toEqual([
      "Sales invoice SAL-7", "Received at the time of sale (invoice SAL-7)", "Receipt towards invoice SAL-7", "Receipt from customer",
    ]);
    expect(s.rows[1].voucher).toBe("Receipt no. 4");
    expect(s.closing).toBe(1500);
  });
});

describe("labour statement", () => {
  it("names the batch, shows the work period, and keeps no balance", () => {
    const s = buildStatement("WORKER", [], [
      pay({ id: 1, date: "2026-10-02", amount: 2000, batchId: 4, batchProduct: "Biscuit pack", workFrom: d("2026-10-02"), workTo: d("2026-10-02") }),
      pay({ id: 2, date: "2026-10-08", amount: 500, note: "advance", workFrom: d("2026-10-01"), workTo: d("2026-10-07") }),
    ]);
    expect(s.rows.map((r) => r.title)).toEqual(["Labour for production batch BAT-4 (Biscuit pack)", "Labour payment"]);
    expect(s.rows[0].detail).toBe("Work on 02 Oct 2026");
    expect(s.rows[1].detail).toBe("Work 01 Oct 2026 to 07 Oct 2026 · advance");
    expect(s.rows.every((r) => r.balance === null)).toBe(true);
    expect(s.closing).toBe(2500);
  });
});
