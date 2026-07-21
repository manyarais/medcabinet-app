"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";

type Membership = {
  membershipId: string;
  householdId: string;
  name: string;
  role: string;
  canSeeSymptomHistory: boolean;
};

type MemberRow = {
  id: string;
  clerkUserId: string;
  displayName?: string;
  email?: string | null;
  role: string;
  status: string;
  canSeeSymptomHistory: boolean;
};

/** Household switcher, invites, and member management for Settings. */
export function HouseholdSharingPanel() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteExpires, setInviteExpires] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const active = memberships.find((m) => m.householdId === activeId) ?? memberships[0];
  const isOwner = active?.role === "owner";

  const load = useCallback(async () => {
    setError(null);
    const listRes = await fetch("/api/households");
    const listData = (await listRes.json()) as {
      memberships?: Membership[];
      activeHouseholdId?: string | null;
      error?: string;
    };
    if (!listRes.ok) throw new Error(listData.error ?? "Could not load households.");
    const list = listData.memberships ?? [];
    setMemberships(list);
    setActiveId(listData.activeHouseholdId ?? list[0]?.householdId ?? null);

    const memRes = await fetch("/api/households/members");
    if (memRes.ok) {
      const memData = (await memRes.json()) as { members?: MemberRow[] };
      setMembers(memData.members ?? []);
    } else {
      setMembers([]);
    }
  }, []);

  useEffect(() => {
    void load().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Could not load sharing.");
    });
  }, [load]);

  function switchHousehold(householdId: string) {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const res = await fetch("/api/households", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not switch.");
        return;
      }
      setActiveId(householdId);
      setMessage("Switched household.");
      await load();
      window.location.reload();
    });
  }

  function createInvite() {
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const res = await fetch("/api/households/invite", { method: "POST" });
      const data = (await res.json()) as {
        code?: string;
        expiresAt?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not create invite.");
        return;
      }
      setInviteCode(data.code ?? null);
      setInviteExpires(data.expiresAt ?? null);
    });
  }

  function approve(id: string, role: "caregiver" | "viewer") {
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/households/members/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not approve.");
        return;
      }
      await load();
    });
  }

  function patchMember(
    id: string,
    body: { role?: string; canSeeSymptomHistory?: boolean },
  ) {
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/households/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not update member.");
        return;
      }
      await load();
    });
  }

  function removeMember(id: string) {
    if (!window.confirm("Remove this member from the household?")) return;
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/households/members/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not remove member.");
        return;
      }
      await load();
    });
  }

  const pendingMembers = members.filter((m) => m.status === "pending");
  const activeMembers = members.filter((m) => m.status === "active");

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)]">
        <p className="text-[16px] font-semibold text-[var(--text-primary)]">
          Household
        </p>
        <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
          Switch which cabinet you&apos;re viewing
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {memberships.map((m) => (
            <button
              key={m.householdId}
              type="button"
              disabled={pending || m.householdId === activeId}
              onClick={() => switchHousehold(m.householdId)}
              className={`rounded-xl px-3 py-2 text-left text-sm transition ${
                m.householdId === activeId
                  ? "bg-[var(--surface-tint)] font-semibold text-[var(--primary)]"
                  : "bg-[var(--accent-cream)] text-[var(--text-primary)] active:scale-[0.99]"
              } disabled:opacity-70`}
            >
              {m.name}
              <span className="ml-2 text-xs font-normal text-[var(--text-secondary)]">
                {m.role}
              </span>
            </button>
          ))}
        </div>
        <Link
          href="/join"
          className="mt-3 inline-block text-sm font-semibold text-[var(--primary)]"
        >
          Join a household ›
        </Link>
      </div>

      {isOwner && (
        <>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)]">
            <p className="text-[16px] font-semibold text-[var(--text-primary)]">
              Invite caregivers
            </p>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
              Generate a 6-digit code (expires in 48 hours)
            </p>
            <button
              type="button"
              disabled={pending}
              onClick={createInvite}
              className="btn-primary-fill mt-3 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {pending ? "…" : "Generate invite code"}
            </button>
            {inviteCode && (
              <p className="mt-3 rounded-xl bg-[var(--surface-tint)] px-3 py-2 font-mono text-lg tracking-widest text-[var(--text-primary)]">
                {inviteCode}
                {inviteExpires && (
                  <span className="mt-1 block font-sans text-xs tracking-normal text-[var(--text-secondary)]">
                    Expires {new Date(inviteExpires).toLocaleString()}
                  </span>
                )}
              </p>
            )}
          </div>

          {pendingMembers.length > 0 && (
            <div className="rounded-2xl border border-amber-700/25 bg-amber-50 px-4 py-3 dark:bg-amber-950/50">
              <p className="text-[16px] font-semibold text-amber-950 dark:text-amber-50">
                Pending requests
              </p>
              <ul className="mt-2 flex flex-col gap-2">
                {pendingMembers.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--text-primary)]">
                        {m.displayName ?? m.clerkUserId}
                      </p>
                      {m.email && (
                        <p className="truncate text-xs text-[var(--text-secondary)]">
                          {m.email}
                        </p>
                      )}
                    </div>
                    <span className="flex gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => approve(m.id, "caregiver")}
                        className="rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-white"
                      >
                        Caregiver
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => approve(m.id, "viewer")}
                        className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-semibold"
                      >
                        Viewer
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)]">
            <p className="text-[16px] font-semibold text-[var(--text-primary)]">
              Members
            </p>
            <ul className="mt-3 flex flex-col gap-3">
              {activeMembers.map((m) => (
                <li key={m.id} className="flex flex-col gap-2 border-b border-[var(--border)] pb-3 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[var(--text-primary)]">
                      {m.displayName ?? m.clerkUserId}
                    </p>
                    {m.email && (
                      <p className="truncate text-xs text-[var(--text-secondary)]">
                        {m.email}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={m.role}
                      disabled={pending}
                      onChange={(e) => patchMember(m.id, { role: e.target.value })}
                      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm"
                    >
                      <option value="owner">owner</option>
                      <option value="caregiver">caregiver</option>
                      <option value="viewer">viewer</option>
                    </select>
                    <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        checked={m.canSeeSymptomHistory}
                        disabled={pending || m.role === "owner"}
                        onChange={(e) =>
                          patchMember(m.id, {
                            canSeeSymptomHistory: e.target.checked,
                          })
                        }
                      />
                      Symptom history
                    </label>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => removeMember(m.id)}
                      className="ml-auto text-xs font-semibold text-[var(--danger-text)]"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

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
    </div>
  );
}
