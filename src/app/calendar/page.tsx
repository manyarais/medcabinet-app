// Prescription calendar.

import { PrescriptionCalendar } from "@/components/PrescriptionCalendar";
import { PageHeader } from "@/components/ui/PageHeader";
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
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6 lg:max-w-5xl">
      <div className="mb-5 flex items-end justify-between gap-3">
        <PageHeader
          className="mb-0"
          title="Calendar"
          subtitle="Scheduled doses — reminder only, not medical advice."
        />
        <Link
          href="/settings"
          className="mb-1 shrink-0 rounded-full bg-[var(--surface-tint)] px-3 py-2 text-xs font-semibold text-[var(--primary)] transition duration-150 active:scale-95"
        >
          Reminders
        </Link>
      </div>
      <PrescriptionCalendar initialDate={initialDate} />
    </main>
  );
}
