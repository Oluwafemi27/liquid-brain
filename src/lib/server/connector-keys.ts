import "@tanstack/react-start/server-only";
import { verifyCredentials } from "./connector-verify";
import { openToken } from "./crypto-tokens";
import { getSupabaseAdmin } from "./supabase";
import { getProvider, type KeyBasedProviderConfig } from "./oauth-providers";

function keyProvider(id: string): KeyBasedProviderConfig | null {
  const p = getProvider(id);
  return p && "keyBased" in p ? p : null;
}

/** Validates the submitted fields against the provider's declared fields,
 *  stores them encrypted in Vault, and flips the connector to connected.
 *  Returns a user-safe error string on failure. */
export async function saveConnectorKeys(
  userId: string,
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

  // Prove the credentials work BEFORE saving: a wrong key must never show up as "Connected".
  const verdict = await verifyCredentials(providerId, clean, provider.displayName);
  if (!verdict.ok) return { ok: false, error: verdict.error };

  // Hint = last 4 chars of the primary (last) field, so the owner can tell which key is on file.
  const lastValue = Object.values(clean).at(-1) ?? "";
  const hint = `…${lastValue.slice(-4)}`;

  const { error } = await db.rpc("store_connector_secret", {
    p_workspace_id: userId,
    p_provider: providerId,
    p_secret: JSON.stringify(clean),
    p_hint: hint,
  });
  if (error) return { ok: false, error: `Failed to store credentials: ${error.message}` };

  const { error: rowError } = await db.from("connectors").upsert(
    {
      id: providerId,
      workspace_id: userId,
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
  userId: string,
  providerId: string,
): Promise<Record<string, string> | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data, error } = await db.rpc("get_decrypted_connector_secret", {
    p_workspace_id: userId,
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
export async function disconnectConnector(userId: string, providerId: string): Promise<void> {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("No backend configured.");
  // Cut the login off at Google too, not just forget it here. Best-effort: a failure
  // here must never block the owner from disconnecting locally.
  if (["ga", "sheets", "drive", "gmail", "gsc", "gcal", "youtube"].includes(providerId)) {
    try {
      const { data } = await db
        .from("connectors")
        .select("access_token, refresh_token")
        .eq("workspace_id", userId)
        .eq("id", providerId)
        .maybeSingle();
      const token =
        (await openToken(data?.["refresh_token"] as string | null)) ??
        (await openToken(data?.["access_token"] as string | null));
      if (token) {
        await fetch("https://oauth2.googleapis.com/revoke", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ token }),
        });
      }
    } catch (error) {
      console.error(
        "[connectors] provider-side revoke failed (continuing)",
        providerId,
        error instanceof Error ? error.message : "",
      );
    }
  }
  await db.from("connector_health").delete().eq("workspace_id", userId).eq("id", providerId);
  if (keyProvider(providerId)) {
    const { error } = await db.rpc("delete_connector_secret", {
      p_workspace_id: userId,
      p_provider: providerId,
    });
    if (error) throw new Error(`Failed to remove credentials: ${error.message}`);
  }
  const { error } = await db.from("connectors").upsert(
    {
      id: providerId,
      workspace_id: userId,
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
