import { createServerFn } from "@tanstack/react-start";
import { appBaseUrl } from "@/lib/server/app-url";
import { verifyAccessToken } from "@/lib/server/survey";
import { syncComposioConnections } from "@/lib/server/composio-sync";
import {
  composioConfigured,
  disconnect,
  listCatalog,
  listConnections,
  startConnect,
  type CatalogApp,
  type ComposioConnection,
} from "@/connectors/composio-hub/client";

export type { CatalogApp, ComposioConnection };

export interface ComposioBoard {
  configured: boolean;
  apps: CatalogApp[];
  connections: ComposioConnection[];
  /** Set when Composio was reachable in principle but the call failed (bad key, outage). */
  error: string | null;
}

const message = (e: unknown, fallback: string) =>
  e instanceof Error ? e.message.slice(0, 300) : fallback;

export const fetchComposioBoard = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null }) => data)
  .handler(async ({ data }): Promise<ComposioBoard | null> => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return null;
    if (!composioConfigured()) return { configured: false, apps: [], connections: [], error: null };
    try {
      const [apps, connections] = await Promise.all([listCatalog(), listConnections(user.id)]);
      void syncComposioConnections(user.id);
      return { configured: true, apps, connections, error: null };
    } catch (e) {
      return {
        configured: true,
        apps: [],
        connections: [],
        error: message(e, "Couldn't reach Composio. Check the COMPOSIO_API_KEY on the server."),
      };
    }
  });

export const startComposioConnectFn = createServerFn({ method: "POST" })
  .validator(
    (data: { accessToken: string | null; slug: string; origin: string; popup?: boolean }) => data,
  )
  .handler(
    async ({ data }): Promise<{ ok: true; url: string } | { ok: false; message: string }> => {
      const user = await verifyAccessToken(data.accessToken);
      if (!user) return { ok: false, message: "Sign in again to connect an app." };
      if (!/^[a-z0-9_-]{1,80}$/i.test(data.slug))
        return { ok: false, message: "That app name isn't valid." };
      const base = appBaseUrl(process.env, data.origin || "");
      if (!/^https:\/\/|^http:\/\/localhost(:\d+)?$/.test(base)) {
        return {
          ok: false,
          message:
            "The app address isn't set. Add APP_URL on the server so Composio can send you back here.",
        };
      }
      try {
        const back = data.popup ? "/connector-done" : "/connectors";
        const url = await startConnect(
          user.id,
          data.slug,
          `${base}${back}?connected=${encodeURIComponent(data.slug)}`,
        );
        return { ok: true, url };
      } catch (e) {
        return { ok: false, message: message(e, "Couldn't start the connection.") };
      }
    },
  );

export const disconnectComposioFn = createServerFn({ method: "POST" })
  .validator((data: { accessToken: string | null; connectionId: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const user = await verifyAccessToken(data.accessToken);
    if (!user) return { ok: false, message: "Sign in again to disconnect an app." };
    try {
      await disconnect(user.id, data.connectionId);
      return { ok: true, message: "Disconnected." };
    } catch (e) {
      return { ok: false, message: message(e, "Couldn't disconnect.") };
    }
  });
