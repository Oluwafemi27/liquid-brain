import "@tanstack/react-start/server-only";
import {
  composioConfigured,
  createTrigger,
  deleteTrigger,
  ensureWebhookSubscription,
  getConnectionTokens,
  listConnections,
} from "@/connectors/composio-hub/client";
import {
  chooseN8nMethod,
  credentialedNodeTypes,
  extractComposioTrigger,
  type N8nMethod,
} from "@/lib/n8n-credentialless";
import { getSupabaseAdmin } from "./supabase";
import {
  createN8nCredential,
  deleteN8nCredential,
  getN8nWorkflow,
  updateN8nWorkflow,
} from "./n8n-client";
import { resolveN8nConnection } from "./n8n-connection";
import { signRelayToken } from "./n8n-relay";
import { safeFetch } from "@/lib/server/url-safety";

export interface AppTokens {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: string | null;
  scope?: string | null;
}

/** How each connected app becomes an n8n credential. Token-style credentials (Slack, Notion, GitHub...)
 *  don't expire, so they are the most reliable. Google ones are OAuth2 and carry the access token. */
interface CredSpec {
  type: string;
  oauth: boolean;
  data: (t: AppTokens, app: string) => Record<string, unknown>;
}
const oauthData = (t: AppTokens, app: string) => ({
  // Composio's managed login doesn't share its OAuth client. Set N8N_OAUTH_<APP>_CLIENT_ID/_SECRET to your
  // own Google app if you want n8n to be able to refresh by itself; otherwise ADUF refreshes (see below).
  clientId: process.env[`N8N_OAUTH_${app.toUpperCase()}_CLIENT_ID`] ?? "composio-managed",
  clientSecret: process.env[`N8N_OAUTH_${app.toUpperCase()}_CLIENT_SECRET`] ?? "composio-managed",
  sendAdditionalBodyProperties: false,
  additionalBodyProperties: "",
  oauthTokenData: {
    access_token: t.accessToken,
    ...(t.refreshToken ? { refresh_token: t.refreshToken } : {}),
    token_type: "Bearer",
    ...(t.scope ? { scope: t.scope } : {}),
    ...(t.expiresAt ? { expires_at: Math.floor(new Date(t.expiresAt).getTime() / 1000) } : {}),
  },
});
export const CREDENTIAL_SPECS: Record<string, CredSpec> = {
  gmail: { type: "gmailOAuth2", oauth: true, data: oauthData },
  googlesheets: { type: "googleSheetsOAuth2Api", oauth: true, data: oauthData },
  googlecalendar: { type: "googleCalendarOAuth2Api", oauth: true, data: oauthData },
  googledrive: { type: "googleDriveOAuth2Api", oauth: true, data: oauthData },
  slack: { type: "slackApi", oauth: false, data: (t) => ({ accessToken: t.accessToken }) },
  notion: { type: "notionApi", oauth: false, data: (t) => ({ apiKey: t.accessToken }) },
  github: {
    type: "githubApi",
    oauth: false,
    data: (t) => ({ server: "https://api.github.com", user: "", accessToken: t.accessToken }),
  },
  airtable: {
    type: "airtableTokenApi",
    oauth: false,
    data: (t) => ({ accessToken: t.accessToken }),
  },
  hubspot: { type: "hubspotAppToken", oauth: false, data: (t) => ({ appToken: t.accessToken }) },
};
const appForType = (type: string) =>
  Object.entries(CREDENTIAL_SPECS).find(([, s]) => s.type === type)?.[0];

const REFRESH_MARGIN_MS = 5 * 60_000;

/** METHOD 1 (hosted n8n): makes an n8n credential for this user's connected app and remembers it.
 *  Replaces an older one for the same app. Returns the credential to put into workflow nodes. */
