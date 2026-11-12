import { createFileRoute } from "@tanstack/react-router";
import { getDocumentMeta } from "@/lib/server/documents";
import { json, requireUser } from "@/lib/server/require-admin";

/** Details and a text preview of one of the signed-in person's own documents. */
export const Route = createFileRoute("/api/documents/$id/preview")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const auth = await requireUser(request);
        if (!auth.ok) return auth.response;
        try {
          return json({ document: await getDocumentMeta(auth.userId, params.id) });
        } catch {
          return json({ error: "Document not found" }, 404);
        }
      },
    },
  },
});
