"use client";

import { hasCapability, roleLabel, type MemberRole } from "@/lib/permissions";
import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";

type Membership = {
  membershipId: string;
  householdId: string;
  name: string;
  role: string;
  canSeeSymptomHistory: boolean;
  isOwned?: boolean;
};

type MemberRow = {
  id: string;
  clerkUserId: string;
  displayName: string;
  email?: string | null;
  role: string;
  status: string;
  canSeeSymptomHistory: boolean;
  isSelf?: boolean;
  isLastOwner?: boolean;
};

type ApproveRole = "family" | "caregiver" | "viewer";

function memberLabel(m: MemberRow): string {
  const name = m.displayName?.trim();
  if (name && name !== "Unknown member") return name;
  const email = m.email?.trim();
  if (email) return email;
  return "Unknown member";
}

function asMemberRole(role: string): MemberRole | null {
  if (
    role === "owner" ||
    role === "caregiver" ||
    role === "family" ||
    role === "viewer"
  ) {
    return role;
  }
  return null;
}

/** Household switcher, invites, rename, and member management for Settings. */
export function HouseholdSharingPanel() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteExpires, setInviteExpires] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const active = memberships.find((m) => m.householdId === activeId) ?? memberships[0];
  const activeRole = active ? asMemberRole(active.role) : null;
  const canManageMembers =
    activeRole != null && hasCapability(activeRole, "manageMembers");
  const canRename =
    activeRole != null && hasCapability(activeRole, "manageSettings");

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
    const nextActive =
      listData.activeHouseholdId ?? list[0]?.householdId ?? null;
    setActiveId(nextActive);
    const activeRow = list.find((m) => m.householdId === nextActive) ?? list[0];
    setRenameValue(activeRow?.name ?? "");

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

  function renameHousehold() {
    const name = renameValue.trim();
    if (!name) {
      setError("Name is required.");
      return;
    }
    startTransition(async () => {
      setError(null);
      setMessage(null);
      const res = await fetch("/api/households", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = (await res.json()) as {
        household?: { name: string };
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Could not rename.");
        return;
      }
      setMessage("Household renamed.");
      await load();
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

  function approve(id: string, role: ApproveRole) {
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

  function removeMember(m: MemberRow) {
    if (m.isSelf && m.isLastOwner) {
      setError("You can't remove yourself as the last owner.");
      return;
    }
    const label = memberLabel(m);
    if (!window.confirm(`Remove ${label} from this household?`)) return;
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/households/members/${m.id}`, { method: "DELETE" });
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
              {!m.isOwned ? "Shared · " : ""}
              {m.name}
              <span className="ml-2 text-xs font-normal text-[var(--text-secondary)]">
                {roleLabel(m.role)}
              </span>
            </button>
          ))}
        </div>

        {canRename && active && (
          <div className="mt-4 border-t border-[var(--border)] pt-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-[var(--text-primary)]">
                Household name
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={renameValue}
                  maxLength={60}
                  disabled={pending}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/25"
                />
                <button
                  type="button"
                  disabled={
                    pending ||
                    !renameValue.trim() ||
                    renameValue.trim() === active.name
                  }
                  onClick={renameHousehold}
                  className="shrink-0 rounded-full bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </label>
          </div>
        )}

        <Link
          href="/join"
          className="mt-3 inline-block text-sm font-semibold text-[var(--primary)]"
        >
          Join a household ›
        </Link>
      </div>

      {canManageMembers && (
        <>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)]">
            <p className="text-[16px] font-semibold text-[var(--text-primary)]">
              Invite people
            </p>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
              Generate a 6-digit code (expires in 48 hours). Approve them as
              family, caregiver, or visitor.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
              Owner &amp; caregiver: full manage. Family: check doses &amp; out/back.
              Visitor: view only. Symptom history is optional (except owners).
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
              <ul className="mt-2 flex flex-col gap-3">
                {pendingMembers.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-col gap-2 text-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--text-primary)]">
                        {memberLabel(m)}
                      </p>
                      {m.email && memberLabel(m) !== m.email && (
                        <p className="truncate text-xs text-[var(--text-secondary)]">
                          {m.email}
                        </p>
                      )}
                    </div>
                    <span className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => approve(m.id, "family")}
                        className="rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-white"
                      >
                        Family
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => approve(m.id, "caregiver")}
                        className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-semibold"
                      >
                        Caregiver
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => approve(m.id, "viewer")}
                        className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-xs font-semibold"
                      >
                        Visitor
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
              {activeMembers.map((m) => {
                const cannotRemove = Boolean(m.isSelf && m.isLastOwner);
                return (
                  <li
                    key={m.id}
                    className="flex flex-col gap-2 border-b border-[var(--border)] pb-3 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-[var(--text-primary)]">
                        {memberLabel(m)}
                        {m.isSelf ? (
                          <span className="ml-2 text-xs font-normal text-[var(--text-secondary)]">
                            (you)
                          </span>
                        ) : null}
                      </p>
                      {m.email && memberLabel(m) !== m.email && (
                        <p className="truncate text-xs text-[var(--text-secondary)]">
                          {m.email}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={m.role}
                        disabled={pending || cannotRemove}
                        onChange={(e) => patchMember(m.id, { role: e.target.value })}
                        className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm"
                      >
                        <option value="owner">Owner</option>
                        <option value="caregiver">Caregiver</option>
                        <option value="family">Family member</option>
                        <option value="viewer">Visitor</option>
                      </select>
                      <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                        <input
                          type="checkbox"
                          checked={m.canSeeSymptomHistory || m.role === "owner"}
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
                        disabled={pending || cannotRemove}
                        onClick={() => removeMember(m)}
                        title={
                          cannotRemove
                            ? "You can't remove yourself as the last owner"
                            : "Remove member"
                        }
                        className="ml-auto text-xs font-semibold text-[var(--danger-text)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                );
              })}
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
