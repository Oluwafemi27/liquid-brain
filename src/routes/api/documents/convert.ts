import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { convertDocument } from "@/lib/server/documents";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const bodySchema = z.object({
  id: z.string().uuid(),
  targetFormat: z.enum(["txt", "md", "docx", "pdf"]),
});

export const Route = createFileRoute("/api/documents/convert")({
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

        try {
          const doc = await convertDocument(parsed.data.id, parsed.data.targetFormat);
          return json({ document: doc });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to convert document";
          return json({ error: message }, 500);
        }
      },
    },
  },
});
