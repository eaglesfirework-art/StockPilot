import Link from "next/link";
import { pageUser } from "@/server/auth";
import { logoutAction } from "@/server/actions";

const nav: [string, string][] = [
  ["/admin", "Dashboard"], ["/admin/stock", "Stock"], ["/admin/log", "Log"],
  ["/admin/parties/customers", "Customers"], ["/admin/parties/vendors", "Vendors"], ["/admin/parties/workers", "Workers"],
  ["/admin/purchases", "Purchases"], ["/admin/sales", "Sales"], ["/admin/production", "Production"], ["/admin/payments", "Payments"],
  ["/admin/items", "Items"], ["/admin/mapping", "Product mapping"], ["/admin/users", "Users"], ["/admin/reports", "Reports"],
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await pageUser("ADMIN");
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">StockPilot</div>
        {nav.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
        <div className="sec">Enter data</div>
        <Link href="/w/receive">Receive materials</Link>
        <Link href="/w/production">Production batch</Link>
        <Link href="/w/labour">Labour payment</Link>
        <Link href="/admin/sales/new">New sale</Link>
        <div className="sec">{u.name}</div>
        <form action={logoutAction}><button className="link">Log out</button></form>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
