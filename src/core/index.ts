// "/core" in the target layout: the existing backend, re-exported under one name so skills and
// connectors depend on this barrel instead of reaching into lib/server file by file. Nothing was
// moved; add exports here as skills need them.
export { runInSandbox, isSandboxConfigured } from "@/lib/server/sandbox";
export { getSupabaseAdmin, DEFAULT_WORKSPACE_ID } from "@/lib/server/supabase";
export { callAgent } from "@/lib/server/agent";
export { runWithHarness } from "@/lib/server/agent-harness";
export { ACTIONS, riskFor, tierFor } from "@/lib/action-registry";
