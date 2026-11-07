"use client";
import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";

// A password box with a Show / Hide button. Use it inside a <label> like any input.
// When its form is reset (e.g. after "User created") it goes back to hidden, so the next password is never left on screen.
export function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [shown, setShown] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    const hide = () => setShown(false);
    form.addEventListener("reset", hide);
    return () => form.removeEventListener("reset", hide);
  }, []);
  return (
    <span className="pw">
      <input {...props} ref={ref} type={shown ? "text" : "password"} autoCapitalize="off" spellCheck={false} />
      <button
        type="button" className="pw-toggle" aria-pressed={shown} aria-label={shown ? "Hide password" : "Show password"}
        onClick={(e) => { e.preventDefault(); setShown((s) => !s); }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {shown
            ? <><path d="M3 3l18 18" /><path d="M10.6 5.1A10.5 10.5 0 0 1 12 5c6 0 9.5 7 9.5 7a17 17 0 0 1-3.1 3.9M6.6 6.6A17 17 0 0 0 2.5 12S6 19 12 19a9.8 9.8 0 0 0 4.3-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>
            : <><path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" /><circle cx="12" cy="12" r="3" /></>}
        </svg>
        <span className="pw-text">{shown ? "Hide" : "Show"}</span>
      </button>
    </span>
  );
}
