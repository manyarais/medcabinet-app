/** Role / capability checks for household sharing. */

export type MemberRole = "owner" | "caregiver" | "viewer";

export type Capability =
  | "read"
  | "checkDose"
  | "toggleOut"
  | "mutateMeds"
  | "mutateSchedule"
  | "manageSettings"
  | "manageMembers"
  | "seeSymptomHistory";

export function isMemberRole(value: string): value is MemberRole {
  return value === "owner" || value === "caregiver" || value === "viewer";
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
      return role === "owner" || role === "caregiver";
    case "mutateMeds":
    case "mutateSchedule":
    case "manageSettings":
    case "manageMembers":
      return role === "owner";
    case "seeSymptomHistory":
      return role === "owner" || Boolean(opts?.canSeeSymptomHistory);
    default:
      return false;
  }
}
