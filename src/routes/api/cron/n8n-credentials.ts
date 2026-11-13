import { createFileRoute } from "@tanstack/react-router";
import { refreshExpiringN8nCredentials } from "@/lib/server/n8n-composio";
import { safeEqual } from "@/lib/server/signed-links";

/** Refreshes n8n credentials that are about to expire (Method 1, hosted n8n). Google logins last about
 *  an hour, so call this every 30 minutes: Upstash QStash, an Azure scheduled job, or any cron that
 *  sends `Authorization: Bearer $CRON_SECRET`. Vercel's free plan can only run daily crons. */
export const Route = createFileRoute("/api/cron/n8n-credentials")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env["CRON_SECRET"];
        if (!secret || !safeEqual(request.headers.get("authorization"), `Bearer ${secret}`))
          return new Response("Unauthorized", { status: 401 });
        return Response.json({ ok: true, ...(await refreshExpiringN8nCredentials()) });
      },
    },
  },
});