export async function createN8nCredentialFromComposio(
  userId: string,
  appType: string,
  tokens: AppTokens,
): Promise<{ credentialId: string; name: string; type: string }> {
  const app = appType.toLowerCase();
  const spec = CREDENTIAL_SPECS[app];
  if (!spec) throw new Error(`ADUF doesn't know how to make an n8n credential for “${app}” yet.`);
  const db = getSupabaseAdmin();
  if (!db) throw new Error("No backend configured.");

  const name = `ADUF ${app} (${userId.slice(0, 8)})`;
  const created = await createN8nCredential(userId, {
    name,
    type: spec.type,
    data: spec.data(tokens, app),
  });

  const { data: old } = await db
    .from("n8n_credentials")
    .select("n8n_credential_id")
    .eq("user_id", userId)
    .eq("app", app)
    .maybeSingle();
  const { error } = await db.from("n8n_credentials").upsert(
    {
      user_id: userId,
      app,
      n8n_credential_id: created.id,
      n8n_credential_type: spec.type,
      composio_account_id: null,
      expires_at: spec.oauth ? (tokens.expiresAt ?? null) : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,app" },
  );
  if (error) throw new Error(`Credential created but not recorded: ${error.message}`);
  if (old?.["n8n_credential_id"] && old["n8n_credential_id"] !== created.id)
    await deleteN8nCredential(userId, old["n8n_credential_id"] as string).catch(() => undefined);
  return { credentialId: created.id, name, type: spec.type };
}

/** Gets a fresh token from Composio (which refreshes it) and makes sure n8n holds it. */
export async function syncN8nCredential(userId: string, app: string) {
  const t = await getConnectionTokens(userId, app);
  if (!t)
    throw new Error(
      `Couldn't read the ${app} login from Composio. Reconnect ${app}, and check Composio isn't hiding connection secrets.`,
    );
  return createN8nCredentialFromComposio(userId, app, t);
}

async function credentialFor(userId: string, app: string) {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data } = await db
    .from("n8n_credentials")
    .select("n8n_credential_id, n8n_credential_type, expires_at")
    .eq("user_id", userId)
    .eq("app", app)
    .maybeSingle();
  if (!data) return null;
  const exp = data["expires_at"] ? new Date(data["expires_at"] as string).getTime() : null;
  return {
    id: data["n8n_credential_id"] as string,
    type: data["n8n_credential_type"] as string,
    stale: exp !== null && exp - Date.now() < REFRESH_MARGIN_MS,
  };
}

/** METHOD 1: fills every node's `credentials` with this user's n8n credential ids, creating (or
 *  refreshing) them from the user's Composio connections first. Nodes whose app isn't connected are
 *  reported in `missing` so ADUF can tell the user which app to connect. */
export async function injectCredentials(
  userId: string,
  workflow: Record<string, unknown>,
): Promise<{ workflow: Record<string, unknown>; missing: string[] }> {
  const missing = new Set<string>();
  const nodes = ((workflow["nodes"] as Record<string, unknown>[] | undefined) ?? []).map((n) => ({
    ...n,
  }));
  const resolved = new Map<string, { id: string; name: string } | null>();
  for (const node of nodes) {
    const creds = node["credentials"] as Record<string, unknown> | undefined;
    if (!creds) continue;
    const next: Record<string, unknown> = {};
    for (const type of Object.keys(creds)) {
      const app = appForType(type);
      if (!app) {
        next[type] = creds[type]; // not one ADUF manages; leave as is
        continue;
      }
      if (!resolved.has(type)) {
        const cred = await credentialFor(userId, app);
        try {
          if (!cred || cred.stale) {
            const made = await syncN8nCredential(userId, app);
            resolved.set(type, { id: made.credentialId, name: made.name });
          } else {
            resolved.set(type, { id: cred.id, name: `ADUF ${app} (${userId.slice(0, 8)})` });
          }
        } catch {
          resolved.set(type, null);
        }
      }
      const r = resolved.get(type);
      if (r) next[type] = { id: r.id, name: r.name };
      else {
        missing.add(app);
        next[type] = creds[type];
      }
    }
    node["credentials"] = next;
  }
  return { workflow: { ...workflow, nodes }, missing: [...missing] };
}

