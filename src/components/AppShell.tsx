"use client";

import { HouseholdContextChip } from "@/components/HouseholdContextChip";
import { OfflineBanner } from "@/components/OfflineBanner";
import { TabBar } from "@/components/ui/TabBar";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** App chrome: bold wordmark header + icon tab bar. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const printable = pathname.startsWith("/printable");
  const authPage =
    pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");

  if (printable || authPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-full flex-col bg-[var(--background)] text-[var(--text-primary)]">
      <header
        data-app-header
        className="app-glass sticky top-0 z-40 border-b"
        style={{ paddingTop: "max(0.35rem, env(safe-area-inset-top))" }}
      >
        <div className="relative mx-auto flex h-14 max-w-lg items-center justify-center px-4">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-6 top-1/2 h-10 -translate-y-1/2 rounded-full bg-[var(--header-pill)]"
          />
          <Link
            href="/"
            className="relative z-[1] inline-flex min-h-12 items-center gap-2.5 px-3 transition duration-150 ease-out active:scale-[0.98]"
            aria-label="Pillio home"
          >
            <Image
              src="/icon.png"
              alt=""
              width={40}
              height={40}
              priority
              className="h-10 w-10 rounded-[10px] object-cover shadow-[var(--shadow-soft)]"
            />
            <span className="text-[1.35rem] font-semibold tracking-tight text-[var(--header-ink)]">
              Pillio
            </span>
          </Link>
        </div>
        <div className="mx-auto flex max-w-lg justify-center px-4 pb-2.5">
          <HouseholdContextChip />
        </div>
      </header>

      <OfflineBanner />

      <div className="flex flex-1 flex-col pb-[calc(4.75rem+env(safe-area-inset-bottom))]">
        {children}
      </div>

      <TabBar />
    </div>
  );
}
