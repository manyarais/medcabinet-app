// Home page — medication search (Phase 1).

import { DrugSearch } from "@/components/DrugSearch";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8">
      <header className="mb-8">
        <p className="text-sm font-medium tracking-wide text-[var(--brand-sage-deep)]">Pillio</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
          Find a medication
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          See what you already have, then browse products you can add. Scanning the bottle
          at the cabinet is the fastest way to add something new.
        </p>
      </header>

      <DrugSearch />
    </main>
  );
}
