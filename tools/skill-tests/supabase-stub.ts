// Minimal in-memory stand-in for the supabase-js query builder (only what supplier/store.ts uses).
type Row = Record<string, any>;
export const tables: Record<string, Row[]> = { supplier_orders: [], connectors: [] };
let n = 0;
function builder(table: string) {
  let op: "select" | "insert" | "update" | "delete" = "select"; let payload: any; const filters: ((r: Row) => boolean)[] = []; let single = false, maybe = false, lim = 1e9;
  const run = () => {
    const rows = (tables[table] ??= []);
    if (op === "insert") {
      const row = { id: `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), placed_at: null, shipped_at: null, delivered_at: null, supplier_ref: null, carrier: null, tracking_number: null, expected_delivery: null, ...payload };
      if (rows.some((r) => r.user_id === row.user_id && r.store_order_id === row.store_order_id && r.status !== "cancelled" && row.status !== "cancelled")) return { data: null, error: { code: "23505", message: "dup" } };
      rows.push(row); return { data: row, error: null };
    }
    const match = rows.filter((r) => filters.every((f) => f(r)));
    if (op === "update") { match.forEach((r) => Object.assign(r, payload)); return { data: null, error: null }; }
    if (op === "delete") { tables[table] = rows.filter((r) => !match.includes(r)); return { data: null, error: null }; }
    const data = match.slice(0, lim);
    return single || maybe ? { data: data[0] ?? null, error: null } : { data, error: null };
  };
  const b: any = {
    select: () => b, insert: (p: any) => ((op = "insert"), (payload = p), b), update: (p: any) => ((op = "update"), (payload = p), b), delete: () => ((op = "delete"), b),
    eq: (k: string, v: any) => (filters.push((r) => r[k] === v), b), neq: (k: string, v: any) => (filters.push((r) => r[k] !== v), b),
    order: () => b, limit: (x: number) => ((lim = x), b), single: () => ((single = true), b), maybeSingle: () => ((maybe = true), b),
    then: (res: any, rej: any) => Promise.resolve(run()).then(res, rej),
  };
  return b;
}
export const getSupabaseAdmin = () => ({ from: (t: string) => builder(t) });
export const DEFAULT_WORKSPACE_ID = "w";

// Lets tests that load the REAL lib/server/supabase.ts (via relative imports in billing/checkout) run on the same in-memory tables.
export const createClient = () => ({ from: (t: string) => builder(t) });
