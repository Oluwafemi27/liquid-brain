import "@tanstack/react-start/server-only";
import { extOf } from "@/lib/attachment-types";

// Turns any document into plain text the AI can read. Each format uses a real parser (not a rename):
// mammoth for Word, pdf-parse for PDF, exceljs for Excel, jszip for PowerPoint / OpenDocument / EPUB / zip.

export const MAX_EXTRACT_CHARS = 120_000;

export interface Extracted {
  text: string;
  /** What the reader should know (truncated, scanned PDF, unsupported...). */
  note?: string;
  /** True when the file has no readable text layer and needs a vision model (scanned PDF). */
  needsVision?: boolean;
}

const TEXT_EXT = new Set([
  "txt",
  "text",
  "md",
  "markdown",
  "csv",
  "tsv",
  "json",
  "jsonl",
  "ndjson",
  "log",
  "ini",
  "cfg",
  "conf",
  "toml",
  "yaml",
  "yml",
  "sql",
  "env",
  "properties",
  "tex",
  "rst",
  "srt",
  "vtt",
  "ics",
  "vcf",
  "js",
  "mjs",
  "cjs",
  "ts",
  "tsx",
  "jsx",
  "py",
  "rb",
  "php",
  "java",
  "kt",
  "swift",
  "go",
  "rs",
  "c",
  "h",
  "cpp",
  "hpp",
  "cs",
  "sh",
  "bash",
  "ps1",
  "bat",
  "css",
  "scss",
  "less",
  "vue",
  "svelte",
  "r",
  "lua",
  "dart",
  "gradle",
]);
const MARKUP_EXT = new Set(["html", "htm", "xhtml", "xml", "svg", "rss", "atom"]);

const clip = (text: string): Extracted => {
  const t = text
    .replace(/\r\n/g, "\n")
    .replace(/\0/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
  if (t.length <= MAX_EXTRACT_CHARS) return { text: t };
  return {
    text: t.slice(0, MAX_EXTRACT_CHARS),
    note: `Only the first ${MAX_EXTRACT_CHARS.toLocaleString("en")} characters were kept (the file has ${t.length.toLocaleString("en")}).`,
  };
};

function decodeText(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes);
  return new TextDecoder("utf-8").decode(bytes);
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};
const decodeEntities = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTITIES[n.toLowerCase()] ?? m);

/** HTML/XML to readable text: drops scripts and styles, keeps paragraph and row breaks. */
export function markupToText(markup: string): string {
  return decodeEntities(
    markup
      .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<\/(p|div|h[1-6]|li|tr|table|section|article|br|text:p|text:h|a:p)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<(td|th|text:tab|table:table-cell)[^>]*>/gi, " ")
      .replace(/<[^>]+>/g, ""),
  );
}

function rtfToText(rtf: string): string {
  return rtf
    .replace(/\\'([0-9a-f]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\u(-?\d+)\??/g, (_, n) =>
      String.fromCharCode(Number(n) < 0 ? Number(n) + 65536 : Number(n)),
    )
    .replace(/\\(par|line)\b ?/g, "\n")
    .replace(/\\tab\b ?/g, "\t")
    .replace(/\{\\\*[^{}]*\}/g, "")
    .replace(/\\[a-z]+-?\d* ?/gi, "")
    .replace(/[{}]/g, "");
}

async function zipTextParts(
  bytes: Uint8Array,
  pick: (name: string) => boolean,
  order?: (a: string, b: string) => number,
): Promise<string[]> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(bytes);
  const names = Object.keys(zip.files).filter((n) => !zip.files[n]!.dir && pick(n));
  if (order) names.sort(order);
  const out: string[] = [];
  for (const n of names) out.push(await zip.files[n]!.async("string"));
  return out;
}
const numericOrder = (a: string, b: string) =>
  (Number(a.match(/(\d+)\D*$/)?.[1]) || 0) - (Number(b.match(/(\d+)\D*$/)?.[1]) || 0);

async function xlsxToText(bytes: Uint8Array): Promise<Extracted> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(Buffer.from(bytes) as unknown as ArrayBuffer);
  const parts: string[] = [];
  for (const ws of wb.worksheets) {
    const rows: string[] = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const cells = (row.values as unknown[]).slice(1).map((v) => {
        if (v === null || v === undefined) return "";
        if (v instanceof Date) return v.toISOString().slice(0, 10);
        if (typeof v === "object") {
          const o = v as { text?: unknown; result?: unknown; richText?: Array<{ text: string }> };
          if (o.richText) return o.richText.map((r) => r.text).join("");
          if (o.result !== undefined) return String(o.result);
          if (o.text !== undefined) return String(o.text);
          return "";
        }
        return String(v);
      });
      rows.push(cells.join(" | "));
    });
    parts.push(`## Sheet: ${ws.name} (${rows.length} rows)\n${rows.join("\n")}`);
  }
  return clip(parts.join("\n\n"));
}

