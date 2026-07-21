import { clerkClient } from "@clerk/nextjs/server";

/** Best available label for a Clerk user id (name → username → email → id). */
export async function clerkUserLabel(clerkUserId: string): Promise<{
  displayName: string;
  email: string | null;
}> {
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
      email ||
      clerkUserId;
    return { displayName, email };
  } catch {
    return { displayName: clerkUserId, email: null };
  }
}

export async function clerkUserLabels(
  clerkUserIds: string[],
): Promise<Map<string, { displayName: string; email: string | null }>> {
  const unique = [...new Set(clerkUserIds)];
  const entries = await Promise.all(
    unique.map(async (id) => [id, await clerkUserLabel(id)] as const),
  );
  return new Map(entries);
}
