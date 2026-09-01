import { createFileRoute } from "@tanstack/react-router";
import { getDocumentBytes } from "@/lib/server/documents";

export const Route = createFileRoute("/api/documents/$id/download")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        try {
          const { bytes, record } = await getDocumentBytes(params.id);
          const inline = new URL(request.url).searchParams.get("inline") === "1";
          return new Response(Buffer.from(bytes), {
            status: 200,
            headers: {
              "content-type": record.mime_type,
              "content-disposition": `${inline ? "inline" : "attachment"}; filename="${record.filename.replace(/"/g, "")}"`,
              "content-length": String(bytes.byteLength),
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Document not found";
          return new Response(JSON.stringify({ error: message }), {
            status: 404,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
