"use client";

// Twilio Voice settings: reminder phone, test call, quiet hours, server auto-call.

import { useEffect, useState } from "react";

type Settings = {
  serverAutoCall: boolean;
  callMessageTemplate: string;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  callOverdueDuringQuiet: boolean;
  reminderPhone: string | null;
};

const DEFAULT_TEMPLATE =
  "Hello from Pillio. This is a reminder that {brandName} is due at {scheduledTime}. Please check your Pillio calendar when you can. This is a reminder only, not medical advice. Goodbye.";

export function CallReminderPanel() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [hasPhone, setHasPhone] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [callRes, settingsRes] = await Promise.all([
          fetch("/api/reminders/call"),
          fetch("/api/reminders/settings"),
        ]);
        const callJson = (await callRes.json()) as {
          configured?: boolean;
          hasPhone?: boolean;
        };
        setConfigured(Boolean(callJson.configured));
        setHasPhone(Boolean(callJson.hasPhone));
        if (settingsRes.ok) {
          const s = (await settingsRes.json()) as { settings: Settings };
          setSettings({
            ...s.settings,
            reminderPhone: s.settings.reminderPhone ?? "",
          });
        }
      } catch {
        setConfigured(false);
      }
    })();
  }, []);

  async function handleTestCall() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/reminders/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true }),
      });
      const json = (await response.json()) as {
        error?: string;
        toHint?: string;
        sayText?: string;
      };
      if (!response.ok) {
        setError(json.error ?? "Call failed.");
        return;
      }
      setMessage(
        json.toHint
          ? `Calling …${json.toHint}. Script: “${json.sayText ?? ""}”`
          : `Call placed. Script: “${json.sayText ?? ""}”`,
      );
    } catch {
      setError("Network error while placing call.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCallOverdueAgain() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/reminders/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });
      const json = (await response.json()) as {
        error?: string;
        reason?: string;
        called?: Array<{ brandName: string }>;
        overdueCount?: number;
      };
      if (!response.ok) {
        setError(json.error ?? "Call failed.");
        return;
      }
      if (json.called?.length) {
        setMessage(`Calling about ${json.called.map((c) => c.brandName).join(", ")}.`);
        return;
      }
      setMessage(
        json.reason ??
          (json.overdueCount === 0
            ? "No overdue untaken doses right now."
            : "No call placed."),
      );
    } catch {
      setError("Network error while placing call.");
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings(next: Settings) {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/reminders/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...next,
          reminderPhone: next.reminderPhone?.trim() || null,
        }),
      });
      const json = (await response.json()) as { error?: string; settings?: Settings };
      if (!response.ok) {
        setError(json.error ?? "Could not save settings.");
        return;
      }
      if (json.settings) {
        setSettings({
          ...json.settings,
          reminderPhone: json.settings.reminderPhone ?? "",
        });
        setHasPhone(Boolean(json.settings.reminderPhone));
      }
      setMessage("Reminder settings saved.");
    } catch {
      setError("Network error while saving settings.");
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  }

  const canCall = configured === true && hasPhone;

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-[var(--surface)] px-4 py-4 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Phone call reminders</p>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">
            Twilio Voice. Reminder only — not medical advice. Each household
            sets its own number below.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !canCall}
            onClick={() => void handleTestCall()}
            className="btn-primary-fill rounded-full px-3.5 py-2 text-xs font-semibold transition duration-150 ease-out active:scale-95 disabled:opacity-50"
          >
            {busy ? "Calling…" : "Test call"}
          </button>
          <button
            type="button"
            disabled={busy || !canCall}
            onClick={() => void handleCallOverdueAgain()}
            className="rounded-full bg-[var(--surface-tint)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] transition duration-150 active:scale-95 disabled:opacity-50"
          >
            Call overdue
          </button>
        </div>
      </div>

      {configured === false && (
        <p className="rounded-2xl bg-[var(--warning-bg)] px-3 py-2 text-xs text-[var(--warning-text)]">
          Phone calling is not configured on this server (missing Twilio account
          keys).
        </p>
      )}

      {configured && settings && (
        <>
          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-semibold text-[var(--text-primary)]">
              Reminder phone (this household)
            </span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+1 555 123 4567"
              value={settings.reminderPhone ?? ""}
              onChange={(e) => update("reminderPhone", e.target.value)}
              className="rounded-2xl border-0 bg-[var(--surface-tint)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/25"
            />
            <span className="text-[11px] leading-snug text-[var(--text-secondary)]">
              Voice calls go here. On a Twilio trial, the number must be verified
              in your Twilio console first.
            </span>
          </label>

          {configured && !hasPhone && !(settings.reminderPhone ?? "").trim() && (
            <p className="rounded-2xl bg-[var(--warning-bg)] px-3 py-2 text-xs text-[var(--warning-text)]">
              Save a reminder phone above, then use Test call.
            </p>
          )}

          <label className="flex items-start gap-2.5 text-xs text-[var(--text-primary)]">
            <input
              type="checkbox"
              className="mt-0.5 accent-[var(--primary)]"
              checked={settings.serverAutoCall}
              onChange={(e) => update("serverAutoCall", e.target.checked)}
            />
            <span>
              <span className="font-semibold">Server auto-call for overdue doses</span>
              <span className="mt-0.5 block text-[var(--text-secondary)]">
                Needs a dispatcher every ~1 min (laptop watcher pointed at
                Vercel, or an external cron). Without that, use Test call /
                Call overdue.
              </span>
            </span>
          </label>

          <label className="flex flex-col gap-1.5 text-xs">
            <span className="font-semibold text-[var(--text-primary)]">
              Call message (use {"{brandName}"} and {"{scheduledTime}"})
            </span>
            <textarea
              value={settings.callMessageTemplate}
              onChange={(e) => update("callMessageTemplate", e.target.value)}
              rows={4}
              className="rounded-2xl border-0 bg-[var(--surface-tint)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/25"
            />
            <button
              type="button"
              className="self-start text-[11px] font-medium text-[var(--primary)]"
              onClick={() => update("callMessageTemplate", DEFAULT_TEMPLATE)}
            >
              Reset to default
            </button>
          </label>

          <div className="rounded-2xl bg-[var(--surface-tint)] px-3 py-3">
            <label className="flex items-start gap-2.5 text-xs text-[var(--text-primary)]">
              <input
                type="checkbox"
                className="mt-0.5 accent-[var(--primary)]"
                checked={settings.quietHoursEnabled}
                onChange={(e) => update("quietHoursEnabled", e.target.checked)}
              />
              <span>
                <span className="font-semibold">Quiet hours</span>
                <span className="mt-0.5 block text-[var(--text-secondary)]">
                  You choose the window. Doses stay on the calendar either way.
                </span>
              </span>
            </label>

            {settings.quietHoursEnabled && (
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-[var(--text-secondary)]">Start</span>
                  <input
                    type="time"
                    value={settings.quietStart}
                    onChange={(e) => update("quietStart", e.target.value)}
                    className="rounded-xl border-0 bg-[var(--surface)] px-2.5 py-2 text-[var(--text-primary)]"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-[var(--text-secondary)]">End</span>
                  <input
                    type="time"
                    value={settings.quietEnd}
                    onChange={(e) => update("quietEnd", e.target.value)}
                    className="rounded-xl border-0 bg-[var(--surface)] px-2.5 py-2 text-[var(--text-primary)]"
                  />
                </label>
                <label className="flex items-start gap-2 text-xs text-[var(--text-primary)]">
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-[var(--primary)]"
                    checked={settings.callOverdueDuringQuiet}
                    onChange={(e) => update("callOverdueDuringQuiet", e.target.checked)}
                  />
                  <span>
                    Still call for <span className="font-semibold">overdue</span> doses during quiet
                    hours
                  </span>
                </label>
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => void saveSettings(settings)}
            className="self-start btn-primary-fill rounded-full px-4 py-2 text-xs font-semibold transition duration-150 ease-out active:scale-95 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save call settings"}
          </button>
        </>
      )}

      {message && (
        <p className="text-xs font-medium text-[var(--primary)]" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="text-xs text-[var(--danger-text)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
