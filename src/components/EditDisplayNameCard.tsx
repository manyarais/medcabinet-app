"use client";

import { useUser } from "@clerk/nextjs";
import { FormEvent, useEffect, useState } from "react";

/** In-app name editor — Clerk's profile UI often has no edit control for OAuth users. */
export function EditDisplayNameCard() {
  const { user, isLoaded } = useUser();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setUsername(user.username ?? "");
  }, [user]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const data: {
        firstName: string;
        lastName: string;
        username?: string;
      } = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      };
      const nextUsername = username.trim();
      if (nextUsername && nextUsername !== (user.username ?? "")) {
        data.username = nextUsername;
      }
      await user.update(data);
      setMessage("Saved.");
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "errors" in err
          ? String(
              (err as { errors?: Array<{ longMessage?: string; message?: string }> })
                .errors?.[0]?.longMessage ??
                (err as { errors?: Array<{ message?: string }> }).errors?.[0]
                  ?.message ??
                "Could not save.",
            )
          : err instanceof Error
            ? err.message
            : "Could not save. If username fails, enable Usernames in the Clerk dashboard.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (!isLoaded) {
    return (
      <p className="text-sm text-[var(--text-secondary)]" role="status">
        Loading profile…
      </p>
    );
  }

  if (!user) return null;

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-4 flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]"
    >
      <div>
        <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">
          Your name
        </h2>
        <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
          This is what household members see instead of a user id.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-[var(--text-primary)]">First name</span>
        <input
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--primary)]/25"
          autoComplete="given-name"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-[var(--text-primary)]">Last name</span>
        <input
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--primary)]/25"
          autoComplete="family-name"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-[var(--text-primary)]">
          Username <span className="font-normal text-[var(--text-secondary)]">(optional)</span>
        </span>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--primary)]/25"
          autoComplete="username"
        />
      </label>

      {error && (
        <p className="text-sm text-[var(--danger-text)]" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="text-sm text-[var(--primary)]" role="status">
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="btn-primary-fill rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save name"}
      </button>
    </form>
  );
}
