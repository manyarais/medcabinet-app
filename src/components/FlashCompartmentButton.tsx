"use client";

// "Find it" — blinks the physical compartment strip until its switch is
// pressed. Used on cabinet cells and anywhere a medication is located.

import { useState } from "react";

export function FlashCompartmentButton({
  compartment,
  label = "💡 Find it",
}: {
  compartment: number;
  label?: string;
}) {
  const [state, setState] = useState<"idle" | "busy" | "ok" | "fail">("idle");

  async function flash() {
    setState("busy");
    try {
      const res = await fetch("/api/cabinet/flash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compartment }),
      });
      setState(res.ok ? "ok" : "fail");
    } catch {
      setState("fail");
    }
    setTimeout(() => setState("idle"), 4000);
  }

  return (
    <button
      onClick={flash}
      disabled={state === "busy"}
      className="rounded border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-800 disabled:opacity-50"
      title="Blink this compartment's light on the cabinet"
    >
      {state === "busy"
        ? "…"
        : state === "ok"
          ? "Blinking!"
          : state === "fail"
            ? "Cabinet offline"
            : label}
    </button>
  );
}
