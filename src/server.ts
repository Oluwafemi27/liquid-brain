import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { rejectOversizedBody } from "./lib/request-limits";
import { withSecurityHeaders } from "./lib/security-headers";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

/** process.env where it exists (Node); nothing on runtimes without it. */
const runtimeEnv = (): Record<string, string | undefined> =>
  typeof process !== "undefined" ? process.env : {};

let jobsStarted = false;
/** Long-running servers (the Azure container) clean up expired uploads on their own every 15 minutes. */
function startBackgroundJobs() {
  if (jobsStarted) return;
  jobsStarted = true;
  void import("./lib/server/file-retention")
    .then((m) => m.startPurgeTimer())
    .catch(() => undefined);
}

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  const swallowed = consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`);
  console.error(swallowed);
  const { captureServerError } = await import("./lib/server/monitoring");
  await captureServerError(swallowed, { where: "ssr" });
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    startBackgroundJobs();
    const tooBig = rejectOversizedBody(request);
    if (tooBig) return withSecurityHeaders(tooBig, request, runtimeEnv());
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withSecurityHeaders(
        await normalizeCatastrophicSsrResponse(response),
        request,
        runtimeEnv(),
      );
    } catch (error) {
      console.error(error);
      const { captureServerError } = await import("./lib/server/monitoring");
      await captureServerError(error, { where: "server-entry" });
      return withSecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
        request,
        runtimeEnv(),
      );
    }
  },
};
