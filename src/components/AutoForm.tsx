"use client";
import { ReactNode, useRef, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

// A filter form with no Apply button. Dropdowns and checkboxes apply at once; text and dates apply
// shortly after you stop typing. The filters live in the URL, and any page number is dropped.
export function AutoForm({ children, className = "form inline filters" }: { children: ReactNode; className?: string }) {
  const router = useRouter();
  const path = usePathname();
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>();

  function apply(form: HTMLFormElement) {
    const p = new URLSearchParams();
    new FormData(form).forEach((v, k) => { if (typeof v === "string" && v !== "") p.set(k, v); });
    const q = p.toString();
    start(() => router.replace(q ? `${path}?${q}` : path));
  }

  return (
    <form
      className={className}
      style={{ opacity: pending ? 0.6 : 1 }}
      onSubmit={(e) => { e.preventDefault(); clearTimeout(timer.current); apply(e.currentTarget); }}
      onChange={(e) => {
        const form = e.currentTarget;
        const t = e.target as HTMLElement;
        clearTimeout(timer.current);
        const instant = t instanceof HTMLSelectElement || (t instanceof HTMLInputElement && t.type === "checkbox");
        if (instant) apply(form); else timer.current = setTimeout(() => apply(form), 400);
      }}
    >
      {children}
    </form>
  );
}
