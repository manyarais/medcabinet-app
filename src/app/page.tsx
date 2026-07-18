// Home dashboard — search hub + day-at-a-glance previews (doors to full features).

import { DrugSearch } from "@/components/DrugSearch";
import { HomeFeatureCard } from "@/components/HomeFeatureCard";
import { HomeTodayCard } from "@/components/HomeTodayCard";
import { getHomeDashboardData } from "@/lib/homeDashboard";
import Link from "next/link";

export default async function HomePage() {
  const { doseSummaries, activeMedCount, outOfCabinetCount } =
    await getHomeDashboardData();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6 sm:py-8">
      <header className="mb-5">
        <p className="text-sm font-medium tracking-wide text-[var(--brand-sage-deep)]">
          Pillio
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
          Your cabinet companion
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">
          Search what you have, check today&apos;s doses, and jump into any feature.
        </p>
      </header>

      <section className="mb-6" aria-label="Medication search">
        <h2 className="mb-2 text-sm font-semibold text-zinc-800">Search</h2>
        <DrugSearch />
      </section>

      <section className="mb-4" aria-label="Today's doses">
        <HomeTodayCard summaries={doseSummaries} />
      </section>

      {outOfCabinetCount > 0 && (
        <Link
          href="/cabinet"
          className="mb-4 block rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950 transition-colors hover:border-amber-400"
        >
          {outOfCabinetCount} medication{outOfCabinetCount === 1 ? "" : "s"} out of
          cabinet
          <span className="ml-2 text-amber-800/80">View cabinet →</span>
        </Link>
      )}

      <section aria-label="Features">
        <h2 className="mb-2 text-sm font-semibold text-zinc-800">Go to</h2>
        <div className="grid grid-cols-2 gap-3">
          <HomeFeatureCard
            href="/cabinet"
            title="Cabinet"
            meta={`${activeMedCount} medication${activeMedCount === 1 ? "" : "s"}`}
            description="See what's in each compartment"
          />
          <HomeFeatureCard
            href="/symptoms"
            title="Symptoms"
            meta="What are you feeling?"
            description="Find OTC options you already own"
          />
          <HomeFeatureCard
            href="/calendar"
            title="Calendar"
            meta="Prescription schedule"
            description="Check off today’s doses"
          />
          <HomeFeatureCard
            href="/cabinet"
            title="Scanner"
            meta="At the cabinet"
            description="Scan a bottle when hardware is ready"
          />
        </div>
      </section>
    </main>
  );
}
