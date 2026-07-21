// PRODUCT SAFETY CONSTRAINT (intentional):
// This module may ONLY extract symptom terms from free text.
// It must NEVER select, rank, suggest, or name medications.
// Cabinet matching stays in matchOtcCabinetMeds / /api/symptoms.

const PARSE_TIMEOUT_MS = 5000;

const SYSTEM_PROMPT = `You extract symptom terms from patient free text for a household medicine-cabinet app.

STRICT RULES:
- Return ONLY symptom / complaint terms suitable for matching FDA OTC drug-label "uses" / indications text.
- Normalize colloquial language to plain clinical label vocabulary (examples: "stuffed up" → "nasal congestion", "head pounding" → "headache", "i am having a headache" → "headache", "can't sleep" → "insomnia", "tummy ache" → "stomach pain").
- Output strict JSON only: {"symptoms":["..."]} with lowercase strings, no duplicates.
- Return {"symptoms":[]} if no symptoms are present.
- NEVER include medication or product names (Advil, Tylenol, ibuprofen, etc.).
- NEVER give advice, diagnoses, treatment suggestions, or answers to "what should I take".
- If the user only asks for a drug recommendation, return {"symptoms":[]}.
- No markdown, no explanation — JSON object only.`;

/** Longer phrases first so "nasal congestion" wins over "congestion". */
const KNOWN_SYMPTOM_PHRASES = [
  "nasal congestion",
  "runny nose",
  "sore throat",
  "stomach pain",
  "stomach ache",
  "tummy ache",
  "belly ache",
  "muscle pain",
  "joint pain",
  "chest congestion",
  "headache",
  "migraine",
  "fever",
  "cough",
  "insomnia",
  "heartburn",
  "nausea",
  "allergy",
  "allergies",
  "congestion",
  "sinus",
  "cold",
  "flu",
  "ache",
  "pain",
  "itch",
  "rash",
] as const;

/** Map colloquial compounds → label-friendly search terms (include region + sensation). */
const COLLOQUIAL_EXPANSIONS: Array<{ pattern: RegExp; terms: string[] }> = [
  {
    pattern: /\b(stomach|tummy|belly)\s+aches?\b/i,
    terms: ["stomach pain", "stomach", "ache"],
  },
  {
    pattern: /\b(stomach|tummy|belly)\s+pains?\b/i,
    terms: ["stomach pain", "stomach", "pain"],
  },
  { pattern: /\bhead\s+aches?\b/i, terms: ["headache"] },
  {
    pattern: /\b(back|tooth|ear|neck|muscle|joint)\s+(ache|pain)s?\b/i,
    terms: [], // filled dynamically from the match
  },
];

const STOP_TOKENS = new Set([
  "i",
  "i'm",
  "im",
  "am",
  "a",
  "an",
  "the",
  "and",
  "or",
  "my",
  "me",
  "having",
  "have",
  "has",
  "had",
  "got",
  "getting",
  "with",
  "for",
  "to",
  "of",
  "on",
  "in",
  "is",
  "are",
  "was",
  "been",
  "very",
  "really",
  "so",
  "like",
  "feel",
  "feeling",
  "feels",
]);


export type ParsedSymptoms = {
  symptoms: string[];
};

function looksLikeMedicationOrAdvice(term: string): boolean {
  const t = term.toLowerCase().trim();
  if (!t) return true;
  if (
    /\b(advil|tylenol|motrin|aleve|ibuprofen|acetaminophen|aspirin|benadryl|mucinex|nyquil|dayquil|claritin|zyrtec|pepto|tums)\b/.test(
      t,
    )
  ) {
    return true;
  }
  if (
    /^(what|which|should|recommend|take|dose|medication|medicine|drug|pill)\b/.test(t)
  ) {
    return true;
  }
  return false;
}

/** Keep extract-only terms; drop anything that looks like a drug or advice fragment. */
export function filterExtractedSymptoms(symptoms: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of symptoms) {
    if (typeof raw !== "string") continue;
    const term = raw.trim().toLowerCase().replace(/\s+/g, " ");
    if (!term || looksLikeMedicationOrAdvice(term)) continue;
    if (seen.has(term)) continue;
    seen.add(term);
    out.push(term);
  }
  return out;
}

