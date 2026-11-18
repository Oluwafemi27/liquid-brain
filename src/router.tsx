import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  // Error + performance monitoring is opt-in (needs VITE_SENTRY_DSN / VITE_DD_* keys) and loads after paint.
  if (typeof window !== "undefined") {
    void import("./lib/monitoring/client").then((m) => m.initClientMonitoring());
  }

  return router;
};
