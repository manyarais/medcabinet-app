// Distinct person chip + bay badge — never "Household · 13".

type Props = {
  personName?: string | null;
  compartment?: number | null;
  className?: string;
};

export function MedMetaChips({
  personName,
  compartment,
  className = "",
}: Props) {
  const person = personName?.trim() || "Household";

  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="inline-flex items-center rounded-full bg-[var(--surface-tint)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-secondary)]">
        {person}
      </span>
      {compartment != null && (
        <span className="inline-flex items-center rounded-full bg-[var(--brand-tint)] px-2 py-0.5 text-[11px] font-bold tabular-nums text-[var(--primary)]">
          #{compartment}
        </span>
      )}
    </span>
  );
}
