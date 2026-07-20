// App settings — preferences, tools, demo.

// Match the other pages: skip static prerender (it trips a Next 16.2.10
// workStore invariant during `next build` on this page).
export const dynamic = "force-dynamic";

import { CallReminderPanel } from "@/components/CallReminderPanel";
import { DemoResetButton } from "@/components/DemoResetButton";
import { DoseReminderToggle } from "@/components/DoseReminderToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6">
      <PageHeader
        title="Settings"
        subtitle="Appearance, reminders, and tools."
      />

      <section className="flex flex-col gap-3">
        <h2 className="px-0.5 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Appearance
        </h2>
        <ThemeToggle />
      </section>

      <section className="mt-8 flex flex-col gap-3">
        <h2 className="px-0.5 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Reminders
        </h2>
        <DoseReminderToggle />
        <CallReminderPanel />
      </section>

      <section className="mt-8 flex flex-col gap-3">
        <h2 className="px-0.5 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Tools
        </h2>
        <Card href="/activity" className="flex flex-col gap-0.5 p-4">
          <p className="text-[16px] font-semibold text-[var(--text-primary)]">Activity</p>
          <p className="text-sm text-[var(--text-secondary)]">
            Scans, flashes, and cabinet changes
          </p>
        </Card>
      </section>

      <section className="mt-8 flex flex-col gap-3">
        <h2 className="px-0.5 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Demo
        </h2>
        <DemoResetButton />
      </section>
    </main>
  );
}
