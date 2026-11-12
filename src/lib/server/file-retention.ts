import "@tanstack/react-start/server-only";
import { getSupabaseAdmin } from "./supabase";

// How long uploaded files live. The rule: no original file stays longer than 24 hours, and big
// files (and every audio/video file) are thrown away the moment they've been read. What the AI
// learned from a file (its text, transcript or description) is kept with the conversation; the
// file itself is not.

const BUCKET = "agent-files";

/** Hours an original file may be kept. Default 23, never more than 24, so a purge that runs a
 *  little late still stays inside the 24-hour promise. */
export function fileTtlHours(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env["ATTACHMENT_TTL_HOURS"]);
  const hours = Number.isFinite(n) && n > 0 ? n : 23;
  return Math.min(hours, 24);
}

/** Files at or above this size are discarded as soon as they've been read. Default 8 MB. */
export function largeFileBytes(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env["LARGE_FILE_BYTES"]);
  return Number.isFinite(n) && n > 0 ? n : 8 * 1024 * 1024;
}

export const expiresAt = (now = Date.now(), env = process.env): string =>
  new Date(now + fileTtlHours(env) * 3_600_000).toISOString();

/** True when the original should be deleted right after it's been read. */
export function discardImmediately(kind: string, sizeBytes: number, env = process.env): boolean {
  return kind === "audio" || kind === "video" || sizeBytes >= largeFileBytes(env);
}

/** Deletes one stored file. Never throws: a failed delete is retried by the purge job. */
export async function deleteStoredFile(path: string | null | undefined): Promise<boolean> {
  if (!path) return true;
  const db = getSupabaseAdmin();
  if (!db) return false;
  const { error } = await db.storage.from(BUCKET).remove([path]);
  return !error;
}

export interface PurgeSummary {
  files: number;
  abandoned: number;
  documents: number;
  textRows: number;
  errors: number;
}

const chunk = <T>(a: T[], n: number): T[][] =>
  Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));

/** Removes expired originals, abandoned half-finished uploads, and expired uploaded documents. Safe to run as often as you like. */
export async function purgeExpiredFiles(
  now = new Date(),
  limit = 500,
  env = process.env,
): Promise<PurgeSummary> {
  const out: PurgeSummary = { files: 0, abandoned: 0, documents: 0, textRows: 0, errors: 0 };
  const db = getSupabaseAdmin();
  if (!db) return out;
  const nowIso = now.toISOString();
  const abandonedBefore = new Date(now.getTime() - 60 * 60_000).toISOString();

  // 1. Chat attachments: expired, or never finished (uploaded but not read within an hour).
  for (const [label, query] of [
    [
      "files",
      db
        .from("chat_attachments")
        .select("id, storage_path")
        .not("storage_path", "is", null)
        .lte("expires_at", nowIso)
        .limit(limit),
    ],
    [
      "abandoned",
      db
        .from("chat_attachments")
        .select("id, storage_path")
        .not("storage_path", "is", null)
        .neq("status", "ready")
        .lte("created_at", abandonedBefore)
        .limit(limit),
    ],
  ] as const) {
    const { data, error } = await query;
    if (error) {
      out.errors += 1;
      continue;
    }
    for (const part of chunk((data ?? []) as Array<{ id: string; storage_path: string }>, 100)) {
      const { error: rmError } = await db.storage
        .from(BUCKET)
        .remove(part.map((r) => r.storage_path));
      if (rmError) {
        out.errors += 1;
        continue;
      }
      const { error: upError } = await db
        .from("chat_attachments")
        .update({ storage_path: null })
        .in(
          "id",
          part.map((r) => r.id),
        );
      if (upError) out.errors += 1;
      else out[label] += part.length;
    }
  }

  // 2. Uploaded documents (the older upload feature) expire the same way and are removed entirely.
  const docs = await db
    .from("agent_documents")
    .select("id, storage_path")
    .lte("expires_at", nowIso)
    .limit(limit);
  if (!docs.error) {
    for (const part of chunk(
      (docs.data ?? []) as Array<{ id: string; storage_path: string }>,
      100,
    )) {
      const paths = part.map((r) => r.storage_path).filter(Boolean);
      if (paths.length) {
        const { error: rmError } = await db.storage.from(BUCKET).remove(paths);
        if (rmError) {
          out.errors += 1;
          continue;
        }
      }
      const { error: delError } = await db
        .from("agent_documents")
        .delete()
        .in(
          "id",
          part.map((r) => r.id),
        );
      if (delError) out.errors += 1;
      else out.documents += part.length;
    }
  }

  // 3. Optional: also drop the extracted text after N hours (off by default: the text is the memory of the file).
  const textHours = Number(env["ATTACHMENT_TEXT_RETENTION_HOURS"]);
  if (Number.isFinite(textHours) && textHours > 0) {
    const cutoff = new Date(now.getTime() - textHours * 3_600_000).toISOString();
    const { data, error } = await db
      .from("chat_attachments")
      .delete()
      .lte("created_at", cutoff)
      .select("id");
    if (error) out.errors += 1;
    else out.textRows = data?.length ?? 0;
  }
  return out;
}

let lastPurge = 0;
let running: Promise<unknown> | null = null;

/** Runs a purge in the background if one hasn't run on this server in the last `everyMs`. Used after uploads. */
export function maybePurge(everyMs = 10 * 60_000): void {
  const now = Date.now();
  if (running || now - lastPurge < everyMs) return;
  lastPurge = now;
  running = purgeExpiredFiles()
    .catch((e) => console.error("[purge] failed", e))
    .finally(() => {
      running = null;
    });
}

let timer: ReturnType<typeof setInterval> | null = null;

/** Starts the 15-minute purge timer on long-running servers (Azure container). Skipped on Vercel, where cron and upload-time purges do the job. */
export function startPurgeTimer(env = process.env): void {
  if (timer || env["VERCEL"] || env["PURGE_TIMER"] === "off") return;
  timer = setInterval(() => maybePurge(5 * 60_000), 15 * 60_000);
  timer.unref?.();
  maybePurge(0);
}
