import "@tanstack/react-start/server-only";
import { DEFAULT_WORKSPACE_ID, getSupabaseAdmin } from "./supabase";
import { getProvider, type KeyBasedProviderConfig } from "./oauth-providers";

function keyProvider(id: string): KeyBasedProviderConfig | null {
  const p = getProvider(id);
  return p && "keyBased" in p ? p : null;
}

/** Validates the submitted fields against the provider's declared fields,
 *  stores them encrypted in Vault, and flips the connector to connected.
 *  Returns a user-safe error string on failure. */
export async function saveConnectorKeys(
  providerId: string,
  values: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const provider = keyProvider(providerId);
  if (!provider) return { ok: false, error: "That integration doesn't use pasted credentials." };
  const db = getSupabaseAdmin();
  if (!db) {
    return {
      ok: false,
      error: "No backend configured — set SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY first.",
    };
  }

  const clean: Record<string, string> = {};
  for (const name of provider.fieldNames ?? []) {
    const raw = values[name];
    const v = typeof raw === "string" ? raw.trim() : "";
    if (v.length < 4 || v.length > 2000) {
      return { ok: false, error: `Enter a valid ${name}.` };
    }
    clean[name] = v;
  }

  // Hint = last 4 chars of the primary (last) field, so the owner can tell which key is on file.
  const lastValue = Object.values(clean).at(-1) ?? "";
  const hint = `…${lastValue.slice(-4)}`;

  const { error } = await db.rpc("store_connector_secret", {
    p_workspace_id: DEFAULT_WORKSPACE_ID,
    p_provider: providerId,
    p_secret: JSON.stringify(clean),
    p_hint: hint,
  });
  if (error) return { ok: false, error: `Failed to store credentials: ${error.message}` };

  const { error: rowError } = await db.from("connectors").upsert(
    {
      id: providerId,
      workspace_id: DEFAULT_WORKSPACE_ID,
      connected: true,
      access_token: null,
      refresh_token: null,
      metadata: { hint },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,id" },
  );
  if (rowError)
    return { ok: false, error: `Saved, but couldn't mark it connected: ${rowError.message}` };
  return { ok: true };
}

/** Decrypted credentials for a key-based connector, server-side only. */
export async function resolveConnectorSecret(
  providerId: string,
): Promise<Record<string, string> | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data, error } = await db.rpc("get_decrypted_connector_secret", {
    p_workspace_id: DEFAULT_WORKSPACE_ID,
    p_provider: providerId,
  });
  if (error || typeof data !== "string" || !data) return null;
  try {
    return JSON.parse(data) as Record<string, string>;
  } catch {
    return null;
  }
}

/** Works for every provider: drops stored credentials/tokens and marks the
 *  connector disconnected. (Telegram has its own disconnect — it also has to
 *  remove the webhook.) */
export async function disconnectConnector(providerId: string): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("No backend configured.");
  if (keyProvider(providerId)) {
    const { error } = await db.rpc("delete_connector_secret", {
      p_workspace_id: DEFAULT_WORKSPACE_ID,
      p_provider: providerId,
    });
    if (error) throw new Error(`Failed to remove credentials: ${error.message}`);
  }
  const { error } = await db.from("connectors").upsert(
    {
      id: providerId,
      workspace_id: DEFAULT_WORKSPACE_ID,
      connected: false,
      access_token: null,
      refresh_token: null,
      expires_at: null,
      metadata: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workspace_id,id" },
  );
  if (error) throw new Error(`Failed to disconnect: ${error.message}`);
}
