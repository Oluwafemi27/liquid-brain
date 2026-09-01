import "@tanstack/react-start/server-only";

export type ApiStyle = "openai_compatible" | "anthropic" | "gemini";

export interface ModelProvider {
  id: string;
  displayName: string;
  apiStyle: ApiStyle;
  baseUrl: string;
  defaultModel: string;
}

/** Mirrors the `model_providers` table (see supabase/schema.sql) — kept in
 *  code too so the app works even before/without a DB round trip. */
export const MODEL_PROVIDERS: Record<string, ModelProvider> = {
  openai: {
    id: "openai",
    displayName: "ChatGPT (OpenAI)",
    apiStyle: "openai_compatible",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-5-mini",
  },
  anthropic: {
    id: "anthropic",
    displayName: "Claude (Anthropic)",
    apiStyle: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-4-6",
  },
  gemini: {
    id: "gemini",
    displayName: "Gemini (Google)",
    apiStyle: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-3.6-flash",
  },
  deepseek: {
    id: "deepseek",
    displayName: "DeepSeek",
    apiStyle: "openai_compatible",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-v4-flash",
  },
  groq: {
    id: "groq",
    displayName: "Groq",
    apiStyle: "openai_compatible",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "openai/gpt-oss-120b",
  },
  grok: {
    id: "grok",
    displayName: "Grok (xAI)",
    apiStyle: "openai_compatible",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-4.5",
  },
};

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ProviderCallResult {
  text: string;
}

/** Calls whichever provider's chat endpoint, normalizing the very different
 *  request/response shapes into plain text. Every branch throws a plain
 *  Error with the provider's own error body on failure — the self-healing
 *  harness (see agent-harness.ts) is what turns that into a retry. */
export async function callProviderChat(
  provider: ModelProvider,
  apiKey: string,
  args: { system: string; messages: ChatTurn[]; model?: string },
): Promise<ProviderCallResult> {
  const model = args.model ?? provider.defaultModel;

  if (provider.apiStyle === "anthropic") {
    const res = await fetch(`${provider.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: args.system,
        messages: args.messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok) throw new Error(await providerError(provider.id, res));
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = data.content?.find((b) => b.type === "text")?.text ?? "";
    return { text };
  }

  if (provider.apiStyle === "gemini") {
    const res = await fetch(`${provider.baseUrl}/models/${model}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: args.system }] },
        contents: args.messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
      }),
    });
    if (!res.ok) throw new Error(await providerError(provider.id, res));
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return { text };
  }

  // openai_compatible — OpenAI, DeepSeek, Groq, Grok all speak this shape.
  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: args.system }, ...args.messages],
    }),
  });
  if (!res.ok) throw new Error(await providerError(provider.id, res));
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  return { text };
}

async function providerError(providerId: string, res: Response): Promise<string> {
  const body = await res.text().catch(() => "");
  return `${providerId} API error ${res.status}: ${body.slice(0, 300)}`;
}
