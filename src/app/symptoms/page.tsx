// Symptom lookup page (Phase 3).

import { SymptomSearch } from "@/components/SymptomSearch";

export default function SymptomsPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-zinc-900">Symptoms</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Shows OTC medications already in your cabinet whose labels mention what you type.
          Tapping Take this saves a log in your database. This is not medical advice.
        </p>
      </header>
      <SymptomSearch />
    </main>
  );
}
