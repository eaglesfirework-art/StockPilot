"use client";
import { ReactNode, useState } from "react";
import Link from "next/link";
import type { Result } from "@/lib/types";
import { uid } from "@/lib/fmt";

// Edit -> Review summary -> Save. Save is disabled after one tap.
// On any failure the typed data stays (it lives in the parent form).
export function EntryShell({
  children, summary, valid, submit, onSaved,
}: {
  children: ReactNode; summary: ReactNode; valid: boolean;
  submit: (requestId: string) => Promise<Result>; onSaved: () => void;
}) {
  const [rid, setRid] = useState(uid);
  const [review, setReview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);

  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await submit(rid);
      setRes(r);
      if (r.ok) { setRid(uid()); setReview(false); onSaved(); }
    } catch {
      setRes({ ok: false, message: "Not saved. Check internet." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="entry">
      {res && (
        <div className={res.ok ? "msg ok big" : "msg err big"} role="status">
          {res.message}{res.ok && !res.link && " ✓ You can enter another."}
          {res.link && <div className="msg-next"><Link href={res.link.href} className="btn primary sm">{res.link.label}</Link><span className="muted">or enter another below.</span></div>}
        </div>
      )}
      {!review ? (
        <>
          {children}
          <div className="bar"><button className="btn primary" disabled={!valid} onClick={() => { setRes(null); setReview(true); window.scrollTo({ top: 0 }); }}>Review</button></div>
        </>
      ) : (
        <>
          <div className="review-head"><p className="muted">Check the details below. Nothing is saved until you press <b>Confirm and save</b>.</p></div>
          {summary}
          <div className="bar two">
            <button className="btn" onClick={() => setReview(false)} disabled={busy}>← Back to edit</button>
            <button className="btn primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Confirm and save"}</button>
          </div>
        </>
      )}
    </div>
  );
}
