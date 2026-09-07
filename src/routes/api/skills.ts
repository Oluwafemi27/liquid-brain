import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { listSkills, setSkillEnabled } from "@/lib/server/skills";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const patchSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean(),
});

export const Route = createFileRoute("/api/skills")({
  server: {
    handlers: {
      GET: async () => {
        const skills = await listSkills();
        return json({ skills });
      },
      PATCH: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }
        const parsed = patchSchema.safeParse(raw);
        if (!parsed.success) return json({ error: "Invalid request" }, 400);

        try {
          await setSkillEnabled(parsed.data.id, parsed.data.enabled);
          return json({ ok: true });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to update skill";
          return json({ error: message }, 500);
        }
      },
    },
  },
});
