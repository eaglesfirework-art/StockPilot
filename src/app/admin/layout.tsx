import Link from "next/link";
import { pageUser } from "@/server/auth";
import { logoutAction } from "@/server/actions";
import { MobileNav } from "@/components/MobileNav";
import { NavLinks } from "@/components/ui/NavLinks";
import { Avatar } from "@/components/ui/Avatar";

const nav: [string, string][] = [
  ["/admin", "Dashboard"], ["/admin/insights", "Insights"], ["/admin/stock", "Stock"],
  ["/admin/parties/vendors", "Vendors"], ["/admin/parties/labours", "Labours"], ["/admin/parties/customers", "Customers"],
  ["/admin/raw-materials", "Raw materials"], ["/admin/products", "Products"], ["/admin/transactions", "Transactions"],
  ["/admin/reports", "Reports"], ["/admin/users", "Users"], ["/admin/log", "Log"],
];
const entry: [string, string][] = [
  ["/w/receive", "Receive materials"], ["/w/production", "Production batch"], ["/w/labour", "Labour payment"], ["/admin/sales/new", "New sale"],
];

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await pageUser("ADMIN");
  return (
    <div className="shell">
      <MobileNav>
        <aside id="side-nav" className="side">
          <Link href="/admin" className="brand brand-mark"><span className="logo" aria-hidden>▲</span>StockPilot</Link>
          <NavLinks links={nav} exact={["/admin"]} />
          <div className="sec">Enter data</div>
          <NavLinks links={entry} />
          <div className="side-foot">
            <Link href="/admin/profile" className="me"><Avatar name={u.name} /><span><b>{u.name}</b><small>My profile</small></span></Link>
            <form action={logoutAction}><button className="link">Log out</button></form>
          </div>
        </aside>
      </MobileNav>
      <main className="main">{children}</main>
    </div>
  );
}
