import "@tanstack/react-start/server-only";
import { assertNotDemo, demoKeyOwnerId, isDemoUser } from "./demo";
import { getSupabaseAdmin } from "./supabase";
import { MODEL_PROVIDERS, providerAvailable } from "./model-providers";

export interface ModelKeyStatus {
  providerId: string;
  displayName: string;
  connected: boolean;
  label: string | null;
  isDefault: boolean;
}

/** Connection status for every known provider — never returns the secret
 *  itself, only whether one is stored. Safe to send to the client. */
export async function listModelKeyStatuses(userId: string): Promise<ModelKeyStatus[]> {
  if (await isDemoUser(userId)) return demoKeyStatuses();
  const db = getSupabaseAdmin();
  const rows = db
    ? ((
        await db
          .from("user_model_keys")
          .select("provider_id, label, is_default, is_active")
          .eq("workspace_id", userId)
      ).data ?? [])
    : [];
  const byProvider = new Map(rows.map((r) => [r.provider_id as string, r]));

  return Object.values(MODEL_PROVIDERS)
    .filter(providerAvailable)
    .map((p) => {
      const row = byProvider.get(p.id);
      return {
        providerId: p.id,
        displayName: p.displayName,
        connected: Boolean(row?.is_active),
        label: (row?.label as string | null) ?? null,
        isDefault: Boolean(row?.is_default),
      };
    });
}

/** What a demo visitor sees: the owner's default provider shown as ready, nothing else, and never
 *  the owner's label or any detail of the key. */
async function demoKeyStatuses(): Promise<ModelKeyStatus[]> {
  const db = getSupabaseAdmin();
  const owner = await demoKeyOwnerId();
  let defaultProvider: string | null = null;
  if (db && owner) {
    const { data } = await db
      .from("user_model_keys")
      .select("provider_id")
      .eq("workspace_id", owner)
      .eq("is_active", true)
      .eq("is_default", true)
      .maybeSingle();
    defaultProvider = (data?.["provider_id"] as string | undefined) ?? null;
  }
  return Object.values(MODEL_PROVIDERS)
    .filter(providerAvailable)
    .map((p) => ({
      providerId: p.id,
      displayName: p.displayName,
      connected: p.id === defaultProvider,
      label: p.id === defaultProvider ? "Provided for the demo" : null,
      isDefault: p.id === defaultProvider,
    }));
}

/** Stores (or replaces) a provider's key, encrypted in Supabase Vault.
 *  Throws if no backend is configured — callers should surface that as a
 *  clear "connect a backend first" error, not a silent no-op. */
export async function storeModelKey(
  userId: string,
  providerId: string,
  secret: string,
  label?: string,
  makeDefault?: boolean,
): Promise<void> {
  await assertNotDemo(userId);
  const db = getSupabaseAdmin();
  if (!db)
    throw new Error("No backend configured — set SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY first.");
  const { error } = await db.rpc("store_model_key", {
    p_workspace_id: userId,
    p_provider_id: providerId,
    p_secret: secret,
    p_label: label ?? null,
    p_make_default: makeDefault ?? false,
  });
  if (error) throw new Error(`Failed to store key: ${error.message}`);
}

export async function deleteModelKey(userId: string, providerId: string): Promise<void> {
  await assertNotDemo(userId);
  const db = getSupabaseAdmin();
  if (!db) throw new Error("No backend configured.");
  const { error } = await db.rpc("delete_model_key", {
    p_workspace_id: userId,
    p_provider_id: providerId,
  });
  if (error) throw new Error(`Failed to delete key: ${error.message}`);
}

/** Switches which connected provider is the default, without needing the
 *  secret again — a plain metadata update, not a Vault write. */
export async function setDefaultModelKey(userId: string, providerId: string): Promise<void> {
  await assertNotDemo(userId);
  const db = getSupabaseAdmin();
  if (!db) throw new Error("No backend configured.");
  const { error: clearError } = await db
    .from("user_model_keys")
    .update({ is_default: false })
    .eq("workspace_id", userId);
  if (clearError) throw new Error(`Failed to update default: ${clearError.message}`);
  const { error, data } = await db
    .from("user_model_keys")
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq("workspace_id", userId)
    .eq("provider_id", providerId)
    .eq("is_active", true)
    .select("id");
  if (error) throw new Error(`Failed to update default: ${error.message}`);
  if (!data || data.length === 0) throw new Error(`"${providerId}" isn't connected yet.`);
}

/** The key + provider to use for THIS person: their own default key if they added one, else the
 *  server-wide ANTHROPIC_API_KEY (the platform's own model, paid for through the person's token
 *  balance). Keys belong to one account: nobody else's key is ever returned. */
export async function resolveDefaultModelKey(userId: string | null): Promise<{
  providerId: string;
  apiKey: string;
} | null> {
  const db = getSupabaseAdmin();
  // A demo visitor borrows the owner's key (and ONLY that: never the server-wide fallback below).
  const demo = userId ? await isDemoUser(userId) : false;
  const holder = demo ? await demoKeyOwnerId() : userId;
  if (demo && !holder) return null;
  if (db && holder) {
    const { data, error } = await db
      .rpc("get_default_model_key", { p_workspace_id: holder })
      .maybeSingle();
    const row = data as { provider_id: string; decrypted_secret: string } | null;
    if (!error && row?.decrypted_secret) {
      return { providerId: row.provider_id, apiKey: row.decrypted_secret };
    }
  }
  if (!demo && process.env["ANTHROPIC_API_KEY"]) {
    return { providerId: "anthropic", apiKey: process.env["ANTHROPIC_API_KEY"] };
  }
  return null;
}

export async function resolveModelKey(userId: string, providerId: string): Promise<string | null> {
  const db = getSupabaseAdmin();
  const demo = await isDemoUser(userId);
  const fallback = () =>
    !demo && providerId === "anthropic" ? (process.env["ANTHROPIC_API_KEY"] ?? null) : null;
  const holder = demo ? await demoKeyOwnerId() : userId;
  if (!db || !holder) return fallback();
  const { data, error } = await db.rpc("get_decrypted_model_key", {
    p_workspace_id: holder,
    p_provider_id: providerId,
  });
  if (error || !data) {
    return fallback();
  }
  return data as string;
}
