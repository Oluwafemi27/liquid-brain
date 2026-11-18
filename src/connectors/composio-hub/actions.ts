import "@tanstack/react-start/server-only";
import { z } from "zod";
import type { ActionPreview } from "@/lib/aduf-types";
import { composioConfigured, listConnections, runTool } from "./client";

// The approval-gated door for Composio tools. The agent can only PROPOSE this; it runs after the
// owner approves it, through lib/server/actions.ts. Browsing tools is read-only (see index.ts).

export const composioRunSchema = z.object({
  toolkit: z.string().regex(/^[a-z0-9_-]{1,80}$/i),
  /** Composio tool slug, e.g. GMAIL_SEND_EMAIL. */
  toolSlug: z.string().regex(/^[A-Z0-9_]{3,120}$/),
  arguments: z.record(z.unknown()).default({}),
});

const shorten = (v: unknown, n = 600) => {
  const s = JSON.stringify(v, null, 2) ?? "";
  return s.length > n ? `${s.slice(0, n)}…` : s;
};

export async function previewComposioRun(raw: Record<string, unknown>): Promise<ActionPreview> {
  const p = composioRunSchema.parse(raw);
  const effects = [
    `Runs ${p.toolSlug} in your connected ${p.toolkit} account`,
    `Details: ${shorten(p.arguments)}`,
  ];
  if (!composioConfigured()) effects.push("⚠ COMPOSIO_API_KEY isn't set: approving will fail");
  return {
    headline: `If you approve: ADUF runs “${p.toolSlug}” in ${p.toolkit}.`,
    effects,
    unchanged: ["Your other connected apps", "Your money (nothing is paid by ADUF)"],
    confidence: "medium",
    confidenceNote:
      "ADUF can't predict exactly what the app will do with this request, and it can't be undone from here.",
    sources: [],
  };
}

export async function execComposioRun(
  userId: string,
  raw: Record<string, unknown>,
): Promise<{ result: Record<string, unknown>; changed: boolean }> {
  const p = composioRunSchema.parse(raw);
  const connected = (await listConnections(userId)).some((c) => c.toolkit === p.toolkit);
  if (!connected)
    throw new Error(`${p.toolkit} isn't connected any more. Connect it on the Connectors page.`);
  const out = await runTool(userId, p.toolkit, p.toolSlug, p.arguments);
  if (!out.successful)
    throw new Error(`${p.toolkit} said no: ${out.error ?? "the request failed"}`.slice(0, 300));
  return {
    result: { note: `Done: ${p.toolSlug} ran in ${p.toolkit}.`, output: shorten(out.data, 1500) },
    changed: true,
  };
}
