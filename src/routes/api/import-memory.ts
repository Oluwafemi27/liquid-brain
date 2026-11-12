import { requireUser } from "@/lib/server/require-admin";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { parseMemoryExport } from "@/import-memory/parse";
import { saveImportedFacts } from "@/import-memory/store";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const bodySchema = z.object({
  /** Raw text of a mem0 or claude-mem export (JSON or JSONL). */
  content: z.string().min(2).max(10_000_000),
  /** "preview" parses and reports; "import" also saves. Preview first so the owner sees what will land. */
  mode: z.enum(["preview", "import"]).default("preview"),
});

export const Route = createFileRoute("/api/import-memory")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (!auth.ok) return auth.response;
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }
        const body = bodySchema.safeParse(raw);
        if (!body.success) return json({ error: "Invalid request" }, 400);

        const parsed = parseMemoryExport(body.data.content);
        if (!parsed.facts.length) {
          return json(
            { error: parsed.error ?? "No readable memories found.", skipped: parsed.skipped },
            422,
          );
        }
        const summary = {
          sourceKind: parsed.sourceKind,
          found: parsed.facts.length,
          skipped: parsed.skipped,
          note: parsed.error,
          sample: parsed.facts.slice(0, 5).map((f) => f.text.slice(0, 160)),
        };
        if (body.data.mode === "preview") return json({ ...summary, saved: 0 });
        try {
          const saved = await saveImportedFacts(auth.userId, parsed.facts);
          return json({ ...summary, saved });
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : "Import failed" }, 500);
        }
      },
    },
  },
});
