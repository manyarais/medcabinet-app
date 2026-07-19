"use client";

import { useState } from "react";

function isEmbeddedAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // Cursor / VS Code Simple Browser and many desktop WebViews are Electron.
  return /Electron/i.test(ua) || /Cursor/i.test(ua);
}

/**
 * Opens a nav-free printable report in a real browser.
 * Cursor’s embedded preview shows “This app doesn’t support print preview.”
 */
export function PrintButton() {
  const [hint, setHint] = useState<string | null>(null);
  const printUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/printable/report`
      : "/printable/report";

  async function handlePrint() {
    if (isEmbeddedAppBrowser()) {
      setHint(
        "Print doesn’t work inside Cursor’s preview. Open this link in Chrome or Edge, then Print / Save as PDF:",
      );
      try {
        await navigator.clipboard.writeText(printUrl);
        setHint(
          (h) =>
            `${h ?? ""} Link copied — paste into Chrome/Edge: ${printUrl}`,
        );
      } catch {
        // Clipboard may be blocked; URL still shown below.
      }
      return;
    }

    const popup = window.open(printUrl, "_blank", "noopener,noreferrer");
    if (!popup) {
      window.location.href = printUrl;
    }
  }

  return (
    <div className="flex flex-col items-end gap-1 print:hidden">
      <button
        type="button"
        onClick={() => void handlePrint()}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
      >
        Print / save as PDF
      </button>
      {hint ? (
        <p className="max-w-xs text-right text-[11px] text-amber-800" role="status">
          {hint}
          <br />
          <a
            href={printUrl}
            target="_blank"
            rel="noreferrer"
            className="font-medium underline"
          >
            {printUrl}
          </a>
        </p>
      ) : (
        <p className="max-w-[14rem] text-right text-[11px] text-zinc-500">
          Use Chrome or Edge (not Cursor’s built-in preview). On a phone: Share →
          Print.
        </p>
      )}
    </div>
  );
}
