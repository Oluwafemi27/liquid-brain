import "@tanstack/react-start/server-only";
import { createHash } from "node:crypto";
import { connect } from "node:net";

// Every file a person gives ADUF is scanned here BEFORE anything reads, stores or shows it.
//
//  1. Built-in checks (always on, no setup): executables and scripts, files pretending to be
//     something else, Office macros, PDF scripts and embedded programs, booby-trapped archives
//     (zip bombs, path tricks, password-locked zips), scripts inside web files, and the EICAR test file.
//  2. ClamAV (optional, set CLAMAV_HOST): a real antivirus engine with daily-updated signatures.
//  3. VirusTotal (optional, set VIRUSTOTAL_API_KEY): looks up the file's SHA-256 fingerprint.
//     Only the fingerprint is sent, never the file.
//
// Failing safe: if ClamAV is configured but can't be reached, the file is refused rather than let
// through unscanned (set SCAN_FAIL_OPEN=true to choose otherwise).

export type ScanVerdict = "clean" | "blocked";
export interface ScanResult {
  verdict: ScanVerdict;
  /** Plain-language reason a person can act on (set when blocked). */
  reason?: string;
  /** Which engines actually examined the file. */
  engines: string[];
  /** Non-fatal notes (e.g. an optional engine was unreachable). */
  warnings: string[];
}

const BLOCKED_EXT = new Set([
  "exe",
  "dll",
  "sys",
  "scr",
  "com",
  "pif",
  "bat",
  "cmd",
  "msi",
  "msp",
  "jar",
  "apk",
  "ipa",
  "app",
  "lnk",
  "hta",
  "wsf",
  "wsh",
  "vbs",
  "vbe",
  "ps1",
  "psm1",
  "reg",
  "cpl",
  "inf",
  "gadget",
  "msc",
  "iso",
  "img",
  "dmg",
  "appx",
  "msix",
  "docm",
  "xlsm",
  "pptm",
  "dotm",
  "xlam",
  "xlsb",
  "ppam",
  "sldm",
  "scf",
  "jse",
  "application",
  "deb",
  "rpm",
]);
const ZIP_BASED = new Set(["docx", "xlsx", "pptx", "odt", "ods", "odp", "epub", "zip"]);
const IMAGE_SIGS: Array<[string, number[]]> = [
  ["jpeg", [0xff, 0xd8, 0xff]],
  ["png", [0x89, 0x50, 0x4e, 0x47]],
  ["gif", [0x47, 0x49, 0x46, 0x38]],
  ["webp", [0x52, 0x49, 0x46, 0x46]],
  ["bmp", [0x42, 0x4d]],
  ["tiff", [0x49, 0x49, 0x2a, 0x00]],
  ["tiff", [0x4d, 0x4d, 0x00, 0x2a]],
];
const IMAGE_EXT = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "bmp",
  "tif",
  "tiff",
  "heic",
  "heif",
  "avif",
]);

const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

const startsWith = (b: Uint8Array, sig: number[], at = 0) => sig.every((v, i) => b[at + i] === v);
const ext = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
const latin1 = (b: Uint8Array, max = b.byteLength) =>
  Buffer.from(b.subarray(0, max)).toString("latin1");

/** What kind of program the bytes are, if any. */
function executableKind(b: Uint8Array): string | null {
  if (startsWith(b, [0x4d, 0x5a])) return "a Windows program";
  if (startsWith(b, [0x7f, 0x45, 0x4c, 0x46])) return "a Linux program";
  if (
    startsWith(b, [0xfe, 0xed, 0xfa, 0xce]) ||
    startsWith(b, [0xfe, 0xed, 0xfa, 0xcf]) ||
    startsWith(b, [0xce, 0xfa, 0xed, 0xfe]) ||
    startsWith(b, [0xcf, 0xfa, 0xed, 0xfe]) ||
    startsWith(b, [0xca, 0xfe, 0xba, 0xbe])
  )
    return "a Mac or Java program";
  return null;
}

interface ZipEntry {
  name: string;
  compressed: number;
  uncompressed: number;
  encrypted: boolean;
}

