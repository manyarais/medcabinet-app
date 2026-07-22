/** Role / capability checks for household sharing. */

export type MemberRole = "owner" | "caregiver" | "family" | "viewer";

export type Capability =
  | "read"
  | "checkDose"
  | "toggleOut"
  | "mutateMeds"
  | "mutateSchedule"
  | "manageSettings"
  | "manageMembers"
  | "seeSymptomHistory";

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: "Owner",
  caregiver: "Caregiver",
  family: "Family member",
  viewer: "Visitor",
};

export function isMemberRole(value: string): value is MemberRole {
  return (
    value === "owner" ||
    value === "caregiver" ||
    value === "family" ||
    value === "viewer"
  );
}

/** Human-readable role for UI (viewer → Visitor). */
export function roleLabel(role: string): string {
  if (isMemberRole(role)) return ROLE_LABELS[role];
  return role;
}

export function hasCapability(
  role: MemberRole,
  capability: Capability,
  opts?: { canSeeSymptomHistory?: boolean },
): boolean {
  switch (capability) {
    case "read":
      return true;
    case "checkDose":
    case "toggleOut":
      return role === "owner" || role === "caregiver" || role === "family";
    case "mutateMeds":
    case "mutateSchedule":
    case "manageSettings":
    case "manageMembers":
      return role === "owner" || role === "caregiver";
    case "seeSymptomHistory":
      return role === "owner" || Boolean(opts?.canSeeSymptomHistory);
    default:
      return false;
  }
}
