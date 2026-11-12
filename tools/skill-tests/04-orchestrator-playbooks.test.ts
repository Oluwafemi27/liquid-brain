import { runSubAgents } from "@/agents/orchestrator";
import { behaviour } from "@/lib/server/model-providers";
import { ensureSkillsRegistered } from "@/skills";
import { listSkillModuleStatuses } from "@/skills/registry";
import { readPlaybook, playbookIds } from "@/playbooks";
const ok = (c: unknown, m: string) => { if (!c) { console.error("FAIL", m); process.exit(1); } console.log("ok  ", m); };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ctx = { userId: "u1", sessionId: "s" };
const P = { id: "p" } as any;
const finish = (r: string) => JSON.stringify({ toolCall: null, result: r, confidence: "high", gaps: [] });
(async () => {
  ensureSkillsRegistered();
  ok(playbookIds().length === 14, "14 playbooks bundled");
  const pb = readPlaybook("superpowers--dispatching-parallel-agents")!;
  ok(pb.text.startsWith("ADUF note:") && pb.text.includes("Dispatching Parallel Agents") && !pb.text.startsWith("---"), "playbook has ADUF note + original body, frontmatter stripped");
  ok(readPlaybook("nope") === null, "unknown playbook -> null");
  ok(listSkillModuleStatuses().find((s) => s.id === "playbooks")!.status === "ready", "playbooks module ready without keys");

  // parallel: 3 helpers x 200ms each must finish in well under 600ms
  behaviour.fn = async () => { await sleep(200); return finish("done"); };
  let t0 = Date.now();
  let res = await runSubAgents([1, 2, 3].map((n) => ({ id: `h${n}`, role: "r", goal: "g" })), P, "k", ctx);
  ok(res.length === 3 && res.every((r) => r.status === "done") && Date.now() - t0 < 500, "3 helpers run in parallel");

  // cap at 4, unique ids
  res = await runSubAgents(Array.from({ length: 6 }, (_, n) => ({ id: `x${n}`, role: "r", goal: "g" })), P, "k", ctx);
  ok(res.length === 4, "never more than 4 helpers");
  let threw = false; try { await runSubAgents([{ id: "a", role: "r", goal: "g" }, { id: "a", role: "r", goal: "g" }], P, "k", ctx); } catch { threw = true; }
  ok(threw, "duplicate helper ids rejected");

  // tool use: playbook_read (read) works, a write-risk-ish/unknown tool is refused, results fed back
  let seen: string[] = [];
  behaviour.fn = async (_s, msgs) => {
    const last = msgs[msgs.length - 1]!.content;
    seen.push(last.slice(0, 60));
    if (msgs.length === 1) return JSON.stringify({ toolCall: { name: "playbook_read", input: { id: "superpowers--verification-before-completion" } }, result: "" });
    if (last.startsWith("Tool result for playbook_read:") && last.includes("ADUF note")) return finish("used playbook");
    return finish("did not get tool result");
  };
  res = await runSubAgents([{ id: "t", role: "r", goal: "g" }], P, "k", ctx);
  ok(res[0]!.status === "done" && res[0]!.result === "used playbook" && res[0]!.toolsUsed[0] === "playbook_read", "helper can call a read-only skill tool and sees the result");

  behaviour.fn = async (_s, msgs) => msgs.length === 1 ? JSON.stringify({ toolCall: { name: "dropship_update_price", input: {} }, result: "" }) : finish(msgs[msgs.length - 1]!.content.slice(0, 80));
  res = await runSubAgents([{ id: "w", role: "r", goal: "g" }], P, "k", ctx);
  ok(res[0]!.result.includes("failed (unknown)"), "helper cannot call action tools (no such skill tool)");

  // helper cannot delegate: asks for 'delegate' as a tool -> refused as unknown
  behaviour.fn = async (_s, msgs) => msgs.length === 1 ? JSON.stringify({ toolCall: { name: "delegate", input: {} }, result: "" }) : finish(msgs[msgs.length - 1]!.content.slice(0, 60));
  res = await runSubAgents([{ id: "d", role: "r", goal: "g" }], P, "k", ctx);
  ok(res[0]!.result.includes("failed (unknown)"), "helper cannot start helpers");

  // endless tool loop is cut at MAX_STEPS
  behaviour.calls = 0;
  behaviour.fn = async () => JSON.stringify({ toolCall: { name: "playbook_read", input: { id: "superpowers--brainstorming" } }, result: "partial" });
  res = await runSubAgents([{ id: "loop", role: "r", goal: "g" }], P, "k", ctx);
  ok(res[0]!.status === "failed" && behaviour.calls === 4 && res[0]!.confidence === "low", "tool-call loop stops after 4 model calls");

  // failure isolation + garbage output
  behaviour.fn = async (s) => { throw new Error("provider down"); };
  res = await runSubAgents([{ id: "e", role: "r", goal: "g" }], P, "k", ctx);
  ok(res[0]!.status === "failed" && /provider down/.test(res[0]!.result), "provider error is captured, not thrown");
  let n = 0;
  behaviour.fn = async (_s, msgs) => (msgs[0]!.content.includes("BAD") ? "not json at all" : finish("fine"));
  res = await runSubAgents([{ id: "bad", role: "r", goal: "BAD" }, { id: "good", role: "r", goal: "ok" }], P, "k", ctx);
  ok(res[0]!.status === "failed" && res[1]!.status === "done" && res[1]!.result === "fine", "one bad helper doesn't affect the other");

  // timeout + cancellation stops further model calls
  process.env.ADUF_SUBAGENT_TIMEOUT_MS = "150";
  behaviour.calls = 0;
  behaviour.fn = async () => { await sleep(120); return JSON.stringify({ toolCall: { name: "playbook_read", input: { id: "superpowers--brainstorming" } }, result: "" }); };
  res = await runSubAgents([{ id: "slow", role: "r", goal: "g" }], P, "k", ctx);
  await sleep(500);
  ok(res[0]!.status === "timeout" && behaviour.calls <= 3, `timed-out helper stops spending (${behaviour.calls} model calls)`);
})().catch((e) => { console.error("CRASH", e); process.exit(1); });
