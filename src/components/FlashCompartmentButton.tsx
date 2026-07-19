"use client";

// "Find it" — blinks the physical compartment strip until its switch is pressed.

import { useState } from "react";

export function FlashCompartmentButton({
  compartment,
  label = "Find",
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

  const text =
    state === "busy"
      ? "…"
      : state === "ok"
        ? "Lit"
        : state === "fail"
          ? "Offline"
          : label;

  return (
    <button
      type="button"
      onClick={flash}
      disabled={state === "busy"}
      className="inline-flex min-h-8 flex-1 items-center justify-center rounded-full bg-[var(--surface-tint)] px-2.5 text-[11px] font-semibold text-[var(--primary)] transition duration-150 active:scale-95 disabled:opacity-50"
      title="Blink this compartment's light on the cabinet"
    >
      {text}
    </button>
  );
}
