import { z } from "zod";
import type { SkillModule } from "../types";
import { billingContext } from "@/lib/server/billing";
import { isSandboxConfigured, runInSandbox } from "@/lib/server/sandbox";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { cogneeDataset, cogneeSearch } from "../services/cognee";

const MAX_ROWS = 10_000;

const input = z.object({
  kind: z.enum(["sale", "lead", "customer", "deal"]),
  groupBy: z.enum(["month", "channel", "segment", "stage"]).default("month"),
});

// Runs inside the E2B sandbox. Receives rows as a JSON string literal; prints one JSON object.
const PY = (rowsJson: string, groupBy: string) => `
import json
import pandas as pd
df = pd.DataFrame(json.loads(${JSON.stringify(rowsJson)}))
group = ${JSON.stringify(groupBy)}
out = {"rows": int(len(df))}
if len(df):
    df["occurred_on"] = pd.to_datetime(df["occurred_on"], errors="coerce")
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    out["dated_rows"] = int(df["occurred_on"].notna().sum())
    out["rows_with_amount"] = int(df["amount"].notna().sum())
    if group == "month":
        df = df[df["occurred_on"].notna()]
    key = df["occurred_on"].dt.strftime("%Y-%m") if group == "month" else df[group].fillna("(none)")
    g = df.assign(_k=key).groupby(["_k", "currency"], dropna=False).agg(
        count=("amount", "size"), total=("amount", "sum"), average=("amount", "mean")).reset_index()
    g = g.sort_values("_k").tail(24)
    out["groups"] = [
        {"key": str(r._k), "currency": r.currency, "count": int(r["count"]),
         "total": round(float(r.total), 2), "average": None if pd.isna(r.average) else round(float(r.average), 2)}
        for _, r in g.iterrows()]
    if group == "month":
        for cur, part in g.groupby("currency"):
            part = part.sort_values("_k")
            if len(part) >= 2 and part.iloc[-2]["total"]:
                out.setdefault("latest_month_change_pct", {})[cur] = round(
                    (part.iloc[-1]["total"] - part.iloc[-2]["total"]) / abs(part.iloc[-2]["total"]) * 100, 1)
print(json.dumps(out))
`;

export const businessAnalystSkill: SkillModule = {
  id: "skill-business-analyst",
  title: "Business Analyst",
  description: "Summarises the owner’s imported sales, leads, customers and deals with pandas.",
  stack: ["pandas", "E2B sandbox", "cognee"],
  requiresEnv: [],
  implemented: true,
  prompt:
    "Prefer real figures from the owner's own data over estimates, and say how many records they are based on.",
  tools: [
    {
      name: "business_analyst_report",
      description:
        "Use for real numbers instead of estimating. Report row counts and any rows missing dates or amounts; if it returns no rows, say to import data on the Analytics page. Totals, counts and averages of imported sales/leads/customers/deals, grouped by month, channel, segment or stage, with latest month-over-month change. Names, emails and companies are never sent to the sandbox.",
      requiresEnv: ["E2B_API_KEY"],
      input,
      risk: "read",
      run: async ({ kind, groupBy }, ctx) => {
        const userId = ctx.userId;
        if (!userId) throw new Error("No signed-in user for this request.");
        if (!isSandboxConfigured()) throw new Error("E2B_API_KEY isn't set.");
        const db = getSupabaseAdmin();
        if (!db) throw new Error("No backend configured.");
        const { data, error } = await db
          .from("business_records")
          .select("occurred_on, amount, currency, channel, segment, stage")
          .eq("user_id", userId)
          .eq("kind", kind)
          .limit(MAX_ROWS);
        if (error) throw new Error(`Couldn't read records: ${error.message}`);
        if (!data?.length) return { rows: 0, note: "No imported records of this kind." };

        const run = await runInSandbox(PY(JSON.stringify(data), groupBy), {
          language: "python",
          sessionId: "skill-business-analyst",
        });
        if (!run.ok) throw new Error(run.error || run.stderr.slice(0, 300) || "Analysis failed.");
        const parsed = JSON.parse(run.stdout.trim().split("\n").pop() ?? "{}") as Record<
          string,
          unknown
        >;
        return { ...parsed, truncated: data.length >= MAX_ROWS };
      },
    },
    {
      name: "business_analyst_graph_search",
      description:
        "Use for questions about what the business knows (imported memories, summaries of its records). Ask the owner's knowledge graph (cognee) a question. Only contains what the owner has synced from Settings; may be empty.",
      requiresEnv: ["COGNEE_BASE_URL", "COGNEE_API_KEY"],
      input: z.object({ query: z.string().min(3).max(300) }),
      risk: "read",
      run: async ({ query }, ctx) => {
        if (!ctx.userId) throw new Error("No signed-in user for this request.");
        return { results: await cogneeSearch(cogneeDataset(ctx.userId), query) };
      },
    },
  ],
};
