import "@tanstack/react-start/server-only";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { cogneeAdd, cogneeCognify, cogneeDataset } from "../services/cognee";

const MAX_FACTS = 500;

/** Owner-triggered push of what ADUF knows into the owner's cognee dataset. This sends business data
 *  to a third party, so it is a user action (POST /api/skills/cognee-sync), never an agent tool.
 *  Sent: imported memory facts + monthly aggregates (kind, month, currency, count, total).
 *  Never sent: names, emails, companies or any other per-person field. */
export async function syncBusinessMemory(userId: string): Promise<{ sent: number }> {
  const db = getSupabaseAdmin();
  if (!db) throw new Error("No backend configured.");

  const texts: string[] = [];
  const { data: mem } = await db
    .from("imported_memories")
    .select("text")
    .eq("user_id", userId)
    .order("imported_at", { ascending: false })
    .limit(MAX_FACTS);
  for (const m of mem ?? []) texts.push(String(m["text"]));

  const { data: rec } = await db
    .from("business_records")
    .select("kind, occurred_on, amount, currency")
    .eq("user_id", userId)
    .not("occurred_on", "is", null)
    .limit(10_000);
  const agg = new Map<string, { n: number; total: number }>();
  for (const r of rec ?? []) {
    const key = `${r["kind"]}|${String(r["occurred_on"]).slice(0, 7)}|${r["currency"]}`;
    const cur = agg.get(key) ?? { n: 0, total: 0 };
    cur.n++;
    cur.total += Number(r["amount"]) || 0;
    agg.set(key, cur);
  }
  for (const [key, v] of agg) {
    const [kind, month, currency] = key.split("|");
    texts.push(
      `In ${month} the business recorded ${v.n} ${kind} record(s) totalling ${v.total.toFixed(2)} ${currency}.`,
    );
  }

  if (!texts.length) return { sent: 0 };
  const dataset = cogneeDataset(userId);
  await cogneeAdd(dataset, texts);
  await cogneeCognify(dataset);
  return { sent: texts.length };
}
