"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Sidebar links that mark the current page (aria-current), so it is clear where you are.
export function NavLinks({ links, exact = [] }: { links: [string, string][]; exact?: string[] }) {
  const path = usePathname();
  return (
    <>
      {links.map(([href, label]) => {
        const on = exact.includes(href) ? path === href : path === href || path.startsWith(href + "/");
        return <Link key={href} href={href} className={on ? "on" : undefined} aria-current={on ? "page" : undefined}>{label}</Link>;
      })}
    </>
  );
}