/** Token refresh for Method 1. Composio keeps the real refresh token; this asks it for a fresh access
 *  token, makes a new n8n credential, and re-points this user's workflows at it. Call it on a schedule. */
export async function refreshN8nCredential(userId: string, app: string): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) return;
  const before = await credentialFor(userId, app);
  const made = await syncN8nCredential(userId, app);
  if (!before || before.id === made.credentialId) return;
  const { data: deps } = await db
    .from("n8n_deployments")
    .select("n8n_workflow_id")
    .eq("user_id", userId)
    .not("n8n_workflow_id", "is", null);
  for (const d of deps ?? []) {
    const id = d["n8n_workflow_id"] as string;
    try {
      const wf = await getN8nWorkflow(userId, id);
      const text = JSON.stringify(wf);
      if (!text.includes(before.id)) continue;
      await updateN8nWorkflow(
        userId,
        id,
        JSON.parse(text.split(`"id":"${before.id}"`).join(`"id":"${made.credentialId}"`)),
      );
    } catch (e) {
      console.error("[n8n-composio] couldn't re-link workflow", id, e);
    }
  }
}

/** Refreshes every OAuth credential that expires soon. Hook this to the existing cron. */
export async function refreshExpiringN8nCredentials(): Promise<{ refreshed: number }> {
  if (!composioConfigured()) return { refreshed: 0 };
  const db = getSupabaseAdmin();
  if (!db) return { refreshed: 0 };
  const cutoff = new Date(Date.now() + 15 * 60_000).toISOString();
  const { data } = await db
    .from("n8n_credentials")
    .select("user_id, app")
    .not("expires_at", "is", null)
    .lt("expires_at", cutoff)
    .limit(200);
  let refreshed = 0;
  for (const r of data ?? []) {
    try {
      await refreshN8nCredential(r["user_id"] as string, r["app"] as string);
      refreshed++;
    } catch (e) {
      console.error("[n8n-composio] refresh failed", r["app"], e instanceof Error ? e.message : e);
    }
  }
  return { refreshed };
}

/** { gmail: "ca_...", slack: "ca_..." } for this user's live Composio connections. */
export async function connectedAccountMap(userId: string): Promise<Record<string, string>> {
  if (!composioConfigured()) return {};
  const out: Record<string, string> = {};
  for (const c of await listConnections(userId)) out[c.toolkit] ??= c.id;
  return out;
}

export const relayTokenFor = (userId: string, tools: string[]) => signRelayToken(userId, tools);
export const appUrl = (): string => (process.env["APP_URL"] ?? "").replace(/\/+$/, "");
export { chooseN8nMethod };
export type { N8nMethod };

// ---- Triggers: Composio -> ADUF -> the workflow's n8n Webhook node -----------------------------------

let webhookReady = false;
async function ensureComposioWebhook(): Promise<void> {
  if (webhookReady || !appUrl()) return;
  const secret = await ensureWebhookSubscription(`${appUrl()}/api/composio-webhook`);
  if (secret && !process.env["COMPOSIO_WEBHOOK_SECRET"])
    console.warn(
      "[n8n-composio] Composio created a webhook secret. Set COMPOSIO_WEBHOOK_SECRET to it, or events will be rejected:",
      secret.slice(0, 4) + "…",
    );
  webhookReady = true;
}

/** Called when the owner turns a workflow on: starts the Composio trigger its Webhook node asks for. */
export async function registerTriggersForDeployment(
  userId: string,
  deploymentId: string,
  n8nWorkflowId: string,
): Promise<void> {
  const wf = await getN8nWorkflow(userId, n8nWorkflowId);
  const trig = extractComposioTrigger(wf);
  if (!trig) return;
  if (!composioConfigured())
    throw new Error("Composio isn't configured, so the trigger can't start.");
  const conn = await resolveN8nConnection(userId);
  const account = (await connectedAccountMap(userId))[trig.toolkit];
  if (!conn || !account)
    throw new Error(`${trig.toolkit || "That app"} isn't connected, so ADUF can't watch it.`);
  await ensureComposioWebhook();
  const triggerId = await createTrigger(userId, trig.slug, account, trig.config);
  const db = getSupabaseAdmin();
  const { error } = (await db?.from("n8n_trigger_routes").insert({
    user_id: userId,
    deployment_id: deploymentId,
    composio_trigger_id: triggerId,
    trigger_slug: trig.slug,
    webhook_url: `${conn.instanceUrl.replace(/\/+$/, "")}/webhook/${trig.path}`,
  })) ?? { error: null };
  if (error) {
    await deleteTrigger(triggerId).catch(() => undefined);
    throw new Error(`Couldn't save the trigger route: ${error.message}`);
  }
}

