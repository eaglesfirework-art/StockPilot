"use client";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { Result } from "@/lib/types";
import { uid } from "@/lib/fmt";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn primary" disabled={pending}>{pending ? "Saving…" : label}</button>;
}

// A simple form that calls a server action and shows the result under the button.
// A fresh requestId is put in the form on every successful save, so a double tap saves once.
export function ActionForm({
  action, label = "Save", children, className = "form", resetOnOk = true,
}: {
  action: (prev: Result | null, fd: FormData) => Promise<Result>;
  label?: string; children: ReactNode; className?: string; resetOnOk?: boolean;
}) {
  const [state, formAction] = useFormState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const [rid, setRid] = useState("");
  useEffect(() => setRid(uid()), []);
  useEffect(() => {
    if (state?.ok) { if (resetOnOk) ref.current?.reset(); setRid(uid()); }
  }, [state, resetOnOk]);
  return (
    <form ref={ref} action={formAction} className={className}>
      <input type="hidden" name="requestId" value={rid} />
      {children}
      <Submit label={label} />
      {state && <p className={state.ok ? "msg ok" : "msg err"}>{state.message}</p>}
    </form>
  );
}
