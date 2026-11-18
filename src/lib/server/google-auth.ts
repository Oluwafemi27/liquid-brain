import "@tanstack/react-start/server-only";
import { isSealed, openToken, sealToken } from "./crypto-tokens";
import { getSupabaseAdmin } from "./supabase";

/** An error whose message is safe and useful to show the owner as-is. */
export class ImportError extends Error {
  constructor(
    message: string,
    public readonly code: "not_connected" | "reauth" | "api" | "bad_data" | "no_backend",
  ) {
    super(message);
    this.name = "ImportError";
  }
}

export type GoogleProviderId = "ga" | "sheets" | "drive" | "gmail" | "gsc" | "gcal" | "youtube";

const PROVIDER_NAMES: Record<GoogleProviderId, string> = {
  ga: "Google Analytics",
  sheets: "Google Sheets",
  drive: "Google Drive",
  gmail: "Gmail",
  gsc: "Search Console",
  gcal: "Google Calendar",
  youtube: "YouTube",
};

/** A valid access token for a connected Google provider. Refreshes it with
 *  the stored refresh token when it's about to expire (Google access tokens
 *  last ~1 hour) and saves the new one, so imports keep working after the
 *  initial connect without the owner having to reconnect. */
export async function getGoogleAccessToken(
  userId: string,
  provider: GoogleProviderId,
): Promise<string> {
  const name = PROVIDER_NAMES[provider];
  const db = getSupabaseAdmin();
  if (!db)
    throw new ImportError(
      "The backend isn't configured, so connections can't be used yet.",
      "no_backend",
    );

  const { data, error } = await db
    .from("connectors")
    .select("connected, access_token, refresh_token, expires_at")
    .eq("workspace_id", userId)
    .eq("id", provider)
    .maybeSingle();
  if (error) throw new ImportError(`Couldn't read the ${name} connection: ${error.message}`, "api");
  if (!data || !data["connected"] || !data["access_token"]) {
    throw new ImportError(
      `${name} isn't connected. Connect it in Settings first.`,
      "not_connected",
    );
  }

  let accessPlain: string | null;
  let refreshToken: string | null;
  try {
    accessPlain = await openToken(data["access_token"] as string);
    refreshToken = await openToken(data["refresh_token"] as string | null);
  } catch (e) {
    throw new ImportError(
      `${name}'s saved login can't be read (${e instanceof Error ? e.message : "decryption failed"}). Reconnect it in Settings.`,
      "reauth",
    );
  }

  // Upgrade legacy plaintext tokens in place once an encryption key exists.
  if (accessPlain && !isSealed(data["access_token"] as string)) {
    const sealedAccess = await sealToken(accessPlain);
    if (sealedAccess && isSealed(sealedAccess)) {
      await db
        .from("connectors")
        .update({ access_token: sealedAccess, refresh_token: await sealToken(refreshToken) })
        .eq("workspace_id", userId)
        .eq("id", provider);
    }
  }

  const expiresAt = data["expires_at"] ? new Date(data["expires_at"] as string).getTime() : null;
  const stillValid = expiresAt === null || expiresAt - Date.now() > 60_000;
  if (stillValid && accessPlain) return accessPlain;

  const clientId = process.env["GOOGLE_CLIENT_ID"];
  const clientSecret = process.env["GOOGLE_CLIENT_SECRET"];
  if (!refreshToken || !clientId || !clientSecret) {
    throw new ImportError(
      `Your ${name} session expired. Disconnect and reconnect it in Settings.`,
      "reauth",
    );
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new ImportError(
      json.error === "invalid_grant"
        ? `Google revoked access for ${name}. Disconnect and reconnect it in Settings.`
        : `Couldn't refresh your ${name} session (${json.error ?? res.status}). Try reconnecting it in Settings.`,
      "reauth",
    );
  }

  await db
    .from("connectors")
    .update({
      access_token: await sealToken(json.access_token),
      expires_at: json.expires_in
        ? new Date(Date.now() + json.expires_in * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", userId)
    .eq("id", provider);
  return json.access_token;
}

/** GET/POST a Google API with a bearer token and turn failures into messages
 *  the owner can act on (API not enabled, scope missing, quota…). */
export async function googleApi(
  userId: string,
  provider: GoogleProviderId,
  url: string,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<Response> {
  const token = await getGoogleAccessToken(userId, provider);
  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: {
      authorization: `Bearer ${token}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
    },
    ...(init.body ? { body: JSON.stringify(init.body) } : {}),
  });
  if (res.ok) return res;

  const raw = await res.text();
  let message = raw.slice(0, 300);
  let reason = "";
  try {
    const j = JSON.parse(raw) as {
      error?: { message?: string; status?: string; details?: { reason?: string }[] };
    };
    message = j.error?.message ?? message;
    reason = j.error?.details?.find((d) => d.reason)?.reason ?? j.error?.status ?? "";
  } catch {
    /* non-JSON error body */
  }
  const name = PROVIDER_NAMES[provider];
  if (
    /SERVICE_DISABLED|accessNotConfigured|has not been used in project/i.test(
      `${reason} ${message}`,
    )
  ) {
    throw new ImportError(
      `The API behind ${name} isn't enabled in your Google Cloud project. Enable it in the Google Cloud console (APIs & Services → Library), wait a minute, then retry. (${message.slice(0, 160)})`,
      "api",
    );
  }
  if (res.status === 401) {
    throw new ImportError(
      `${name} rejected the saved login. Disconnect and reconnect it in Settings.`,
      "reauth",
    );
  }
  if (res.status === 403) {
    throw new ImportError(
      `${name} said no (403): ${message.slice(0, 200)}. The connected Google account may not have access, or the connection is missing a permission — try reconnecting it.`,
      "api",
    );
  }
  if (res.status === 404)
    throw new ImportError(`Not found in ${name}: ${message.slice(0, 200)}`, "api");
  throw new ImportError(
    `${name} returned an error (${res.status}): ${message.slice(0, 200)}`,
    "api",
  );
}
