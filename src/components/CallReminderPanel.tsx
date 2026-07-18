"use client";

// Twilio Voice settings: test call, custom message, quiet hours, server auto-call.

import { useEffect, useState } from "react";

type Settings = {
  serverAutoCall: boolean;
  callMessageTemplate: string;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  callOverdueDuringQuiet: boolean;
};

const DEFAULT_TEMPLATE =
  "Hello from Pillio. This is a reminder that {brandName} is due at {scheduledTime}. Please check your Pillio calendar when you can. This is a reminder only, not medical advice. Goodbye.";

export function CallReminderPanel() {
  const [configured, setConfigured] = useState<boolean | null>(null);
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
        const callJson = (await callRes.json()) as { configured?: boolean };
        setConfigured(Boolean(callJson.configured));
        if (settingsRes.ok) {
          const s = (await settingsRes.json()) as { settings: Settings };
          setSettings(s.settings);
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
        setMessage(
          `Calling about ${json.called.map((c) => c.brandName).join(", ")}.`,
        );
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
        body: JSON.stringify(next),
      });
      const json = (await response.json()) as { error?: string; settings?: Settings };
      if (!response.ok) {
        setError(json.error ?? "Could not save settings.");
        return;
      }
      if (json.settings) setSettings(json.settings);
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

  return (
    <div className="flex flex-col gap-3 rounded border border-zinc-200 bg-white px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-zinc-900">Phone call reminders</p>
          <p className="text-xs text-zinc-500">
            Twilio Voice. Reminder only — not medical advice. Run{" "}
            <code className="font-mono text-[11px]">npm run reminders:watch</code> so calls
            work with the browser closed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || configured === false}
            onClick={() => void handleTestCall()}
            className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Calling…" : "Test call"}
          </button>
          <button
            type="button"
            disabled={busy || configured === false}
            onClick={() => void handleCallOverdueAgain()}
            className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
          >
            Call again (overdue)
          </button>
        </div>
      </div>

      {configured === false && (
        <p className="text-xs text-amber-800">
          Twilio not configured. Add credentials to <code className="font-mono">.env</code>, then
          restart <code className="font-mono">npm run dev</code>.
        </p>
      )}

      {settings && configured && (
        <>
          <label className="flex items-start gap-2 text-xs text-zinc-700">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={settings.serverAutoCall}
              onChange={(e) => update("serverAutoCall", e.target.checked)}
            />
            <span>
              <span className="font-medium">Server auto-call for overdue doses</span>
              <span className="block text-zinc-500">
                Works with the app closed when <code className="font-mono">reminders:watch</code>{" "}
                is running.
              </span>
            </span>
          </label>

          <label className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-zinc-700">
              Call message (use {"{brandName}"} and {"{scheduledTime}"})
            </span>
            <textarea
              value={settings.callMessageTemplate}
              onChange={(e) => update("callMessageTemplate", e.target.value)}
              rows={4}
              className="rounded border border-zinc-300 px-2 py-2 text-sm text-zinc-900"
            />
            <button
              type="button"
              className="self-start text-[11px] text-[var(--brand-sage-deep)] hover:underline"
              onClick={() => update("callMessageTemplate", DEFAULT_TEMPLATE)}
            >
              Reset to default
            </button>
          </label>

          <div className="rounded border border-zinc-100 bg-zinc-50 px-2.5 py-2">
            <label className="flex items-start gap-2 text-xs text-zinc-700">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={settings.quietHoursEnabled}
                onChange={(e) => update("quietHoursEnabled", e.target.checked)}
              />
              <span>
                <span className="font-medium">Quiet hours</span>
                <span className="block text-zinc-500">
                  You choose the window. Doses stay on the calendar either way.
                </span>
              </span>
            </label>

            {settings.quietHoursEnabled && (
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-zinc-600">Start</span>
                  <input
                    type="time"
                    value={settings.quietStart}
                    onChange={(e) => update("quietStart", e.target.value)}
                    className="rounded border border-zinc-300 px-2 py-1.5"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  <span className="text-zinc-600">End</span>
                  <input
                    type="time"
                    value={settings.quietEnd}
                    onChange={(e) => update("quietEnd", e.target.value)}
                    className="rounded border border-zinc-300 px-2 py-1.5"
                  />
                </label>
                <label className="flex items-start gap-2 text-xs text-zinc-700">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={settings.callOverdueDuringQuiet}
                    onChange={(e) => update("callOverdueDuringQuiet", e.target.checked)}
                  />
                  <span>
                    Still call for <span className="font-medium">overdue</span> doses during quiet
                    hours (recommended if you need those meds)
                  </span>
                </label>
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={() => void saveSettings(settings)}
            className="self-start rounded border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save call settings"}
          </button>
        </>
      )}

      {message && (
        <p className="text-xs text-[var(--brand-sage-deep)]" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="text-xs text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
