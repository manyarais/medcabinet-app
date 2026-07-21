"use client";

import { todayLocal } from "@/lib/dates";
import {
  formatLastSyncLabel,
  LAST_SYNC_STORAGE_KEY,
  readLastSyncMs,
  writeLastSyncMs,
} from "@/lib/offline";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type OfflineContextValue = {
  online: boolean;
  lastSyncMs: number | null;
  lastSyncLabel: string;
  markSynced: (at?: number) => void;
};

const OfflineContext = createContext<OfflineContextValue>({
  online: true,
  lastSyncMs: null,
  lastSyncLabel: formatLastSyncLabel(null),
  markSynced: () => {},
});

export function useOffline(): OfflineContextValue {
  return useContext(OfflineContext);
}

async function warmCriticalApis(markSynced: (at?: number) => void) {
  const date = todayLocal();
  const month = date.slice(0, 7);
  const urls = [
    "/api/cabinet",
    `/api/calendar?date=${encodeURIComponent(date)}`,
    `/api/calendar/month?month=${encodeURIComponent(month)}`,
  ];

  await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.ok) markSynced();
      } catch {
        // Offline or cold cache — SW may still serve later.
      }
    }),
  );
}

function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  // Avoid caching Next HMR in `next dev` unless explicitly enabled.
  const force =
    process.env.NEXT_PUBLIC_ENABLE_SW === "1" ||
    process.env.NEXT_PUBLIC_ENABLE_SW === "true";
  if (process.env.NODE_ENV !== "production" && !force) return;
  void navigator.serviceWorker.register("/sw.js").catch(() => {
    // Registration is best-effort.
  });
}

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(true);
  const [lastSyncMs, setLastSyncMs] = useState<number | null>(null);

  const markSynced = useCallback((at: number = Date.now()) => {
    writeLastSyncMs(at);
    setLastSyncMs(at);
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);
    setLastSyncMs(readLastSyncMs());

    const onOnline = () => {
      setOnline(true);
      void warmCriticalApis(markSynced);
    };
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    registerServiceWorker();

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; at?: number } | undefined;
      if (data?.type === "PILLIO_SYNC" && typeof data.at === "number") {
        markSynced(data.at);
      }
    };
    navigator.serviceWorker?.addEventListener("message", onMessage);

    // Seed last-sync from storage events (other tabs).
    const onStorage = (event: StorageEvent) => {
      if (event.key === LAST_SYNC_STORAGE_KEY) {
        setLastSyncMs(readLastSyncMs());
      }
    };
    window.addEventListener("storage", onStorage);

    const boot = window.setTimeout(() => {
      void warmCriticalApis(markSynced);
    }, 0);

    return () => {
      window.clearTimeout(boot);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("storage", onStorage);
      navigator.serviceWorker?.removeEventListener("message", onMessage);
    };
  }, [markSynced]);

  const value = useMemo(
    () => ({
      online,
      lastSyncMs,
      lastSyncLabel: formatLastSyncLabel(lastSyncMs),
      markSynced,
    }),
    [online, lastSyncMs, markSynced],
  );

  return (
    <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>
  );
}
