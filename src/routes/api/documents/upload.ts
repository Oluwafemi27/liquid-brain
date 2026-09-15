import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { uploadDocument } from "@/lib/server/documents";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const bodySchema = z.object({
  sessionId: z.string().min(1).max(200).default("default"),
  filename: z.string().min(1).max(200),
  format: z.enum(["txt", "md", "docx", "pdf"]),
  /** Raw file bytes, base64-encoded — avoids needing multipart parsing. */
  base64Content: z.string().min(1),
});

export const Route = createFileRoute("/api/documents/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success)
          return json({ error: "Invalid request", details: parsed.error.flatten() }, 400);

        let bytes: Uint8Array;
        try {
          bytes = new Uint8Array(Buffer.from(parsed.data.base64Content, "base64"));
        } catch {
          return json({ error: "base64Content isn't valid base64" }, 400);
        }
        if (bytes.byteLength > 15 * 1024 * 1024) {
          return json({ error: "File too large (15MB max)" }, 400);
        }

        try {
          const doc = await uploadDocument({
            sessionId: parsed.data.sessionId,
            filename: parsed.data.filename,
            format: parsed.data.format,
            bytes,
          });
          return json({ document: doc });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to upload document";
          return json({ error: message }, 500);
        }
      },
    },
  },
});
