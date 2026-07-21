// Thin OpenAI chat helper shared by every AI feature. One place for the
// model name, JSON-mode calls and image attachment, so features stay small.
// All calls run server-side only — the key never reaches the browser.

export const AI_MODEL = "gpt-4o";

export function aiAvailable(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | Array<Record<string, unknown>>;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
};

export type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type ChatResponse = {
  choices?: Array<{
    message?: { content?: string | null; tool_calls?: ToolCall[] };
    finish_reason?: string;
  }>;
  error?: { message?: string };
};

export type ToolSchema = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

/** Raw chat call. Throws on missing key or API error. */
export async function chat(options: {
  messages: ChatMessage[];
  tools?: ToolSchema[];
  jsonMode?: boolean;
  maxTokens?: number;
}): Promise<{ content: string; toolCalls: ToolCall[] }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set — AI features are off.");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      temperature: 0,
      messages: options.messages,
      ...(options.tools ? { tools: options.tools } : {}),
      ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
      ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
    }),
  });

  const data = (await response.json()) as ChatResponse;
  if (!response.ok) {
    throw new Error(`OpenAI error: ${data.error?.message ?? response.status}`);
  }
  const message = data.choices?.[0]?.message;
  return {
    content: (message?.content ?? "").trim(),
    toolCalls: message?.tool_calls ?? [],
  };
}

/** JSON-mode call that parses the reply; returns null when parsing fails. */
export async function chatJSON<T>(options: {
  system: string;
  user: string | Array<Record<string, unknown>>;
  maxTokens?: number;
}): Promise<T | null> {
  const { content } = await chat({
    messages: [
      { role: "system", content: options.system },
      { role: "user", content: options.user },
    ],
    jsonMode: true,
    maxTokens: options.maxTokens,
  });
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

/** Build an image_url content part from JPEG bytes. */
export function imagePart(jpeg: Buffer, detail: "low" | "high" = "high") {
  return {
    type: "image_url",
    image_url: { url: `data:image/jpeg;base64,${jpeg.toString("base64")}`, detail },
  };
}
