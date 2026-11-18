import "@tanstack/react-start/server-only";
import { registerSkillModule } from "./registry";
import { adsOperatorSkill } from "./skill-ads-operator";
import { businessAnalystSkill } from "./skill-business-analyst";
import { competitorSpySkill } from "./skill-competitor-spy";
import { dropshipSkill } from "./skill-dropship";
import { n8nEngineerSkill } from "./skill-n8n-engineer";
import { composioHubConnector } from "@/connectors/composio-hub";
import { playbooksSkill } from "@/playbooks";

let registered = false;

/** Idempotent. Call before listing or running skill tools. */
export function ensureSkillsRegistered(): void {
  if (registered) return;
  registered = true;
  for (const m of [
    businessAnalystSkill,
    competitorSpySkill,
    dropshipSkill,
    adsOperatorSkill,
    n8nEngineerSkill,
    composioHubConnector,
    playbooksSkill,
  ]) {
    registerSkillModule(m);
  }
}

export * from "./registry";
export type * from "./types";
