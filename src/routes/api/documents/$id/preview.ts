import { createFileRoute } from "@tanstack/react-router";
import { getDocumentMeta } from "@/lib/server/documents";

export const Route = createFileRoute("/api/documents/$id/preview")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const doc = await getDocumentMeta(params.id);
          return new Response(JSON.stringify({ document: doc }), {
            status: 200,
            headers: { "content-type": "application/json" },
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
