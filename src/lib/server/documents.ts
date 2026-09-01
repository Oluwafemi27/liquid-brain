import "@tanstack/react-start/server-only";
import { Document, Packer, Paragraph, TextRun } from "docx";
import mammoth from "mammoth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { DEFAULT_WORKSPACE_ID, getSupabaseAdmin } from "./supabase";

export type DocFormat = "txt" | "md" | "docx" | "pdf";

const MIME_BY_FORMAT: Record<DocFormat, string> = {
  txt: "text/plain",
  md: "text/markdown",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
};

export interface AgentDocument {
  id: string;
  filename: string;
  format: DocFormat;
  mimeType: string;
  sizeBytes: number;
  previewText: string | null;
  source: "agent" | "upload";
  createdAt: string;
}

function bucket() {
  const db = getSupabaseAdmin();
  if (!db)
    throw new Error("No backend configured — set SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY first.");
  return db.storage.from("agent-files");
}

/** Renders plain text content into the bytes for the given format. This is
 *  the "creating" half of the document skill — txt/md are passthrough,
 *  docx/pdf are real generated files, not just renamed text. */
async function renderBytes(format: DocFormat, content: string): Promise<Uint8Array> {
  if (format === "txt" || format === "md") {
    return new TextEncoder().encode(content);
  }

  if (format === "docx") {
    const doc = new Document({
      sections: [
        {
          children: content
            .split("\n")
            .map((line) => new Paragraph({ children: [new TextRun(line)] })),
        },
      ],
    });
    return await Packer.toBuffer(doc);
  }

  // pdf — simple word-wrapped text pages, not a layout engine, but a real
  // readable PDF rather than a stub.
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontSize = 11;
  const margin = 50;
  const pageWidth = 612;
  const pageHeight = 792;
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = fontSize * 1.4;

  const wrapped: string[] = [];
  for (const paragraph of content.split("\n")) {
    if (!paragraph) {
      wrapped.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) > maxWidth && line) {
        wrapped.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    wrapped.push(line);
  }

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;
  for (const line of wrapped) {
    if (y < margin) {
      page = pdf.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
    y -= lineHeight;
  }
  return await pdf.save();
}

/** Extracts plain text from arbitrary document bytes — the "reading" half
 *  of the skill. Used both for files the agent generated (to build a
 *  preview) and files the user uploads. */
export async function extractText(format: DocFormat, bytes: Uint8Array): Promise<string> {
  if (format === "txt" || format === "md") {
    return new TextDecoder().decode(bytes);
  }
  if (format === "docx") {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return value;
  }
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: bytes });
  const result = await parser.getText();
  return result.text;
}

function storagePath(sessionId: string, id: string, filename: string): string {
  return `${DEFAULT_WORKSPACE_ID}/${sessionId}/${id}-${filename}`;
}

/** Creates a new document from plain text content, uploads it, and records
 *  it with a ready-made preview. This is the entry point for both "create a
 *  document" and "edit a document" (edit = create again with new content,
 *  new row — the old version stays retrievable). */
export async function createDocument(args: {
  sessionId: string;
  filename: string;
  format: DocFormat;
  content: string;
}): Promise<AgentDocument> {
  const db = getSupabaseAdmin();
  if (!db)
    throw new Error("No backend configured — set SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY first.");

  const bytes = await renderBytes(args.format, args.content);
  const id = crypto.randomUUID();
  const path = storagePath(args.sessionId, id, args.filename);
  const mimeType = MIME_BY_FORMAT[args.format];

  const { error: uploadError } = await bucket().upload(path, bytes, {
    contentType: mimeType,
    upsert: true,
  });
  if (uploadError) throw new Error(`Failed to store document: ${uploadError.message}`);

  const previewText = args.content.slice(0, 5000);
  const { data, error } = await db
    .from("agent_documents")
    .insert({
      id,
      workspace_id: DEFAULT_WORKSPACE_ID,
      session_id: args.sessionId,
      filename: args.filename,
      format: args.format,
      mime_type: mimeType,
      storage_path: path,
      size_bytes: bytes.byteLength,
      preview_text: previewText,
      source: "agent",
    })
    .select("id, filename, format, mime_type, size_bytes, preview_text, source, created_at")
    .single();
  if (error || !data)
    throw new Error(`Failed to record document: ${error?.message ?? "unknown error"}`);

  return toAgentDocument(data);
}

