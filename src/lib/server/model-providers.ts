import { assertTokensAvailable, billingContext, estimateTokens } from "./billing";
import "@tanstack/react-start/server-only";
import { recordModelCall } from "./monitoring";
import { resilientFetch } from "@/lib/server/resilient-fetch";

export type ApiStyle = "openai_compatible" | "anthropic" | "gemini" | "azure_openai";

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
  // Azure OpenAI: only offered when AZURE_OPENAI_ENDPOINT is set on the server (see azureEndpoint()).
  // The "model" is your Azure *deployment name*, set via AZURE_OPENAI_DEPLOYMENT.
  azure_openai: {
    id: "azure_openai",
    displayName: "Azure OpenAI",
    apiStyle: "azure_openai",
    baseUrl: "",
    defaultModel: "",
  },
  grok: {
    id: "grok",
    displayName: "Grok (xAI)",
    apiStyle: "openai_compatible",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-4.5",
  },
};

/** The Azure resource address, e.g. https://my-resource.openai.azure.com (no trailing slash). */
export function azureEndpoint(): string | null {
  const v = (process.env["AZURE_OPENAI_ENDPOINT"] ?? "").trim().replace(/\/+$/, "");
  return /^https:\/\/[a-z0-9.-]+$/i.test(v) ? v : null;
}

/** Providers the owner can actually use on this server (Azure only when its endpoint is set). */
export function providerAvailable(p: ModelProvider): boolean {
  return p.apiStyle !== "azure_openai" || azureEndpoint() !== null;
}

/** A picture or PDF sent to a model that can see it (base64, no data: prefix). */
export interface MediaPart {
  mimeType: string;
  base64: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  /** Images (and PDFs, for providers that read them) the model should look at in this turn. */
  media?: MediaPart[];
}

/** Providers whose chat models accept images. DeepSeek and the default Groq model are text-only. */
export const VISION_PROVIDERS = ["anthropic", "openai", "gemini", "grok", "azure_openai"] as const;
export const supportsVision = (providerId: string): boolean =>
  (VISION_PROVIDERS as readonly string[]).includes(providerId);

export interface ProviderCallResult {
  text: string;
  /** Total tokens the provider says it used (0 when it didn't report any). */
  tokens?: number;
}

/** OpenAI-style chat messages, with images attached as data URLs when a turn has media. */
function openAiMessages(system: string, messages: ChatTurn[]) {
  return [
    { role: "system", content: system },
    ...messages.map((m) =>
      m.media?.length
        ? {
            role: m.role,
            content: [
              { type: "text", text: m.content },
              ...m.media.map((p) =>
                p.mimeType === "application/pdf"
                  ? {
                      type: "file",
                      file: {
                        filename: "document.pdf",
                        file_data: `data:${p.mimeType};base64,${p.base64}`,
                      },
                    }
                  : {
                      type: "image_url",
                      image_url: { url: `data:${p.mimeType};base64,${p.base64}` },
                    },
              ),
            ],
          }
        : { role: m.role, content: m.content },
    ),
  ];
}

/** Calls whichever provider's chat endpoint, normalizing the very different
 *  request/response shapes into plain text. Every branch throws a plain
 *  Error with the provider's own error body on failure — the self-healing
 *  harness (see agent-harness.ts) is what turns that into a retry. */
