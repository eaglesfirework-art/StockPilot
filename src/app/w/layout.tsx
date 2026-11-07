import Link from "next/link";
import { pageUser } from "@/server/auth";
import { logoutAction } from "@/server/actions";
import { Avatar } from "@/components/ui/Avatar";

export const dynamic = "force-dynamic";

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const u = await pageUser();
  return (
    <div className="wk">
      <header className="wk-head">
        <Link href="/w" className="brand-mark"><span className="logo" aria-hidden>▲</span><b>StockPilot</b></Link>
        <nav className="wk-actions" aria-label="Account">
          {u.role === "ADMIN" && <Link href="/admin" className="btn ghost sm">Admin panel</Link>}
          <form action={logoutAction}><button className="btn ghost sm">Log out</button></form>
          <Avatar name={u.name} href="/w/profile" />
        </nav>
      </header>
      {children}
    </div>
  );
}
