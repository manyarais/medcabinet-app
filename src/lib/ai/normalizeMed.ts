// Medication normalization + entity matching (RxNorm-backed).
// Turns messy label text into a standardized identity without ever touching
// the original wording, and explains when two records look like the same
// medication. Strength/form conflicts are heavily penalized — name similarity
// alone can never merge different strengths or release forms.

import { prisma } from "@/lib/db";
import { recordAudit } from "@/lib/ai/audit";
import type { Medication } from "@prisma/client";

export const NORMALIZE_VERSION = "normalize-v1";

export type NormalizationCandidate = {
  rxcui: string;
  normalized_name: string;
  score: number;
  tty: string | null;
  why: string;
};

export type NormalizationResult = {
  raw_name: string;
  normalized_name: string | null;
  rxcui: string | null;
  generic_name: string | null;
  strength: string | null;
  dosage_form: string | null;
  match_confidence: number;
  match_status: "MATCHED" | "MULTIPLE_CANDIDATES" | "NO_MATCH" | "CONFLICTING_FIELDS" | "USER_REVIEW_REQUIRED";
  candidate_matches: NormalizationCandidate[];
  requires_user_confirmation: boolean;
  normalization_source: "rxnorm";
  normalization_version: string;
};

export type DuplicateType =
  | "EXACT_SAME_PRODUCT"
  | "SAME_INGREDIENT_DIFFERENT_BRAND"
  | "SAME_INGREDIENT_DIFFERENT_STRENGTH"
  | "SAME_NAME_DIFFERENT_FORM"
  | "POSSIBLE_REFILL"
  | "POSSIBLE_OCR_DUPLICATE"
  | "NOT_A_DUPLICATE";

export type DuplicateFinding = {
  duplicate_type: DuplicateType;
  existing_medication_id: number;
  new_medication_id: number;
  explanation: string;
  requires_review: boolean;
};

// ---- step 1: deterministic text normalization (pure, tested) ----

const ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\btabs?\b/gi, "tablet"],
  [/\bcaps?\b/gi, "capsule"],
  [/\bsoln\b/gi, "solution"],
  [/\bsusp\b/gi, "suspension"],
  [/\ber\b|\bxr\b|\bxl\b/gi, "extended-release"],
  [/\bir\b/gi, "immediate-release"],
  [/\bhcl\b/gi, "hydrochloride"],
  [/\bapap\b/gi, "acetaminophen"],
  [/\basa\b/gi, "aspirin"],
  [/\bmcg\b|\bug\b/gi, "mcg"],
  [/\bmilligrams?\b/gi, "mg"],
  [/\bmillilit(er|re)s?\b/gi, "ml"],
];

