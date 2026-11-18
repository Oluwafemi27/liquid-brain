import { z } from "zod";
import { registerSkillModule, runSkillTool, buildSkillToolsBlock, listSkillModuleStatuses } from "@/skills/registry";
import { parseMemoryExport } from "@/import-memory/parse";

const assert = (c: unknown, m: string) => { if (!c) { console.error("FAIL", m); process.exit(1); } console.log("ok  ", m); };

registerSkillModule({ id: "t", title: "T", description: "d", stack: [], requiresEnv: ["T_KEY"], implemented: true,
  tools: [
    { name: "t_read", description: "r", input: z.object({ n: z.number() }), risk: "read", run: async (i) => ({ double: (i as any).n * 2 }) },
    { name: "t_ads", description: "a", input: z.object({}), risk: "ads", run: async () => "boom" },
  ] });
(async () => {
  assert(buildSkillToolsBlock() === "", "no prompt block while env missing");
  assert(listSkillModuleStatuses()[0]!.status === "needs_setup", "status needs_setup");
  let r = await runSkillTool("t_read", { n: 2 }, { userId: null, sessionId: "s" });
  assert(!r.ok && r.code === "unavailable", "blocked while env missing");
  process.env.T_KEY = "x";
  assert(buildSkillToolsBlock().includes("t_read (runs immediately)"), "block lists ready tool");
  r = await runSkillTool("t_read", { n: 2 }, { userId: null, sessionId: "s" });
  assert(r.ok && (r.output as any).double === 4, "read tool runs");
  r = await runSkillTool("t_read", { n: "x" }, { userId: null, sessionId: "s" });
  assert(!r.ok && r.code === "invalid", "bad input rejected");
  r = await runSkillTool("t_ads", {}, { userId: null, sessionId: "s" });
  assert(!r.ok && r.code === "approval_required", "ads tool never runs directly");
  r = await runSkillTool("nope", {}, { userId: null, sessionId: "s" });
  assert(!r.ok && r.code === "unknown", "unknown tool");

  const m0 = parseMemoryExport(JSON.stringify({ results: [{ id: "a1", memory: "Sells shoes in Lagos", categories: ["business"], created_at: "2025-01-02T00:00:00Z" }, { id: "a1", memory: "dup" }, { nope: 1 }] }));
  assert(m0.sourceKind === "mem0" && m0.facts.length === 1 && m0.skipped === 2, "mem0 parse + dedupe + skipped");
  const cm = parseMemoryExport(JSON.stringify({ exportedAt: "x", observations: [{ id: 7, title: "Fixed login", narrative: "Patched JWT expiry", facts: "[\"uses supabase\"]", type: "bugfix", created_at_epoch: 1735776000 }], summaries: [], prompts: [{ prompt_text: "secret" }] }));
  assert(cm.sourceKind === "claude-mem" && cm.facts[0]!.text.includes("Patched JWT") && cm.facts[0]!.text.includes("uses supabase") && cm.facts[0]!.tags.includes("bugfix"), "claude-mem parse, prompts excluded");
  const jl = parseMemoryExport('{"memory":"a"}\n{"memory":"b"}\nnot json');
  assert(jl.facts.length === 2 && jl.skipped === 1, "jsonl with bad line");
  assert(parseMemoryExport("").error !== null && parseMemoryExport("{}").sourceKind === null, "empty / unknown rejected");
})();
