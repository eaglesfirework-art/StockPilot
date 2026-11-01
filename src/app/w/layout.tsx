import Link from "next/link";
import { pageUser } from "@/server/auth";
import { logoutAction } from "@/server/actions";

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const u = await pageUser();
  return (
    <div className="wk">
      <header>
        <Link href="/w"><b>StockPilot</b></Link>
        <span className="muted">{u.name}{u.role === "ADMIN" && <> · <Link href="/admin">Admin</Link></>}
          <form action={logoutAction} style={{ display: "inline" }}> · <button className="link">Log out</button></form></span>
      </header>
      {children}
    </div>
  );
}