export function normalizeLabelText(raw: string): string {
  let text = raw.replace(/\[\?\]/g, " ").replace(/[^\w.%/\- ]/g, " ");
  for (const [re, out] of ABBREVIATIONS) text = text.replace(re, out);
  return text
    .replace(/(\d)\s*(mg|mcg|g|ml|%)\b/gi, "$1 $2") // glue "500MG" -> "500 mg"
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Pull "500 mg"-style strengths out of text. Decimals preserved. */
export function extractStrengths(text: string): string[] {
  const matches = normalizeLabelText(text).match(/\d+(?:\.\d+)?\s?(?:mg|mcg|g|ml|%)(?:\/\d+(?:\.\d+)?\s?(?:mg|mcg|g|ml))?/g);
  return [...new Set((matches ?? []).map((s) => s.replace(/\s+/g, " ").trim()))];
}

const FORM_WORDS = [
  "tablet", "capsule", "solution", "suspension", "syrup", "liquid", "cream",
  "ointment", "gel", "patch", "spray", "drops", "inhaler", "injection",
  "suppository", "lozenge", "powder", "chewable",
];

export function extractForm(text: string): string | null {
  const t = normalizeLabelText(text);
  const release = /extended-release/.test(t)
    ? "extended-release "
    : /immediate-release/.test(t)
      ? "immediate-release "
      : "";
  for (const form of FORM_WORDS) {
    if (t.includes(form)) return `${release}${form}`.trim();
  }
  return release ? release.trim() : null;
}

/** Do two strength lists conflict? (both non-empty and disjoint) */
export function strengthsConflict(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  return !a.some((s) => b.includes(s));
}

// ---- steps 2-3: RxNorm candidates + scoring ----

type ApproximateTermResponse = {
  approximateGroup?: {
    candidate?: Array<{ rxcui?: string; score?: string; name?: string }>;
  };
};

type AllPropertiesResponse = {
  propConceptGroup?: {
    propConcept?: Array<{ propName?: string; propValue?: string }>;
  };
};

async function rxnormCandidates(term: string): Promise<NormalizationCandidate[]> {
  const url = new URL("https://rxnav.nlm.nih.gov/REST/approximateTerm.json");
  url.searchParams.set("term", term);
  url.searchParams.set("maxEntries", "8");
  const res = await fetch(url.toString(), { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const data = (await res.json()) as ApproximateTermResponse;
  const seen = new Set<string>();
  const out: NormalizationCandidate[] = [];
  for (const c of data.approximateGroup?.candidate ?? []) {
    if (!c.rxcui || !c.name || seen.has(c.rxcui)) continue;
    seen.add(c.rxcui);
    out.push({
      rxcui: c.rxcui,
      normalized_name: c.name,
      score: Number(c.score ?? 0) / 100,
      tty: null,
      why: "RxNorm approximate name match",
    });
  }
  return out;
}

async function rxcuiTty(rxcui: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://rxnav.nlm.nih.gov/REST/rxcui/${encodeURIComponent(rxcui)}/allProperties.json?prop=all`,
      { cache: "no-store", signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as AllPropertiesResponse;
    return (
      data.propConceptGroup?.propConcept?.find((p) => p.propName === "TTY")?.propValue ?? null
    );
  } catch {
    return null;
  }
}

/**
 * Score an RxNorm candidate against what the label said. Name similarity can
 * never outrun a strength or form conflict (spec: heavy penalty).
 * Pure — exported for tests.
 */
export function scoreCandidate(candidate: {
  nameScore: number; // 0..1 from RxNorm
  labelStrengths: string[];
  candidateStrengths: string[];
  labelForm: string | null;
  candidateForm: string | null;
}): number {
  let score = candidate.nameScore * 0.5;
  if (candidate.labelStrengths.length && candidate.candidateStrengths.length) {
    score += candidate.labelStrengths.some((s) => candidate.candidateStrengths.includes(s)) ? 0.3 : -0.6;
  } else {
    score += 0.1; // strength unknown on one side — neither reward nor conflict
  }
  if (candidate.labelForm && candidate.candidateForm) {
    score += candidate.candidateForm.includes(candidate.labelForm) ||
      candidate.labelForm.includes(candidate.candidateForm)
      ? 0.2
      : -0.3;
  } else {
    score += 0.05;
  }
  return Math.max(0, Math.min(1, score));
}

export async function normalizeMedication(input: {
  rawName: string;
  genericName?: string | null;
  strengthText?: string | null;
  formText?: string | null;
  medicationId?: number;
}): Promise<NormalizationResult> {
  const rawName = input.rawName.trim();
  const labelText = [rawName, input.genericName, input.strengthText, input.formText]
    .filter(Boolean)
    .join(" ");
  const labelStrengths = extractStrengths(labelText);
  const labelForm = extractForm(labelText);

  const base: Omit<NormalizationResult, "match_status" | "requires_user_confirmation"> = {
    raw_name: rawName,
    normalized_name: null,
    rxcui: null,
    generic_name: input.genericName?.trim() || null,
    strength: labelStrengths[0] ?? input.strengthText?.trim() ?? null,
    dosage_form: labelForm,
    match_confidence: 0,
    candidate_matches: [],
    normalization_source: "rxnorm",
    normalization_version: NORMALIZE_VERSION,
  };

  let candidates: NormalizationCandidate[] = [];
  try {
    // Query with name + strength so RxNorm can return the precise product.
    candidates = await rxnormCandidates(
      normalizeLabelText([rawName, labelStrengths[0] ?? "", labelForm ?? ""].join(" ")),
    );
    if (candidates.length === 0) candidates = await rxnormCandidates(normalizeLabelText(rawName));
  } catch {
    // RxNorm down — report NO_MATCH rather than guessing.
  }

  const scored = candidates
    .map((c) => ({
      ...c,
      score: scoreCandidate({
        nameScore: c.score,
        labelStrengths,
        candidateStrengths: extractStrengths(c.normalized_name),
        labelForm,
        candidateForm: extractForm(c.normalized_name),
      }),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  let result: NormalizationResult;
  const top = scored[0];
  const second = scored[1];

  if (!top || top.score < 0.35) {
    result = { ...base, candidate_matches: scored, match_status: "NO_MATCH", requires_user_confirmation: true };
  } else if (
    second &&
    top.score - second.score < 0.12 &&
    // Close candidates that differ in strength or release form must never be
    // silently merged (e.g. metformin IR vs ER).
    (strengthsConflict(extractStrengths(top.normalized_name), extractStrengths(second.normalized_name)) ||
      extractForm(top.normalized_name) !== extractForm(second.normalized_name))
  ) {
    result = {
      ...base,
      candidate_matches: scored,
      match_confidence: top.score,
      match_status: "MULTIPLE_CANDIDATES",
      requires_user_confirmation: true,
    };
  } else if (strengthsConflict(labelStrengths, extractStrengths(top.normalized_name))) {
    result = {
      ...base,
      candidate_matches: scored,
      match_confidence: top.score,
      match_status: "CONFLICTING_FIELDS",
      requires_user_confirmation: true,
    };
  } else {
    top.tty = await rxcuiTty(top.rxcui);
    result = {
      ...base,
      normalized_name: top.normalized_name,
      rxcui: top.rxcui,
      candidate_matches: scored,
      match_confidence: top.score,
      match_status: "MATCHED",
      requires_user_confirmation: top.score < 0.7,
    };
  }

  void recordAudit({
    feature: "normalize",
    promptVersion: NORMALIZE_VERSION,
    inputRefs: { medicationId: input.medicationId ?? null, rawName },
    output: result,
    confidence: result.match_confidence,
  });
  return result;
}

// ---- entity matching / duplicate detection ----

function ingredientKey(med: Pick<Medication, "genericName" | "brandName" | "normalizedName">): string {
  return normalizeLabelText(med.genericName || med.normalizedName || med.brandName)
    .replace(/\d+(?:\.\d+)?\s?(?:mg|mcg|g|ml|%)/g, "")
    .replace(/\b(oral|tablet|capsule|extended-release|immediate-release|solution)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pure comparator — exported for tests. */
export function classifyPair(
  a: Pick<Medication, "id" | "brandName" | "genericName" | "normalizedName" | "dosage" | "form" | "personName" | "rxNumber">,
  b: Pick<Medication, "id" | "brandName" | "genericName" | "normalizedName" | "dosage" | "form" | "personName" | "rxNumber">,
): DuplicateFinding | null {
  const sameOwner = (a.personName ?? "") === (b.personName ?? "");
  const nameA = normalizeLabelText(a.brandName);
  const nameB = normalizeLabelText(b.brandName);
  const ingA = ingredientKey(a);
  const ingB = ingredientKey(b);
  const sameIngredient = Boolean(ingA) && ingA === ingB;
  const strengthsA = extractStrengths([a.dosage, a.brandName, a.normalizedName].filter(Boolean).join(" "));
  const strengthsB = extractStrengths([b.dosage, b.brandName, b.normalizedName].filter(Boolean).join(" "));
  const conflict = strengthsConflict(strengthsA, strengthsB);
  const formA = extractForm([a.form, a.normalizedName].filter(Boolean).join(" "));
  const formB = extractForm([b.form, b.normalizedName].filter(Boolean).join(" "));

  const finding = (type: DuplicateType, explanation: string, requiresReview = true): DuplicateFinding => ({
    duplicate_type: type,
    existing_medication_id: a.id,
    new_medication_id: b.id,
    explanation,
    requires_review: requiresReview,
  });

  if (nameA === nameB && !conflict && sameOwner) {
    if (a.rxNumber && b.rxNumber && a.rxNumber !== b.rxNumber) {
      return finding("POSSIBLE_REFILL", `Same product and owner but different Rx numbers (${a.rxNumber} vs ${b.rxNumber}) — this looks like a refill.`);
    }
    return finding("EXACT_SAME_PRODUCT", `Both records are ${a.brandName}${strengthsA[0] ? ` ${strengthsA[0]}` : ""} for the same person.`);
  }
  if (sameIngredient && conflict) {
    return finding(
      "SAME_INGREDIENT_DIFFERENT_STRENGTH",
      `Both records contain ${ingA}, but one is ${strengthsA[0] ?? "unknown strength"} and the other is ${strengthsB[0] ?? "unknown strength"}.`,
    );
  }
  if (sameIngredient && nameA !== nameB && !conflict) {
    return finding(
      "SAME_INGREDIENT_DIFFERENT_BRAND",
      `${a.brandName} and ${b.brandName} both contain ${ingA}${strengthsA[0] ? ` ${strengthsA[0]}` : ""}.`,
    );
  }
  if (nameA === nameB && formA && formB && formA !== formB) {
    return finding("SAME_NAME_DIFFERENT_FORM", `Both are named ${a.brandName} but one is a ${formA} and the other a ${formB}.`);
  }
  if (nameA !== nameB && !sameIngredient && levenshteinClose(nameA, nameB)) {
    return finding("POSSIBLE_OCR_DUPLICATE", `"${a.brandName}" and "${b.brandName}" differ by only a character or two — one may be an OCR misread of the other.`);
  }
  return null;
}

function levenshteinClose(a: string, b: string): boolean {
  if (!a || !b || Math.abs(a.length - b.length) > 2 || a.length < 4) return false;
  // Cheap bounded edit distance (≤2) — enough for OCR slips.
  const dp = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const cur = dp[i];
      dp[i] = Math.min(dp[i] + 1, dp[i - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
  }
  return dp[a.length] <= 2;
}

/** Compare one medication against the rest of the (non-disposed) inventory. */
export async function findDuplicates(medicationId: number): Promise<DuplicateFinding[]> {
  const med = await prisma.medication.findUnique({ where: { id: medicationId } });
  if (!med) return [];
  const others = await prisma.medication.findMany({
    where: { id: { not: medicationId }, status: { not: "disposed" } },
  });
  const findings: DuplicateFinding[] = [];
  for (const other of others) {
    const hit = classifyPair(other, med);
    if (hit) findings.push(hit);
  }
  return findings;
}