async function callProviderChatRaw(
  provider: ModelProvider,
  apiKey: string,
  args: { system: string; messages: ChatTurn[]; model?: string },
): Promise<ProviderCallResult> {
  const model = args.model ?? provider.defaultModel;

  if (provider.apiStyle === "azure_openai") {
    const endpoint = azureEndpoint();
    if (!endpoint)
      throw new Error("Azure OpenAI isn't set up: add AZURE_OPENAI_ENDPOINT on the server.");
    const deployment = args.model || process.env["AZURE_OPENAI_DEPLOYMENT"];
    if (!deployment)
      throw new Error(
        "Azure OpenAI needs a deployment name: set AZURE_OPENAI_DEPLOYMENT on the server.",
      );
    // Azure's v1 API: no api-version query, and "model" is the deployment name.
    const res = await resilientFetch(`${endpoint}/openai/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", "api-key": apiKey },
      body: JSON.stringify({
        model: deployment,
        messages: openAiMessages(args.system, args.messages),
      }),
    });
    if (!res.ok) throw new Error(await providerError(provider.id, res, res.status));
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };
    return {
      text: data.choices?.[0]?.message?.content ?? "",
      tokens: data.usage?.total_tokens ?? 0,
    };
  }

  if (provider.apiStyle === "anthropic") {
    const res = await resilientFetch(`${provider.baseUrl}/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        // 1024 cut long structured replies off mid-JSON, which forced a slow full retry.
        max_tokens: 4096,
        // The persona + skills + tool instructions are ~10K tokens and identical from one message to the
        // next, so Anthropic caches them: later rounds and messages start much faster and cost less.
        system: [{ type: "text", text: args.system, cache_control: { type: "ephemeral" } }],
        messages: args.messages.map((m) => ({
          role: m.role,
          content: m.media?.length
            ? [
                ...m.media.map((p) =>
                  p.mimeType === "application/pdf"
                    ? {
                        type: "document",
                        source: { type: "base64", media_type: p.mimeType, data: p.base64 },
                      }
                    : {
                        type: "image",
                        source: { type: "base64", media_type: p.mimeType, data: p.base64 },
                      },
                ),
                { type: "text", text: m.content },
              ]
            : m.content,
        })),
      }),
    });
    if (!res.ok) throw new Error(await providerError(provider.id, res));
    const data = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = data.content?.find((b) => b.type === "text")?.text ?? "";
    return { text, tokens: (data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0) };
  }

  if (provider.apiStyle === "gemini") {
    const res = await resilientFetch(
      `${provider.baseUrl}/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: args.system }] },
          contents: args.messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [
              ...(m.media ?? []).map((p) => ({
                inlineData: { mimeType: p.mimeType, data: p.base64 },
              })),
              { text: m.content },
            ],
          })),
        }),
      },
    );
    if (!res.ok) throw new Error(await providerError(provider.id, res));
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { totalTokenCount?: number };
    };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    return { text, tokens: data.usageMetadata?.totalTokenCount ?? 0 };
  }

  // openai_compatible — OpenAI, DeepSeek, Groq, Grok all speak this shape.
  const res = await resilientFetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: openAiMessages(args.system, args.messages),
    }),
  });
  if (!res.ok) throw new Error(await providerError(provider.id, res));
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { total_tokens?: number };
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  return { text, tokens: data.usage?.total_tokens ?? 0 };
}

/** Every model call goes through here. Inside a billing context (set by the route that handles the
 *  user's request) it first checks the person has tokens left, and afterwards charges what the
 *  provider reported (or a length-based estimate if it didn't). Failed calls cost nothing. */
export async function callProviderChat(
  provider: ModelProvider,
  apiKey: string,
  args: Parameters<typeof callProviderChatRaw>[2],
): Promise<ProviderCallResult> {
  const ctx = billingContext();
  if (ctx) await assertTokensAvailable(ctx.userId);
  const started = Date.now();
  let out: ProviderCallResult;
  try {
    out = await callProviderChatRaw(provider, apiKey, args);
  } catch (e) {
    const m = /API error (\d{3})/.exec(e instanceof Error ? e.message : "");
    recordModelCall({
      provider: provider.id,
      model: args.model ?? provider.defaultModel ?? "",
      ms: Date.now() - started,
      tokens: 0,
      ok: false,
      ...(m ? { status: Number(m[1]) } : {}),
    });
    throw e;
  }
  recordModelCall({
    provider: provider.id,
    model: args.model ?? provider.defaultModel ?? "",
    ms: Date.now() - started,
    tokens: out.tokens ?? 0,
    ok: true,
  });
  if (ctx) {
    const used =
      out.tokens && out.tokens > 0
        ? out.tokens
        : estimateTokens(args.system, ...args.messages.map((m) => m.content), out.text);
    ctx.rawTokens = (ctx.rawTokens ?? 0) + used; // charged once, in credits, when the action ends
  }
  return { text: out.text, tokens: out.tokens ?? 0 };
}

async function providerError(providerId: string, res: Response, _status?: number): Promise<string> {
  const body = await res.text().catch(() => "");
  return `${providerId} API error ${res.status}: ${body.slice(0, 300)}`;
}
