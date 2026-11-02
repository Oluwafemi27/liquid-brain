import {
  EntitlementError,
  QuotaExceededError,
  assertTokensAvailable,
  withBilling,
} from "@/lib/server/billing";
import { requireUser } from "@/lib/server/require-admin";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { NoModelConfiguredError } from "@/lib/server/agent";
import { buildPlan, runTask } from "@/lib/server/tasks";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const bodySchema = z.object({
  goal: z.string().min(3).max(4000),
  /** "plan" returns just the risk-weighted plan without executing it —
   *  useful to show the owner the plan and let them approve it first.
   *  "run" plans and immediately executes every step via sub-agents. */
  mode: z.enum(["plan", "run"]).default("run"),
  sessionId: z.string().min(1).max(200).optional(),
});

export const Route = createFileRoute("/api/tasks/run")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (!auth.ok) return auth.response;
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
          await assertTokensAvailable(auth.userId);
          if (parsed.data.mode === "plan") {
            const { plan, trace } = await withBilling(
              { userId: auth.userId, feature: "plan" },
              () => buildPlan(parsed.data.goal),
            );
            return json({ plan, trace });
          }
          const result = await withBilling({ userId: auth.userId, feature: "subagent" }, () =>
            runTask(parsed.data.goal, parsed.data.sessionId),
          );
          return json(result);
        } catch (error) {
          if (error instanceof QuotaExceededError)
            return json({ error: error.message, code: "quota" }, 402);
          if (error instanceof EntitlementError)
            return json({ error: error.message, code: "plan" }, 403);
          if (error instanceof NoModelConfiguredError) {
            return json({ error: error.message }, 400);
          }
          const message = error instanceof Error ? error.message : "Task failed";
          return json({ error: message }, 500);
        }
      },
    },
  },
});
