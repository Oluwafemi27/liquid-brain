import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createDocument } from "@/lib/server/documents";

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
  content: z.string().min(1).max(200_000),
});

export const Route = createFileRoute("/api/documents")({
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
          const doc = await createDocument(parsed.data);
          return json({ document: doc });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to create document";
          return json({ error: message }, 500);
        }
      },
    },
  },
});