/** Called when the owner turns a workflow off or deletes it: stops its Composio triggers. */
export async function unregisterTriggersForDeployment(
  userId: string,
  deploymentId: string,
): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) return;
  const { data } = await db
    .from("n8n_trigger_routes")
    .select("composio_trigger_id")
    .eq("user_id", userId)
    .eq("deployment_id", deploymentId);
  for (const r of data ?? []) {
    await deleteTrigger(r["composio_trigger_id"] as string).catch(() => undefined);
  }
  await db
    .from("n8n_trigger_routes")
    .delete()
    .eq("user_id", userId)
    .eq("deployment_id", deploymentId);
}

/** One verified Composio event in, forwarded to the right user's workflow. */
export async function forwardTriggerEvent(event: Record<string, unknown>): Promise<void> {
  const meta = (event["metadata"] as Record<string, unknown> | undefined) ?? {};
  const triggerId = String(meta["trigger_id"] ?? "");
  if (!triggerId) return;
  const db = getSupabaseAdmin();
  if (!db) return;
  const { data: route } = await db
    .from("n8n_trigger_routes")
    .select("user_id, webhook_url, trigger_slug")
    .eq("composio_trigger_id", triggerId)
    .maybeSingle();
  if (!route) return;
  // Never deliver an event to a different owner's workflow than the one that asked for the trigger.
  if (meta["user_id"] && String(meta["user_id"]) !== route["user_id"]) return;
  await safeFetch(route["webhook_url"] as string, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ trigger: route["trigger_slug"], ...(event["data"] as object) }),
  });
}

// ---- Hooked into the workflow builder ------------------------------------------------------------------

export const RELAY_TOKEN_PLACEHOLDER = "__ADUF_RELAY_TOKEN__";

