"use client";

import { useOffline } from "@/components/OfflineProvider";
import { useEffect, useState } from "react";

const DISMISS_KEY = "pillio-offline-banner-dismissed-at";

export function OfflineBanner() {
  const { online, lastSyncLabel } = useOffline();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (online) {
      setDismissed(false);
      try {
        sessionStorage.removeItem(DISMISS_KEY);
      } catch {
        // ignore
      }
      return;
    }
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, [online]);

  if (online || dismissed) return null;

  return (
    <div
      role="status"
      className="border-b border-amber-700/20 bg-amber-50 px-3 py-2 text-amber-950 dark:border-amber-200/15 dark:bg-amber-950/80 dark:text-amber-50"
    >
      <div className="mx-auto flex max-w-lg items-start gap-2">
        <p className="min-w-0 flex-1 text-sm leading-snug">
          You&apos;re offline — showing your cabinet as of {lastSyncLabel}.
        </p>
        <button
          type="button"
          className="shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold underline-offset-2 hover:underline"
          onClick={() => {
            setDismissed(true);
            try {
              sessionStorage.setItem(DISMISS_KEY, "1");
            } catch {
              // ignore
            }
          }}
          aria-label="Dismiss offline banner"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
