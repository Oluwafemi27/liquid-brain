import "@tanstack/react-start/server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { composioConfigured, runTool } from "@/connectors/composio-hub/client";
import { resolveDefaultModelKey } from "./model-keys";
import { MODEL_PROVIDERS, callProviderChat } from "./model-providers";
import { withBilling } from "./billing";
import { AI_TEXT_TOOL } from "@/lib/n8n-credentialless";

/** The relay lets a workflow running in ANY n8n act for one ADUF user without credentials in n8n.
 *  The workflow carries a signed token (who it is for, which tools it may call). ADUF checks the token,
 *  then runs the tool with its own Composio key. The user id always comes from the token, never from the
 *  request body, so a workflow can only ever act inside its own owner's connected apps. */

interface RelayClaims {
  /** ADUF user id */
  u: string;
  /** Tools this workflow may call */
  t: string[];
  /** Expiry (unix seconds) */
  e: number;
}

function secret(): string {
  const s =
    process.env["N8N_RELAY_SECRET"] ||
    (process.env["SUPABASE_SERVICE_ROLE_KEY"]
      ? createHash("sha256")
          .update(`n8n-relay:${process.env["SUPABASE_SERVICE_ROLE_KEY"]}`)
          .digest("hex")
      : "");
  if (!s) throw new Error("Set N8N_RELAY_SECRET so workflow tokens can be signed.");
  return s;
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const sign = (body: string) => createHmac("sha256", secret()).update(body).digest("base64url");

/** Signs a token for one user's workflow. Rotating N8N_RELAY_SECRET revokes every issued token. */
export function signRelayToken(userId: string, tools: string[], days = 365): string {
  const claims: RelayClaims = {
    u: userId,
    t: [...new Set(tools)],
    e: Math.floor(Date.now() / 1000) + days * 86400,
  };
  const body = b64(JSON.stringify(claims));
  return `${body}.${sign(body)}`;
}

export function verifyRelayToken(token: string): RelayClaims | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  let expected: string;
  try {
    expected = sign(body);
  } catch {
    return null;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as RelayClaims;
    if (!claims.u || !Array.isArray(claims.t) || claims.e < Date.now() / 1000) return null;
    return claims;
  } catch {
    return null;
  }
}

export interface RelayRequest {
  tool: string;
  toolkit?: string | undefined;
  connectedAccountId?: string | undefined;
  arguments: Record<string, unknown>;
}

export type RelayResult =
  { ok: true; data: unknown } | { ok: false; status: number; error: string };

/** Runs one workflow step for the token's owner. */
export async function runRelay(claims: RelayClaims, req: RelayRequest): Promise<RelayResult> {
  if (!claims.t.includes(req.tool))
    return { ok: false, status: 403, error: "This workflow isn't allowed to call that tool." };

  if (req.tool === AI_TEXT_TOOL) {
    const instruction = String(req.arguments["instruction"] ?? "").slice(0, 2000);
    const text = String(req.arguments["text"] ?? "").slice(0, 20000);
    if (!instruction || !text)
      return { ok: false, status: 400, error: "ADUF_AI_TEXT needs instruction and text." };
    const key = await resolveDefaultModelKey(claims.u);
    const provider = key ? MODEL_PROVIDERS[key.providerId] : undefined;
    if (!key || !provider)
      return { ok: false, status: 409, error: "No AI model is connected for this account." };
    try {
      const { text: out } = await withBilling({ userId: claims.u, feature: "n8n" }, () =>
        callProviderChat(provider, key.apiKey, {
          system:
            "You process text for an automation. Follow the instruction exactly. Reply with only the result, no preamble.",
          messages: [{ role: "user", content: `${instruction}\n\n---\n${text}` }],
        }),
      );
      return { ok: true, data: { text: out.trim() } };
    } catch (e) {
      return { ok: false, status: 402, error: e instanceof Error ? e.message : "AI step failed." };
    }
  }

  if (!composioConfigured())
    return { ok: false, status: 503, error: "Composio isn't configured on the server." };
  const toolkit = (req.toolkit || req.tool.split("_")[0] || "").toLowerCase();
  try {
    const res = await runTool(claims.u, toolkit, req.tool, req.arguments, req.connectedAccountId);
    if (!res.successful)
      return { ok: false, status: 502, error: res.error ?? "The app refused that." };
    return { ok: true, data: res.data };
  } catch (e) {
    return { ok: false, status: 409, error: e instanceof Error ? e.message : "Tool failed." };
  }
}
