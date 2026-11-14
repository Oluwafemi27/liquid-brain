import { appBaseUrl } from "@/lib/server/app-url";
import { createFileRoute } from "@tanstack/react-router";

/** Retired: every connector now goes through Composio. Old links land on the Connectors page. */
export const Route = createFileRoute("/api/connectors/$provider/authorize")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const origin = appBaseUrl(process.env, url.origin);
        return Response.redirect(`${origin}/connectors`, 302);
      },
    },
  },
});
