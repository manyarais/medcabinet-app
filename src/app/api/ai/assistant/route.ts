// POST /api/ai/assistant — grounded caregiver Q&A over the real inventory.
// The reply is validated server-side (evidence ids must exist) before it
// reaches the browser; hardware actions are only *suggested* here and
// executed via /api/ai/assistant/light after the user confirms.

import { askAssistant } from "@/lib/ai/assistant";
import { aiAvailable } from "@/lib/ai/openai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  if (!aiAvailable()) {
    return NextResponse.json(
      { error: "The assistant needs OPENAI_API_KEY set on the server." },
      { status: 503 },
    );
  }
  let question = "";
  try {
    const body = (await request.json()) as { question?: string };
    question = (body.question ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Body must be JSON." }, { status: 400 });
  }
  if (!question) {
    return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
  }

  try {
    const reply = await askAssistant(question);
    return NextResponse.json(reply);
  } catch (error) {
    console.error("Assistant failed:", error);
    return NextResponse.json(
      { error: "The assistant could not answer right now. Try again." },
      { status: 502 },
    );
  }
}
