import "@tanstack/react-start/server-only";
import {
  classifyFile,
  extOf,
  MAX_AUDIO_BYTES,
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
  type AttachmentKind,
} from "@/lib/attachment-types";
import type { ChatAttachment } from "@/lib/aduf-types";
import { extractDocumentText } from "./attachment-extract";
import { deleteStoredFile, discardImmediately, expiresAt, maybePurge } from "./file-retention";
import { scanFile, scanMediaPiece } from "./file-scan";
import { getSupabaseAdmin } from "./supabase";
import { transcribeAudio } from "./transcribe";
import { analyzeMedia, DESCRIBE_INSTRUCTION, NoVisionModelError, pickVisionKey } from "./vision";
import type { MediaPart } from "./model-providers";

// The store behind the chat box's attach button. Files go from the browser straight to private storage
// (so size isn't limited by the web server), then `finishUpload` reads them: documents are parsed,
// images are described and OCR'd by a vision model, audio is transcribed. The extracted text stays
// on the server and is read by the AI on every turn.

const BUCKET = "agent-files";

interface Row {
  id: string;
  user_id: string;
  session_id: string;
  filename: string;
  kind: AttachmentKind;
  mime_type: string;
  size_bytes: number;
  storage_path: string | null;
  status: "pending" | "ready" | "failed";
  extracted_text: string | null;
  summary: string | null;
  meta: {
    thumbnail?: string;
    note?: string;
    durationSec?: number;
    scan?: { engines: string[]; at: string };
  } | null;
}

function db() {
  const d = getSupabaseAdmin();
  if (!d)
    throw new Error("No backend configured: set SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY first.");
  return d;
}

const safeName = (n: string) => n.replace(/[^\w.-]+/g, "_").slice(-120) || "file";

export function toChatAttachment(r: Row): ChatAttachment {
  const text = r.extracted_text ?? r.summary ?? "";
  return {
    id: r.id,
    filename: r.filename,
    format: r.kind === "document" ? extOf(r.filename) || "file" : r.kind,
    kind: r.kind,
    mimeType: r.mime_type,
    sizeBytes: Number(r.size_bytes),
    previewText: text.slice(0, 6000) || null,
    thumbnail: r.meta?.thumbnail ?? null,
    note: r.meta?.note ?? null,
    scanned: Boolean(r.meta?.scan),
    originalDeleted: !r.storage_path,
  };
}

async function getRow(userId: string, id: string): Promise<Row> {
  const { data, error } = await db()
    .from("chat_attachments")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) throw new Error("That file wasn't found.");
  return data as Row;
}

/** Step 1: reserve a row and hand the browser a one-time upload slot in private storage. */
export async function startUpload(
  userId: string,
  a: { sessionId: string; filename: string; mimeType: string; sizeBytes: number },
): Promise<{ id: string; path: string; token: string; kind: AttachmentKind }> {
  const kind = classifyFile(a.filename, a.mimeType);
  if (kind === "video")
    throw new Error(
      "Videos are read in the browser and sent as frames and audio, not uploaded whole.",
    );
  const limit =
    kind === "image" ? MAX_IMAGE_BYTES : kind === "audio" ? MAX_AUDIO_BYTES : MAX_DOCUMENT_BYTES;
  if (a.sizeBytes > limit)
    throw new Error(`That file is too large (${Math.round(limit / 1048576)}MB max for ${kind}s).`);
  const id = crypto.randomUUID();
  const path = `${userId}/${a.sessionId.replace(/[^\w-]/g, "_").slice(0, 80)}/${id}-${safeName(a.filename)}`;
  const { data, error } = await db().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data)
    throw new Error(`Couldn't prepare the upload: ${error?.message ?? "unknown error"}`);
  const { error: insertError } = await db()
    .from("chat_attachments")
    .insert({
      id,
      user_id: userId,
      session_id: a.sessionId,
      filename: a.filename.slice(0, 200),
      kind,
      mime_type: a.mimeType || "application/octet-stream",
      size_bytes: a.sizeBytes,
      storage_path: path,
      status: "pending",
      expires_at: expiresAt(),
    });
  maybePurge();
  if (insertError) throw new Error(`Couldn't record the file: ${insertError.message}`);
  return { id, path, token: data.token, kind };
}

async function download(path: string): Promise<Uint8Array> {
  const { data, error } = await db().storage.from(BUCKET).download(path);
  if (error || !data)
    throw new Error(`Couldn't read the uploaded file: ${error?.message ?? "missing"}`);
  return new Uint8Array(await data.arrayBuffer());
}

const toBase64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64");
const VISION_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function imageMime(row: Row): string {
  const m = row.mime_type.toLowerCase();
  if (VISION_MIME.has(m)) return m;
  const ext = extOf(row.filename);
  return ext === "png"
    ? "image/png"
    : ext === "webp"
      ? "image/webp"
      : ext === "gif"
        ? "image/gif"
        : "image/jpeg";
}

