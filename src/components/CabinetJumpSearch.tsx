"use client";

// Compact jump search on the cabinet page — filter owned meds and open their detail page.

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

export type CabinetJumpMed = {
  id: number;
  brandName: string;
  genericName: string | null;
  compartment: number | null;
  outOfCabinet: boolean;
};

type Props = {
  medications: CabinetJumpMed[];
};

export function CabinetJumpSearch({ medications }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    return medications
      .filter((med) => {
        const brand = med.brandName.toLowerCase();
        const generic = med.genericName?.toLowerCase() ?? "";
        return brand.includes(needle) || generic.includes(needle);
      })
      .slice(0, 8);
  }, [medications, query]);

  function goToMed(brandName: string) {
    setIsOpen(false);
    setQuery("");
    router.push(`/drugs/${encodeURIComponent(brandName)}`);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (matches.length === 0) return;
    goToMed(matches[0]!.brandName);
  }

  return (
    <div className="relative mb-6">
      <form onSubmit={handleSubmit}>
        <label htmlFor="cabinet-jump-search" className="sr-only">
          Find a medication in your cabinet
        </label>
        <input
          id="cabinet-jump-search"
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Allow click on a result before closing.
            window.setTimeout(() => setIsOpen(false), 150);
          }}
          placeholder="Find a med…"
          className="min-h-11 w-full rounded-full border-0 bg-[var(--surface-tint)] px-5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--primary)]/25"
          autoComplete="off"
          enterKeyHint="go"
        />
      </form>

      {isOpen && query.trim() && (
        <ul className="absolute z-10 mt-2 max-h-64 w-full overflow-auto rounded-2xl bg-[var(--surface)] py-1 shadow-lg shadow-black/10">
          {matches.length === 0 ? (
            <li className="px-4 py-3 text-sm text-[var(--text-secondary)]">
              No match in your cabinet.
            </li>
          ) : (
            matches.map((med) => (
              <li key={med.id}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => goToMed(med.brandName)}
                  className="flex min-h-11 w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition duration-150 active:bg-[var(--surface-tint)]"
                >
                  <span className="min-w-0 truncate font-semibold text-[var(--text-primary)]">
                    {med.brandName}
                    {med.outOfCabinet && (
                      <span className="ml-2 rounded-full bg-[var(--warning-bg)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--warning-text)]">
                        Out
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs font-medium text-[var(--text-secondary)]">
                    {med.compartment != null ? med.compartment : "—"}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
