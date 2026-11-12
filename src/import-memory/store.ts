import "@tanstack/react-start/server-only";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import type { ImportedFact } from "./parse";

const BATCH = 500;

/** Upserts parsed facts for one user. Returns how many rows were written. */
export async function saveImportedFacts(userId: string, facts: ImportedFact[]): Promise<number> {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("No backend configured.");
  let written = 0;
  for (let i = 0; i < facts.length; i += BATCH) {
    const rows = facts.slice(i, i + BATCH).map((f) => ({
      user_id: userId,
      source_kind: f.sourceKind,
      external_id: f.externalId,
      text: f.text,
      tags: f.tags,
      created_at_source: f.createdAt,
    }));
    const { error } = await db
      .from("imported_memories")
      .upsert(rows, { onConflict: "user_id,source_kind,external_id" });
    if (error) throw new Error(`Failed to save imported memories: ${error.message}`);
    written += rows.length;
  }
  return written;
}

export async function countImportedFacts(userId: string): Promise<number> {
  const db = getSupabaseAdmin();
  if (!db) return 0;
  const { count } = await db
    .from("imported_memories")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return count ?? 0;
}
