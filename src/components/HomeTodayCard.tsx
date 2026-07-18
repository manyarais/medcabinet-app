import Link from "next/link";
import type { TodayDoseSummary } from "@/lib/homeDashboard";

type Props = {
  summaries: TodayDoseSummary[];
};

export function HomeTodayCard({ summaries }: Props) {
  return (
    <Link
      href="/calendar"
      className="block rounded-lg border border-zinc-200 bg-white px-4 py-4 transition-colors hover:border-[var(--brand-sage-deep)]"
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Today
        </h2>
        <span className="text-xs font-medium text-[var(--brand-sage-deep)]">Calendar →</span>
      </div>

      {summaries.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-600">No doses scheduled today</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {summaries.map((row) => (
            <li
              key={row.medicationId}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="min-w-0 truncate font-medium text-zinc-900">
                {row.brandName}
              </span>
              <span className="shrink-0 tabular-nums text-zinc-600">
                {row.taken} of {row.doses} dose{row.doses === 1 ? "" : "s"} taken
              </span>
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}
