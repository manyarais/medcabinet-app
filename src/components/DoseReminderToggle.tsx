"use client";

// Enable / disable desktop OS dose reminders (Notification API).

import {
  disableReminders,
  getNotificationPermission,
  getReminderPreference,
  requestReminderPermission,
  sendTestNotification,
} from "@/lib/doseNotifications";
import { useEffect, useState } from "react";

type Status = "loading" | "unsupported" | "off" | "on" | "denied";

function readStatus(): Exclude<Status, "loading"> {
  const permission = getNotificationPermission();
  if (permission === "unsupported") return "unsupported";
  if (permission === "denied") return "denied";
  return getReminderPreference() && permission === "granted" ? "on" : "off";
}

export function DoseReminderToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    const boot = window.setTimeout(() => setStatus(readStatus()), 0);
    return () => window.clearTimeout(boot);
  }, []);

  async function handleEnable() {
    setBusy(true);
    setHint(null);
    try {
      const result = await requestReminderPermission();
      if (result === "unsupported") {
        setStatus("unsupported");
        return;
      }
      if (result === "denied") {
        setStatus("denied");
        setHint("Notifications are blocked for this site. Enable them in browser settings.");
        return;
      }
      setStatus("on");
      sendTestNotification();
      setHint("Desktop reminders enabled. Keep this tab open for alerts.");
    } finally {
      setBusy(false);
    }
  }

  function handleDisable() {
    disableReminders();
    setStatus("off");
    setHint("Desktop reminders off. In-app banner still works.");
  }

  if (status === "loading") return null;

  if (status === "unsupported") {
    return (
      <p className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
        This browser does not support desktop notifications.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded border border-zinc-200 bg-white px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-zinc-900">Desktop reminders</p>
          <p className="text-xs text-zinc-500">
            OS notification when a dose is due soon or overdue (tab must stay open).
          </p>
        </div>
        {status === "on" ? (
          <button
            type="button"
            onClick={handleDisable}
            className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            Turn off
          </button>
        ) : status === "denied" ? (
          <span className="rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-800">
            Blocked
          </span>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleEnable()}
            className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Enabling…" : "Enable reminders"}
          </button>
        )}
      </div>
      {status === "on" && (
        <p className="text-xs font-medium text-[var(--brand-sage-deep)]">Reminders are on</p>
      )}
      {(hint || status === "denied") && (
        <p className="text-xs text-zinc-600" role="status">
          {hint ??
            "Notifications are blocked for this site. Enable them in browser settings, then try again."}
        </p>
      )}
    </div>
  );
}
