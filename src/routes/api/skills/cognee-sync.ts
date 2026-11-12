import { requireUser } from "@/lib/server/require-admin";
import { createFileRoute } from "@tanstack/react-router";
import { cogneeConfigured } from "@/skills/services/cognee";
import { syncBusinessMemory } from "@/skills/skill-business-analyst/sync";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

export const Route = createFileRoute("/api/skills/cognee-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (!auth.ok) return auth.response;
        if (!cogneeConfigured())
          return json({ error: "cognee isn't configured on this server." }, 503);
        try {
          return json(await syncBusinessMemory(auth.userId));
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : "Sync failed" }, 500);
        }
      },
    },
  },
});
