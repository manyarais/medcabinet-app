// Duplicate active-ingredient detection.
// Informational only: flags products sharing an ingredient, never judges
// whether a combination is safe and never calculates doses.

export type IngredientOverlap = {
  ingredient: string;
  medications: Array<{ id: number; brandName: string; compartment: number | null }>;
};

/** "acetaminophen, dextromethorphan HBr" → ["acetaminophen", "dextromethorphan"] */
export function splitIngredients(genericName: string | null | undefined): string[] {
  if (!genericName) return [];
  return genericName
    .toLowerCase()
    .split(/[,;/]| and /)
    .map((part) =>
      part
        .replace(/\[\?\]/g, "")
        // Strip salt/form suffixes so "cetirizine hydrochloride" matches "cetirizine HCl".
        .replace(/\b(hcl|hbr|hydrochloride|hydrobromide|sodium|potassium|citrate|sulfate|succinate|tartrate|maleate)\b/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((part) => part.length > 2);
}

type MedLike = {
  id: number;
  brandName: string;
  genericName: string | null;
  compartment: number | null;
};

/** Every ingredient that appears in 2+ household medications. */
export function findIngredientOverlaps(meds: MedLike[]): IngredientOverlap[] {
  const byIngredient = new Map<string, MedLike[]>();
  for (const med of meds) {
    for (const ingredient of new Set(splitIngredients(med.genericName))) {
      const list = byIngredient.get(ingredient) ?? [];
      list.push(med);
      byIngredient.set(ingredient, list);
    }
  }
  return [...byIngredient.entries()]
    .filter(([, list]) => list.length >= 2)
    .map(([ingredient, list]) => ({
      ingredient,
      medications: list.map(({ id, brandName, compartment }) => ({ id, brandName, compartment })),
    }));
}

/** Overlaps involving one specific medication (e.g. the one just scanned). */
export function overlapsForMedication(
  med: MedLike,
  household: MedLike[],
): IngredientOverlap[] {
  return findIngredientOverlaps([med, ...household.filter((m) => m.id !== med.id)]).filter(
    (overlap) => overlap.medications.some((m) => m.id === med.id),
  );
}
