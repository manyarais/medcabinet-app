import { clerkClient, currentUser } from "@clerk/nextjs/server";

export type MemberIdentity = {
  displayName: string | null;
  email: string | null;
};

/** UI label: displayName → email → "Unknown member" (never raw user_ id). */
export function memberDisplayLabel(member: {
  displayName?: string | null;
  email?: string | null;
}): string {
  const name = member.displayName?.trim();
  if (name) return name;
  const email = member.email?.trim();
  if (email) return email;
  return "Unknown member";
}

/** First token for compact attribution ("by Manya"). */
export function memberShortLabel(member: {
  displayName?: string | null;
  email?: string | null;
}): string {
  const full = memberDisplayLabel(member);
  if (full === "Unknown member") return full;
  const first = full.split(/\s+/)[0];
  return first || full;
}

/** Snapshot from Clerk Backend API. */
export async function fetchClerkIdentity(
  clerkUserId: string,
): Promise<MemberIdentity> {
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);
    const email =
      user.primaryEmailAddress?.emailAddress ??
      user.emailAddresses[0]?.emailAddress ??
      null;
    const displayName =
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      user.username ||
      null;
    return { displayName, email };
  } catch {
    return { displayName: null, email: null };
  }
}

/** Snapshot from the signed-in session (no extra Backend round-trip). */
export async function identityFromCurrentUser(): Promise<MemberIdentity | null> {
  const user = await currentUser();
  if (!user) return null;
  const email =
    user.primaryEmailAddress?.emailAddress ??
    user.emailAddresses[0]?.emailAddress ??
    null;
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
    user.username ||
    null;
  return { displayName, email };
}

export async function fetchClerkIdentities(
  clerkUserIds: string[],
): Promise<Map<string, MemberIdentity>> {
  const unique = [...new Set(clerkUserIds.filter(Boolean))];
  const entries = await Promise.all(
    unique.map(async (id) => [id, await fetchClerkIdentity(id)] as const),
  );
  return new Map(entries);
}
