import { ensureSkillsRegistered, buildSkillToolsBlock, listSkillModuleStatuses, runSkillTool } from "@/skills";
import { composioRunSchema, execComposioRun, previewComposioRun } from "@/connectors/composio-hub/actions";
import { disconnect, listCatalog, startConnect } from "@/connectors/composio-hub/client";
import { riskFor, tierFor } from "@/lib/action-registry";

const ok = (c: unknown, m: string) => { if (!c) { console.error("FAIL", m); process.exit(1); } console.log("ok  ", m); };
const rejects = async (p: Promise<unknown>, re: RegExp) => { try { await p; return false; } catch (e: any) { return re.test(e.message); } };
const g = globalThis as any;
const reset = () => { g.__c = { calls: [], connections: [{ id: "ca1", userId: "u1", toolkit: "gmail" }, { id: "ca2", userId: "u2", toolkit: "slack" }], authConfigs: [], toolkits: [], exec: undefined, noRedirect: false }; };
const ctx = { userId: "u1", sessionId: "s" };

(async () => {
  reset();
  ensureSkillsRegistered();
  delete process.env.COMPOSIO_API_KEY;
  const status = () => listSkillModuleStatuses().find((s) => s.id === "composio-hub")!;
  ok(status().status === "needs_setup" && status().missingEnv.includes("COMPOSIO_API_KEY"), "needs setup without a key");
  ok(!buildSkillToolsBlock().includes("composio_find_tools"), "tools hidden without a key");
  process.env.COMPOSIO_API_KEY = "ck";
  ok(status().status === "ready", "ready with a key");
  ok(buildSkillToolsBlock().includes("composio_my_apps") && buildSkillToolsBlock().includes("composio_run_tool"), "tools and run-via-approval guidance advertised");

  // ---- read tools
  let r: any = await runSkillTool("composio_my_apps", {}, ctx);
  ok(r.ok && JSON.stringify(r.output.apps) === '["gmail"]', "my_apps lists only this user's apps");
  r = await runSkillTool("composio_find_tools", { toolkit: "slack", search: "post message" }, ctx);
  ok(!r.ok && /isn't connected/.test(r.message), "find_tools refuses an app the user hasn't connected (u2 owns slack)");
  r = await runSkillTool("composio_find_tools", { toolkit: "Gmail", search: "send email" }, ctx);
  ok(r.ok && r.output.tools[0].slug === "GMAIL_SEND_EMAIL", "find_tools returns tool slugs for a connected app");
  r = await runSkillTool("composio_my_apps", {}, { userId: null, sessionId: "s" });
  ok(r.ok && r.output.apps.length === 0, "no user, no apps");

  // ---- approval-gated action
  ok(riskFor("composio_run_tool", {}) === "external", "running a Composio tool is external risk");
  ok(tierFor("composio_run_tool", {}) === "approve", "running a Composio tool always needs approval");
  ok(!composioRunSchema.safeParse({ toolkit: "gmail", toolSlug: "gmail_send_email" }).success, "tool slug must be an exact upper-case slug");
  ok(!composioRunSchema.safeParse({ toolkit: "gm ail!", toolSlug: "GMAIL_SEND_EMAIL" }).success, "toolkit name is validated");
  const prev = await previewComposioRun({ toolkit: "gmail", toolSlug: "GMAIL_SEND_EMAIL", arguments: { to: "a@b.c" } });
  ok(/GMAIL_SEND_EMAIL/.test(prev.headline) && prev.effects.some((e) => e.includes("a@b.c")), "preview shows the tool and its arguments");
  reset();
  const run = await execComposioRun("u1", { toolkit: "gmail", toolSlug: "GMAIL_SEND_EMAIL", arguments: { to: "a@b.c" } });
  const call = g.__c.calls.find((c: any[]) => c[0] === "execute");
  ok(run.changed && call[1] === "GMAIL_SEND_EMAIL" && call[2].connectedAccountId === "ca1" && call[2].userId === "u1" && call[2].arguments.to === "a@b.c", "exec uses the user's own connection");
  ok(await rejects(execComposioRun("u1", { toolkit: "slack", toolSlug: "SLACK_SEND_MESSAGE", arguments: {} }), /isn't connected/), "exec refuses another user's app");
  g.__c.exec = { successful: false, error: "invalid_grant", data: null };
  ok(await rejects(execComposioRun("u1", { toolkit: "gmail", toolSlug: "GMAIL_SEND_EMAIL", arguments: {} }), /invalid_grant/), "a failed tool call is reported, not hidden");

  // ---- connect / disconnect
  reset();
  ok(await rejects(startConnect("u1", "gmail", "https://x/cb"), /already connected/), "can't connect the same app twice");
  const url = await startConnect("u1", "github", "https://x/cb");
  ok(url === "https://connect.test/ac_new_github" && g.__c.calls.some((c: any[]) => c[0] === "authConfigs.create" && c[2].type === "use_composio_managed_auth"), "creates a managed login config when none exists");
  reset();
  g.__c.authConfigs = [{ id: "ac_existing", status: "ENABLED" }];
  ok((await startConnect("u1", "github", "https://x/cb")) === "https://connect.test/ac_existing" && !g.__c.calls.some((c: any[]) => c[0] === "authConfigs.create"), "reuses an existing login config");
  reset(); g.__c.noRedirect = true;
  ok(await rejects(startConnect("u1", "github", "https://x/cb"), /sign-in link/), "missing sign-in link is an error");
  reset();
  ok(await rejects(disconnect("u1", "ca2"), /isn't yours/), "can't disconnect someone else's connection");
  await disconnect("u1", "ca1");
  ok(g.__c.calls.some((c: any[]) => c[0] === "delete" && c[1] === "ca1"), "disconnects your own connection");

  // ---- catalogue
  reset();
  g.__c.toolkits = [
    { slug: "gmail", name: "Gmail", meta: { logo: "l", description: "Email  \n service", categories: [{ slug: "c", name: "Email" }], toolsCount: 40 }, isLocalToolkit: false, composioManagedAuthSchemes: ["OAUTH2"] },
    { slug: "weird", name: "Weird", meta: {}, isLocalToolkit: false, composioManagedAuthSchemes: [] },
    { slug: "open", name: "Open", meta: {}, isLocalToolkit: false, noAuth: true },
    { slug: "local", name: "Local", meta: {}, isLocalToolkit: true },
    { slug: "gmail", name: "Gmail dup", meta: {}, isLocalToolkit: false },
  ];
  const cat = await listCatalog();
  const by = Object.fromEntries(cat.map((a) => [a.slug, a]));
  ok(cat.length === 3 && !by["local"], "catalogue drops local and duplicate toolkits");
  ok(by["gmail"].access === "managed" && by["weird"].access === "own" && by["open"].access === "none", "access level mapped from Composio's managed auth");
  ok(by["gmail"].description === "Email service" && by["gmail"].categories[0] === "Email", "description is tidied and categories kept");
  await listCatalog();
  ok(g.__c.calls.filter((c: any[]) => c[0] === "toolkits.get").length === 1, "catalogue is cached");
  console.log("done");
})();
