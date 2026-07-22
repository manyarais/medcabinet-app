"use client";

import { roleLabel } from "@/lib/permissions";
import Link from "next/link";
import { useEffect, useState } from "react";

type Membership = {
  householdId: string;
  name: string;
  role: string;
  isOwned?: boolean;
};

/**
 * Header cue for which household is active.
 * Shared households get a stronger “Shared · …” label.
 */
export function HouseholdContextChip() {
  const [active, setActive] = useState<Membership | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/households");
        if (!res.ok) return;
        const data = (await res.json()) as {
          memberships?: Membership[];
          activeHouseholdId?: string | null;
        };
        const list = data.memberships ?? [];
        const current =
          list.find((m) => m.householdId === data.activeHouseholdId) ??
          list[0] ??
          null;
        if (!cancelled) setActive(current);
      } catch {
        // ignore — chip is non-critical
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!active) return null;

  const shared = active.isOwned === false;
  const name = active.name.trim() || "Household";

  return (
    <Link
      href="/settings"
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition active:scale-[0.98] ${
        shared
          ? "bg-[var(--warning-bg)] text-[var(--warning-text)] ring-1 ring-[var(--warning-text)]/15"
          : "bg-[var(--surface)] text-[var(--text-primary)] shadow-[var(--shadow-soft)] ring-1 ring-[var(--border)]"
      }`}
      title={`${shared ? "Shared household" : "Your household"} · ${roleLabel(active.role)} — tap to manage`}
    >
      {shared && (
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide opacity-80">
          Shared
        </span>
      )}
      <span className="min-w-0 truncate">{name}</span>
      <span className="shrink-0 text-[10px] font-medium opacity-70" aria-hidden>
        ·
      </span>
      <span className="shrink-0 font-medium opacity-80">{roleLabel(active.role)}</span>
    </Link>
  );
}
