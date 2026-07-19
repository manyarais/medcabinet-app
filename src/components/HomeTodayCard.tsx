import Link from "next/link";
import type { TodayDoseSummary } from "@/lib/homeDashboard";

type Props = {
  summaries: TodayDoseSummary[];
};

/** Home hero — soft sage diagonal gradient only (reserved effect). */
export function HomeTodayCard({ summaries }: Props) {
  return (
    <Link
      href="/calendar"
      className="block w-full rounded-2xl border border-[var(--brand-tint)]/50 p-5 shadow-[var(--shadow-soft)] transition duration-150 ease-out active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
      style={{ background: "var(--gradient-today)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--surface)]/70">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <rect
                x="3"
                y="5"
                width="18"
                height="16"
                rx="2"
                stroke="var(--primary)"
                strokeWidth="1.75"
              />
              <path
                d="M3 10h18M8 3v4M16 3v4"
                stroke="var(--primary)"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <h2 className="text-sm font-bold tracking-wide text-[var(--primary)]">Today</h2>
        </div>
        <span className="text-xs font-semibold text-[var(--primary)]">Open</span>
      </div>

      {summaries.length === 0 ? (
        <p className="mt-4 text-[15px] text-[var(--text-secondary)]">
          No doses scheduled today
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {summaries.map((row) => (
            <li
              key={row.medicationId}
              className="flex items-center justify-between gap-3 rounded-xl bg-[var(--surface)]/80 px-3 py-2.5 text-[15px]"
            >
              <span className="min-w-0 truncate font-semibold text-[var(--text-primary)]">
                {row.brandName}
              </span>
              <span className="shrink-0 tabular-nums text-[var(--text-secondary)]">
                {row.taken}/{row.doses}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Link>
  );
}
