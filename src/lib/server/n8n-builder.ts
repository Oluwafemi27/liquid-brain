import "@tanstack/react-start/server-only";
import { resolveDefaultModelKey } from "./model-keys";
import { MODEL_PROVIDERS, callProviderChat } from "./model-providers";
import { searchN8nSkillDocs } from "./n8n-skills";
import { searchN8nTemplates } from "./n8n-templates";
import { schemaIndexSummary, validateWorkflowAgainstSchema } from "./n8n-schema-validator";

/** "Build one from the available workflows" — the fallback path when
 *  search_n8n_templates found nothing close enough to deploy as-is. Rather
 *  than generating a workflow from nothing, this pulls the 3 closest
 *  templates as structural scaffolding (real, working node/connection
 *  shapes) plus any relevant platform docs, and asks the configured model
 *  to adapt/combine them into new workflow JSON for the brief — grounded
 *  generation, not free-form invention. */
export async function buildWorkflowFromBrief(
  brief: string,
  name: string,
): Promise<Record<string, unknown>> {
  const key = await resolveDefaultModelKey();
  if (!key) throw new Error("No AI model connected — add one in Settings before building a workflow.");
  const provider = MODEL_PROVIDERS[key.providerId];
  if (!provider) throw new Error(`Unknown model provider "${key.providerId}"`);

  const [scaffolds, docs] = await Promise.all([
    searchN8nTemplates(brief, 3),
    searchN8nSkillDocs(brief, 3),
  ]);

  const scaffoldBlock = scaffolds.length
    ? scaffolds
        .map(
          (s, i) =>
            `--- Reference workflow ${i + 1}: "${s.name}" (integrations: ${s.integrations.join(", ") || "none"}) ---\n` +
            `Use this only as a structural example of valid n8n node/connection shape — do not copy business logic that doesn't fit the brief.`,
        )
        .join("\n\n")
    : "No close reference workflow found — build from n8n platform conventions directly.";

  const docsBlock = docs.length
    ? docs.map((d) => `### ${d.title}\n${d.content}`).join("\n\n")
    : "";

  const system =
    `You are an n8n workflow engineer. Output ONLY a single valid n8n workflow JSON object ` +
    `(the same shape returned by n8n's GET /workflows/:id — top-level "nodes" array and ` +
    `"connections" object, each node with id/name/type/typeVersion/position/parameters), ` +
    `no markdown fences, no prose. Build it to satisfy the brief exactly. Prefer a webhook or ` +
    `schedule trigger unless the brief clearly implies otherwise. Never set "active": true — ` +
    `it will always be deployed off regardless. Keep credentials referenced by name/placeholder ` +
    `only (e.g. {"credentials": {"shopifyApi": {"name": "Shopify account"}}}) since real ` +
    `credential ids don't exist yet on the target instance. Only use core n8n node types ` +
    `(n8n-nodes-base.*) with real "resource"/"operation" values — ${schemaIndexSummary()} — ` +
    `never invent a node type or a resource/operation combination.\n\n${scaffoldBlock}` +
    (docsBlock ? `\n\n=== Platform reference ===\n${docsBlock}` : "");

  const { text } = await callProviderChat(provider, key.apiKey, {
    system,
    messages: [{ role: "user", content: `Brief: ${brief}\nWorkflow name: ${name}` }],
  });

  const workflowJson = parseWorkflowJson(text);

  // One repair pass: if the model hallucinated a node type or an invalid
  // resource/operation, feed the exact issues back and ask it to fix them
  // rather than silently shipping something we already know is broken.
  const issues = validateWorkflowAgainstSchema(workflowJson);
  if (issues.length === 0) return workflowJson;

  const { text: repaired } = await callProviderChat(provider, key.apiKey, {
    system,
    messages: [
      { role: "user", content: `Brief: ${brief}\nWorkflow name: ${name}` },
      { role: "assistant", content: text },
      {
        role: "user",
        content:
          `That workflow has validation issues against the real n8n schema:\n` +
          issues.map((i) => `- Node "${i.nodeName}" (${i.nodeType}): ${i.message}`).join("\n") +
          `\n\nOutput the corrected full workflow JSON only, same rules as before.`,
      },
    ],
  });

  const correctedJson = parseWorkflowJson(repaired);
  // If it's still wrong after one repair pass, ship it anyway — the live
  // testDeployWorkflow() check downstream (and the repair-agent loop) is
  // the real backstop, not an infinite local retry loop.
  return correctedJson;
}

function parseWorkflowJson(text: string): Record<string, unknown> {
  let parsed: unknown;
  try {
    const fenced = text.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
    parsed = JSON.parse(fenced ? (fenced[1] ?? text) : text);
  } catch {
    throw new Error("The model didn't return valid workflow JSON — try rephrasing the brief.");
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !Array.isArray((parsed as Record<string, unknown>)["nodes"])
  ) {
    throw new Error("Generated workflow was missing a valid \"nodes\" array.");
  }
  return parsed as Record<string, unknown>;
}
