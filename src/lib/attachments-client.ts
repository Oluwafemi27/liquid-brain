import { authHeaders } from "@/lib/auth-headers";
import {
  classifyFile,
  MAX_AUDIO_BYTES,
  MAX_DOCUMENT_BYTES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  type AttachmentKind,
} from "@/lib/attachment-types";
import type { ChatAttachment } from "@/lib/aduf-types";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

// Browser side of the attach button. Documents and audio go straight to private storage and are read
// by the server. Images are shrunk first (fast uploads, cheaper to read). Videos are never uploaded
// whole: the browser samples frames and extracts the speech audio, and only those are sent.

export type Stage = "preparing" | "uploading" | "reading" | "transcribing";

const BUCKET = "agent-files";
const JPEG_Q = 0.85;

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { ...authHeaders(), "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

function canvasToBlob(c: HTMLCanvasElement, quality = JPEG_Q): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Couldn't encode the image."))),
      "image/jpeg",
      quality,
    ),
  );
}

function draw(source: CanvasImageSource, w: number, h: number, maxSide: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * scale));
  c.height = Math.max(1, Math.round(h * scale));
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Your browser can't process images.");
  ctx.fillStyle = "#fff"; // transparent PNGs become white instead of black
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(source, 0, 0, c.width, c.height);
  return c;
}

const thumbOf = (source: CanvasImageSource, w: number, h: number) =>
  draw(source, w, h, 160).toDataURL("image/jpeg", 0.6);

/** Shrinks a photo to at most 1600px (JPEG) and makes a tiny preview. */
async function prepareImage(file: File): Promise<{ blob: Blob; thumbnail: string }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      "Your browser can't open this image type. Save it as JPEG or PNG and try again.",
    );
  }
  try {
    const canvas = draw(bitmap, bitmap.width, bitmap.height, 1600);
    return {
      blob: await canvasToBlob(canvas),
      thumbnail: thumbOf(bitmap, bitmap.width, bitmap.height),
    };
  } finally {
    bitmap.close();
  }
}

async function uploadToSlot(
  path: string,
  token: string,
  blob: Blob,
  contentType: string,
): Promise<void> {
  const client = getSupabaseBrowser();
  if (!client) throw new Error("Uploads need Supabase to be configured.");
  const { error } = await client.storage
    .from(BUCKET)
    .uploadToSignedUrl(path, token, blob, { contentType });
  if (error) throw new Error(`Upload failed: ${error.message}`);
}

async function storeAndRead(
  file: Blob,
  meta: { filename: string; mimeType: string; sessionId: string },
  thumbnail: string | null,
  onStage: (s: Stage) => void,
): Promise<ChatAttachment> {
  onStage("uploading");
  const slot = await postJson<{ id: string; path: string; token: string }>(
    "/api/attachments/prepare",
    {
      sessionId: meta.sessionId,
      filename: meta.filename,
      mimeType: meta.mimeType,
      sizeBytes: file.size,
    },
  );
  await uploadToSlot(slot.path, slot.token, file, meta.mimeType || "application/octet-stream");
  onStage("reading");
  const { attachment } = await postJson<{ attachment: ChatAttachment }>("/api/attachments/finish", {
    id: slot.id,
    thumbnail,
  });
  return attachment;
}

// ---- video ---------------------------------------------------------------------------------------

function waitFor(target: HTMLMediaElement, event: string, ms: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = window.setTimeout(() => reject(new Error("timeout")), ms);
    target.addEventListener(event, () => (window.clearTimeout(t), resolve()), { once: true });
    target.addEventListener("error", () => (window.clearTimeout(t), reject(new Error("error"))), {
      once: true,
    });
  });
}

