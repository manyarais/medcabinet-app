"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

export default function JoinHouseholdPage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Join a household · Pillio";
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const res = await fetch("/api/households/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = (await res.json()) as {
        error?: string;
        householdName?: string;
        status?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not join.");
        return;
      }
      setSuccess(
        `Requested to join “${data.householdName ?? "household"}”. Waiting for the owner to approve.`,
      );
      setCode("");
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
        Join a household
      </h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        Enter the 6-digit invite code from the household. They&apos;ll approve
        you as a family member, caregiver, or visitor.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-[var(--text-primary)]">Invite code</span>
          <input
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 font-mono text-lg tracking-widest outline-none focus:ring-2 focus:ring-[var(--primary)]/25"
            required
          />
        </label>
        <button
          type="submit"
          disabled={busy || code.length !== 6}
          className="btn-primary-fill rounded-full px-4 py-3 text-sm font-semibold disabled:opacity-50"
        >
          {busy ? "Sending…" : "Request to join"}
        </button>
      </form>

      {error && (
        <p className="mt-4 text-sm text-[var(--danger-text)]" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="mt-4 text-sm text-[var(--primary)]" role="status">
          {success}
        </p>
      )}

      <Link
        href="/settings"
        className="mt-8 text-sm font-semibold text-[var(--primary)]"
      >
        ← Back to Settings
      </Link>
    </main>
  );
}
