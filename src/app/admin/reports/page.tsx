import { ReportDownloads } from "@/components/ReportDownloads";
import { dateRange, presets } from "@/lib/filters";

const REPORTS: [string, string, string][] = [
  ["stock", "Stock summary", "Item, unit, quantity, average cost, value, minimum, low flag"],
  ["money-flow", "Money flow", "Day, money in, money out, net (uses the dates)"],
  ["purchases", "Purchases", "Number, date, vendor, total, paid, due"],
  ["sales", "Sales", "Number, date, customer, total, received, due, gross profit"],
  ["customer-dues", "Customer dues", "Party, billed, paid, balance"],
  ["vendor-dues", "Vendor dues", "Party, billed, paid, balance"],
  ["labour", "Labour payments", "Date, labour, amount, batch, note"],
  ["production", "Production cost", "Batch, product, date, material, labour, other, good units, cost per unit"],
];

export default function Reports() {
  const r = dateRange({});
  return (
    <>
      <h1>Reports (CSV)</h1>
      <ReportDownloads reports={REPORTS} presets={presets()} initial={{ from: r.from, to: r.to }} />
    </>
  );
}