async function sampleFrames(file: File): Promise<{
  frames: Array<{ t: number; base64: string }>;
  durationSec: number;
  thumbnail: string | null;
}> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;
  try {
    await waitFor(video, "loadedmetadata", 20_000).catch(() => {
      throw new Error("Your browser can't open this video format. Try an MP4 (H.264).");
    });
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    if (!duration || !video.videoWidth)
      throw new Error("Couldn't read this video. Try an MP4 (H.264).");
    const n = Math.min(12, Math.max(4, Math.ceil(duration / 20)));
    const frames: Array<{ t: number; base64: string }> = [];
    let thumbnail: string | null = null;
    for (let i = 0; i < n; i++) {
      const t = Math.min(duration - 0.05, (duration * (i + 0.5)) / n);
      video.currentTime = Math.max(0, t);
      await waitFor(video, "seeked", 10_000).catch(() => undefined);
      const canvas = draw(video, video.videoWidth, video.videoHeight, 768);
      const blob = await canvasToBlob(canvas, 0.7);
      const base64 = await blobToBase64(blob);
      if (base64.length > 100) frames.push({ t, base64 });
      if (i === 0) thumbnail = thumbOf(video, video.videoWidth, video.videoHeight);
    }
    return { frames, durationSec: duration, thumbnail };
  } finally {
    URL.revokeObjectURL(url);
    video.removeAttribute("src");
    video.load();
  }
}

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve((r.result as string).slice((r.result as string).indexOf(",") + 1));
    r.onerror = () => reject(r.error ?? new Error("Couldn't read the data."));
    r.readAsDataURL(blob);
  });

function wavOf(samples: Float32Array, rate: number, gain = 1): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) =>
    [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, "WAVEfmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++)
    v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i]! * gain)) * 0x7fff, true);
  return new Blob([buf], { type: "audio/wav" });
}

const RATE = 16_000;
const CHUNK_SEC = 45;
const MAX_AUDIO_SEC = 10 * 60;
const PARALLEL = 3; // the server allows 4 at once per person

/** Cuts the audio at the quietest moment near every 45 seconds, so words are not split in half. */
function planChunks(mono: Float32Array, usable: number): Array<[number, number]> {
  const target = CHUNK_SEC * RATE;
  const win = Math.round(0.1 * RATE);
  const reach = 4 * RATE;
  const out: Array<[number, number]> = [];
  let start = 0;
  while (start < usable) {
    let end = Math.min(usable, start + target);
    if (end < usable) {
      let best = end;
      let bestEnergy = Infinity;
      for (let p = Math.max(start + 10 * RATE, end - reach); p <= end - win; p += win >> 1) {
        let e = 0;
        for (let k = p; k < p + win; k += 8) e += mono[k]! * mono[k]!;
        if (e < bestEnergy) {
          bestEnergy = e;
          best = p + (win >> 1);
        }
      }
      end = best;
    }
    out.push([start, end]);
    start = end;
  }
  return out;
}

async function pool<T>(
  limit: number,
  items: T[],
  work: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      await work(items[i]!, i);
    }
  });
  await Promise.all(runners);
}

async function transcribeChunk(wav: Blob): Promise<string> {
  let lastError = new Error("Couldn't transcribe the audio.");
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { ...authHeaders(), "content-type": "audio/wav" },
        body: wav,
      });
      const body = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (res.ok) return body.text ?? "";
      lastError = new Error(body.error ?? "Couldn't transcribe the audio.");
      if (res.status !== 429 && res.status < 500) throw lastError; // a missing key or bad audio won't improve on retry
    } catch (e) {
      lastError = e instanceof Error ? e : lastError;
      if (attempt === 2 || /speech into text needs|blocked/i.test(lastError.message))
        throw lastError;
    }
    await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
  }
  throw lastError;
}

/** Decodes the video's audio track to 16 kHz mono, evens out the volume, and transcribes it in
 *  pieces, several at once. */
