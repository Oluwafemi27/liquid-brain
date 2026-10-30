import "@tanstack/react-start/server-only";
import { logEvent } from "./activity";
import { importGaMonths, importGmailLeads, importTable } from "./business-data";
import { ImportError } from "./google-auth";
import { fetchGaMonths, fetchGmailLeads, loadGoogleTable } from "./google-sources";
import { getSupabaseAdmin } from "./supabase";

export interface SyncOutcome {
  ok: boolean;
  message: string;
}

type Row = Record<string, unknown>;

/** Repeats a saved import against its source. The old data is only replaced AFTER the fresh
 *  fetch succeeds, so a failed sync never wipes good numbers — it just records why it failed. */
export async function resyncImport(userId: string, importId: string): Promise<SyncOutcome> {
  const db = getSupabaseAdmin();
  if (!db) return { ok: false, message: "Backend not configured." };
  const { data } = await db
    .from("data_imports")
    .select("*")
    .eq("id", importId)
    .eq("user_id", userId)
    .maybeSingle();
  const row = data as Row | null;
  if (!row) return { ok: false, message: "That import no longer exists." };
  const config = row["config"] as Record<string, unknown> | null;
  const source = row["source"] as string;
  const label = row["label"] as string;
  if (!config)
    return {
      ok: false,
      message: "Uploaded files can't be re-synced — upload the newer file instead.",
    };

  try {
    let count = 0;
    if (source === "sheets" || source === "drive") {
      const table = await loadGoogleTable(
        String(config["fileRef"]),
        config["tab"] ? String(config["tab"]) : undefined,
      );
      const out = await importTable(userId, {
        source,
        sourceRef: row["source_ref"] as string,
        label,
        kind: config["kind"] as "sale",
        currency: String(config["currency"]),
        dateOrder: config["dateOrder"] as "auto",
        mapping: config["mapping"] as Record<string, number>,
        rows: table.rows.slice(1),
        config,
      });
      count = out.imported;
    } else if (source === "ga") {
      const { months, currency } = await fetchGaMonths(String(config["propertyId"]));
      count = (
        await importGaMonths(userId, {
          propertyId: String(config["propertyId"]),
          propertyName: String(config["propertyName"] ?? label),
          currency,
          months,
          config,
        })
      ).imported;
    } else if (source === "gmail") {
      count = (await importGmailLeads(userId, await fetchGmailLeads())).imported;
    } else {
      return { ok: false, message: "This source can't be re-synced." };
    }
    await logEvent(userId, {
      platform: source,
      kind: "sync",
      title: `Synced ${label}`,
      detail: `${count.toLocaleString()} records refreshed`,
      status: "ok",
    });
    return { ok: true, message: `Refreshed ${count.toLocaleString()} records.` };
  } catch (e) {
    const message = e instanceof ImportError ? e.message : "Unexpected error while syncing.";
    if (!(e instanceof ImportError)) console.error("[sync] failed", importId, e);
    await db
      .from("data_imports")
      .update({ last_error: message.slice(0, 300) })
      .eq("id", importId)
      .eq("user_id", userId);
    await logEvent(userId, {
      platform: source,
      kind: "sync",
      title: `Sync failed: ${label}`,
      detail: message,
      status: "error",
    });
    return { ok: false, message };
  }
}

/** Cron entry: re-sync the stalest auto-syncable imports across all owners. */
export async function resyncDue(limit = 10): Promise<{ attempted: number; failed: number }> {
  const db = getSupabaseAdmin();
  if (!db) return { attempted: 0, failed: 0 };
  const { data } = await db
    .from("data_imports")
    .select("id, user_id")
    .not("config", "is", null)
    .order("synced_at", { ascending: true })
    .limit(limit);
  let failed = 0;
  for (const r of data ?? []) {
    const res = await resyncImport(r["user_id"] as string, r["id"] as string);
    if (!res.ok) failed += 1;
  }
  return { attempted: data?.length ?? 0, failed };
}
