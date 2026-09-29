import "@tanstack/react-start/server-only";
import { DEFAULT_WORKSPACE_ID, getSupabaseAdmin } from "./supabase";

export interface N8nConnectionStatus {
  connected: boolean;
  instanceUrl: string | null;
  label: string | null;
  lastVerifiedAt: string | null;
  lastVerifyError: string | null;
}

/** Connection status only — never the API key itself. Safe to send to the
 *  client, same contract as listModelKeyStatuses(). */
export async function getN8nConnectionStatus(): Promise<N8nConnectionStatus> {
  const db = getSupabaseAdmin();
  if (!db) {
    return { connected: false, instanceUrl: null, label: null, lastVerifiedAt: null, lastVerifyError: null };
  }
  const { data } = await db
    .from("n8n_connections")
    .select("instance_url, label, connected, last_verified_at, last_verify_error")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .maybeSingle();
  if (!data) {
    return { connected: false, instanceUrl: null, label: null, lastVerifiedAt: null, lastVerifyError: null };
  }
  return {
    connected: Boolean(data["connected"]),
    instanceUrl: (data["instance_url"] as string | null) ?? null,
    label: (data["label"] as string | null) ?? null,
    lastVerifiedAt: (data["last_verified_at"] as string | null) ?? null,
    lastVerifyError: (data["last_verify_error"] as string | null) ?? null,
  };
}

/** Stores (or replaces) the owner's n8n instance URL + API key, encrypted
 *  in Supabase Vault — same pattern as storeModelKey(). Verifies the key
 *  against the owner's own n8n instance before saving so a typo doesn't
 *  silently "connect" nothing. */
export async function storeN8nConnection(
  instanceUrl: string,
  apiKey: string,
  label?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalizedUrl = instanceUrl.trim().replace(/\/+$/, "");
  const verify = await verifyN8nCredentials(normalizedUrl, apiKey);
  if (!verify.ok) return verify;

  const db = getSupabaseAdmin();
  if (!db) return { ok: false, error: "No backend configured — set SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY first." };
  const { error } = await db.rpc("store_n8n_connection", {
    p_workspace_id: DEFAULT_WORKSPACE_ID,
    p_instance_url: normalizedUrl,
    p_api_key: apiKey,
    p_label: label ?? null,
  });
  if (error) return { ok: false, error: `Failed to store connection: ${error.message}` };

  await db
    .from("n8n_connections")
    .update({ last_verified_at: new Date().toISOString(), last_verify_error: null })
    .eq("workspace_id", DEFAULT_WORKSPACE_ID);

  return { ok: true };
}

export async function deleteN8nConnection(): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("No backend configured.");
  const { error } = await db.rpc("delete_n8n_connection", { p_workspace_id: DEFAULT_WORKSPACE_ID });
  if (error) throw new Error(`Failed to delete connection: ${error.message}`);
}

/** The decrypted instance URL + API key for the current workspace, or null
 *  if nothing is connected. Never sent to the client — only used server-side
 *  by n8n-client.ts to call the owner's own n8n instance. */
export async function resolveN8nConnection(): Promise<{ instanceUrl: string; apiKey: string } | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data, error } = await db
    .rpc("get_decrypted_n8n_connection", { p_workspace_id: DEFAULT_WORKSPACE_ID })
    .maybeSingle();
  const row = data as { instance_url: string; api_key: string } | null;
  if (error || !row?.api_key) return null;
  return { instanceUrl: row.instance_url, apiKey: row.api_key };
}

/** Pings the owner's n8n instance (GET /api/v1/workflows?limit=1) with the
 *  given credentials — used both on connect and by the health-check part of
 *  the weekly repair job, so a revoked API key surfaces immediately instead
 *  of failing silently on the next deploy. */
export async function verifyN8nCredentials(
  instanceUrl: string,
  apiKey: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${instanceUrl}/api/v1/workflows?limit=1`, {
      headers: { "X-N8N-API-KEY": apiKey },
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: "n8n rejected that API key — check it's a valid API key, not a login password." };
    }
    if (!res.ok) {
      return { ok: false, error: `n8n instance returned ${res.status} — check the instance URL.` };
    }
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not reach that n8n instance.";
    return { ok: false, error: message };
  }
}
