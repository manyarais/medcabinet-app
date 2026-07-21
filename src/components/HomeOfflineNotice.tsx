"use client";

import { useOffline } from "@/components/OfflineProvider";

/** Home-only callout when offline — what still works vs what needs a connection. */
export function HomeOfflineNotice() {
  const { online, lastSyncLabel } = useOffline();
  if (online) return null;

  return (
    <aside
      role="status"
      className="mb-4 rounded-2xl border border-amber-700/25 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-200/20 dark:bg-amber-950/70 dark:text-amber-50"
    >
      <p className="text-[15px] font-semibold leading-snug">
        You&apos;re offline
      </p>
      <p className="mt-1 text-sm leading-snug opacity-90">
        Showing your cabinet and today&apos;s doses as of {lastSyncLabel}. You can
        browse what you already have and search symptoms against it.
      </p>
      <p className="mt-2 text-sm leading-snug opacity-90">
        Catalog search, scanning, logging doses, and other changes need a
        connection — reconnect when you can.
      </p>
    </aside>
  );
}
