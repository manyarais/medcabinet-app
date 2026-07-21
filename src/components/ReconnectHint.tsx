"use client";

import { useOffline } from "@/components/OfflineProvider";
import { RECONNECT_TO_CHANGE } from "@/lib/offline";

/** Persistent note when offline — mutations are blocked (no write queue). */
export function ReconnectHint({ className }: { className?: string }) {
  const { online } = useOffline();
  if (online) return null;
  return (
    <p
      className={
        className ??
        "rounded-xl border border-amber-700/25 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-200/20 dark:bg-amber-950/60 dark:text-amber-50"
      }
      role="status"
    >
      {RECONNECT_TO_CHANGE}
    </p>
  );
}
