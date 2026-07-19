// App settings.

import { CallReminderPanel } from "@/components/CallReminderPanel";
import { DemoResetButton } from "@/components/DemoResetButton";
import { DoseReminderToggle } from "@/components/DoseReminderToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PageHeader } from "@/components/ui/PageHeader";
import Link from "next/link";

const moreLinks = [
  { href: "/alerts", label: "Alerts", meta: "What needs attention" },
  { href: "/expiry", label: "Expiry", meta: "Dates & disposal" },
  { href: "/travel", label: "Travel", meta: "Pack for a trip" },
  { href: "/report", label: "Report", meta: "Print for appointments" },
  { href: "/activity", label: "Activity", meta: "Recent events" },
  { href: "/scan", label: "Scan", meta: "Bottle camera & hardware" },
];

export default function SettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6">
      <PageHeader
        title="Settings"
        subtitle="Reminders and tools. Reminder only — not medical advice."
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
          More
        </h2>
        <ul className="overflow-hidden rounded-2xl bg-[var(--surface)] shadow-sm shadow-black/[0.04]">
          {moreLinks.map((item, i) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex min-h-14 items-center justify-between gap-3 px-4 py-3 transition duration-150 active:bg-[var(--surface-tint)] ${
                  i > 0 ? "border-t border-[var(--border)]" : ""
                }`}
              >
                <div>
                  <p className="text-[15px] font-semibold text-[var(--text-primary)]">
                    {item.label}
                  </p>
                  <p className="text-sm text-[var(--text-secondary)]">{item.meta}</p>
                </div>
                <span className="text-[var(--text-secondary)]" aria-hidden>
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
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
