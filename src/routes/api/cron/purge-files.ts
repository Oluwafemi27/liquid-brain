import { createFileRoute } from "@tanstack/react-router";
import { purgeExpiredFiles } from "@/lib/server/file-retention";
import { safeEqual } from "@/lib/server/signed-links";

/** Deletes expired and abandoned uploads. Call it every hour or so from any scheduler (GitHub Actions,
 *  Azure, cron-job.org) with `Authorization: Bearer <CRON_SECRET>`. The Azure container also runs it
 *  by itself every 15 minutes, and uploads trigger it opportunistically. */
export const Route = createFileRoute("/api/cron/purge-files")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env["CRON_SECRET"];
        if (!secret || !safeEqual(request.headers.get("authorization"), `Bearer ${secret}`)) {
          return new Response("Unauthorized", { status: 401 });
        }
        return Response.json({ ok: true, ...(await purgeExpiredFiles()) });
      },
    },
  },
});
