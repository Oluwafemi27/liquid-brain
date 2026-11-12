import { z } from "zod";
import type { SkillModule } from "@/skills/types";
import { PLAYBOOK_SOURCES } from "./library.gen";

// Playbooks: method guides the agent loads on demand. The texts come unmodified from two MIT-licensed
// projects (obra/superpowers, addyosmani/agent-skills; see content/LICENSES.md). They were written for
// coding agents, so every read prepends an ADUF note that says how to apply them to business work.

const GENERAL_NOTE =
  "ADUF note: you are a business agent, not a coding assistant. Apply the METHOD below to business work " +
  "(research, pricing, campaigns, automations, operations). Ignore anything about git, repositories, files, " +
  "terminals, test runners or code review. Wherever it says 'subagent' or 'Task tool', use your `delegate` " +
  "tool (read-only helpers, at most 4 at a time, they cannot ask the owner questions). Plans live in your reply " +
  "or as an ADUF goal, never in files. Sibling files it mentions (prompt templates, references/) are not bundled; " +
  "work from this text alone.";

const NOTES: Record<string, string> = {
  "superpowers--brainstorming":
    "Ask the owner ONE question at a time. The 'design doc' is your reply; don't write files or commit anything.",
  "superpowers--writing-plans":
    "Write the plan in your reply as numbered steps with a check for each step. Do not include code. Get owner agreement before spending money or changing anything.",
  "superpowers--executing-plans":
    "Treat each plan step as done only when you have evidence (a tool result), not because you did the step.",
  "superpowers--subagent-driven-development":
    "Use `delegate` for the 'implementer' role: research, analysis, drafting. There are no code reviewers; YOU check each helper's output (second-pass check) before relying on it.",
  "superpowers--dispatching-parallel-agents":
    "This is the core playbook for `delegate`. Only split work that is truly independent; give every helper a self-contained goal and context.",
  "superpowers--verification-before-completion":
    "Before saying a price changed, an order was placed, a number is right, or an automation works, point to the tool result that proves it. Otherwise say it is unverified.",
  "superpowers--systematic-debugging":
    "Use for failing automations, ads not delivering, orders stuck, numbers that don't add up: reproduce, check what changed, one hypothesis at a time.",
  "agent-skills--planning-and-task-breakdown":
    "Break big goals into small, checkable tasks with an owner and an order.",
  "agent-skills--idea-refine":
    "Use for the owner's rough business ideas: diverge, then converge on one testable version.",
  "agent-skills--interview-me":
    "Use when the request is vague: interview the owner (few, sharp questions) before acting.",
  "agent-skills--context-engineering":
    "Use to decide what information to give a helper or keep in your own context.",
  "agent-skills--doubt-driven-development":
    "Use before high-stakes recommendations: challenge your own conclusion with a fresh, skeptical pass.",
  "agent-skills--source-driven-development":
    "Ground claims in sources: cite where each fact came from and say when you have no source.",
  "agent-skills--shipping-and-launch":
    "Use before launching a store, campaign or automation: checklist, rollout, rollback.",
};

function parse(raw: string): { name: string; description: string; body: string } {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const front = m?.[1] ?? "";
  const field = (k: string) =>
    front
      .match(new RegExp(`^${k}:\\s*(.+)$`, "m"))?.[1]
      ?.trim()
      .replace(/^["']|["']$/g, "") ?? "";
  return { name: field("name"), description: field("description"), body: m?.[2] ?? raw };
}

const entries = Object.entries(PLAYBOOK_SOURCES).map(([id, raw]) => ({ id, ...parse(raw) }));

export const playbookIds = (): string[] => entries.map((e) => e.id);

export function readPlaybook(id: string): { id: string; text: string } | null {
  const e = entries.find((x) => x.id === id);
  if (!e) return null;
  const note = NOTES[id];
  return {
    id,
    text: `${GENERAL_NOTE}${note ? `\nFor this playbook: ${note}` : ""}\n\n---\n\n${e.body.trim()}`,
  };
}

const index = entries.map((e) => `- ${e.id}: ${e.description.slice(0, 160)}`).join("\n");

export const playbooksSkill: SkillModule = {
  id: "playbooks",
  title: "Playbooks",
  description:
    "Method guides (planning, delegating, verifying, interviewing) the agent can load before a hard task.",
  stack: ["obra/superpowers (MIT)", "addyosmani/agent-skills (MIT)"],
  requiresEnv: [],
  implemented: true,
  prompt:
    "For a big, vague, risky or multi-part task, read the matching playbook FIRST (playbook_read), then follow its method. " +
    "Available playbooks:\n" +
    index,
  tools: [
    {
      name: "playbook_read",
      description:
        "Load one playbook by id (a method to follow for a hard task). Long: use only when the task needs it.",
      input: z.object({ id: z.string().min(1).max(100) }),
      risk: "read",
      resultChars: 24_000,
      run: async ({ id }) => {
        const p = readPlaybook(id);
        if (!p) throw new Error(`No playbook "${id}". Available: ${playbookIds().join(", ")}`);
        return p;
      },
    },
  ],
};
