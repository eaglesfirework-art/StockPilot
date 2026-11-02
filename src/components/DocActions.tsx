"use client";
import { useState } from "react";
import { Modal } from "@/components/Modal";
import { PencilIcon, TrashIcon } from "@/components/Icons";
import { cancelAction, noteAction } from "@/server/actions";
import type { CancelKind } from "@/server/core";

// Edit (note only) and Delete (cancel with a reason) for a saved purchase, sale, batch or payment.
export function DocActions({ kind, id, label, note }: { kind: CancelKind; id: number; label: string; note: string }) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const open = (which: "edit" | "delete") => {
    setErr(""); setVal(which === "edit" ? note : "");
    if (which === "edit") setEditing(true); else setDeleting(true);
  };
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await noteAction(kind, id, val);
    setBusy(false);
    if (r.ok) setEditing(false); else setErr(r.message);
  }
  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await cancelAction(kind, id, val);
    setBusy(false);
    if (r.ok) setDeleting(false); else setErr(r.message);
  }

  return (
    <div className="row-actions">
      <button type="button" className="icon-btn" aria-label={`Edit note of ${label}`} title="Edit note" onClick={() => open("edit")}><PencilIcon /></button>
      <button type="button" className="icon-btn danger" aria-label={`Delete ${label}`} title="Delete" onClick={() => open("delete")}><TrashIcon /></button>

      <Modal open={editing} onClose={() => setEditing(false)} title={`Edit ${label}`}>
        <form onSubmit={save}>
          <label>Note<input value={val} maxLength={500} autoFocus onChange={(e) => setVal(e.target.value)} /></label>
          <p className="muted">Amounts, items and dates cannot be changed because stock and money are calculated from them. To fix those, delete this entry and enter it again.</p>
          {err && <p className="msg err">{err}</p>}
          <div className="modal-buttons">
            <button type="button" className="btn" disabled={busy} onClick={() => setEditing(false)}>Cancel</button>
            <button className="btn primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={deleting} onClose={() => setDeleting(false)} title={`Delete ${label}?`}>
        <form onSubmit={confirm}>
          <p>Are you sure you want to delete <b>{label}</b>?</p>
          <p className="muted">It stays in the history, greyed out, and its stock and money effects are reversed. Linked payments are deleted too.</p>
          <label>Reason (required)<input value={val} required minLength={3} autoFocus onChange={(e) => setVal(e.target.value)} /></label>
          {err && <p className="msg err">{err}</p>}
          <div className="modal-buttons">
            <button type="button" className="btn" disabled={busy} onClick={() => setDeleting(false)}>Cancel</button>
            <button className="btn danger" disabled={busy}>{busy ? "Deleting…" : "Confirm"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
