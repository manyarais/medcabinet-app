"use client";

import { TabBar } from "@/components/ui/TabBar";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** App chrome: bold wordmark header + icon tab bar. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const printable = pathname.startsWith("/printable");

  if (printable) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-full flex-col bg-[var(--background)] text-[var(--text-primary)]">
      <header
        data-app-header
        className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md"
        style={{ paddingTop: "max(0.35rem, env(safe-area-inset-top))" }}
      >
        <div className="relative mx-auto flex h-16 max-w-lg items-center justify-center px-4">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-6 top-1/2 h-10 -translate-y-1/2 rounded-full bg-[var(--header-pill)]"
          />
          <Link
            href="/"
            className="relative z-[1] inline-flex min-h-12 items-center px-3"
            aria-label="Pillio home"
          >
            <Image
              src="/logo.png"
              alt="Pillio"
              width={200}
              height={52}
              priority
              className="h-11 w-auto max-w-[220px] object-contain"
              style={{ width: "auto", height: 44 }}
            />
          </Link>
        </div>
      </header>

      <div className="flex flex-1 flex-col pb-[calc(4.75rem+env(safe-area-inset-bottom))]">
        {children}
      </div>

      <TabBar />
    </div>
  );
}