/** Reads a zip's table of contents without unpacking anything. Returns null if it isn't a readable zip. */
export function listZipEntries(b: Uint8Array): ZipEntry[] | null {
  const buf = Buffer.from(b.buffer, b.byteOffset, b.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return null;
  const total = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const entries: ZipEntry[] = [];
  for (let n = 0; n < total && n < 100_000; n++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50)
      return entries.length ? entries : null;
    const flags = buf.readUInt16LE(p + 8);
    const compressed = buf.readUInt32LE(p + 20);
    const uncompressed = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    entries.push({
      name: buf.toString("utf8", p + 46, p + 46 + nameLen),
      compressed,
      uncompressed,
      encrypted: (flags & 1) === 1,
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function inspectZip(entries: ZipEntry[]): string | null {
  if (entries.length > 10_000) return "it contains an unusually large number of files";
  let total = 0;
  for (const e of entries) {
    total += e.uncompressed;
    const lower = e.name.toLowerCase();
    if (e.name.includes("..") || e.name.startsWith("/") || /^[a-z]:/i.test(e.name))
      return "it contains files with unsafe paths";
    if (e.encrypted) return "it is password-protected, so it can't be checked";
    if (lower.endsWith("vbaproject.bin")) return "it contains macros";
    if (BLOCKED_EXT.has(ext(lower)))
      return `it contains a program file (${e.name.split("/").pop()})`;
    if (e.uncompressed > 200 * 1024 * 1024) return "one file inside would expand to an unsafe size";
  }
  const compressedTotal = entries.reduce((n, e) => n + e.compressed, 0) || 1;
  if (total > 1024 * 1024 * 1024 || (total > 50 * 1024 * 1024 && total / compressedTotal > 200))
    return "it would expand to an unsafe size (looks like a zip bomb)";
  return null;
}

/** The always-on checks. Returns a reason when the file must be refused, otherwise null. */
export function builtinScan(filename: string, bytes: Uint8Array): string | null {
  const e = ext(filename);
  if (BLOCKED_EXT.has(e)) return `.${e} files can run programs, so they aren't accepted`;
  const head = latin1(bytes, 4096);
  if (latin1(bytes, Math.min(bytes.byteLength, 1024 * 1024)).includes(EICAR))
    return "it is the standard antivirus test file";
  const exe = executableKind(bytes);
  if (exe) return `it is ${exe} disguised as a document`;

  if (IMAGE_EXT.has(e) && !["heic", "heif", "avif"].includes(e)) {
    const ok = IMAGE_SIGS.some(([, sig]) => startsWith(bytes, sig));
    if (!ok) return "its content isn't a real picture";
  }
  if (e === "pdf") {
    if (!head.includes("%PDF-")) return "it isn't a real PDF";
    // Active content in a PDF can run scripts or launch programs when it's opened elsewhere.
    const body = latin1(bytes, Math.min(bytes.byteLength, 20 * 1024 * 1024));
    if (/\/(JavaScript|JS)\b/.test(body)) return "it contains scripts";
    if (/\/Launch\b/.test(body)) return "it can launch programs";
    if (/\/EmbeddedFile\b/.test(body)) return "it contains hidden attached files";
    if (/\/RichMedia\b/.test(body)) return "it contains embedded interactive content";
  }
  if (ZIP_BASED.has(e)) {
    if (!startsWith(bytes, [0x50, 0x4b])) return `it isn't a real .${e} file`;
    const entries = listZipEntries(bytes);
    if (!entries) return "its archive structure is damaged or unreadable";
    const reason = inspectZip(entries);
    if (reason) return reason;
  } else if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    // A zip under another name (e.g. report.txt that is really an archive).
    const entries = listZipEntries(bytes);
    if (entries) {
      const reason = inspectZip(entries);
      if (reason) return reason;
    }
  }
  if (
    ["doc", "xls", "ppt", "dot", "xlt"].includes(e) &&
    startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0])
  ) {
    const body = latin1(bytes, Math.min(bytes.byteLength, 20 * 1024 * 1024));
    if (/_VBA_PROJECT|VBA\/|Macros\//.test(body)) return "it contains macros";
  }
  if (["html", "htm", "svg", "xml", "xhtml"].includes(e)) {
    const text = latin1(bytes, Math.min(bytes.byteLength, 2 * 1024 * 1024)).toLowerCase();
    if (/<script\b|javascript:|<iframe\b|<object\b|<embed\b|onload\s*=|onerror\s*=/.test(text))
      return "it contains scripts";
  }
  return null;
}

/** Streams the bytes to a ClamAV daemon (clamd) and returns the signature name if infected. */
export function scanWithClamd(
  bytes: Uint8Array,
  host: string,
  port: number,
  timeoutMs = 30_000,
): Promise<{ infected: boolean; signature?: string | undefined }> {
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port });
    let response = "";
    const done = (fn: () => void) => {
      socket.destroy();
      fn();
    };
    socket.setTimeout(timeoutMs, () => done(() => reject(new Error("ClamAV timed out"))));
    socket.on("error", (err) => done(() => reject(err)));
    socket.on("data", (d) => {
      response += d.toString("utf8");
    });
    socket.on("close", () => {
      const r = response.replace(/\0/g, "").trim();
      if (/OK$/.test(r)) return resolve({ infected: false });
      const m = r.match(/stream:\s*(.+?)\s+FOUND/);
      if (m) return resolve({ infected: true, signature: m[1] });
      reject(new Error(`ClamAV said: ${r || "nothing"}`));
    });
    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      const CHUNK = 64 * 1024;
      for (let i = 0; i < bytes.byteLength; i += CHUNK) {
        const part = Buffer.from(bytes.subarray(i, Math.min(i + CHUNK, bytes.byteLength)));
        const len = Buffer.alloc(4);
        len.writeUInt32BE(part.length);
        socket.write(len);
        socket.write(part);
      }
      socket.write(Buffer.alloc(4)); // zero length ends the stream
    });
  });
}

