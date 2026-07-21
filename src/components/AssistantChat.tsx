"use client";

// Grounded caregiver assistant chat. Every answer arrives with source cards
// (the records it used) and a verification badge; the "light compartment"
// action always takes an explicit tap — the model can only suggest it.

import { useRef, useState } from "react";

type Source = {
  type: "medication" | "cabinet_event";
  id: number;
  title: string;
  subtitle: string | null;
  verification_status: string | null;
  compartment: number | null;
};

type Reply = {
  answer: string;
  safety_status: "ALLOWED" | "REFUSED_MEDICAL" | "NEEDS_CLARIFICATION" | "NOT_FOUND";
  suggested_action: { type: "LIGHT_COMPARTMENT"; medication_id: number; compartment: number } | null;
  sources: Source[];
};

type Turn =
  | { role: "user"; text: string }
  | { role: "assistant"; reply: Reply }
  | { role: "error"; text: string };

const SUGGESTIONS = [
  "Which medications are out of the cabinet?",
  "What expires in the next 60 days?",
  "Where is the ibuprofen?",
  "What was scanned recently?",
];

export function AssistantChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setInput("");
    setTurns((t) => [...t, { role: "user", text: q }]);
    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = (await res.json()) as Reply & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "The assistant could not answer.");
      setTurns((t) => [...t, { role: "assistant", reply: data }]);
    } catch (error) {
      setTurns((t) => [
        ...t,
        { role: "error", text: error instanceof Error ? error.message : "Something went wrong." },
      ]);
    }
    setBusy(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-2xl bg-[var(--surface-tint)] px-4 py-3 text-xs text-[var(--text-secondary)]">
        Pillio answers from your confirmed inventory and cabinet activity only. It does not give
        medical advice, and a cabinet event never means a dose was taken.
      </p>

      {turns.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void ask(s)}
              className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] shadow-[var(--shadow-soft)] transition active:scale-95"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {turns.map((turn, i) =>
          turn.role === "user" ? (
            <p
              key={i}
              className="self-end rounded-2xl rounded-br-md bg-[var(--primary)] px-4 py-2.5 text-sm text-white"
            >
              {turn.text}
            </p>
          ) : turn.role === "error" ? (
            <p
              key={i}
              className="self-start rounded-2xl bg-[var(--danger-bg)] px-4 py-2.5 text-sm text-[var(--danger-text)]"
            >
              {turn.text}
            </p>
          ) : (
            <AssistantBubble key={i} reply={turn.reply} />
          ),
        )}
        {busy && (
          <p className="self-start rounded-2xl bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text-secondary)] shadow-[var(--shadow-soft)]">
            Checking the cabinet…
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
        className="sticky bottom-3 mt-2 flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your medications…"
          className="min-w-0 flex-1 rounded-full bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--text-primary)] shadow-[var(--shadow-soft)] outline-none placeholder:text-[var(--text-secondary)]"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-full bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-50"
        >
          Ask
        </button>
      </form>
    </div>
  );
}

function AssistantBubble({ reply }: { reply: Reply }) {
  return (
    <div className="flex max-w-full flex-col gap-2 self-start">
      <p
        className={`rounded-2xl rounded-bl-md px-4 py-2.5 text-sm shadow-[var(--shadow-soft)] ${
          reply.safety_status === "REFUSED_MEDICAL"
            ? "bg-[var(--warning-bg)] text-[var(--warning-text)]"
            : "bg-[var(--surface)] text-[var(--text-primary)]"
        }`}
      >
        {reply.answer}
      </p>
      {reply.suggested_action && <LightAction action={reply.suggested_action} />}
      {reply.sources.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {reply.sources.map((s) => (
            <span
              key={`${s.type}-${s.id}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-tint)] px-2.5 py-1 text-[11px] text-[var(--text-secondary)]"
              title={s.subtitle ?? undefined}
            >
              <span className="font-semibold text-[var(--text-primary)]">{s.title}</span>
              {s.compartment != null && <span>· bay {s.compartment}</span>}
              {s.verification_status === "USER_CONFIRMED" ? (
                <span className="text-[var(--otc-text)]">✓ confirmed</span>
              ) : s.type === "medication" ? (
                <span className="text-[var(--warning-text)]">AI-extracted</span>
              ) : null}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function LightAction({
  action,
}: {
  action: { medication_id: number; compartment: number };
}) {
  const [state, setState] = useState<"idle" | "busy" | "ok" | "fail">("idle");

  async function light() {
    setState("busy");
    try {
      const res = await fetch("/api/ai/assistant/light", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ medicationId: action.medication_id }),
      });
      const data = (await res.json()) as { ok?: boolean };
      setState(res.ok && data.ok ? "ok" : "fail");
    } catch {
      setState("fail");
    }
  }

  return (
    <button
      type="button"
      onClick={() => void light()}
      disabled={state === "busy" || state === "ok"}
      className="self-start rounded-full bg-[var(--surface-tint)] px-4 py-2 text-xs font-semibold text-[var(--primary)] transition active:scale-95 disabled:opacity-60"
    >
      {state === "ok"
        ? `Compartment ${action.compartment} is blinking`
        : state === "fail"
          ? "Lights unreachable — try again"
          : state === "busy"
            ? "Lighting…"
            : `💡 Light compartment ${action.compartment}`}
    </button>
  );
}
