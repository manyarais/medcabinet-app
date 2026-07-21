// Plain-language label explanations. Hybrid per the spec:
//   1. deterministic parser turns common pharmacy sigs into structured fields
//   2. a controlled template renders the plain sentence
//   3. the LLM is used ONLY when parsing fails, and
//   4. a verification pass checks numbers/negations/key terms survived —
//      if it fails, we refuse rather than show a rewrite that drifted.
// Original label text is always returned alongside; it stays the source.

import { chatJSON, aiAvailable } from "@/lib/ai/openai";
import { recordAudit } from "@/lib/ai/audit";

export const PLAIN_PROMPT_VERSION = "plain-language-v1";

export type PlainLanguageResult = {
  original_text: string;
  plain_language_text: string | null;
  preserved_values: Record<string, string>;
  warnings: string[];
  confidence: number;
  requires_review: boolean;
  refused_reason: string | null;
  source: "template" | "ai" | "refused";
};

export type ParsedSig = {
  action: string;
  quantity: string; // "1", "1-2", "0.5"
  unit: string; // tablet(s), capsule(s), mL...
  route: string | null;
  frequencyText: string | null; // rendered frequency phrase
  mealRelation: string | null;
  asNeeded: boolean;
  maxPerDay: string | null;
};

const UNIT_WORDS =
  "tablet|tablets|tab|tabs|capsule|capsules|cap|caps|caplet|caplets|softgel|softgels|pill|pills|ml|milliliter|milliliters|teaspoon|teaspoons|tsp|drop|drops|puff|puffs|patch|patches|spray|sprays";

const NUMBER_WORDS: Record<string, string> = {
  one: "1", two: "2", three: "3", four: "4", five: "5", six: "6",
  "one-half": "0.5", half: "0.5", "1/2": "0.5",
};

function normalizeNumberWord(word: string): string {
  return NUMBER_WORDS[word.toLowerCase()] ?? word;
}

function pluralUnit(unit: string, quantity: string): string {
  const u = unit.toLowerCase().replace(/s$/, "");
  const map: Record<string, string> = {
    tab: "tablet", cap: "capsule", tsp: "teaspoon",
  };
  const base = map[u] ?? u;
  const isOne = quantity === "1" || quantity === "0.5";
  if (base === "ml") return "mL";
  return isOne && quantity !== "0.5" ? base : `${base}s`;
}

