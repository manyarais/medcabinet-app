"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded bg-zinc-900 px-4 py-2 text-sm font-semibold text-white print:hidden"
    >
      🖨️ Print / save as PDF
    </button>
  );
}
