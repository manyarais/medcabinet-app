// Home — mobile-app proof for Phase A shell + design system.

import { DrugSearch } from "@/components/DrugSearch";
import { HomeFeatureCard } from "@/components/HomeFeatureCard";
import { HomeTodayCard } from "@/components/HomeTodayCard";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { getHomeDashboardData } from "@/lib/homeDashboard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { doseSummaries, activeMedCount, outOfCabinetCount } =
    await getHomeDashboardData();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6">
      <PageHeader
        title={greeting}
        subtitle="What’s in your cabinet, and what you need today."
      />

      <section className="mb-6" aria-label="Medication search">
        <DrugSearch variant="pill" />
      </section>

      <section className="mb-5" aria-label="Today's doses">
        <HomeTodayCard summaries={doseSummaries} />
      </section>

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
            href="/cabinet"
            title="Scanner"
            meta="At the cabinet"
            description="Scan a bottle when hardware is ready"
            icon="scan"
          />
        </div>
      </section>
    </main>
  );
}