async function pdfToText(bytes: Uint8Array): Promise<Extracted> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: bytes });
  const result = await parser.getText();
  const text = (result.text ?? "").trim();
  // Almost no text for a multi-page file means it is a scan or photo of pages.
  const visible = text.replace(/--\s*\d+\s+of\s+\d+\s*--/g, "").replace(/\s/g, "");
  if (visible.length < 8) {
    return {
      text: "",
      needsVision: true,
      note: "This PDF has no text layer (it looks scanned), so it was read as an image.",
    };
  }
  return clip(text);
}

async function zipToText(bytes: Uint8Array): Promise<Extracted> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(bytes);
  const files = Object.keys(zip.files).filter(
    (n) => !zip.files[n]!.dir && !n.startsWith("__MACOSX"),
  );
  const lines = [
    `Zip archive with ${files.length} files:`,
    ...files.slice(0, 200).map((n) => `- ${n}`),
  ];
  let read = 0;
  for (const name of files) {
    if (read >= 12) break;
    const ext = extOf(name);
    if (
      !TEXT_EXT.has(ext) &&
      !MARKUP_EXT.has(ext) &&
      !["docx", "xlsx", "pptx", "pdf"].includes(ext)
    )
      continue;
    const entry = zip.files[name]!;
    const data = await entry.async("uint8array");
    if (data.byteLength > 3 * 1024 * 1024) continue;
    const inner = await extractDocumentText(name, "", data, 1);
    if (inner.text) {
      lines.push(`\n### ${name}\n${inner.text.slice(0, 15_000)}`);
      read++;
    }
  }
  return clip(lines.join("\n"));
}

/** Reads any supported document. Never throws on a bad file: returns an empty text and a note instead. */
export async function extractDocumentText(
  filename: string,
  mime: string,
  bytes: Uint8Array,
  depth = 0,
): Promise<Extracted> {
  const ext = extOf(filename);
  const m = mime.toLowerCase();
  try {
    if (ext === "pdf" || m === "application/pdf") return await pdfToText(bytes);
    if (ext === "docx" || m.includes("wordprocessingml")) {
      const mammoth = (await import("mammoth")).default;
      return clip((await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value);
    }
    if (ext === "xlsx" || ext === "xlsm" || m.includes("spreadsheetml"))
      return await xlsxToText(bytes);
    if (ext === "pptx" || m.includes("presentationml")) {
      const slides = await zipTextParts(
        bytes,
        (n) => /^ppt\/slides\/slide\d+\.xml$/.test(n),
        numericOrder,
      );
      const notes = await zipTextParts(
        bytes,
        (n) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(n),
        numericOrder,
      );
      const texts = slides.map(
        (x, i) => `## Slide ${i + 1}\n${markupToText(x.replace(/<a:t>/g, " <a:t>"))}`,
      );
      return clip(
        texts.join("\n\n") +
          (notes.length ? `\n\n## Speaker notes\n${notes.map(markupToText).join("\n")}` : ""),
      );
    }
    if (["odt", "ods", "odp"].includes(ext)) {
      const parts = await zipTextParts(bytes, (n) => n === "content.xml");
      return clip(markupToText(parts[0] ?? ""));
    }
    if (ext === "epub") {
      const parts = await zipTextParts(
        bytes,
        (n) => /\.(x?html?)$/i.test(n),
        (a, b) => a.localeCompare(b),
      );
      return clip(parts.map(markupToText).join("\n\n"));
    }
    if (ext === "zip" && depth === 0) return await zipToText(bytes);
    if (ext === "rtf" || m === "application/rtf" || m === "text/rtf")
      return clip(rtfToText(decodeText(bytes)));
    if (MARKUP_EXT.has(ext) || m === "text/html" || m.includes("xml"))
      return clip(markupToText(decodeText(bytes)));
    if (TEXT_EXT.has(ext) || m.startsWith("text/") || m === "application/json")
      return clip(decodeText(bytes));
    if (ext === "doc" || ext === "xls" || ext === "ppt") {
      return {
        text: "",
        note: `Old .${ext} files can't be read directly. Save it as .${ext}x (or PDF) and attach it again.`,
      };
    }
    // Unknown type: read it as text if it looks like text, otherwise say so.
    const head = bytes.subarray(0, 4096);
    if (!head.includes(0)) {
      const t = decodeText(bytes);
      if (t.trim()) return clip(t);
    }
    return {
      text: "",
      note: `ADUF can't read .${ext || "this"} files yet. The file name and size were kept.`,
    };
  } catch (e) {
    console.error("[attachments] extract failed", filename, e);
    return {
      text: "",
      note: "This file looks damaged or protected, so its contents couldn't be read.",
    };
  }
}
