// Prescription calendar day view (Phase 5).

import { PrescriptionCalendar } from "@/components/PrescriptionCalendar";
import { isValidDateString, todayLocal } from "@/lib/dates";

type PageProps = {
  searchParams: Promise<{ date?: string }>;
};

export default async function CalendarPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const requested = params.date?.trim() ?? "";
  const initialDate = isValidDateString(requested) ? requested : todayLocal();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Calendar</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Reminder list for scheduled prescription doses. This is not medical advice.
        </p>
      </header>
      <PrescriptionCalendar initialDate={initialDate} />
    </main>
  );
}
