// App settings — reminders and other preferences (grows over time).

import { CallReminderPanel } from "@/components/CallReminderPanel";
import { DoseReminderToggle } from "@/components/DoseReminderToggle";

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Reminder preferences and other app options. Reminder only — not medical advice.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Reminders
        </h2>
        <DoseReminderToggle />
        <CallReminderPanel />
      </section>
    </main>
  );
}
