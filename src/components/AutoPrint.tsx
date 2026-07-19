"use client";

import { useEffect, useState } from "react";

function isEmbeddedAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Electron/i.test(ua) || /Cursor/i.test(ua);
}

/** Auto-print only in real browsers — Cursor Electron has no print preview. */
export function AutoPrint() {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (isEmbeddedAppBrowser()) {
      setBlocked(true);
      return;
    }
    const id = window.setTimeout(() => {
      try {
        window.print();
      } catch {
        setBlocked(true);
      }
    }, 400);
    return () => window.clearTimeout(id);
  }, []);

  if (!blocked) return null;

  return (
    <p className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 print:hidden">
      Print preview isn’t available inside Cursor. Open this same URL in{" "}
      <strong>Chrome</strong> or <strong>Edge</strong>, then use Print → Save as
      PDF.
    </p>
  );
}
