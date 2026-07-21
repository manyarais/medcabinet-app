"use client";

import { UserButton } from "@clerk/nextjs";

/** Account menu (sign-out) for Settings. */
export function SettingsAccountCard() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-[var(--shadow-soft)]">
      <div className="min-w-0">
        <p className="text-[16px] font-semibold text-[var(--text-primary)]">
          Account
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          Sign out or manage your Clerk profile
        </p>
      </div>
      <UserButton
        appearance={{
          elements: {
            avatarBox: "h-10 w-10",
          },
        }}
      />
    </div>
  );
}
