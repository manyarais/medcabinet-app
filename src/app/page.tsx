// Home — search, today’s dose checkoffs, scanner, travel/report.

import { DrugSearch } from "@/components/DrugSearch";
import { HomeFeatureCard } from "@/components/HomeFeatureCard";
import { HomeTodayChecklist } from "@/components/HomeTodayChecklist";
import { PageHeader } from "@/components/ui/PageHeader";
import { getHomeDashboardData } from "@/lib/homeDashboard";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { alertCount, soonCount, outOfCabinetCount } = await getHomeDashboardData();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <main className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-6 h-48 max-w-lg"
        style={{ background: "var(--gradient-home-glow)" }}
      />
      <div className="relative z-[1] flex flex-1 flex-col">
        <PageHeader
          title={greeting}
          subtitle="Search what you have — or scan a new bottle in."
        />

        {alertCount > 0 && (
          <Link
            href="/alerts"
            className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-[var(--warning-bg)] px-4 py-3 transition duration-150 ease-out active:scale-[0.98]"
          >
            <p className="text-[15px] font-semibold text-[var(--warning-text)]">
              {alertCount} thing{alertCount === 1 ? "" : "s"} need
              {alertCount === 1 ? "s" : ""} attention
            </p>
            <span
              className="text-sm font-semibold text-[var(--warning-text)]"
              aria-hidden
            >
              ›
            </span>
          </Link>
        )}

        {(soonCount > 0 || outOfCabinetCount > 0) && alertCount === 0 && (
          <div className="mb-4 flex flex-col gap-2">
            {soonCount > 0 && (
              <Link
                href="/expiry"
                className="rounded-2xl bg-[var(--warning-bg)] px-4 py-3 text-[15px] font-semibold text-[var(--warning-text)] transition duration-150 ease-out active:scale-[0.98]"
              >
                {soonCount} expiring soon ›
              </Link>
            )}
            {outOfCabinetCount > 0 && (
              <Link
                href="/cabinet"
                className="rounded-2xl bg-[var(--warning-bg)] px-4 py-3 text-[15px] font-semibold text-[var(--warning-text)] transition duration-150 ease-out active:scale-[0.98]"
              >
                {outOfCabinetCount} out of cabinet ›
              </Link>
            )}
          </div>
        )}

        <section className="mb-5">
          <HomeTodayChecklist />
        </section>

        <section className="mb-6" aria-label="Medication search">
          <DrugSearch variant="pill" />
        </section>

        <section className="mb-5" aria-label="Scan medication">
          <Link
            href="/scan"
            className="block w-full rounded-3xl border border-[var(--brand-tint)]/60 p-6 shadow-[var(--shadow-raised)] transition duration-150 ease-out active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
            style={{ background: "var(--gradient-today)" }}
          >
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--surface)]/80 shadow-[var(--shadow-soft)]">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M7 4H5a1 1 0 0 0-1 1v2M17 4h2a1 1 0 0 1 1 1v2M7 20H5a1 1 0 0 1-1-1v-2M17 20h2a1 1 0 0 0 1-1v-2M8 12h8"
                    stroke="var(--primary)"
                    strokeWidth="1.85"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <h2 className="text-[1.45rem] font-semibold leading-tight tracking-tight text-[var(--text-primary)]">
                  Scan a bottle
                </h2>
                <p className="mt-1.5 text-[15px] leading-snug text-[var(--text-secondary)]">
                  Hardware or phone camera — add it to your cabinet.
                </p>
              </div>
            </div>
            <span className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-2xl btn-primary-fill text-sm font-semibold">
              Open scanner
            </span>
          </Link>
        </section>

        <section className="mb-4 flex flex-col gap-3" aria-label="Shortcuts">
          <HomeFeatureCard
            href="/travel"
            title="Travel"
            meta="Pack for a trip"
            description="Blink bays and mark bottles away"
            icon="travel"
          />
          <HomeFeatureCard
            href="/report"
            title="Report"
            meta="For appointments"
            description="Printable medication list"
            icon="report"
          />
        </section>
      </div>
    </main>
  );
}
