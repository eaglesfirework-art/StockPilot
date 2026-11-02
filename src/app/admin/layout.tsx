import Link from "next/link";
import { pageUser } from "@/server/auth";
import { logoutAction } from "@/server/actions";
import { MobileNav } from "@/components/MobileNav";

const nav: [string, string][] = [
  ["/admin", "Dashboard"], ["/admin/stock", "Stock"], 
   ["/admin/parties/vendors", "Vendors"], ["/admin/parties/labours", "Labours"],["/admin/parties/customers", "Customers"],
  ["/admin/raw-materials", "Raw Materials"], ["/admin/products", "Products"], ["/admin/transactions", "Transactions"], ["/admin/reports", "Reports"], ["/admin/users", "Users"],["/admin/log", "Log"]
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await pageUser("ADMIN");
  return (
    <div className="shell">
      <MobileNav>
      <aside id="side-nav" className="side">
        <div className="brand">StockPilot</div>
        {nav.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
        <div className="sec">Enter data</div>
        <Link href="/w/receive">Receive materials</Link>
        <Link href="/w/production">Production batch</Link>
        <Link href="/w/labour">Labour payment</Link>
        <Link href="/admin/sales/new">New sale</Link>
        <div className="sec">{u.name}</div>
        <Link href="/admin/profile">My profile</Link>
        <form action={logoutAction}><button className="link">Log out</button></form>
      </aside>
      </MobileNav>
      <main className="main">{children}</main>
    </div>
  );
}
