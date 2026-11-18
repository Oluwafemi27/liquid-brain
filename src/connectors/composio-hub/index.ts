import { z } from "zod";
import type { SkillModule } from "@/skills/types";
import { composioConfigured, findTools, listConnections } from "./client";

/** Hundreds of third-party apps through one Composio key. The owner connects an app on the
 *  Connectors page; the agent can then LOOK UP what it can do (read-only) and PROPOSE an action,
 *  which only runs after the owner approves it (see actions.ts). Composio is a hosted service: it
 *  needs COMPOSIO_API_KEY (a free plan exists) and stores the owner's app logins on its side. */
export const composioHubConnector: SkillModule = {
  id: "composio-hub",
  title: "Connected apps (Composio)",
  description:
    "Lets ADUF work with the apps you connect on the Connectors page, with your approval for every change.",
  stack: ["composio"],
  requiresEnv: ["COMPOSIO_API_KEY"],
  implemented: true,
  prompt:
    "Apps the owner connected (Gmail, Slack, Shopify, Sheets and many more) are reachable through Composio. " +
    "First call composio_my_apps to see which are connected, then composio_find_tools to find the exact tool slug and what it needs. " +
    "You cannot run these tools yourself: to do something, propose it with proposedAction type composio_run_tool " +
    "(toolkit, toolSlug, arguments); the owner approves it first. Never guess a tool slug or its arguments: look them up. " +
    "If the app isn't connected, tell the owner to connect it on the Connectors page.",
  tools: [
    {
      name: "composio_my_apps",
      description: "Lists the apps the owner has connected (slugs such as gmail, slack, shopify).",
      input: z.object({}),
      risk: "read",
      run: async (_input, ctx) => {
        if (!ctx.userId) return { apps: [], note: "Not signed in." };
        const conns = await listConnections(ctx.userId);
        return { apps: [...new Set(conns.map((c) => c.toolkit))] };
      },
    },
    {
      name: "composio_find_tools",
      description:
        "Searches the tools of ONE connected app, e.g. {toolkit:'gmail', search:'send email'}. Returns tool slugs and what they do. Read-only.",
      input: z.object({ toolkit: z.string().min(1).max(80), search: z.string().min(2).max(100) }),
      risk: "read",
      resultChars: 5000,
      run: async ({ toolkit, search }, ctx) => {
        if (!ctx.userId) throw new Error("Not signed in.");
        return { tools: await findTools(ctx.userId, toolkit.toLowerCase(), search) };
      },
    },
  ],
};

export { composioConfigured };