/** Deterministic parse of a common pharmacy sig. Null when not confidently parseable. */
export function parseSig(text: string): ParsedSig | null {
  const t = text.toLowerCase().replace(/\s+/g, " ").trim();

  // Bail out on shapes templates cannot represent safely: tapers, conditionals,
  // multi-step instructions, "then", ranges of days.
  if (/\bthen\b|\btaper\b|\bweek 1\b|\bday 1\b|;|(?:\.\s+\w)/.test(t)) return null;

  const m = t.match(
    new RegExp(
      `^(take|give|chew|dissolve|apply|use|instill|inhale)\\s+(one-half|half|\\d+(?:\\.\\d+)?(?:\\s*-\\s*\\d+)?|one|two|three|four|five|six|1/2)\\s+(${UNIT_WORDS})\\b(.*)$`,
    ),
  );
  if (!m) return null;

  const [, action, rawQty, unit, restRaw] = m;
  const quantity = normalizeNumberWord(rawQty.replace(/\s*-\s*/, "-"));
  let rest = restRaw;

  const route = /by mouth|orally/.test(rest) ? "by mouth" : null;
  rest = rest.replace(/by mouth|orally/g, " ");

  const asNeeded = /as needed|prn/.test(rest);
  rest = rest.replace(/as needed|prn/g, " ");

  let mealRelation: string | null = null;
  const mealPatterns: Array<[RegExp, string]> = [
    [/with (a |each )?meals?|with food/, "with food"],
    [/on an empty stomach|without food/, "on an empty stomach"],
    [/before (each )?meals?|before food/, "before meals"],
    [/after (each )?meals?|after food/, "after meals"],
  ];
  for (const [re, out] of mealPatterns) {
    if (re.test(rest)) {
      mealRelation = out;
      rest = rest.replace(re, " ");
      break;
    }
  }

  let frequencyText: string | null = null;
  const freqPatterns: Array<[RegExp, string | ((m: RegExpMatchArray) => string)]> = [
    [/every (\d+)(?:\s*(?:to|-)\s*(\d+))? hours?/, (fm) => (fm[2] ? `every ${fm[1]} to ${fm[2]} hours` : `every ${fm[1]} hours`)],
    // Multi-a-day patterns must come before the bare "daily" pattern, or
    // "twice daily" would half-match as "daily" and leave "twice" behind.
    [/twice daily|twice a day|two times? (?:a|per) day|2 times? (?:a|per) day/, "two times each day"],
    [/three times? (?:a|per) day|3 times? (?:a|per) day|thrice daily/, "three times each day"],
    [/four times? (?:a|per) day|4 times? (?:a|per) day/, "four times each day"],
    [/once daily|once a day|(?:^|\s)daily|every day|once per day/, "one time each day"],
    [/every morning/, "every morning"],
    [/every evening|every night|at bedtime|at night/, "at bedtime"],
    [/every other day/, "every other day"],
    [/once weekly|once a week|weekly/, "one time each week"],
  ];
  for (const [re, out] of freqPatterns) {
    const fm = rest.match(re);
    if (fm) {
      frequencyText = typeof out === "string" ? out : out(fm);
      rest = rest.replace(re, " ");
      break;
    }
  }

  let maxPerDay: string | null = null;
  const maxMatch = rest.match(/(?:do not (?:take|use|exceed)|no) more than (\d+(?:\.\d+)?)\s*(\w+)[^.]*(?:24 hours|day)/);
  if (maxMatch) maxPerDay = `${maxMatch[1]} ${pluralUnit(maxMatch[2], maxMatch[1])} in 24 hours`;
  rest = rest.replace(/(?:do not (?:take|use|exceed)|no) more than [^.]*(?:24 hours|day)/, " ");

  // Anything meaningful left that we did not understand? Refuse the template
  // path — unparsed words could carry conditions we must not drop.
  const leftover = rest
    .replace(/[.,]/g, " ")
    .replace(/\b(a|an|the|of|for|to|per|day|daily|needed|as|and|dose|doses)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (leftover.length > 3) return null;

  return {
    action,
    quantity,
    unit: pluralUnit(unit, quantity),
    route,
    frequencyText,
    mealRelation,
    asNeeded,
    maxPerDay,
  };
}

/** Controlled template render (spec stage 2). */
export function renderSig(sig: ParsedSig): { text: string; preserved: Record<string, string> } {
  const parts: string[] = [
    sig.action.charAt(0).toUpperCase() + sig.action.slice(1),
    sig.quantity,
    sig.unit,
  ];
  if (sig.route) parts.push(sig.route);
  if (sig.frequencyText) parts.push(sig.frequencyText);
  if (sig.mealRelation) parts.push(sig.mealRelation);
  if (sig.asNeeded) parts.push("only when needed");
  let text = `${parts.join(" ")}.`;
  if (sig.maxPerDay) text += ` Never take more than ${sig.maxPerDay}.`;

  const preserved: Record<string, string> = {
    quantity: `${sig.quantity} ${sig.unit}`,
  };
  if (sig.frequencyText) preserved.frequency = sig.frequencyText;
  if (sig.mealRelation) preserved.meal_instruction = sig.mealRelation;
  if (sig.asNeeded) preserved.as_needed = "yes — only when needed";
  if (sig.maxPerDay) preserved.maximum = sig.maxPerDay;
  return { text, preserved };
}

// ---- verification pass (spec stage 4) ----

const CRITICAL_WORDS = [
  "not", "only", "maximum", "before", "after", "with", "without",
  "as needed", "every", "do not", "avoid", "crush", "split", "chew",
];

function numbersIn(text: string): string[] {
  const wordDigits = text
    .toLowerCase()
    .replace(/\bone-half\b|\bhalf\b|\b1\/2\b/g, "0.5")
    .replace(/\bone\b/g, "1").replace(/\btwo\b|\btwice\b/g, "2")
    .replace(/\bthree\b|\bthrice\b/g, "3").replace(/\bfour\b/g, "4")
    .replace(/\bfive\b/g, "5").replace(/\bsix\b/g, "6")
    .replace(/\bonce\b/g, "1").replace(/\bdaily\b/g, "");
  return (wordDigits.match(/\d+(?:\.\d+)?/g) ?? []).sort();
}

/**
 * The rewrite may not lose numbers, negations or timing words present in the
 * original. Numbers must survive exactly (set-wise). Critical words present in
 * the original must appear in the rewrite (with/without checked as phrases).
 */
export function verifyRewrite(original: string, rewrite: string): { ok: boolean; problems: string[] } {
  const problems: string[] = [];
  const origNums = numbersIn(original);
  const newNums = numbersIn(rewrite);
  for (const n of origNums) {
    if (!newNums.includes(n)) problems.push(`number "${n}" missing from rewrite`);
  }
  const lowerOrig = ` ${original.toLowerCase()} `;
  const lowerNew = ` ${rewrite.toLowerCase()} `;
  for (const word of CRITICAL_WORDS) {
    if (lowerOrig.includes(` ${word} `) && !lowerNew.includes(word)) {
      problems.push(`critical word "${word}" missing from rewrite`);
    }
  }
  return { ok: problems.length === 0, problems };
}

const REFUSAL =
  "Pillio cannot simplify this instruction confidently. Review the original label or ask a pharmacist.";

/**
 * Main entry. Only call with USER_CONFIRMED label text (the route enforces
 * this). Never fills gaps from general medication knowledge.
 */
export async function explainInstructions(options: {
  originalText: string;
  medicationId: number;
  warningsText?: string | null;
}): Promise<PlainLanguageResult> {
  const original = options.originalText.trim();
  const warnings = simplifyWarnings(options.warningsText ?? null);

  if (!original) {
    return refusal(original, warnings, "The label has no instruction text to explain.");
  }

  // Stage 1+2: deterministic path.
  const sig = parseSig(original);
  if (sig) {
    const { text, preserved } = renderSig(sig);
    const check = verifyRewrite(original, text);
    if (check.ok) {
      const result: PlainLanguageResult = {
        original_text: original,
        plain_language_text: text,
        preserved_values: preserved,
        warnings,
        confidence: 0.97,
        requires_review: false,
        refused_reason: null,
        source: "template",
      };
      void recordAudit({
        feature: "plain_language",
        promptVersion: PLAIN_PROMPT_VERSION,
        inputRefs: { medicationId: options.medicationId, original },
        output: result,
        confidence: result.confidence,
      });
      return result;
    }
  }

  // Stage 3: AI fallback for text templates can't represent — still verified.
  if (!aiAvailable()) {
    return refusal(original, warnings, "Automatic simplification is unavailable and the instruction is not a standard pattern.");
  }

  const ai = await chatJSON<{ plain: string; preserved: Record<string, string> }>({
    system:
      `You rewrite pharmacy label instructions in plain language for older adults. ` +
      `Rules: change wording ONLY, never meaning. Keep every number, dose, unit, frequency, ` +
      `timing, meal instruction, duration, maximum, "as needed" condition and negation ` +
      `("do not", "avoid", "only") exactly. Never soften warnings. Never add information. ` +
      `If the text is ambiguous, incomplete or a multi-step taper, reply {"plain": ""}. ` +
      `Reply JSON: {"plain": "rewritten text", "preserved": {"quantity": "...", "frequency": "..."}}`,
    user: `Label instruction: "${original}"`,
    maxTokens: 300,
  }).catch(() => null);

  const plain = ai?.plain?.trim() ?? "";
  if (plain) {
    const check = verifyRewrite(original, plain);
    if (check.ok) {
      const result: PlainLanguageResult = {
        original_text: original,
        plain_language_text: plain,
        preserved_values: ai?.preserved ?? {},
        warnings,
        confidence: 0.85,
        requires_review: true, // AI-path rewrites always get the review flag
        refused_reason: null,
        source: "ai",
      };
      void recordAudit({
        feature: "plain_language",
        promptVersion: PLAIN_PROMPT_VERSION,
        inputRefs: { medicationId: options.medicationId, original },
        output: result,
        confidence: result.confidence,
      });
      return result;
    }
    void recordAudit({
      feature: "plain_language",
      promptVersion: PLAIN_PROMPT_VERSION,
      inputRefs: { medicationId: options.medicationId, original },
      output: { rejected: plain, problems: check.problems },
      confidence: 0,
    });
  }

  return refusal(original, warnings, REFUSAL);
}

function refusal(original: string, warnings: string[], reason: string): PlainLanguageResult {
  return {
    original_text: original,
    plain_language_text: null,
    preserved_values: {},
    warnings,
    confidence: 0,
    requires_review: true,
    refused_reason: reason,
    source: "refused",
  };
}

// Warnings are only case-normalized, never reworded — softening a warning is
// worse than shouting it.
function simplifyWarnings(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/[\n]|(?<=\.)\s+/)
    .map((w) => w.trim())
    .filter(Boolean)
    .slice(0, 12)
    .map((w) => (w === w.toUpperCase() ? w.charAt(0) + w.slice(1).toLowerCase() : w));
}
