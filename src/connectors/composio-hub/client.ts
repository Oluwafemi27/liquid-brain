import "@tanstack/react-start/server-only";
import { Composio } from "@composio/core";

// Server-side Composio client. Composio is a hosted service: it needs COMPOSIO_API_KEY (a free plan
// exists) and stores each user's app logins on its side. We use the owner's ADUF user id as the
// Composio user id, so every owner only ever sees and disconnects their own connections.

export const composioConfigured = (): boolean => Boolean(process.env["COMPOSIO_API_KEY"]);

let client: Composio | null = null;
function composio(): Composio {
  const apiKey = process.env["COMPOSIO_API_KEY"];
  if (!apiKey) throw new Error("COMPOSIO_API_KEY is not set on the server.");
  client ??= new Composio({ apiKey });
  return client;
}

/** One tiny call to check the key really works (used by the admin Monitoring page). */
export async function composioPing(): Promise<{ ok: boolean; detail: string }> {
  try {
    await composio().toolkits.get({ limit: 1 });
    return { ok: true, detail: "Key accepted by Composio." };
  } catch (e) {
    const m = e instanceof Error ? e.message : "";
    return {
      ok: false,
      detail: /401|invalid api key/i.test(m)
        ? "Composio rejected COMPOSIO_API_KEY (401). Create a new key and update it."
        : "Couldn't reach Composio.",
    };
  }
}

/** The slimmed-down shape the browser gets for each app. */
export interface CatalogApp {
  slug: string;
  name: string;
  logo: string | null;
  description: string;
  categories: string[];
  toolsCount: number;
  /** "managed": one click through Composio's own login app. "own": needs your own OAuth app
   *  registered in Composio first. "none": needs no login. */
  access: "managed" | "own" | "none";
}

const CATALOG_TTL_MS = 30 * 60_000;
let catalogCache: { at: number; apps: CatalogApp[] } | null = null;

export async function listCatalog(): Promise<CatalogApp[]> {
  if (catalogCache && Date.now() - catalogCache.at < CATALOG_TTL_MS) return catalogCache.apps;
  const apps: CatalogApp[] = [];
  const seen = new Set<string>();
  // The SDK's list call returns a plain array (no next-page cursor), so ask for a large page once.
  const items = await composio().toolkits.get({ limit: 1000, sortBy: "usage" });
  for (const t of items) {
    if (seen.has(t.slug) || t.isLocalToolkit) continue;
    seen.add(t.slug);
    apps.push({
      slug: t.slug,
      name: t.name,
      logo: t.meta.logo ?? null,
      description: (t.meta.description ?? "").replace(/\s+/g, " ").slice(0, 160),
      categories: (t.meta.categories ?? []).map((c) => c.name).slice(0, 3),
      toolsCount: t.meta.toolsCount ?? 0,
      access: t.noAuth
        ? "none"
        : (t.composioManagedAuthSchemes?.length ?? 0) > 0
          ? "managed"
          : "own",
    });
  }
  catalogCache = { at: Date.now(), apps };
  return apps;
}

export interface ComposioConnection {
  id: string;
  toolkit: string;
  status: string;
  createdAt: string | null;
}

export async function listConnections(userId: string): Promise<ComposioConnection[]> {
  const out: ComposioConnection[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 10; page++) {
    const res = await composio().connectedAccounts.list({
      userIds: [userId],
      statuses: ["ACTIVE"],
      limit: 100,
      ...(cursor ? { cursor } : {}),
    });
    for (const a of res.items) {
      out.push({
        id: a.id,
        toolkit: a.toolkit.slug,
        status: a.status,
        createdAt: a.createdAt ?? null,
      });
    }
    cursor = res.nextCursor ?? undefined;
    if (!cursor || res.items.length === 0) break;
  }
  return out;
}

/** Finds (or creates once) the Composio-managed login config for an app, then returns the hosted
 *  sign-in URL for this user. Apps already connected are refused with a clear message. */
export async function startConnect(
  userId: string,
  slug: string,
  callbackUrl: string,
): Promise<string> {
  const c = composio();
  if ((await listConnections(userId)).some((x) => x.toolkit === slug)) {
    throw new Error(
      "This app is already connected. Disconnect it first to connect a different account.",
    );
  }
  const existing = await c.authConfigs.list({ toolkit: slug, isComposioManaged: true, limit: 10 });
  let authConfigId = existing.items.find((x) => x.status === "ENABLED")?.id;
  if (!authConfigId) {
    const created = await c.authConfigs.create(slug, { type: "use_composio_managed_auth" });
    authConfigId = created.id ?? undefined;
  }
  if (!authConfigId) throw new Error("Composio didn't return a login configuration for this app.");
  const request = await c.connectedAccounts.link(userId, authConfigId, { callbackUrl });
  if (!request.redirectUrl) throw new Error("Composio didn't return a sign-in link for this app.");
  return request.redirectUrl;
}

/** Removes a connection, but only if it belongs to this user. */
export async function disconnect(userId: string, connectionId: string): Promise<void> {
  const own = (await listConnections(userId)).some((x) => x.id === connectionId);
  if (!own) throw new Error("That connection isn't yours or no longer exists.");
  await composio().connectedAccounts.delete(connectionId);
}

export interface FoundTool {
  slug: string;
  name: string;
  description: string;
}

/** Searches the tools of one app that the user has connected. */
export async function findTools(
  userId: string,
  toolkit: string,
  search: string,
): Promise<FoundTool[]> {
  if (!(await listConnections(userId)).some((x) => x.toolkit === toolkit)) {
    throw new Error(`${toolkit} isn't connected. The owner can connect it on the Connectors page.`);
  }
  const tools = await composio().tools.getRawComposioTools({
    toolkits: [toolkit],
    search,
    limit: 15,
  });
  return tools.map((t) => ({
    slug: t.slug,
    name: t.name ?? t.slug,
    description: (t.description ?? "").replace(/\s+/g, " ").slice(0, 200),
  }));
}

export interface ToolRunResult {
  successful: boolean;
  error: string | null;
  data: unknown;
}

/** Runs ONE tool in an app the user has connected. Callers must have the owner's approval first:
 *  this can send messages, create records or change data in the connected app.
 *  `dangerouslySkipVersionCheck` is set because ADUF doesn't pin toolkit versions; Composio otherwise
 *  refuses to run "latest" tools. */
export async function runTool(
  userId: string,
  toolkit: string,
  toolSlug: string,
  args: Record<string, unknown>,
): Promise<ToolRunResult> {
  const conn = (await listConnections(userId)).find((x) => x.toolkit === toolkit);
  if (!conn)
    throw new Error(`${toolkit} isn't connected. Connect it on the Connectors page first.`);
  const res = await composio().tools.execute(toolSlug, {
    userId,
    connectedAccountId: conn.id,
    arguments: args,
    dangerouslySkipVersionCheck: true,
  });
  return { successful: Boolean(res.successful), error: res.error ?? null, data: res.data };
}
