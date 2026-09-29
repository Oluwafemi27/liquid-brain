import { randomBytes } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { normalizeShop } from "@/lib/server/oauth-exchange";
import { getProvider, isOAuth } from "@/lib/server/oauth-providers";
import { DEFAULT_WORKSPACE_ID, getSupabaseAdmin } from "@/lib/server/supabase";

function redirectToSettings(origin: string, provider: string, error: string) {
  return Response.redirect(
    `${origin}/settings?connectorError=${encodeURIComponent(error)}&provider=${encodeURIComponent(provider)}`,
    302,
  );
}

export const Route = createFileRoute("/api/connectors/$provider/authorize")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const providerId = params.provider;
        const url = new URL(request.url);
        const origin = process.env["APP_URL"] ?? url.origin;
        const provider = getProvider(providerId);

        if (!provider) return redirectToSettings(origin, providerId, "unknown_provider");
        if (!isOAuth(provider)) return redirectToSettings(origin, providerId, "not_oauth");
        if (!provider.clientId || !provider.clientSecret) {
          return redirectToSettings(origin, providerId, "not_configured");
        }

        let authorizeUrl = provider.authorizeUrl;
        if (provider.requiresShopParam) {
          const rawShop = url.searchParams.get("shop");
          if (!rawShop) return redirectToSettings(origin, providerId, "missing_shop");
          // Accepts "my-store" or "my-store.myshopify.com"; rejects anything
          // that isn't a real Shopify domain.
          const shop = normalizeShop(rawShop);
          if (!shop) return redirectToSettings(origin, providerId, "invalid_shop");
          authorizeUrl = authorizeUrl.replace("{shop}.myshopify.com", shop);
        }

        const db = getSupabaseAdmin();
        if (!db) return redirectToSettings(origin, providerId, "backend_not_configured");

        const state = randomBytes(24).toString("hex");
        const { error } = await db
          .from("oauth_states")
          .insert({ state, provider: providerId, workspace_id: DEFAULT_WORKSPACE_ID });
        if (error) {
          console.error("[connectors/authorize] failed to store oauth state", error);
          return redirectToSettings(origin, providerId, "server_error");
        }

        const redirectUri = `${origin}/api/connectors/${providerId}/callback`;
        const authParams = new URLSearchParams({
          [provider.clientIdParam ?? "client_id"]: provider.clientId,
          redirect_uri: redirectUri,
          response_type: "code",
          state,
          ...(provider.scope ? { scope: provider.scope } : {}),
          ...(provider.extraAuthorizeParams ?? {}),
        });

        return Response.redirect(`${authorizeUrl}?${authParams.toString()}`, 302);
      },
    },
  },
});
