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
          placeholder="Find a med in your cabinet…"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-[var(--brand-sage-deep)] placeholder:text-zinc-400 focus:ring-2"
          autoComplete="off"
          enterKeyHint="go"
        />
      </form>

      {isOpen && query.trim() && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-md">
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-zinc-500">No match in your cabinet.</li>
          ) : (
            matches.map((med) => (
              <li key={med.id}>
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => goToMed(med.brandName)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--brand-sage)]/40"
                >
                  <span className="min-w-0 truncate font-medium text-zinc-900">
                    {med.brandName}
                    {med.outOfCabinet && (
                      <span className="ml-2 rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                        Out
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {med.compartment != null ? `#${med.compartment}` : "—"}
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
