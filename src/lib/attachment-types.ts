// Client-safe description of which files ADUF can read, shared by the chat box and the server.

export type AttachmentKind = "document" | "image" | "audio" | "video";

const IMAGE_EXT = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "bmp",
  "heic",
  "heif",
  "avif",
  "tif",
  "tiff",
]);
const AUDIO_EXT = new Set([
  "mp3",
  "wav",
  "m4a",
  "aac",
  "ogg",
  "oga",
  "opus",
  "flac",
  "weba",
  "amr",
]);
const VIDEO_EXT = new Set(["mp4", "mov", "webm", "mkv", "avi", "m4v", "3gp", "mpeg", "mpg", "ogv"]);

export const extOf = (filename: string): string => filename.split(".").pop()?.toLowerCase() ?? "";

/** Decides what a file is from its type and extension (browsers often leave the type empty). */
export function classifyFile(filename: string, mime: string): AttachmentKind {
  const ext = extOf(filename);
  const m = mime.toLowerCase();
  if (m.startsWith("image/") && m !== "image/svg+xml") return "image";
  if (m.startsWith("video/")) return "video";
  if (m.startsWith("audio/")) return "audio";
  if (IMAGE_EXT.has(ext)) return "image";
  if (VIDEO_EXT.has(ext)) return "video";
  if (AUDIO_EXT.has(ext)) return "audio";
  return "document";
}

export const MAX_FILES_PER_MESSAGE = 8;
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 24 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

export function sizeLabel(bytes: number): string {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${Math.round(bytes / 1000)} KB`;
  return `${bytes} B`;
}
