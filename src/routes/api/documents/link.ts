import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getDocumentMeta } from "@/lib/server/documents";
import { json, requireUser } from "@/lib/server/require-admin";
import { signFileLink } from "@/lib/server/signed-links";

/** Gives the signed-in person a ten-minute link to one of their own documents. */
export const Route = createFileRoute("/api/documents/link")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (!auth.ok) return auth.response;
        const parsed = z
          .object({ id: z.string().uuid() })
          .safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json({ error: "Invalid request" }, 400);
        try {
          await getDocumentMeta(auth.userId, parsed.data.id); // must be theirs
        } catch {
          return json({ error: "Document not found" }, 404);
        }
        try {
          const { exp, sig } = signFileLink(parsed.data.id, auth.userId);
          const qs = new URLSearchParams({ u: auth.userId, exp: String(exp), sig });
          return json({ url: `/api/documents/${parsed.data.id}/download?${qs}` });
        } catch {
          return json(
            { error: "File links aren't set up on this server (missing DOCUMENT_LINK_SECRET)." },
            503,
          );
        }
      },
    },
  },
});
