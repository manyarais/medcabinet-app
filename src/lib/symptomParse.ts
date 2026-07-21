// PRODUCT SAFETY CONSTRAINT (intentional):
// This module may ONLY extract symptom terms from free text.
// It must NEVER select, rank, suggest, or name medications.
// Cabinet matching stays in matchOtcCabinetMeds / /api/symptoms.

const PARSE_TIMEOUT_MS = 3000;

const SYSTEM_PROMPT = `You extract symptom terms from patient free text for a household medicine-cabinet app.

STRICT RULES:
- Return ONLY symptom / complaint terms suitable for matching FDA OTC drug-label "uses" / indications text.
- Normalize colloquial language to plain clinical label vocabulary (examples: "stuffed up" → "nasal congestion", "head pounding" → "headache", "can't sleep" → "insomnia", "tummy ache" → "stomach pain").
- Output strict JSON only: {"symptoms":["..."]} with lowercase strings, no duplicates.
- Return {"symptoms":[]} if no symptoms are present.
- NEVER include medication or product names (Advil, Tylenol, ibuprofen, etc.).
- NEVER give advice, diagnoses, treatment suggestions, or answers to "what should I take".
- If the user only asks for a drug recommendation, return {"symptoms":[]}.
- No markdown, no explanation — JSON object only.`;

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
 * Call Gemini to extract symptoms only.
 * Returns null when unset key / timeout / failure — callers fall back to raw text.
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
