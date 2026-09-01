import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { isSandboxConfigured, runInSandbox } from "@/lib/server/sandbox";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const bodySchema = z.object({
  code: z.string().min(1).max(20_000),
  language: z.enum(["python", "javascript", "bash"]).default("python"),
  sessionId: z.string().min(1).max(200).optional(),
});

/** Direct, ad-hoc sandbox execution — separate from the tasks/run pipeline
 *  (which drives this automatically for plan steps flagged
 *  needsCodeExecution). Useful for Brain Chat to run a one-off script the
 *  agent wrote, or for testing the sandbox is wired up correctly. */
export const Route = createFileRoute("/api/sandbox/run")({
  server: {
    handlers: {
      GET: async () => json({ configured: isSandboxConfigured() }),
      POST: async ({ request }) => {
        if (!isSandboxConfigured()) {
          return json({ error: "E2B isn't configured yet — set E2B_API_KEY on the server." }, 400);
        }
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
          const run = await runInSandbox(parsed.data.code, {
            language: parsed.data.language,
            ...(parsed.data.sessionId ? { sessionId: parsed.data.sessionId } : {}),
          });
          return json(run);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Sandbox run failed";
          return json({ error: message }, 500);
        }
      },
    },
  },
});