/** Marks a file as failed and deletes its stored copy, so a refused or unreadable file never lingers. */
async function fail(id: string, message: string, path?: string | null): Promise<never> {
  if (path) await deleteStoredFile(path);
  await db()
    .from("chat_attachments")
    .update({ status: "failed", storage_path: null, meta: { note: message } })
    .eq("id", id);
  throw new Error(message);
}

/** Step 2: the file is in storage. Read it and keep what the AI needs. Throws a plain-language error. */
export async function finishUpload(
  userId: string,
  id: string,
  thumbnail?: string | null,
): Promise<ChatAttachment> {
  const row = await getRow(userId, id);
  if (!row.storage_path) throw new Error("That file has no stored copy.");
  let bytes: Uint8Array;
  try {
    bytes = await download(row.storage_path);
  } catch (e) {
    return fail(id, e instanceof Error ? e.message : "Couldn't read the file.", row.storage_path);
  }
  // Nothing reads, shows or keeps a file until it has been scanned.
  const scan = await scanFile(row.filename, bytes);
  if (scan.verdict === "blocked")
    return fail(id, scan.reason ?? "That file was blocked for safety.", row.storage_path);
  let text = "";
  let summary: string | null = null;
  let note: string | null = null;
  try {
    if (row.kind === "image") {
      if (!VISION_MIME.has(imageMime(row)) || /heic|heif|tif|bmp|avif/i.test(extOf(row.filename))) {
        return fail(
          id,
          "That image format can't be read. Save it as JPEG or PNG and attach it again.",
          row.storage_path,
        );
      }
      summary = await analyzeMedia(
        userId,
        [{ mimeType: imageMime(row), base64: toBase64(bytes) }],
        DESCRIBE_INSTRUCTION,
      );
      text = summary;
    } else if (row.kind === "audio") {
      const t = await transcribeAudio(userId, bytes, row.filename, row.mime_type);
      text = t.text;
      summary = t.text.slice(0, 600);
      if (!t.text) note = "No speech was found in this audio.";
    } else {
      const ex = await extractDocumentText(row.filename, row.mime_type, bytes);
      text = ex.text;
      note = ex.note ?? null;
      if (ex.needsVision) {
        if (bytes.byteLength > 20 * 1024 * 1024)
          return fail(
            id,
            "That scanned PDF is too large to read as images (20MB max).",
            row.storage_path,
          );
        text = await analyzeMedia(
          userId,
          [{ mimeType: "application/pdf", base64: toBase64(bytes) }],
          "This PDF is scanned. Transcribe all of its text in reading order, keeping tables as plain rows and numbers exact. No preamble.",
        );
      }
    }
  } catch (e) {
    return fail(id, e instanceof Error ? e.message : "Couldn't read that file.", row.storage_path);
  }
  // Big files and all audio are thrown away right now: only what was learned from them is kept.
  const discard = discardImmediately(row.kind, Number(row.size_bytes));
  if (discard && (await deleteStoredFile(row.storage_path))) {
    note = [
      note,
      "The original file was deleted after reading. Only the text taken from it is kept.",
    ]
      .filter(Boolean)
      .join(" ");
  }
  const kept = !discard || !(note ?? "").includes("original file was deleted");
  const meta = {
    ...(thumbnail ? { thumbnail } : {}),
    ...(note ? { note } : {}),
    scan: { engines: scan.engines, at: new Date().toISOString() },
  };
  const { data, error } = await db()
    .from("chat_attachments")
    .update({
      status: "ready",
      extracted_text: text,
      summary,
      meta,
      ...(kept ? {} : { storage_path: null }),
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) throw new Error("Couldn't save what was read from that file.");
  return toChatAttachment(data as Row);
}

export interface VideoInput {
  sessionId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  durationSec: number;
  frames: Array<{ t: number; base64: string }>;
  transcript: string;
  audioNote?: string | null | undefined;
  thumbnail?: string | null | undefined;
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Videos are cut into frames and audio in the browser; this looks at the frames, joins the transcript,
 *  and saves one searchable analysis (the video file itself is not stored). */
export async function saveVideoAnalysis(userId: string, v: VideoInput): Promise<ChatAttachment> {
  if (v.frames.length === 0 && !v.transcript)
    throw new Error("Nothing could be read from that video (no frames and no audio).");
  if (v.frames.length > 60) throw new Error("Too many video frames. Try a shorter clip.");
  // The pieces come from the browser, so check them like any upload before a model sees them.
  const decoded = v.frames.map((f) => new Uint8Array(Buffer.from(f.base64, "base64")));
  for (const bytes of decoded) {
    if (bytes.byteLength > 3 * 1024 * 1024)
      throw new Error("A video frame is too large. Try a shorter clip.");
    const bad = scanMediaPiece("jpeg", bytes);
    if (bad) throw new Error(`Blocked for safety: ${bad}.`);
  }
  const scan = decoded.length
    ? await scanFile("video-frames.bin", Buffer.concat(decoded.map((d) => Buffer.from(d))), {
        env: { ...process.env, VIRUSTOTAL_API_KEY: undefined },
      })
    : { verdict: "clean" as const, engines: ["built-in"], warnings: [] as string[] };
  if (scan.verdict === "blocked")
    throw new Error(scan.reason ?? "That video was blocked for safety.");
  let visual = "";
  const notes: string[] = [];
  if (v.audioNote) notes.push(v.audioNote);
  if (v.frames.length > 0) {
    if (await pickVisionKey(userId)) {
      const media: MediaPart[] = v.frames.map((f) => ({
        mimeType: "image/jpeg",
        base64: f.base64,
      }));
      visual = await analyzeMedia(
        userId,
        media,
        `These ${v.frames.length} images are frames sampled evenly from one video "${v.filename}" (${clock(v.durationSec)} long), at: ${v.frames.map((f) => clock(f.t)).join(", ")}. ` +
          "Describe what happens over time, name the setting and any products or screens shown, and transcribe visible text and numbers exactly. " +
          (v.transcript ? `Audio transcript for context:\n${v.transcript.slice(0, 6000)}\n` : "") +
          "Plain text, timeline order, no preamble.",
      );
    } else if (!v.transcript) {
      throw new NoVisionModelError();
    } else {
      notes.push("No vision-capable AI key is connected, so only the audio was read.");
    }
  }
  const text =
    `VIDEO "${v.filename}" (${clock(v.durationSec)})\n\n` +
    (visual ? `What is on screen:\n${visual}\n\n` : "") +
    (v.transcript
      ? `Spoken audio (transcript):\n${v.transcript}`
      : "No speech was detected in the audio.");
  const id = crypto.randomUUID();
  notes.push("The video file itself is never stored, only what was read from it.");
  const meta = {
    ...(v.thumbnail ? { thumbnail: v.thumbnail } : {}),
    note: notes.join(" "),
    durationSec: v.durationSec,
    scan: { engines: scan.engines, at: new Date().toISOString() },
  };
  const { data, error } = await db()
    .from("chat_attachments")
    .insert({
      id,
      user_id: userId,
      session_id: v.sessionId,
      filename: v.filename.slice(0, 200),
      kind: "video",
      mime_type: v.mimeType || "video/mp4",
      size_bytes: v.sizeBytes,
      status: "ready",
      extracted_text: text,
      summary: (visual || v.transcript).slice(0, 600),
      meta,
    })
    .select("*")
    .single();
  if (error || !data)
    throw new Error(`Couldn't save the video analysis: ${error?.message ?? "unknown error"}`);
  return toChatAttachment(data as Row);
}

/** A short-lived link to view or download the original file (not available for videos). */
export async function signedViewUrl(userId: string, id: string): Promise<string> {
  const row = await getRow(userId, id);
  if (!row.storage_path)
    throw new Error(
      "The original was deleted (files are kept for less than 24 hours). The text read from it is still in the chat.",
    );
  if (row.status !== "ready" || !row.meta?.scan)
    throw new Error("That file hasn't been scanned yet.");
  const { data, error } = await db()
    .storage.from(BUCKET)
    .createSignedUrl(row.storage_path, 300, { download: false });
  if (error || !data) throw new Error("Couldn't open that file.");
  return data.signedUrl;
}

export interface LoadedAttachment {
  row: Row;
  text: string;
}

/** What the chat turn needs: each attached file's extracted text (owned by this user, ready). */
export async function loadAttachments(userId: string, ids: string[]): Promise<LoadedAttachment[]> {
  if (ids.length === 0) return [];
  const { data } = await db()
    .from("chat_attachments")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "ready")
    .in("id", ids);
  const byId = new Map((data as Row[] | null)?.map((r) => [r.id, r]) ?? []);
  return ids.flatMap((id) => {
    const row = byId.get(id);
    return row ? [{ row, text: row.extracted_text ?? "" }] : [];
  });
}

/** Original image bytes for a follow-up vision pass on the person's actual question. */
export async function loadImageMedia(userId: string, row: Row): Promise<MediaPart | null> {
  if (row.kind !== "image" || !row.storage_path || row.user_id !== userId) return null;
  try {
    return { mimeType: imageMime(row), base64: toBase64(await download(row.storage_path)) };
  } catch {
    return null;
  }
}

/** Builds the labelled text block the AI reads for a set of attachments, within a shared size budget. */
export function buildAttachmentContext(items: LoadedAttachment[], budget = 100_000): string {
  if (items.length === 0) return "";
  const per = Math.max(8_000, Math.floor(budget / items.length));
  return items
    .map(({ row, text }, i) => {
      const body =
        text.length > per
          ? `${text.slice(0, per)}\n[...cut: ${text.length - per} more characters not shown]`
          : text || "(nothing readable was found)";
      const label = row.kind === "document" ? "document" : row.kind;
      return `[Attachment ${i + 1} of ${items.length}: "${row.filename}", ${label}]\n${body}`;
    })
    .join("\n\n");
}
