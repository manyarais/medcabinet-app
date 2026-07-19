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
      <p className="rounded-2xl bg-[var(--accent-cream)] px-4 py-3 text-xs text-[var(--text-secondary)]">
        This browser does not support desktop notifications.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-[var(--surface)] px-4 py-4 shadow-sm shadow-black/[0.04]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Desktop reminders</p>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">
            OS notification when a dose is due soon or overdue (tab must stay open).
          </p>
        </div>
        {status === "on" ? (
          <button
            type="button"
            onClick={handleDisable}
            className="rounded-full bg-[var(--surface-tint)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] transition duration-150 active:scale-95"
          >
            Turn off
          </button>
        ) : status === "denied" ? (
          <span className="rounded-full bg-[var(--danger-bg)] px-2.5 py-1 text-xs font-semibold text-[var(--danger-text)]">
            Blocked
          </span>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleEnable()}
            className="rounded-full bg-[var(--primary)] px-3.5 py-2 text-xs font-semibold text-[var(--text-on-primary)] transition duration-150 active:bg-[var(--primary-pressed)] active:scale-95 disabled:opacity-50"
          >
            {busy ? "Enabling…" : "Enable"}
          </button>
        )}
      </div>
      {status === "on" && (
        <p className="text-xs font-medium text-[var(--primary)]">Reminders are on</p>
      )}
      {(hint || status === "denied") && (
        <p className="text-xs text-[var(--text-secondary)]" role="status">
          {hint ??
            "Notifications are blocked for this site. Enable them in browser settings, then try again."}
        </p>
      )}
    </div>
  );
}