/**
 * Offline fallback when Gemini is unset/fails: pull known label-friendly
 * symptom phrases out of the free text (still not medication advice).
 * Keeps body-region words (e.g. stomach) together with ache/pain — not ache alone.
 */
const SENSATION_ONLY = new Set(["ache", "pain", "itch", "rash"]);

export function extractSymptomsHeuristically(text: string): string[] {
  const lower = text.toLowerCase().replace(/\s+/g, " ").trim();
  const found: string[] = [];

  const push = (term: string) => {
    const t = term.trim().toLowerCase();
    if (!t || found.includes(t)) return;
    found.push(t);
  };

  // Colloquial "stomach ache" → stomach pain + stomach + ache (not only "ache").
  for (const { pattern, terms } of COLLOQUIAL_EXPANSIONS) {
    const match = lower.match(pattern);
    if (!match) continue;
    if (terms.length > 0) {
      for (const term of terms) push(term);
      continue;
    }
    const region = (match[1] ?? "").toLowerCase();
    const sensation = (match[2] ?? "").toLowerCase();
    if (region && sensation) {
      push(`${region} ${sensation}`);
      push(region);
      push(sensation);
    }
  }

  for (const phrase of KNOWN_SYMPTOM_PHRASES) {
    if (!lower.includes(phrase)) continue;
    const normalized =
      phrase === "allergies"
        ? "allergy"
        : phrase === "stomach ache" ||
            phrase === "tummy ache" ||
            phrase === "belly ache"
          ? "stomach pain"
          : phrase;
    // Skip short sensation words already covered (ache ⊂ headache), but keep
    // region words like "stomach" even when "stomach pain" is present.
    if (
      SENSATION_ONLY.has(normalized) &&
      found.some((f) => f.includes(normalized) && f.length > normalized.length)
    ) {
      continue;
    }
    if (found.includes(normalized)) continue;
    push(normalized);
  }

  // Multi-word inputs: also keep meaningful tokens (stomach from "stomach ache").
  if (/\s/.test(lower)) {
    for (const token of lower.split(/\s+/)) {
      const clean = token.replace(/[^a-z\-]/g, "");
      if (clean.length < 3 || STOP_TOKENS.has(clean)) continue;
      if (looksLikeMedicationOrAdvice(clean)) continue;
      if (found.includes(clean)) continue;
      if (
        SENSATION_ONLY.has(clean) &&
        found.some((f) => f.includes(clean) && f.length > clean.length)
      ) {
        continue;
      }
      push(clean);
    }
  }

  return filterExtractedSymptoms(found);
}

/**
 * Call Gemini to extract symptoms only.
 * Returns null when unset key / timeout / failure — callers fall back.
 */
export async function extractSymptomsFromText(
  text: string,
): Promise<string[] | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;

  const trimmed = text.trim();
  if (!trimmed) return [];

  const model =
    process.env.GEMINI_SYMPTOM_MODEL?.trim() || "gemini-2.0-flash";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PARSE_TIMEOUT_MS);

  try {
    const url = new URL(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    );
    url.searchParams.set("key", key);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: trimmed }],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 256,
          responseMimeType: "application/json",
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const textBlock =
      data.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("")
        .trim() ?? "";
    const jsonMatch = textBlock.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]) as ParsedSymptoms;
    if (!Array.isArray(parsed.symptoms)) return null;
    return filterExtractedSymptoms(parsed.symptoms);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Multi-word / sentence → parse; single token → direct match. */
export function looksLikeNaturalLanguage(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return /\s/.test(trimmed);
}

/**
 * Resolve which symptom strings to match against cabinet labels.
 * Prefer Gemini extracts merged with local expansions so "stomach ache"
 * does not collapse to only "ache".
 */
export function resolveSymptomsForMatch(
  rawInput: string,
  parsedFromAi: string[] | null,
): string[] {
  const heuristic = extractSymptomsHeuristically(rawInput);
  if (parsedFromAi && parsedFromAi.length > 0) {
    return filterExtractedSymptoms([...parsedFromAi, ...heuristic]);
  }
  if (heuristic.length > 0) return heuristic;
  const trimmed = rawInput.trim().toLowerCase();
  return trimmed ? [trimmed] : [];
}
