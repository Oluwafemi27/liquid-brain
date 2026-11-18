import "@tanstack/react-start/server-only";
import { composioConfigured, listCatalog, listConnections } from "@/connectors/composio-hub/client";
import { createInsight } from "./insights";
import { getSupabaseAdmin } from "./supabase";

// Keeps ADUF's notifications and the chat agent in step with what is connected in Composio.
// Composio is the source of truth for connections; this logs ONE notification when an app
// appears or disappears (remembered in composio_seen) and tells the agent which apps are live.

const SYNC_GAP_MS = 20_000;
const lastSync = new Map<string, { at: number; slugs: string[] }>();

async function niceName(slug: string): Promise<string> {
  try {
    const app = (await listCatalog()).find((a) => a.slug === slug);
    if (app) return app.name;
  } catch {
    /* catalogue unavailable: fall back to the slug */
  }
  return slug.replace(/[_-]+/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/** Connected app slugs for this owner. Logs notifications for new/removed connections. Never throws. */
export async function syncComposioConnections(userId: string): Promise<string[]> {
  if (!composioConfigured()) return [];
  const prev = lastSync.get(userId);
  if (prev && Date.now() - prev.at < SYNC_GAP_MS) return prev.slugs;
  try {
    const conns = await listConnections(userId);
    const slugs = [...new Set(conns.map((c) => c.toolkit))];
    lastSync.set(userId, { at: Date.now(), slugs });

    const db = getSupabaseAdmin();
    if (!db) return slugs;
    const { data: seen, error } = await db
      .from("composio_seen")
      .select("connection_id, toolkit")
      .eq("user_id", userId);
    if (error) return slugs;
    const seenIds = new Set((seen ?? []).map((r) => r.connection_id as string));
    const liveIds = new Set(conns.map((c) => c.id));

    const fresh = conns.filter((c) => !seenIds.has(c.id));
    if (fresh.length) {
      // ignoreDuplicates + select returns only rows this call really inserted, so two parallel syncs
      // can't both announce the same connection.
      const { data: inserted } = await db
        .from("composio_seen")
        .upsert(
          fresh.map((c) => ({ user_id: userId, connection_id: c.id, toolkit: c.toolkit })),
          { onConflict: "user_id,connection_id", ignoreDuplicates: true },
        )
        .select("toolkit");
      for (const row of inserted ?? []) {
        const name = await niceName(row.toolkit as string);
        await createInsight(userId, {
          title: `${name} connected`,
          body: `${name} is linked through Composio. Ask ADUF in Brain Chat to look things up in it or do something there; you approve every change.`,
          severity: "success",
          source: "Connectors",
        });
      }
    }

    const gone = (seen ?? []).filter((r) => !liveIds.has(r.connection_id as string));
    for (const row of gone) {
      const { data: removed } = await db
        .from("composio_seen")
        .delete()
        .eq("user_id", userId)
        .eq("connection_id", row.connection_id as string)
        .select("toolkit");
      if (removed?.length) {
        const name = await niceName(row.toolkit as string);
        await createInsight(userId, {
          title: `${name} disconnected`,
          body: `${name} is no longer linked. Reconnect it from the Connectors panel if you still need it.`,
          severity: "warning",
          source: "Connectors",
        });
      }
    }
    return slugs;
  } catch (e) {
    console.error("[composio-sync] failed", e instanceof Error ? e.message : e);
    return prev?.slugs ?? [];
  }
}

/** One paragraph for the agent's prompt, or undefined when nothing is connected. */
export async function connectedAppsContext(userId: string): Promise<string | undefined> {
  const slugs = await syncComposioConnections(userId);
  if (!slugs.length) return undefined;
  return (
    `Apps this owner has connected through Composio right now: ${slugs.join(", ")}. ` +
    "You can use them: call composio_find_tools for the exact tool, then propose composio_run_tool for the owner's approval. " +
    "If they ask about an app not in this list, tell them to connect it from the Connectors panel."
  );
}
