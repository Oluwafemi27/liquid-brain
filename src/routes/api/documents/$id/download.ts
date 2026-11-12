import { createFileRoute } from "@tanstack/react-router";
import { getDocumentBytes } from "@/lib/server/documents";
import { verifyFileLink } from "@/lib/server/signed-links";

/** Opens a document. Needs a signed link from POST /api/documents/link: valid for ten minutes,
 *  for one file and one person, so a leaked or guessed URL gives nobody else access. */
export const Route = createFileRoute("/api/documents/$id/download")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        const q = new URL(request.url).searchParams;
        const userId = q.get("u") ?? "";
        let valid = false;
        try {
          valid = verifyFileLink(params.id, userId, Number(q.get("exp")), q.get("sig") ?? "");
        } catch {
          return new Response(
            JSON.stringify({
              error: "File links aren't set up on this server (missing DOCUMENT_LINK_SECRET).",
            }),
            {
              status: 503,
              headers: { "content-type": "application/json", "cache-control": "no-store" },
            },
          );
        }
        if (!valid) {
          return new Response(
            JSON.stringify({ error: "This link has expired. Open the file again." }),
            {
              status: 403,
              headers: { "content-type": "application/json", "cache-control": "no-store" },
            },
          );
        }
        try {
          const { bytes, record } = await getDocumentBytes(userId, params.id);
          const inline = q.get("inline") === "1";
          const safeName = record.filename.replace(/[^\w.\- ]+/g, "_").slice(0, 150) || "document";
          return new Response(Buffer.from(bytes), {
            status: 200,
            headers: {
              "content-type": record.mime_type,
              "content-disposition": `${inline ? "inline" : "attachment"}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(record.filename)}`,
              "content-length": String(bytes.byteLength),
              "cache-control": "private, no-store",
              "x-content-type-options": "nosniff",
            },
          });
        } catch {
          return new Response(JSON.stringify({ error: "Document not found" }), {
            status: 404,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
