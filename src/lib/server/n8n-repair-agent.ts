import "@tanstack/react-start/server-only";
import { getSupabaseAdmin } from "./supabase";
import { testDeployWorkflow } from "./n8n-client";
import { starTemplateCorrection } from "./n8n-templates";
import { validateWorkflowAgainstSchema } from "./n8n-schema-validator";

/** The weekly "Template Repair Agent": test-deploys every library template
 *  against a connected n8n instance (inactive, deleted immediately after —
 *  see testDeployWorkflow) and stars anything that fails with the exact
 *  error, so:
 *   1. the owner-facing library never silently offers a broken workflow, and
 *   2. next time the agent's search_n8n_templates tool call surfaces this
 *      template, the correction note comes back with it — that's the
 *      "reminds the ai whenever it wants to use the same workflow in
 *      future" behavior the brief asked for.
 *
 * This needs a *connected* n8n instance to actually test against (n8n has
 * no public "validate this JSON" endpoint — creating-then-deleting a
 * workflow on a real instance is the only reliable correctness check,
 * since that's what catches removed node parameters, renamed node types,
 * and connection-shape changes between n8n versions). Wire this up to a
 * cron trigger (e.g. a Supabase Edge Function scheduled weekly, or a
 * platform cron hitting a protected route) that calls runWeeklyRepairSweep
 * using whichever workspace's connection you want as the test rig —
 * typically your own internal n8n instance kept on the latest version,
 * not a customer's, so a bad template never touches a live customer
 * account during testing. */
export async function runWeeklyRepairSweep(options?: { batchSize?: number }): Promise<{
  runId: string;
  tested: number;
  flagged: number;
}> {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("No backend configured.");

  const { data: run, error: runError } = await db
    .from("n8n_repair_runs")
    .insert({ status: "running" })
    .select("id")
    .single();
  if (runError || !run) throw new Error(`Failed to start repair run: ${runError?.message}`);
  const runId = run["id"] as string;

  const batchSize = options?.batchSize ?? 1000;
  let tested = 0;
  let flagged = 0;

  try {
    // Skip templates that already have an open starred correction — no
    // point re-flagging the same known-broken workflow every week; the
    // agent already avoids it via getDeployableTemplateJson's correction
    // lookup, and a human/agent fix should clear the 'open' status.
    const { data: alreadyFlagged } = await db
      .from("n8n_workflow_corrections")
      .select("template_id")
      .eq("status", "open");
    const skipIds = new Set((alreadyFlagged ?? []).map((r) => r["template_id"] as string));

    const { data: templates, error } = await db
      .from("n8n_workflow_templates")
      .select("id, name, workflow_json")
      .order("imported_at", { ascending: true })
      .limit(batchSize);
    if (error) throw new Error(error.message);

    for (const template of templates ?? []) {
      const id = template["id"] as string;
      if (skipIds.has(id)) continue;
      tested++;

      // Cheap static pass first — catches a hallucinated/renamed node type
      // instantly without spending a live create+delete round trip on the
      // owner's test n8n instance. Anything it misses (deeper parameter
      // shape issues) still gets caught by the live test below.
      const staticIssues = validateWorkflowAgainstSchema(
        template["workflow_json"] as Record<string, unknown>,
      );
      if (staticIssues.length > 0) {
        flagged++;
        await starTemplateCorrection({
          templateId: id,
          issue: staticIssues.map((i) => `${i.nodeName} (${i.nodeType}): ${i.message}`).join("; "),
          note:
            `Flagged by the weekly repair sweep's static schema check on ${new Date().toISOString().slice(0, 10)}. ` +
            `Do not offer this template until fixed — prefer another match or build fresh instead.`,
          detectedBy: "repair_agent",
        });
        continue;
      }

      const result = await testDeployWorkflow(
        template["workflow_json"] as Record<string, unknown>,
        template["name"] as string,
      );
      if (!result.ok) {
        flagged++;
        await starTemplateCorrection({
          templateId: id,
          issue: result.error,
          note:
            `Flagged by the weekly repair sweep on ${new Date().toISOString().slice(0, 10)}. ` +
            `Deploy failed: ${result.error.slice(0, 300)}. Do not offer this template until fixed — ` +
            `prefer another match or build fresh instead.`,
          detectedBy: "repair_agent",
        });
      }
    }

    await db
      .from("n8n_repair_runs")
      .update({
        finished_at: new Date().toISOString(),
        templates_tested: tested,
        templates_flagged: flagged,
        templates_fixed: 0,
        status: "done",
        summary: `Tested ${tested} templates, flagged ${flagged} as broken.`,
      })
      .eq("id", runId);

    return { runId, tested, flagged };
  } catch (err) {
    await db
      .from("n8n_repair_runs")
      .update({
        finished_at: new Date().toISOString(),
        templates_tested: tested,
        templates_flagged: flagged,
        status: "error",
        summary: err instanceof Error ? err.message : "Repair sweep failed",
      })
      .eq("id", runId);
    throw err;
  }
}

/** Called from the live deploy path (n8n-deployments.ts) when a
 *  template-based deploy fails for a reason that isn't the owner's own
 *  connection being down — files the same kind of correction as the
 *  weekly sweep, but immediately, so a broken template is starred the
 *  moment it's discovered rather than waiting up to a week. */
export async function flagTemplateFromDeployFailure(templateId: string, error: string): Promise<void> {
  await starTemplateCorrection({
    templateId,
    issue: error,
    note: `Flagged from a live deploy failure. Deploy failed: ${error.slice(0, 300)}. Avoid until fixed.`,
    detectedBy: "deploy_failure",
  });
}
