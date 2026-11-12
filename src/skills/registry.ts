import "@tanstack/react-start/server-only";
import type {
  SkillModule,
  SkillModuleStatus,
  SkillStatus,
  SkillTool,
  SkillToolContext,
} from "./types";

const modules = new Map<string, SkillModule>();
const toolIndex = new Map<string, { module: SkillModule; tool: SkillTool }>();

export function registerSkillModule(mod: SkillModule): void {
  if (modules.has(mod.id)) throw new Error(`Skill module "${mod.id}" is registered twice.`);
  for (const tool of mod.tools) {
    if (toolIndex.has(tool.name)) throw new Error(`Skill tool "${tool.name}" is registered twice.`);
    toolIndex.set(tool.name, { module: mod, tool });
  }
  modules.set(mod.id, mod);
}

function missingEnv(mod: SkillModule): string[] {
  return mod.requiresEnv.filter((k) => !process.env[k]);
}

function toolMissingEnv(t: SkillTool): string[] {
  const missing = (t.requiresEnv ?? []).filter((k) => !process.env[k]);
  if (t.requiresAnyEnv?.length && !t.requiresAnyEnv.some((k) => process.env[k])) {
    missing.push(t.requiresAnyEnv.join(" or "));
  }
  return missing;
}

function statusOf(mod: SkillModule): { status: SkillStatus; missing: string[] } {
  if (!mod.implemented || mod.tools.length === 0) return { status: "planned", missing: [] };
  const missing = missingEnv(mod);
  if (missing.length) return { status: "needs_setup", missing };
  // Ready when at least one tool has everything it needs; otherwise report what the tools lack.
  if (mod.tools.some((t) => toolMissingEnv(t).length === 0))
    return { status: "ready", missing: [] };
  return { status: "needs_setup", missing: [...new Set(mod.tools.flatMap(toolMissingEnv))] };
}

export function listSkillModuleStatuses(): SkillModuleStatus[] {
  return [...modules.values()].map((m) => {
    const { status, missing } = statusOf(m);
    return {
      id: m.id,
      title: m.title,
      description: m.description,
      stack: m.stack,
      status,
      missingEnv: missing,
      toolNames: m.tools.map((t) => t.name),
    };
  });
}

function readyModules(): SkillModule[] {
  return [...modules.values()].filter((m) => statusOf(m).status === "ready");
}

/** Prompt block for the agent: only skills that can actually run right now are described, so the
 *  model is never told about a tool that would fail. Empty string when nothing is ready. */
export function buildSkillToolsBlock(): string {
  const ready = readyModules();
  if (!ready.length) return "";
  const lines = ready.flatMap((m) => [
    `### ${m.title}${m.prompt ? `\n${m.prompt}` : ""}`,
    ...m.tools
      .filter((t) => toolMissingEnv(t).length === 0)
      .map(
        (t) =>
          `- ${t.name} (${t.risk === "read" ? "runs immediately" : "needs owner approval"}): ${t.description}`,
      ),
  ]);
  return (
    '\n\n=== Skill tools you can call (via toolCall type "skill_tool") ===\n' + lines.join("\n")
  );
}

export type SkillToolResult =
  | { ok: true; output: unknown; maxChars: number }
  | {
      ok: false;
      code: "unknown" | "unavailable" | "invalid" | "approval_required" | "failed";
      message: string;
    };

/** The only door into a skill tool. Enforces, in order: the tool exists, its skill is ready, the
 *  input matches its schema, and non-read tools are refused (they must go through the approval
 *  flow in lib/server/actions.ts — they are never executed from here). */
export async function runSkillTool(
  name: string,
  rawInput: unknown,
  ctx: SkillToolContext,
): Promise<SkillToolResult> {
  const entry = toolIndex.get(name);
  if (!entry) return { ok: false, code: "unknown", message: `No skill tool named "${name}".` };

  const { status, missing } = statusOf(entry.module);
  if (status !== "ready") {
    return {
      ok: false,
      code: "unavailable",
      message:
        status === "needs_setup"
          ? `${entry.module.title} isn't set up: missing ${missing.join(", ")}.`
          : `${entry.module.title} isn't built yet.`,
    };
  }

  const toolMissing = toolMissingEnv(entry.tool);
  if (toolMissing.length) {
    return {
      ok: false,
      code: "unavailable",
      message: `"${name}" isn't set up: missing ${toolMissing.join(", ")}.`,
    };
  }

  const parsed = entry.tool.input.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return { ok: false, code: "invalid", message: parsed.error.message.slice(0, 300) };
  }

  if (entry.tool.risk !== "read") {
    return {
      ok: false,
      code: "approval_required",
      message: `"${name}" changes things outside ADUF (${entry.tool.risk}); propose it to the owner instead of calling it.`,
    };
  }

  try {
    return {
      ok: true,
      output: await entry.tool.run(parsed.data, ctx),
      maxChars: entry.tool.resultChars ?? 6000,
    };
  } catch (error) {
    return {
      ok: false,
      code: "failed",
      message: error instanceof Error ? error.message : "Skill tool failed.",
    };
  }
}
