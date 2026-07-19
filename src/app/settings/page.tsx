// App settings — preferences only (appearance, reminders, demo).

import { CallReminderPanel } from "@/components/CallReminderPanel";
import { DemoResetButton } from "@/components/DemoResetButton";
import { DoseReminderToggle } from "@/components/DoseReminderToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PageHeader } from "@/components/ui/PageHeader";

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6">
      <PageHeader
        title="Settings"
        subtitle="Appearance and reminders. Reminder only — not medical advice."
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
          Demo
        </h2>
        <DemoResetButton />
      </section>
    </main>
  );
}
