"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";

/** Account entry — whole card opens Clerk profile (name, username, sign out). */
export function SettingsAccountCard() {
  const { user, isLoaded } = useUser();
  const displayName =
    user?.fullName?.trim() ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    (isLoaded ? "Your account" : "Loading…");

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)]">
      <Link
        href="/user-profile"
        className="min-w-0 flex-1 rounded-xl text-left transition duration-150 active:opacity-80"
      >
        <p className="text-[16px] font-semibold text-[var(--text-primary)]">
          Account
        </p>
        <p className="truncate text-sm font-medium text-[var(--text-primary)]">
          {displayName}
        </p>
        <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
          Tap to change your name or open full account settings
        </p>
      </Link>
      <UserButton
        userProfileMode="navigation"
        userProfileUrl="/user-profile"
        appearance={{
          elements: {
            avatarBox: "h-10 w-10",
          },
        }}
      />
    </div>
  );
}
