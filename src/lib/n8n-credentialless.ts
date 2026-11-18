/** Builds n8n workflows that need NO credentials set up inside n8n.
 *
 *  Method 2 ("Composio as the node"): the trigger is an n8n Webhook node (no auth), every action is an
 *  HTTP Request node. The result can be imported into ANY n8n (hosted, n8n Cloud or the user's own).
 *
 *  Two gateways for the actions:
 *   - "relay" (default, recommended): nodes call ADUF's own relay (/api/n8n-relay) with a signed, per-user
 *     token. The Composio API key never leaves ADUF, so a customer who owns their n8n can never read it.
 *   - "composio-direct": nodes call Composio's execute endpoint with a Header Auth credential holding the
 *     Composio API key. Only use this on an n8n instance that ADUF alone controls. */

export type N8nMethod = "inject" | "composio-node";

/** Which method to use. Hosted n8n (ADUF controls it) can have credentials created for the user and linked
 *  automatically (Method 1). Anything else gets credential-less workflows (Method 2). */
export function chooseN8nMethod(env: Record<string, string | undefined> = process.env): N8nMethod {
  return env["N8N_HOSTED"] === "true" ? "inject" : "composio-node";
}

export interface ComposioAction {
  /** Shown as the node name. */
  name: string;
  /** Composio tool slug, e.g. SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL. Use ADUF_AI_TEXT for AI text work. */
  tool: string;
  /** Composio app slug (gmail, slack...). Picks the connected account when one id per app is given. */
  toolkit?: string;
  /** Tool arguments. Strings may hold n8n expressions: "={{ $json.x }}" or "Hi {{ $json.name }}". */
  params: Record<string, unknown>;
}

export type TriggerSpec =
  | { kind: "composio"; toolkit: string; slug: string; config?: Record<string, unknown> }
  | { kind: "webhook" };

export interface CredentiallessOptions {
  name?: string;
  trigger?: TriggerSpec;
  /** Defaults to "relay". */
  gateway?: "relay" | "composio-direct";
  /** Base URL of ADUF (relay) - e.g. https://liquid-brain.vercel.app */
  appUrl: string;
  /** Signed relay token for this user (relay gateway, and for ADUF_* tools in any gateway). */
  relayToken: string;
  /** Name of the one global Header Auth credential (direct gateway). */
  headerAuthCredentialName?: string;
  headerAuthCredentialId?: string;
  /** Fixed path for the webhook (random when omitted). */
  webhookPath?: string;
}

export const AI_TEXT_TOOL = "ADUF_AI_TEXT";
export const COMPOSIO_EXECUTE = "https://backend.composio.dev/api/v3/tools/execute";
export const TRIGGER_NOTE_PREFIX = "aduf-composio-trigger:";

const RAND = () =>
  Math.random().toString(16).slice(2, 10) + Math.random().toString(16).slice(2, 10);

