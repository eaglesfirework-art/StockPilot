"use client";
import { ReactNode, useEffect, useRef } from "react";

// A native <dialog>: focus is trapped, Esc closes it, and clicking the dimmed background closes it.
// The content is only rendered while open, so every form inside starts fresh with the latest data.
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="modal" aria-label={title} onClose={onClose} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {open && <div className="modal-card"><h2>{title}</h2>{children}</div>}
    </dialog>
  );
}
