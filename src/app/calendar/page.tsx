// Prescription calendar month view (Phase 5).

import { PrescriptionCalendar } from "@/components/PrescriptionCalendar";
import { isValidDateString, todayLocal } from "@/lib/dates";
import Link from "next/link";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ date?: string }>;
};

export default async function CalendarPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requested = params.date?.trim() ?? "";
  const initialDate = isValidDateString(requested) ? requested : todayLocal();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8">
      <header className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Calendar</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Month view of scheduled prescription doses. Reminder only — not medical advice.
            </p>
          </div>
          <Link
            href="/settings"
            className="text-sm font-medium text-[var(--brand-sage-deep)] hover:underline"
          >
            Reminder settings
          </Link>
        </div>
      </header>
      <PrescriptionCalendar initialDate={initialDate} />
    </main>
  );
}
