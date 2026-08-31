import "@tanstack/react-start/server-only";
import { DEFAULT_WORKSPACE_ID, getSupabaseAdmin } from "./supabase";
import { getProvider, isOAuth } from "./oauth-providers";

export interface ConnectorStatus {
  id: string;
  connected: boolean;
  /** Whether an OAuth app is registered for this provider (env vars set) —
   *  used by the UI to decide whether "Connect" starts a real redirect. */
  configured: boolean;
}

/** Real connection state for every known provider, merging Supabase rows
 *  (if a backend is configured) with which providers have OAuth app
 *  credentials set at all. Never throws — callers always get a full map. */
export async function getConnectorStatuses(): Promise<Record<string, ConnectorStatus>> {
  const ids = ["shopify", "ga", "whatsapp", "paystack", "meta", "sheets"];
  const base: Record<string, ConnectorStatus> = {};
  for (const id of ids) {
    const provider = getProvider(id);
    const configured = Boolean(
      provider && isOAuth(provider) && provider.clientId && provider.clientSecret,
    );
    base[id] = { id, connected: false, configured };
  }

  const db = getSupabaseAdmin();
  if (!db) return base;

  const { data, error } = await db
    .from("connectors")
    .select("id, connected")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID);
  if (error) {
    console.error("[connectors] failed to read connector status", error);
    return base;
  }
  for (const row of data ?? []) {
    const entry = base[row.id as string];
    if (entry) entry.connected = Boolean(row.connected);
  }
  return base;
}
