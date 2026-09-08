import "@tanstack/react-start/server-only";
import type { MemoryEdge, MemoryNode } from "@/lib/aduf-types";
import { DEFAULT_WORKSPACE_ID, getSupabaseAdmin } from "./supabase";

interface GroupSpec {
  id: string;
  label: string;
  group: MemoryNode["group"];
}

// Every cluster maps to a table ADUF actually writes to — there is no
// fabricated business data (no fake "products" or "customers" counters).
// "Customers" facts come from real chat conversations, "Product catalog"
// from real uploaded knowledge documents, "Revenue" from real goals being
// tracked, and "Website traffic" from real automation runs ADUF has
// executed. A fresh workspace with none of these yet simply omits that
// cluster from the graph rather than showing a placeholder bubble.
const GROUPS: GroupSpec[] = [
  { id: "customers", label: "Customers", group: "customers" },
  { id: "products", label: "Product catalog", group: "products" },
  { id: "revenue", label: "Revenue", group: "revenue" },
  { id: "traffic", label: "Website traffic", group: "traffic" },
];

/** Builds the Business Memory knowledge graph entirely from real counts
 *  already recorded in Supabase for this workspace. The core "ADUF" node
 *  always exists (facts = 0 on a brand-new workspace); satellite clusters
 *  only appear once ADUF has actually learned something in that category,
 *  so the graph never shows fabricated or placeholder data. */
export async function getMemoryGraph(): Promise<{ nodes: MemoryNode[]; edges: MemoryEdge[] }> {
  const db = getSupabaseAdmin();
  const core: MemoryNode = { id: "core", label: "ADUF", group: "core", facts: 0, x: 50, y: 50 };
  if (!db) return { nodes: [core], edges: [] };

  const [chatMessages, documents, goals, automationRuns] = await Promise.all([
    db
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", DEFAULT_WORKSPACE_ID),
    db
      .from("agent_documents")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", DEFAULT_WORKSPACE_ID),
    db
      .from("goals")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", DEFAULT_WORKSPACE_ID),
    db
      .from("automation_runs")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", DEFAULT_WORKSPACE_ID),
  ]);

  const counts: Record<string, number> = {
    customers: chatMessages.count ?? 0,
    products: documents.count ?? 0,
    revenue: goals.count ?? 0,
    traffic: automationRuns.count ?? 0,
  };

  const activeGroups = GROUPS.filter((g) => (counts[g.id] ?? 0) > 0);
  const totalFacts = activeGroups.reduce((sum, g) => sum + (counts[g.id] ?? 0), 0);

  const nodes: MemoryNode[] = [{ ...core, facts: totalFacts }];
  const edges: MemoryEdge[] = [];
  activeGroups.forEach((g) => {
    nodes.push({
      id: g.id,
      label: g.label,
      group: g.group,
      facts: counts[g.id] ?? 0,
      x: 50,
      y: 50,
    });
    edges.push({ from: "core", to: g.id });
  });

  return { nodes, edges };
}
