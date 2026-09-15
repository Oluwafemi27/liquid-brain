import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { runWithHarness } from "@/lib/server/agent-harness";
import { resolveDefaultModelKey } from "@/lib/server/model-keys";
import { MODEL_PROVIDERS, callProviderChat } from "@/lib/server/model-providers";
import { listSkills } from "@/lib/server/skills";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const CHANNEL_TO_SKILL: Record<string, string> = {
  comment: "social-comment-reply",
  dm: "social-dm-reply",
  email: "email-reply",
};

const bodySchema = z.object({
  channel: z.enum(["comment", "dm", "email"]),
  incomingText: z.string().min(1).max(4000),
  context: z.string().max(4000).optional(),
});

export const Route = createFileRoute("/api/skills/reply")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }
        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success)
          return json({ error: "Invalid request", details: parsed.error.flatten() }, 400);
        const { channel, incomingText, context } = parsed.data;

        const key = await resolveDefaultModelKey();
        if (!key) {
          return json(
            { error: "No AI model is connected yet — add a model API key in Settings first." },
            400,
          );
        }
        const provider = MODEL_PROVIDERS[key.providerId];
        if (!provider) return json({ error: `Unknown provider "${key.providerId}"` }, 500);

        const skills = await listSkills();
        const skillId = CHANNEL_TO_SKILL[channel];
        const skill = skills.find((s) => s.id === skillId && s.enabled);
        if (!skill) {
          return json(
            { error: `The "${skillId}" skill is disabled — enable it in Settings to use this.` },
            400,
          );
        }

        const system = `${skill.systemPrompt}\n\nRespond with ONLY the reply text — no preamble, no quotation marks, no explanation.`;

        try {
          const { result, trace } = await runWithHarness(
            `skill-reply-${channel}`,
            async () => {
              const { text } = await callProviderChat(provider, key.apiKey, {
                system,
                messages: [
                  {
                    role: "user",
                    content: context
                      ? `Context:\n${context}\n\nIncoming ${channel} message:\n${incomingText}`
                      : `Incoming ${channel} message:\n${incomingText}`,
                  },
                ],
              });
              if (!text.trim()) throw new Error("Model returned an empty reply.");
              return text.trim();
            },
            { maxAttempts: 3 },
          );
          return json({ reply: result, trace });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to draft a reply";
          return json({ error: message }, 500);
        }
      },
    },
  },
});
