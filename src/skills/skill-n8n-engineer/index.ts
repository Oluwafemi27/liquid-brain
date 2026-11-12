import type { SkillModule } from "../types";

/** Placeholder only, on purpose. The n8n work the agent can do is already built into the agent itself
 *  (search_n8n_templates, node docs search, safe-mode deploy and repair, all approval-gated), so a
 *  second set of tools here would duplicate it. What was missing was DATA: tools/n8n-ingest now
 *  includes ritik-prog/n8n-automation-templates-5000 (MIT); load it with the steps in docs/SKILLS.md. */
export const n8nEngineerSkill: SkillModule = {
  id: "skill-n8n-engineer",
  title: "n8n Engineer",
  description:
    "Already built into the agent (template search, node docs, safe deploy). This entry only tracks the template library import.",
  stack: ["n8n-skills", "templates-5000"],
  requiresEnv: ["N8N_BASE_URL"],
  implemented: false,
  tools: [],
};
