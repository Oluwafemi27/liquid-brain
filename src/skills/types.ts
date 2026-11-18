// Skill framework types. A "skill module" is a bundle of (a) prompt guidance folded into the
// agent's system prompt and (b) zero or more named tools the agent can call. Client-safe: no
// server imports here, so the UI can show a skill's status without pulling in server code.
import type { ZodTypeAny, z } from "zod";
import type { ActionRisk } from "@/lib/aduf-types";

/** "read" tools only look things up or compute; they run immediately. Anything else touches the
 *  outside world (ads, messages, money, another system) and may NEVER run without owner approval. */
export type ToolRisk = "read" | Exclude<ActionRisk, "internal"> | "internal";

export type SkillStatus =
  /** Manifest only: the integration isn't written yet. Never offered to the agent. */
  | "planned"
  /** Code exists but required env vars / connections are missing. Not offered to the agent. */
  | "needs_setup"
  | "ready";

export interface SkillToolContext {
  userId: string | null;
  sessionId: string;
}

export interface SkillTool<S extends ZodTypeAny = ZodTypeAny> {
  /** Globally unique, snake_case, prefixed by the skill (e.g. "competitor_spy_scrape"). */
  name: string;
  description: string;
  input: S;
  risk: ToolRisk;
  /** Extra env vars this one tool needs on top of its module's. */
  requiresEnv?: string[];
  /** At least one of these env vars must be set (for tools that accept alternative credentials). */
  requiresAnyEnv?: string[];
  /** Longest result (in characters) the agent is shown for this tool. Default 6000. */
  resultChars?: number;
  run: (input: z.infer<S>, ctx: SkillToolContext) => Promise<unknown>;
}

export interface SkillModule {
  /** Folder name, e.g. "skill-business-analyst". */
  id: string;
  title: string;
  description: string;
  /** Env vars that must all be set for the skill's tools to run. */
  requiresEnv: string[];
  /** The upstream projects this skill is meant to wrap (documentation only). */
  stack: string[];
  /** Whether the integration code exists yet. */
  implemented: boolean;
  /** Extra system-prompt guidance, added only while the skill is ready. */
  prompt?: string;
  tools: SkillTool[];
}

export interface SkillModuleStatus {
  id: string;
  title: string;
  description: string;
  stack: string[];
  status: SkillStatus;
  missingEnv: string[];
  toolNames: string[];
}
