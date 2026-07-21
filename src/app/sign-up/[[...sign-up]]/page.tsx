"use client";

import { SignUp } from "@clerk/nextjs";
import Image from "next/image";
import { clerkAppearance } from "@/lib/clerkAppearance";

export default function SignUpPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center bg-[var(--background)] px-4 py-10">
      <div className="mb-6 flex flex-col items-center gap-2">
        <Image
          src="/icon.png"
          alt=""
          width={56}
          height={56}
          priority
          className="h-14 w-14 rounded-[12px] object-cover shadow-[var(--shadow-soft)]"
        />
        <p className="text-xl font-semibold tracking-tight text-[var(--header-ink)]">
          Pillio
        </p>
      </div>
      <SignUp
        appearance={clerkAppearance}
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/"
      />
    </main>
  );
}
