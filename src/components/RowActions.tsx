"use client";
import { ReactNode, useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Modal } from "@/components/Modal";
import { PencilIcon, TrashIcon } from "@/components/Icons";
import type { Result } from "@/lib/types";

type Act = (prev: Result | null, fd: FormData) => Promise<Result>;

function SaveButton() {
  const { pending } = useFormStatus();
  return <button className="btn primary" disabled={pending}>{pending ? "Saving…" : "Save changes"}</button>;
}

function EditForm({ id, action, fields, onDone, onCancel }: { id: string; action: Act; fields: ReactNode; onDone: () => void; onCancel: () => void }) {
  const [state, formAction] = useFormState(action, null);
  useEffect(() => { if (state?.ok) onDone(); }, [state, onDone]);
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <div className="fields">{fields}</div>
      {state && !state.ok && <p className="msg err">{state.message}</p>}
      <div className="modal-buttons">
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        <SaveButton />
      </div>
    </form>
  );
}

function DeleteBody({ id, name, action, blocked, onDone, onCancel }: { id: string; name: string; action: Act; blocked: string | null; onDone: () => void; onCancel: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (blocked)
    return (
      <>
        <p><b>{name}</b> cannot be deleted.</p>
        <p className="muted">{blocked}</p>
        <div className="modal-buttons"><button type="button" className="btn primary" onClick={onCancel}>Close</button></div>
      </>
    );
  async function go() {
    setBusy(true); setErr("");
    const fd = new FormData();
    fd.set("id", id);
    const r = await action(null, fd);
    setBusy(false);
    if (r.ok) onDone(); else setErr(r.message);
  }
  return (
    <>
      <p>Are you sure you want to delete <b>{name}</b>?</p>
      <p className="muted">This cannot be undone.</p>
      {err && <p className="msg err">{err}</p>}
      <div className="modal-buttons">
        <button type="button" className="btn" disabled={busy} onClick={onCancel}>Cancel</button>
        <button type="button" className="btn danger" disabled={busy} onClick={go}>{busy ? "Deleting…" : "Confirm"}</button>
      </div>
    </>
  );
}

// Edit and Delete icons for one row. Edit opens a card with `fields`; Delete opens a confirm/cancel dialog.
// `deleteBlock` is the reason a delete is not allowed (the record has history). The dialog then explains it.
export function RowActions({ id, name, entity, updateAction, fields, deleteAction, deleteBlock, children }: {
  id: string; name: string; entity: string; updateAction: Act; fields: ReactNode; deleteAction: Act; deleteBlock: string | null; children?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const closeEdit = () => setEditing(false);
  const closeDelete = () => setDeleting(false);
  return (
    <div className="row-actions">
      {children}
      <button type="button" className="icon-btn" aria-label={`Edit ${name}`} title="Edit" onClick={() => setEditing(true)}><PencilIcon /></button>
      <button type="button" className={`icon-btn danger${deleteBlock ? " muted-btn" : ""}`} aria-label={`Delete ${name}`} title={deleteBlock ?? "Delete"} onClick={() => setDeleting(true)}><TrashIcon /></button>
      <Modal open={editing} onClose={closeEdit} title={`Edit ${entity}`}>
        <EditForm id={id} action={updateAction} fields={fields} onDone={closeEdit} onCancel={closeEdit} />
      </Modal>
      <Modal open={deleting} onClose={closeDelete} title={`Delete ${entity}?`}>
        <DeleteBody id={id} name={name} action={deleteAction} blocked={deleteBlock} onDone={closeDelete} onCancel={closeDelete} />
      </Modal>
    </div>
  );
}