/** Turns a value into a JavaScript literal for an n8n expression, keeping "{{ expr }}" parts live. */
export function toExpressionLiteral(value: unknown): string {
  if (typeof value === "string") {
    const whole = value.match(/^=?\s*\{\{([\s\S]*)\}\}\s*$/);
    if (whole && !/\{\{|\}\}/.test(whole[1] ?? "")) return (whole[1] ?? "").trim();
    if (/\{\{[\s\S]*?\}\}/.test(value)) {
      const body = value
        .replace(/^=/, "")
        .split(/(\{\{[\s\S]*?\}\})/)
        .map((part) =>
          part.startsWith("{{")
            ? `\${${part.slice(2, -2).trim()}}`
            : part.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${"),
        )
        .join("");
      return `\`${body}\``;
    }
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(toExpressionLiteral).join(", ")}]`;
  if (value && typeof value === "object")
    return `{ ${Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${JSON.stringify(k)}: ${toExpressionLiteral(v)}`)
      .join(", ")} }`;
  return JSON.stringify(value ?? null);
}

const slugOf = (tool: string) => tool.split("_")[0]?.toLowerCase() ?? "";

/** Returns n8n workflow JSON made only of a Webhook node and HTTP Request nodes.
 *  `connectedAccountId` is the user's Composio connection: one id, or one per app ({gmail: "ca_..."}). */
export function generateCredentiallessWorkflow(
  userId: string,
  connectedAccountId: string | Record<string, string>,
  actions: ComposioAction[],
  options: CredentiallessOptions,
): Record<string, unknown> {
  const gateway = options.gateway ?? "relay";
  const path = options.webhookPath ?? `aduf-${RAND()}`;
  const trigger = options.trigger ?? { kind: "webhook" as const };
  const accountFor = (a: ComposioAction): string | undefined =>
    typeof connectedAccountId === "string"
      ? connectedAccountId
      : connectedAccountId[a.toolkit ?? slugOf(a.tool)];

  const nodes: Record<string, unknown>[] = [
    {
      id: `trigger-${RAND()}`,
      name: "ADUF Trigger",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [240, 300],
      webhookId: path,
      parameters: { httpMethod: "POST", path, responseMode: "onReceived", options: {} },
      ...(trigger.kind === "composio"
        ? {
            notes: `${TRIGGER_NOTE_PREFIX}${JSON.stringify({
              toolkit: trigger.toolkit,
              slug: trigger.slug,
              config: trigger.config ?? {},
              path,
            })}`,
          }
        : {}),
    },
  ];
  const connections: Record<string, unknown> = {};
  let previous = nodes[0]!["name"] as string;

  actions.forEach((action, i) => {
    const isAi = action.tool === AI_TEXT_TOOL;
    const viaRelay = gateway === "relay" || isAi;
    const account = accountFor(action);
    const name = action.name || action.tool;
    const url = viaRelay
      ? `${options.appUrl.replace(/\/+$/, "")}/api/n8n-relay`
      : `${COMPOSIO_EXECUTE}/${action.tool}`;
    const body = viaRelay
      ? {
          tool: action.tool,
          ...(account && !isAi ? { connectedAccountId: account } : {}),
          ...(action.toolkit ? { toolkit: action.toolkit } : {}),
          arguments: action.params,
        }
      : { connected_account_id: account, user_id: userId, arguments: action.params };

    const node: Record<string, unknown> = {
      id: `action-${i + 1}-${RAND()}`,
      name,
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [240 + (i + 1) * 280, 300],
      parameters: {
        method: "POST",
        url,
        sendHeaders: true,
        headerParameters: {
          parameters: viaRelay
            ? [{ name: "Authorization", value: `Bearer ${options.relayToken}` }]
            : [],
        },
        sendBody: true,
        specifyBody: "json",
        jsonBody: `={{ ${toExpressionLiteral(body)} }}`,
        options: { timeout: 60000 },
      },
    };
    if (!viaRelay) {
      // The one global credential, created once on the n8n that ADUF controls. Holds the Composio key.
      (node["parameters"] as Record<string, unknown>)["authentication"] = "genericCredentialType";
      (node["parameters"] as Record<string, unknown>)["genericAuthType"] = "httpHeaderAuth";
      node["credentials"] = {
        httpHeaderAuth: {
          ...(options.headerAuthCredentialId ? { id: options.headerAuthCredentialId } : {}),
          name: options.headerAuthCredentialName ?? "ADUF Composio API",
        },
      };
    }
    nodes.push(node);
    connections[previous] = { main: [[{ node: name, type: "main", index: 0 }]] };
    previous = name;
  });

  return {
    name: options.name ?? "ADUF workflow",
    nodes,
    connections,
    settings: { executionOrder: "v1" },
  };
}

/** The Composio trigger a generated workflow asks for (read from the Webhook node's note). */
export function extractComposioTrigger(
  workflow: Record<string, unknown>,
): { toolkit: string; slug: string; config: Record<string, unknown>; path: string } | null {
  const nodes = (workflow["nodes"] as Record<string, unknown>[] | undefined) ?? [];
  for (const n of nodes) {
    const note = typeof n["notes"] === "string" ? (n["notes"] as string) : "";
    if (!note.startsWith(TRIGGER_NOTE_PREFIX)) continue;
    try {
      const v = JSON.parse(note.slice(TRIGGER_NOTE_PREFIX.length)) as Record<string, unknown>;
      if (typeof v["slug"] === "string" && typeof v["path"] === "string")
        return {
          toolkit: String(v["toolkit"] ?? ""),
          slug: v["slug"],
          config: (v["config"] as Record<string, unknown>) ?? {},
          path: v["path"],
        };
    } catch {
      /* malformed note: no trigger */
    }
  }
  return null;
}

/** Credential types referenced by native nodes: these are what a credential-less workflow must not have. */
export function credentialedNodeTypes(workflow: Record<string, unknown>): string[] {
  const nodes = (workflow["nodes"] as Record<string, unknown>[] | undefined) ?? [];
  const types = new Set<string>();
  for (const n of nodes) {
    const creds = n["credentials"];
    if (creds && typeof creds === "object") for (const t of Object.keys(creds)) types.add(t);
  }
  return [...types];
}
