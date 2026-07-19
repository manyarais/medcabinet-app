"use client";

import { AppNav } from "@/components/AppNav";
import { usePathname } from "next/navigation";

/** Hides app chrome on /printable/* so print preview is not blank / blocked. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const printable = pathname.startsWith("/printable");

  if (printable) {
    return <>{children}</>;
  }

  return (
    <>
      <AppNav />
      {children}
    </>
  );
}
