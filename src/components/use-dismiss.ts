"use client";

// Click away to close. Every menu, drawer and popover in the app answers to the
// same two gestures — a pointer down anywhere outside it, or Escape — so the
// operator never has to hunt back to the button that opened the thing.
//
// Usage — put the ref on the element that wraps BOTH the trigger and the panel:
//   const ref = useDismiss<HTMLSpanElement>(open, () => setOpen(false));
//   return <span ref={ref}><button onClick={toggle}/>{open && <div>…</div>}</span>;
//
// Wrapping the trigger matters: if the trigger sat outside, a click on it would
// close the panel here and immediately re-open it in the button's own handler,
// and the panel would never shut. Inside, the button keeps its toggle and the
// outside click is the only thing this hook has to answer for.
//
// The listener only exists while `open` is true, and it runs on pointerdown so
// the panel is gone before a click lands on whatever is underneath. Anything
// inside the ref'd element — including a form that submits — is left alone.

import { useEffect, useRef, type RefObject } from "react";

export function useDismiss<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  // Hold the latest handler so a re-render of the parent doesn't tear the
  // listener down and put it straight back up. Written in an effect, never
  // during render.
  const cb = useRef(onClose);
  useEffect(() => {
    cb.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const target = e.target as Node | null;
      // A click on the element that opened the panel is that button's business,
      // not ours — but it lives outside the panel, so it still closes here and
      // its own toggle re-opens. Net effect: one click, panel gone.
      if (target && el.contains(target)) return;
      cb.current();
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") cb.current();
    };
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away, true);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return ref;
}
