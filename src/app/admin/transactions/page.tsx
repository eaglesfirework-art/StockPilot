import Link from "next/link";
import { DateFilter } from "@/components/DateFilter";
import { pageOf } from "@/server/queries";
import { dateRange, qs } from "@/lib/filters";
import { PaymentsList, ProductionList, PurchasesList, SalesList, type Filters } from "./lists";

const TABS = {
  purchases: { label: "Purchases", List: PurchasesList },
  sales: { label: "Sales", List: SalesList },
  production: { label: "Production", List: ProductionList },
  payments: { label: "Payments", List: PaymentsList },
} as const;
type Tab = keyof typeof TABS;
type SP = { tab?: string; page?: string; from?: string; to?: string; status?: string; q?: string; by?: string };

export default function Transactions({ searchParams: sp }: { searchParams: SP }) {
  const tab: Tab = sp.tab && sp.tab in TABS ? (sp.tab as Tab) : "purchases";
  const { List } = TABS[tab];
  const f: Filters = {
    range: dateRange(sp), page: pageOf(sp), q: sp.q?.trim() ?? "",
    status: sp.status === "saved" || sp.status === "cancelled" ? sp.status : "",
    by: tab === "payments" && sp.by === "work" ? "work" : "",
  };
  return (
    <>
      <h1>Transactions</h1>
      <div className="tabs">
        {(Object.keys(TABS) as Tab[]).map((k) => (
          <Link key={k} href={`/admin/transactions${qs({ tab: k, from: sp.from, to: sp.to, status: f.status, q: f.q })}`} className={tab === k ? "on" : ""}>{TABS[k].label}</Link>
        ))}
      </div>
      <DateFilter range={f.range} hidden={{ tab }}>
        <label>Status
          <select name="status" defaultValue={f.status}><option value="">All</option><option value="saved">Saved</option><option value="cancelled">Cancelled</option></select>
        </label>
        {tab === "payments" && (
          <label>Dates match
            <select name="by" defaultValue={f.by}><option value="">Payment date</option><option value="work">Labour work period</option></select>
          </label>
        )}
        <label>Search<input name="q" defaultValue={f.q} placeholder={tab === "production" ? "Product or note" : tab === "payments" ? "Party or note" : "Party, item or note"} /></label>
      </DateFilter>
      <List f={f} />
      <p className="muted">
        Saved entries cannot be changed or erased, because stock and money are calculated from them. The pencil edits the note. The bin deletes the entry
        (it stays in the history, greyed out, with the reason, and its linked payments are deleted too). To fix amounts, delete and enter it again.
      </p>
    </>
  );
}