/** Looks up the file's fingerprint at VirusTotal (the file itself is never sent). */
export async function lookupVirusTotal(
  bytes: Uint8Array,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ malicious: number; known: boolean }> {
  const sha = createHash("sha256").update(bytes).digest("hex");
  const res = await fetchImpl(`https://www.virustotal.com/api/v3/files/${sha}`, {
    headers: { "x-apikey": apiKey },
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404) return { malicious: 0, known: false };
  if (!res.ok) throw new Error(`VirusTotal answered ${res.status}`);
  const j = (await res.json()) as {
    data?: { attributes?: { last_analysis_stats?: { malicious?: number } } };
  };
  return { malicious: j.data?.attributes?.last_analysis_stats?.malicious ?? 0, known: true };
}

export interface ScanDeps {
  env?: Record<string, string | undefined>;
  clamd?: typeof scanWithClamd;
  virusTotal?: typeof lookupVirusTotal;
}

/** Scans one file with every engine that's switched on. Never returns "clean" without the built-in checks having run. */
export async function scanFile(
  filename: string,
  bytes: Uint8Array,
  deps: ScanDeps = {},
): Promise<ScanResult> {
  const env = deps.env ?? process.env;
  const engines = ["built-in"];
  const warnings: string[] = [];
  const blocked = (reason: string): ScanResult => ({
    verdict: "blocked",
    reason: `Blocked for safety: ${reason}.`,
    engines,
    warnings,
  });

  const builtin = builtinScan(filename, bytes);
  if (builtin) return blocked(builtin);

  const host = env["CLAMAV_HOST"];
  if (host) {
    try {
      const r = await (deps.clamd ?? scanWithClamd)(
        bytes,
        host,
        Number(env["CLAMAV_PORT"] ?? 3310),
      );
      engines.push("ClamAV");
      if (r.infected) return blocked(`antivirus found ${r.signature ?? "malware"}`);
    } catch (e) {
      if (env["SCAN_FAIL_OPEN"] === "true")
        warnings.push(
          `ClamAV unavailable (${e instanceof Error ? e.message : "error"}); continued with built-in checks only.`,
        );
      else
        return {
          verdict: "blocked",
          reason:
            "The virus scanner isn't reachable right now, so this file can't be accepted. Try again in a minute.",
          engines,
          warnings,
        };
    }
  }

  const vtKey = env["VIRUSTOTAL_API_KEY"];
  if (vtKey) {
    try {
      const r = await (deps.virusTotal ?? lookupVirusTotal)(bytes, vtKey);
      engines.push("VirusTotal");
      if (r.malicious >= Number(env["VIRUSTOTAL_MIN_DETECTIONS"] ?? 2))
        return blocked(`${r.malicious} antivirus engines flag this exact file`);
    } catch (e) {
      warnings.push(`VirusTotal lookup skipped (${e instanceof Error ? e.message : "error"}).`);
    }
  }
  return { verdict: "clean", engines, warnings };
}

/** Quick check for small browser-produced pieces (video frames, audio chunks) that are only ever
 *  passed to AI models and never stored: must be the media they claim to be and not a program. */
export function scanMediaPiece(kind: "jpeg" | "audio", bytes: Uint8Array): string | null {
  const exe = executableKind(bytes);
  if (exe) return `it is ${exe}`;
  if (latin1(bytes, Math.min(bytes.byteLength, 1024 * 1024)).includes(EICAR))
    return "it is the standard antivirus test file";
  if (kind === "jpeg" && !startsWith(bytes, [0xff, 0xd8, 0xff])) return "it isn't a real picture";
  if (kind === "audio" && /^\s*(#!|<script|<html|[{[])/i.test(latin1(bytes, 256)))
    return "it isn't real audio";
  return null;
}
