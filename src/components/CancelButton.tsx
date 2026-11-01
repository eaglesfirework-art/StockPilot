"use client";
import { useState } from "react";
import { cancelAction } from "@/server/actions";

export function CancelButton({ kind, id }: { kind: "purchase" | "sale" | "batch" | "payment"; id: number }) {
  const [busy, setBusy] = useState(false);
  async function go() {
    const reason = window.prompt("Reason for cancelling (required). Linked payments will be cancelled too.");
    if (!reason) return;
    setBusy(true);
    const r = await cancelAction(kind, id, reason);
    setBusy(false);
    if (!r.ok) window.alert(r.message);
  }
  return <button className="link danger" disabled={busy} onClick={go}>Cancel</button>;
}
