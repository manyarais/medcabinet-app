// Home page — medication search (Phase 1).

import { DrugSearch } from "@/components/DrugSearch";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8">
      <header className="mb-8">
        <p className="text-sm font-medium tracking-wide text-teal-800">MedCabinet</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
          Find a medication
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Search by brand or generic name. Misspellings are normalized through RxNorm
          before we look up the FDA label.
        </p>
      </header>

      <DrugSearch />
    </main>
  );
}