/** Stores an uploaded file (given as raw bytes the caller already decoded)
 *  and extracts a text preview from it immediately. */
export async function uploadDocument(args: {
  sessionId: string;
  filename: string;
  format: DocFormat;
  bytes: Uint8Array;
}): Promise<AgentDocument> {
  const db = getSupabaseAdmin();
  if (!db)
    throw new Error("No backend configured — set SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY first.");

  const id = crypto.randomUUID();
  const path = storagePath(args.sessionId, id, args.filename);
  const mimeType = MIME_BY_FORMAT[args.format];

  const { error: uploadError } = await bucket().upload(path, args.bytes, {
    contentType: mimeType,
    upsert: true,
  });
  if (uploadError) throw new Error(`Failed to store document: ${uploadError.message}`);

  let previewText: string | null = null;
  try {
    previewText = (await extractText(args.format, args.bytes)).slice(0, 5000);
  } catch (error) {
    console.error("[documents] failed to extract preview text", error);
  }

  const { data, error } = await db
    .from("agent_documents")
    .insert({
      id,
      workspace_id: DEFAULT_WORKSPACE_ID,
      session_id: args.sessionId,
      filename: args.filename,
      format: args.format,
      mime_type: mimeType,
      storage_path: path,
      size_bytes: args.bytes.byteLength,
      preview_text: previewText,
      source: "upload",
    })
    .select("id, filename, format, mime_type, size_bytes, preview_text, source, created_at")
    .single();
  if (error || !data)
    throw new Error(`Failed to record document: ${error?.message ?? "unknown error"}`);

  return toAgentDocument(data);
}

/** Converts a stored document to a different format by extracting its text
 *  and re-rendering — real re-generation, not a file-extension swap. */
export async function convertDocument(id: string, targetFormat: DocFormat): Promise<AgentDocument> {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("No backend configured.");
  const { bytes, record } = await getDocumentBytes(id);
  const text = await extractText(record.format, bytes);
  const baseName = record.filename.replace(/\.[^.]+$/, "");
  return createDocument({
    sessionId: record.session_id as string,
    filename: `${baseName}.${targetFormat}`,
    format: targetFormat,
    content: text,
  });
}

interface DocumentRow {
  id: string;
  filename: string;
  format: DocFormat;
  mime_type: string;
  storage_path: string;
  session_id: string;
  size_bytes: number;
  preview_text: string | null;
  source: "agent" | "upload";
  created_at: string;
}

export async function getDocumentBytes(
  id: string,
): Promise<{ bytes: Uint8Array; record: DocumentRow }> {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("No backend configured.");
  const { data: record, error } = await db
    .from("agent_documents")
    .select("*")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("id", id)
    .single();
  if (error || !record) throw new Error("Document not found");

  const { data: file, error: downloadError } = await bucket().download(
    record.storage_path as string,
  );
  if (downloadError || !file)
    throw new Error(`Failed to fetch document: ${downloadError?.message}`);
  const bytes = new Uint8Array(await file.arrayBuffer());
  return { bytes, record: record as DocumentRow };
}

export async function getDocumentMeta(id: string): Promise<AgentDocument> {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("No backend configured.");
  const { data, error } = await db
    .from("agent_documents")
    .select("id, filename, format, mime_type, size_bytes, preview_text, source, created_at")
    .eq("workspace_id", DEFAULT_WORKSPACE_ID)
    .eq("id", id)
    .single();
  if (error || !data) throw new Error("Document not found");
  return toAgentDocument(data);
}

function toAgentDocument(row: {
  id: string;
  filename: string;
  format: string;
  mime_type: string;
  size_bytes: number;
  preview_text: string | null;
  source: string;
  created_at: string;
}): AgentDocument {
  return {
    id: row.id,
    filename: row.filename,
    format: row.format as DocFormat,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    previewText: row.preview_text,
    source: row.source as "agent" | "upload",
    createdAt: row.created_at,
  };
}
