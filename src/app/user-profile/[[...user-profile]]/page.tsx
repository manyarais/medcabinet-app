"use client";

import { EditDisplayNameCard } from "@/components/EditDisplayNameCard";
import { UserProfile } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerkAppearance";
import Link from "next/link";

export default function UserProfilePage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6 pb-8">
      <Link
        href="/settings"
        className="mb-4 text-sm font-semibold text-[var(--primary)]"
      >
        ← Back to Settings
      </Link>
      <h1 className="mb-4 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
        Account settings
      </h1>
      <p className="mb-4 text-sm text-[var(--text-secondary)]">
        Change your name below. Email and sign-out are in the Clerk section.
      </p>

      <EditDisplayNameCard />

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        <UserProfile
          appearance={clerkAppearance}
          routing="path"
          path="/user-profile"
        />
      </div>
    </main>
  );
}
