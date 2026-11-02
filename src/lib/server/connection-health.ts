import "@tanstack/react-start/server-only";
import type { ConnectionHealth, HealthState } from "@/lib/aduf-types";
import { PLATFORM_NAMES } from "@/lib/permissions-catalog";
import { logEvent } from "./activity";
import { getGoogleAccessToken, ImportError, type GoogleProviderId } from "./google-auth";
import { DEFAULT_WORKSPACE_ID, getSupabaseAdmin } from "./supabase";

const GOOGLE_IDS = ["ga", "sheets", "drive", "gmail", "gsc", "gcal", "youtube"] as const;
const CACHE_MS = 10 * 60_000;
const STALE_SYNC_DAYS = 3;

export interface HealthInput {
  id: string;
  connected: boolean;
  hasRefresh: boolean;
  expiresAt: string | null;
  /** Result of calling the provider just now, if we could. */
  ping: { ok: true } | { ok: false; message: string } | null;
  /** From the auto-synced imports that depend on this connection. */
  sync: { oldestSyncedAt: string | null; lastError: string | null } | null;
  now: Date;
}

/** Pure: turns raw signals into live / delayed / broken with a plain next step. */
export function classifyHealth(
  i: HealthInput,
): Omit<ConnectionHealth, "name" | "checkedAt" | "lastOkAt"> {
  const method: "live-check" | "token-only" = i.ping ? "live-check" : "token-only";
  const fix = { actionLabel: "Reconnect in Settings", actionHref: "/settings" };
  if (i.ping && !i.ping.ok) {
    return { id: i.id, state: "broken", message: i.ping.message, method, ...fix };
  }
  if (i.expiresAt && !i.ping) {
    const left = new Date(i.expiresAt).getTime() - i.now.getTime();
    if (left < 0 && !i.hasRefresh) {
      return {
        id: i.id,
        state: "broken",
        message: "The saved login expired and can't renew itself.",
        method,
        ...fix,
      };
    }
    if (left < 3 * 86_400_000 && !i.hasRefresh) {
      return {
        id: i.id,
        state: "delayed",
        message: "The saved login expires soon.",
        method,
        ...fix,
      };
    }
  }
  if (i.sync?.lastError) {
    return {
      id: i.id,
      state: "broken",
      message: `The last data sync failed: ${i.sync.lastError}`,
      method,
      actionLabel: "Open imports",
      actionHref: "/analytics",
    };
  }
  if (i.sync?.oldestSyncedAt) {
    const days = (i.now.getTime() - new Date(i.sync.oldestSyncedAt).getTime()) / 86_400_000;
    if (days > STALE_SYNC_DAYS) {
      return {
        id: i.id,
        state: "delayed",
        message: `Data from this connection hasn't refreshed for ${Math.floor(days)} days.`,
        method,
        actionLabel: "Sync now",
        actionHref: "/analytics",
      };
    }
  }
  return {
    id: i.id,
    state: "live",
    message: i.ping ? "Connected and responding." : "Saved login looks valid (not checked live).",
    method,
  };
}

async function ping(provider: GoogleProviderId): Promise<HealthInput["ping"]> {
  try {
    const token = await getGoogleAccessToken(provider);
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(token)}`,
    );
    if (!res.ok) return { ok: false, message: "Google no longer accepts this login." };
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof ImportError ? e.message : "Couldn't reach Google." };
  }
}

type Row = Record<string, unknown>;

/** Checks every connected integration, saves the result, and logs changes (so a silent break shows up). */
export async function checkConnections(
  opts: { force?: boolean } = {},
): Promise<ConnectionHealth[]> {
  const db = getSupabaseAdmin();
  if (!db) return [];
  const now = new Date();

  const [{ data: conns }, { data: saved }, { data: syncs }] = await Promise.all([
    db
      .from("connectors")
      .select("id, connected, refresh_token, expires_at")
      .eq("workspace_id", DEFAULT_WORKSPACE_ID)
      .eq("connected", true),
    db.from("connector_health").select("*").eq("workspace_id", DEFAULT_WORKSPACE_ID),
    db
      .from("data_imports")
      .select("user_id, source, synced_at, last_error")
      .not("config", "is", null),
  ]);
  const savedById = new Map((saved ?? []).map((r) => [r["id"] as string, r as Row]));

  // Auto-synced imports per connection.
  const syncBy = new Map<
    string,
    { oldestSyncedAt: string | null; lastError: string | null; users: Set<string> }
  >();
  for (const s of syncs ?? []) {
    const id = s["source"] as string;
    const cur = syncBy.get(id) ?? {
      oldestSyncedAt: null,
      lastError: null,
      users: new Set<string>(),
    };
    const at = s["synced_at"] as string;
    if (!cur.oldestSyncedAt || at < cur.oldestSyncedAt) cur.oldestSyncedAt = at;
    if (s["last_error"]) cur.lastError = s["last_error"] as string;
    cur.users.add(s["user_id"] as string);
    syncBy.set(id, cur);
  }

  const out: ConnectionHealth[] = [];
  for (const c of conns ?? []) {
    const id = c["id"] as string;
    const prev = savedById.get(id);
    const fresh =
      prev &&
      !opts.force &&
      now.getTime() - new Date(prev["checked_at"] as string).getTime() < CACHE_MS;

    let health: ConnectionHealth;
    if (fresh && prev) {
      health = {
        id,
        name: PLATFORM_NAMES[id] ?? id,
        state: prev["state"] as HealthState,
        message: prev["message"] as string,
        actionLabel: (prev["action_label"] as string | null) ?? undefined,
        actionHref: (prev["action_href"] as string | null) ?? undefined,
        method: prev["method"] as "live-check" | "token-only",
        checkedAt: prev["checked_at"] as string,
        lastOkAt: (prev["last_ok_at"] as string | null) ?? null,
      };
    } else {
      const sync = syncBy.get(id) ?? null;
      const result = classifyHealth({
        id,
        connected: true,
        hasRefresh: Boolean(c["refresh_token"]),
        expiresAt: (c["expires_at"] as string | null) ?? null,
        ping: (GOOGLE_IDS as readonly string[]).includes(id)
          ? await ping(id as GoogleProviderId)
          : null,
        sync: sync ? { oldestSyncedAt: sync.oldestSyncedAt, lastError: sync.lastError } : null,
        now,
      });
      const lastOkAt =
        result.state === "live"
          ? now.toISOString()
          : ((prev?.["last_ok_at"] as string | null) ?? null);
      health = {
        ...result,
        name: PLATFORM_NAMES[id] ?? id,
        checkedAt: now.toISOString(),
        lastOkAt,
      };
      await db.from("connector_health").upsert({
        workspace_id: DEFAULT_WORKSPACE_ID,
        id,
        state: health.state,
        message: health.message,
        action_label: health.actionLabel ?? null,
        action_href: health.actionHref ?? null,
        method: health.method,
        checked_at: health.checkedAt,
        last_ok_at: lastOkAt,
      });
      // Tell the people who rely on this connection when its state changes.
      if (prev && prev["state"] !== health.state && sync) {
        for (const u of sync.users) {
          await logEvent(u, {
            platform: id,
            kind: "health",
            title:
              health.state === "live"
                ? `${health.name} is working again`
                : `${health.name} is ${health.state === "broken" ? "not working" : "delayed"}`,
            detail: health.message,
            status: health.state === "live" ? "ok" : health.state === "broken" ? "error" : "warn",
          });
        }
      }
    }
    out.push(health);
  }
  return out;
}