export interface CredentialStrategy {
  method: N8nMethod;
  /** Rules for the model that writes the workflow. */
  promptBlock: string;
  /** Problems with a generated workflow under this strategy (fed back to the model once). */
  issues: (wf: Record<string, unknown>) => string[];
  /** Final step before deploying: fills in credential ids or the signed relay token. */
  finalize: (wf: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

const TOOL_SLUG = /\b[A-Z][A-Z0-9]*_[A-Z0-9_]{2,}\b/g;

export async function strategyFor(userId: string, brief: string): Promise<CredentialStrategy> {
  const method = chooseN8nMethod();
  const accounts = await connectedAccountMap(userId).catch(() => ({}) as Record<string, string>);
  const apps = Object.keys(accounts);
  const connectedLine = apps.length
    ? `This owner's connected apps (Composio): ${apps.join(", ")}.`
    : "This owner has no connected apps yet.";

  if (method === "inject") {
    return {
      method,
      promptBlock:
        `=== Credentials (hosted n8n) ===\n${connectedLine}\n` +
        `You may use native n8n nodes for connected apps. Reference credentials by TYPE only, with no id ` +
        `(e.g. "credentials": {"gmailOAuth2": {"name": "x"}}); ADUF links the owner's real credential ` +
        `automatically. Never invent credential ids.`,
      issues: () => [],
      finalize: async (wf) => {
        const { workflow, missing } = await injectCredentials(userId, wf);
        if (missing.length)
          throw new Error(
            `Connect ${missing.join(", ")} first (Connectors), then ask me to build this again.`,
          );
        return workflow;
      },
    };
  }

  // Method 2: webhook + HTTP Request nodes, no n8n credentials at all.
  const base = appUrl();
  let toolHints = "";
  try {
    const { findTools } = await import("@/connectors/composio-hub/client");
    const text = brief.toLowerCase();
    const wanted = apps.filter((a) => text.includes(a)).slice(0, 3);
    const lines: string[] = [];
    for (const a of wanted.length ? wanted : apps.slice(0, 2)) {
      const tools = await findTools(userId, a, brief).catch(() => []);
      for (const t of tools.slice(0, 6)) lines.push(`- ${t.slug} (${a}): ${t.description}`);
    }
    if (lines.length)
      toolHints = `\nReal tool slugs you may use (use these exact names):\n${lines.join("\n")}`;
  } catch {
    /* hints are optional */
  }
  const promptBlock =
    `=== Credentials: NONE inside n8n (mandatory) ===\n${connectedLine}\n` +
    `The workflow must import into any n8n with no credential setup. Therefore:\n` +
    `1. Use ONLY these node types: n8n-nodes-base.webhook (trigger), n8n-nodes-base.httpRequest, and ` +
    `core logic nodes (if, set, code, merge, splitInBatches, wait, scheduleTrigger). NEVER use native app ` +
    `nodes (Gmail, Slack, Notion, Google Sheets, HubSpot, ...) and never add a "credentials" field.\n` +
    `2. Every action in a connected app is ONE httpRequest node: POST ${base}/api/n8n-relay, header ` +
    `Authorization = "Bearer ${RELAY_TOKEN_PLACEHOLDER}" (type that exact text), specifyBody "json", jsonBody ` +
    `= ={{ { tool: "TOOL_SLUG", toolkit: "app", arguments: { ... } } }}. The reply is {successful, data}; ` +
    `later nodes read $json.data.\n` +
    `3. For AI work (summarise, classify, rewrite) use the same node with tool "ADUF_AI_TEXT" and arguments ` +
    `{ instruction, text }; the reply is {successful, data: {text}}.\n` +
    `4. For "when X happens in an app" use a webhook trigger whose "notes" field is exactly ` +
    `aduf-composio-trigger:{"toolkit":"gmail","slug":"GMAIL_NEW_GMAIL_MESSAGE","config":{},"path":"<same as webhook path>"} ` +
    `(Composio watches the app and ADUF feeds this webhook). For schedules use scheduleTrigger.\n` +
    `5. Webhook event fields arrive under $json.body or $json. Do not hard-code secrets.${toolHints}`;

  return {
    method,
    promptBlock,
    issues: (wf) => {
      const types = credentialedNodeTypes(wf).filter((t) => t !== "httpHeaderAuth");
      const out = types.map(
        (t) =>
          `A node uses the credential type "${t}". Replace it with an httpRequest node calling the ADUF relay.`,
      );
      const nodes = (wf["nodes"] as Record<string, unknown>[] | undefined) ?? [];
      for (const n of nodes) {
        const t = String(n["type"] ?? "");
        if (
          /n8n-nodes-base\.(gmail|slack|notion|googleSheets|hubspot|airtable|github|googleCalendar|googleDrive)/i.test(
            t,
          )
        )
          out.push(
            `Node "${n["name"]}" is a native app node (${t}). Use the relay httpRequest pattern instead.`,
          );
      }
      return out;
    },
    finalize: async (wf) => {
      if (!base)
        throw new Error(
          "APP_URL isn't set on the server, so workflows can't reach the ADUF relay.",
        );
      const text = JSON.stringify(wf);
      const tools = new Set<string>();
      for (const n of (wf["nodes"] as Record<string, unknown>[] | undefined) ?? []) {
        const p = JSON.stringify(n["parameters"] ?? {});
        if (!p.includes("/api/n8n-relay")) continue;
        for (const m of p.match(TOOL_SLUG) ?? []) if (!m.startsWith("__")) tools.add(m);
      }
      const token = relayTokenFor(userId, [...tools]);
      return JSON.parse(text.split(RELAY_TOKEN_PLACEHOLDER).join(token)) as Record<string, unknown>;
    },
  };
}
