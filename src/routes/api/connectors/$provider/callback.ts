import { createFileRoute } from "@tanstack/react-router";
import { getProvider, isOAuth } from "@/lib/server/oauth-providers";
import { DEFAULT_WORKSPACE_ID, getSupabaseAdmin } from "@/lib/server/supabase";

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
}

export const Route = createFileRoute("/api/connectors/$provider/callback")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const providerId = params.provider;
        const url = new URL(request.url);
        const origin = process.env["APP_URL"] ?? url.origin;

        const redirectSettings = (error?: string) =>
          Response.redirect(
            error
              ? `${origin}/settings?connectorError=${encodeURIComponent(error)}&provider=${encodeURIComponent(providerId)}`
              : `${origin}/settings?connected=${encodeURIComponent(providerId)}`,
            302,
          );

        const provider = getProvider(providerId);
        if (!provider || !isOAuth(provider) || !provider.clientId || !provider.clientSecret) {
          return redirectSettings("not_configured");
        }

        const oauthError = url.searchParams.get("error");
        if (oauthError) return redirectSettings("provider_denied");

        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        if (!code || !state) return redirectSettings("missing_code");

        const db = getSupabaseAdmin();
        if (!db) return redirectSettings("backend_not_configured");

        const { data: stateRow, error: stateError } = await db
          .from("oauth_states")
          .select("provider, created_at")
          .eq("state", state)
          .maybeSingle();
        if (stateError || !stateRow || stateRow.provider !== providerId) {
          return redirectSettings("invalid_state");
        }
        const ageMs = Date.now() - new Date(stateRow.created_at as string).getTime();
        await db.from("oauth_states").delete().eq("state", state);
        if (ageMs > 10 * 60 * 1000) return redirectSettings("expired_state");

        let tokenUrl = provider.tokenUrl;
        const shop = url.searchParams.get("shop");
        if (provider.requiresShopParam) {
          if (!shop) return redirectSettings("missing_shop");
          tokenUrl = tokenUrl.replace("{shop}", shop);
        }

        const redirectUri = `${origin}/api/connectors/${providerId}/callback`;
        let tokenJson: TokenResponse;
        try {
          const tokenResponse = await fetch(tokenUrl, {
            method: "POST",
            headers: {
              "content-type": "application/x-www-form-urlencoded",
              accept: "application/json",
            },
            body: new URLSearchParams({
              client_id: provider.clientId,
              client_secret: provider.clientSecret,
              code,
              redirect_uri: redirectUri,
              grant_type: "authorization_code",
            }),
          });
          if (!tokenResponse.ok) {
            const body = await tokenResponse.text().catch(() => "");
            throw new Error(`token exchange failed ${tokenResponse.status}: ${body.slice(0, 200)}`);
          }
          tokenJson = (await tokenResponse.json()) as TokenResponse;
        } catch (error) {
          console.error("[connectors/callback] token exchange failed", error);
          return redirectSettings("token_exchange_failed");
        }

        const { error: upsertError } = await db.from("connectors").upsert(
          {
            id: providerId,
            workspace_id: DEFAULT_WORKSPACE_ID,
            connected: true,
            access_token: tokenJson.access_token ?? null,
            refresh_token: tokenJson.refresh_token ?? null,
            token_type: tokenJson.token_type ?? null,
            scope: tokenJson.scope ?? provider.scope,
            expires_at: tokenJson.expires_in
              ? new Date(Date.now() + tokenJson.expires_in * 1000).toISOString()
              : null,
            metadata: shop ? { shop } : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id,id" },
        );
        if (upsertError) {
          console.error("[connectors/callback] failed to store connector tokens", upsertError);
          return redirectSettings("storage_failed");
        }

        return redirectSettings();
      },
    },
  },
});
