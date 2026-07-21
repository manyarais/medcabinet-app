// POST /api/symptoms/parse — extract symptom terms only (never meds / advice).
// PRODUCT SAFETY: AI extracts symptoms; matching stays deterministic in /api/symptoms.

import {
  extractSymptomsFromText,
  filterExtractedSymptoms,
} from "@/lib/symptomParse";
import { NextRequest, NextResponse } from "next/server";

type Body = {
  text?: string;
};

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const text = body.text?.trim() ?? "";
  if (!text) {
    return NextResponse.json({ symptoms: [] as string[] });
  }

  // Unset key / failure → 503 so the client can silently fall back to raw match.
  if (!process.env.GEMINI_API_KEY?.trim()) {
    return NextResponse.json(
      { error: "Symptom parse not configured.", symptoms: [] as string[] },
      { status: 503 },
    );
  }

  const symptoms = await extractSymptomsFromText(text);
  if (symptoms == null) {
    return NextResponse.json(
      { error: "Parse failed.", symptoms: [] as string[] },
      { status: 502 },
    );
  }

  return NextResponse.json({
    symptoms: filterExtractedSymptoms(symptoms),
  });
}
