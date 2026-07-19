// Symptom lookup page.

import { SymptomSearch } from "@/components/SymptomSearch";
import { PageHeader } from "@/components/ui/PageHeader";

export default function SymptomsPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6">
      <PageHeader
        title="Symptoms"
        subtitle="Match what you feel to OTC labels already in your cabinet. Not medical advice."
      />
      <SymptomSearch />
    </main>
  );
}
