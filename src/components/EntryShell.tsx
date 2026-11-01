"use client";
import { ReactNode, useState } from "react";
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
      {res && <p className={res.ok ? "msg ok big" : "msg err big"}>{res.message}{res.ok && " ✓ You can enter another."}</p>}
      {!review ? (
        <>
          {children}
          <div className="bar"><button className="btn primary" disabled={!valid} onClick={() => { setRes(null); setReview(true); }}>Review</button></div>
        </>
      ) : (
        <>
          <div className="card">{summary}</div>
          <div className="bar two">
            <button className="btn" onClick={() => setReview(false)} disabled={busy}>Back</button>
            <button className="btn primary" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
          </div>
        </>
      )}
    </div>
  );
}
