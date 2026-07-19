// Home — surfaces live state; shortcuts for tools.

import { DrugSearch } from "@/components/DrugSearch";
import { HomeFeatureCard } from "@/components/HomeFeatureCard";
import { HomeTodayCard } from "@/components/HomeTodayCard";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { getHomeDashboardData } from "@/lib/homeDashboard";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const {
    doseSummaries,
    activeMedCount,
    outOfCabinetCount,
    alertCount,
    soonCount,
  } = await getHomeDashboardData();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <main
      className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-6 h-48 max-w-lg"
        style={{ background: "var(--gradient-home-glow)" }}
      />
      <div className="relative z-[1] flex flex-1 flex-col">
      <PageHeader
        title={greeting}
        subtitle="What’s in your cabinet, and what you need today."
      />

      {alertCount > 0 && (
        <Link
          href="/alerts"
          className="mb-5 flex items-center justify-between gap-3 rounded-2xl bg-[var(--warning-bg)] px-4 py-3 transition duration-150 ease-out active:scale-[0.98]"
        >
          <p className="text-[15px] font-semibold text-[var(--warning-text)]">
            {alertCount} thing{alertCount === 1 ? "" : "s"} need
            {alertCount === 1 ? "s" : ""} attention
          </p>
          <span className="text-sm font-semibold text-[var(--warning-text)]" aria-hidden>
            ›
          </span>
        </Link>
      )}

      <section className="mb-6" aria-label="Medication search">
        <DrugSearch variant="pill" />
      </section>

      <section className="mb-5" aria-label="Today's doses">
        <HomeTodayCard summaries={doseSummaries} />
      </section>

      {soonCount > 0 && (
        <Card
          href="/expiry"
          className="mb-5 border border-[var(--warning)]/25 bg-[var(--warning-bg)]"
        >
          <p className="text-[15px] font-semibold text-[var(--warning-text)]">
            {soonCount} medication{soonCount === 1 ? "" : "s"} expiring soon
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Tap to review expiry</p>
        </Card>
      )}

      {outOfCabinetCount > 0 && (
        <Card
          href="/cabinet"
          className="mb-5 border border-[var(--warning)]/25 bg-[var(--warning-bg)]"
        >
          <p className="text-[15px] font-semibold text-[var(--warning-text)]">
            {outOfCabinetCount} medication{outOfCabinetCount === 1 ? "" : "s"} out of
            cabinet
          </p>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">Tap to review</p>
        </Card>
      )}

      <section className="mb-4" aria-label="Features">
        <h2 className="mb-3 px-0.5 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Shortcuts
        </h2>
        <div className="flex flex-col gap-3">
          <HomeFeatureCard
            href="/cabinet"
            title="Cabinet"
            meta={`${activeMedCount} medication${activeMedCount === 1 ? "" : "s"}`}
            description="See what’s in each compartment"
            icon="cabinet"
          />
          <HomeFeatureCard
            href="/symptoms"
            title="Symptoms"
            meta="What are you feeling?"
            description="Match OTC labels you already own"
            icon="symptoms"
          />
          <HomeFeatureCard
            href="/calendar"
            title="Calendar"
            meta="Prescription schedule"
            description="Check off today’s doses"
            icon="calendar"
          />
          <HomeFeatureCard
            href="/scan"
            title="Scan"
            meta="Hardware or camera"
            description="Scan a bottle — hardware or phone camera."
            icon="scan"
          />
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
          <HomeFeatureCard
            href="/activity"
            title="Activity"
            meta="Recent events"
            description="Scans, flashes, and cabinet changes"
            icon="activity"
          />
        </div>
      </section>
      </div>
    </main>
  );
}
