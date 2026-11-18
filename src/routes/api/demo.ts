import { createFileRoute } from "@tanstack/react-router";
import { DemoStartError, clientIp, getDemoSettings, startDemoSession } from "@/lib/server/demo";

function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...headers },
  });
}

/** "Continue as demo". GET says whether the button should show; POST starts a visit and returns a one-time
 *  sign-in token the browser swaps for a normal session. Public on purpose (no account yet), so it is
 *  limited per network address, per day for the whole demo, and by the number of live visits. */
export const Route = createFileRoute("/api/demo")({
  server: {
    handlers: {
      GET: async () => {
        const s = await getDemoSettings();
        return json({ enabled: s.enabled, hours: s.sessionHours });
      },
      POST: async ({ request }) => {
        try {
          return json(await startDemoSession(clientIp(request)));
        } catch (e) {
          if (e instanceof DemoStartError) {
            return json(
              { error: e.message },
              e.status,
              e.retryAfter ? { "retry-after": String(e.retryAfter) } : {},
            );
          }
          console.error("[api/demo] unexpected failure", e);
          return json({ error: "Couldn't start the demo. Try again in a moment." }, 500);
        }
      },
    },
  },
});
