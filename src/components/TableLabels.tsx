"use client";
import { useEffect } from "react";

// On phones tables turn into stacked cards (see globals.css):
// - each cell gets its column name from the header, and
// - list tables ("collapsible") start folded to the name; tapping the name unfolds the whole card.
export function TableLabels() {
  useEffect(() => {
    const phone = window.matchMedia("(max-width: 700px)");

    const tune = () => {
      document.querySelectorAll<HTMLTableElement>(".table-wrap table").forEach((t) => {
        const heads = Array.from(t.querySelectorAll("thead th")).map((h) => h.textContent?.trim() ?? "");
        t.querySelectorAll("tbody tr").forEach((tr) => {
          let col = 0;
          tr.querySelectorAll(":scope > td").forEach((td) => {
            const cell = td as HTMLTableCellElement;
            if (cell.colSpan === 1 && cell.dataset.label !== (heads[col] ?? "")) cell.dataset.label = heads[col] ?? "";
            col += cell.colSpan;
          });
          const first = tr.querySelector(":scope > td:first-child") as HTMLTableCellElement | null;
          if (!first || !t.classList.contains("collapsible") || first.colSpan > 1) return;
          if (phone.matches) {
            first.setAttribute("role", "button");
            first.tabIndex = 0;
            first.setAttribute("aria-expanded", tr.hasAttribute("data-open") ? "true" : "false");
          } else {
            first.removeAttribute("role"); first.removeAttribute("tabindex"); first.removeAttribute("aria-expanded");
          }
        });
      });
    };

    const toggle = (tr: Element) => {
      if (tr.hasAttribute("data-open")) tr.removeAttribute("data-open"); else tr.setAttribute("data-open", "");
      tr.querySelector(":scope > td:first-child")?.setAttribute("aria-expanded", tr.hasAttribute("data-open") ? "true" : "false");
    };
    const firstCell = (el: Element) => {
      const td = el.closest("table.collapsible td:first-child") as HTMLTableCellElement | null;
      return td && td.colSpan === 1 ? td : null;
    };
    const onClick = (e: MouseEvent) => {
      if (!phone.matches) return;
      const el = e.target as Element;
      const td = firstCell(el);
      if (!td) return;
      const tr = td.parentElement as Element;
      // On a phone the name only opens or closes the card. Anything it linked to has its own link inside the card.
      const link = el.closest("a");
      if (link) e.preventDefault();
      toggle(tr);
    };
    const onKey = (e: KeyboardEvent) => {
      if (!phone.matches || (e.key !== "Enter" && e.key !== " ")) return;
      const td = firstCell(e.target as Element);
      if (td && e.target === td) { e.preventDefault(); toggle(td.parentElement as Element); }
    };

    tune();
    let raf = 0;
    const watch = new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(tune); });
    watch.observe(document.body, { childList: true, subtree: true });
    phone.addEventListener("change", tune);
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      watch.disconnect(); cancelAnimationFrame(raf);
      phone.removeEventListener("change", tune);
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  return null;
}