async function transcribeVideoAudio(
  file: File,
  onProgress: (done: number, total: number) => void,
): Promise<{ text: string; note: string | null }> {
  if (file.size > 300 * 1024 * 1024)
    return {
      text: "",
      note: "The video is too large to read its audio in the browser, so only the picture was read.",
    };
  let decoded: AudioBuffer;
  try {
    const Ctx =
      window.OfflineAudioContext ??
      (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
        .webkitOfflineAudioContext;
    decoded = await new Ctx(1, 1, RATE).decodeAudioData(await file.arrayBuffer());
  } catch {
    return {
      text: "",
      note: "This video's audio couldn't be read (or it has none), so only the picture was read.",
    };
  }
  const ch0 = decoded.getChannelData(0);
  const mono =
    decoded.numberOfChannels > 1
      ? ch0.map((s, i) => {
          let sum = s;
          for (let c = 1; c < decoded.numberOfChannels; c++) sum += decoded.getChannelData(c)[i]!;
          return sum / decoded.numberOfChannels;
        })
      : ch0;
  const usable = Math.min(mono.length, MAX_AUDIO_SEC * RATE);
  let peak = 0;
  for (let i = 0; i < usable; i += 4) peak = Math.max(peak, Math.abs(mono[i]!));
  // Quiet recordings are the commonest reason speech-to-text misses words: lift them (never more than 8x).
  const gain = peak > 0.001 && peak < 0.5 ? Math.min(8, 0.9 / peak) : 1;
  const chunks = planChunks(mono, usable);
  const parts: string[] = new Array(chunks.length).fill("");
  let skippedSilent = 0;
  let done = 0;
  onProgress(0, chunks.length);
  await pool(PARALLEL, chunks, async ([from, to], i) => {
    const slice = mono.subarray(from, to);
    let energy = 0;
    for (let k = 0; k < slice.length; k += 50) energy += slice[k]! * slice[k]!;
    if (energy / Math.max(1, slice.length / 50) < 1e-6) {
      skippedSilent++; // near silence: nothing to transcribe
    } else {
      parts[i] = await transcribeChunk(wavOf(slice, RATE, gain));
    }
    onProgress(++done, chunks.length);
  });
  const note =
    mono.length > usable
      ? `Only the first ${MAX_AUDIO_SEC / 60} minutes of audio were transcribed.`
      : skippedSilent === chunks.length
        ? "The audio is silent."
        : null;
  return { text: parts.filter(Boolean).join(" ").replace(/\s+/g, " ").trim(), note };
}

async function attachVideo(
  file: File,
  sessionId: string,
  onStage: (s: Stage, detail?: string) => void,
): Promise<ChatAttachment> {
  onStage("preparing", "Reading the picture and the sound");
  // The picture and the speech are independent, so they are read at the same time.
  const [{ frames, durationSec, thumbnail }, audio] = await Promise.all([
    sampleFrames(file),
    transcribeVideoAudio(file, (d, t) =>
      onStage("transcribing", `Transcribing audio ${Math.min(d + 1, t)}/${t}`),
    ).catch((e: Error) => {
      // No speech-to-text key: still read the picture, and say why the audio was skipped.
      if (/speech into text needs/.test(e.message)) return { text: "", note: e.message };
      throw e;
    }),
  ]);
  onStage("reading", "Reading the video");
  const { attachment } = await postJson<{ attachment: ChatAttachment }>("/api/attachments/video", {
    sessionId,
    filename: file.name,
    mimeType: file.type || "video/mp4",
    sizeBytes: file.size,
    durationSec,
    frames,
    transcript: audio.text,
    audioNote: audio.note,
    thumbnail,
  });
  return attachment;
}

// ---- entry point ---------------------------------------------------------------------------------

export function checkFile(file: File): { kind: AttachmentKind } | { error: string } {
  const kind = classifyFile(file.name, file.type);
  const limit =
    kind === "video"
      ? MAX_VIDEO_BYTES
      : kind === "image"
        ? MAX_IMAGE_BYTES
        : kind === "audio"
          ? MAX_AUDIO_BYTES
          : MAX_DOCUMENT_BYTES;
  if (file.size === 0) return { error: `"${file.name}" is empty.` };
  if (file.size > limit)
    return {
      error: `"${file.name}" is too large (${Math.round(limit / 1048576)}MB max for ${kind}s).`,
    };
  return { kind };
}

/** Prepares, uploads and reads one file. Resolves to the attachment the chat can send. */
export async function attachFile(
  file: File,
  sessionId: string,
  onStage: (s: Stage, detail?: string) => void,
): Promise<{ attachment: ChatAttachment; thumbnail: string | null }> {
  const checked = checkFile(file);
  if ("error" in checked) throw new Error(checked.error);
  if (checked.kind === "video") {
    const attachment = await attachVideo(file, sessionId, onStage);
    return { attachment, thumbnail: attachment.thumbnail ?? null };
  }
  if (checked.kind === "image") {
    onStage("preparing");
    const { blob, thumbnail } = await prepareImage(file);
    const attachment = await storeAndRead(
      blob,
      { filename: file.name, mimeType: "image/jpeg", sessionId },
      thumbnail,
      onStage,
    );
    return { attachment, thumbnail };
  }
  const attachment = await storeAndRead(
    file,
    { filename: file.name, mimeType: file.type, sessionId },
    null,
    onStage,
  );
  return { attachment, thumbnail: null };
}
