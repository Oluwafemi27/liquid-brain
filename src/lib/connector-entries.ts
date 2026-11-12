import type { DataSource } from "@/lib/aduf-types";
import type { ConnectorDef } from "@/lib/connector-registry";

// One list for every app ADUF can connect to: the built-in connectors (Google, Paystack, Telegram...)
// plus the 1,000+ apps from Composio. The Memory page and the chat connector panel both read this,
// so search, grouping and "what is connected" always agree.

export type ConnectorTab = "connected" | "available" | "all";

export interface ConnectorEntry {
  key: string;
  origin: "builtin" | "composio";
  /** Built-in connector id, or the Composio app slug. */
  id: string;
  name: string;
  category: string;
  categories: string[];
  connected: boolean;
  logo: string | null;
  description: string;
  /** How connecting works: sign in, paste a key, bot token, or one click through Composio. */
  setup: "oauth" | "key" | "bot" | "one-click" | "own-app" | "none";
  popular: boolean;
  connectionId?: string | undefined;
}

export interface ComposioAppLike {
  slug: string;
  name: string;
  logo: string | null;
  description: string;
  categories: string[];
  access: "managed" | "own" | "none";
}
export interface ComposioBoardLike {
  apps: ComposioAppLike[];
  connections: Array<{ id: string; toolkit: string }>;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function buildEntries(
  sources: DataSource[],
  defs: Record<string, ConnectorDef | undefined>,
  board: ComposioBoardLike | null,
): ConnectorEntry[] {
  const out: ConnectorEntry[] = [];
  const seen = new Set<string>();
  for (const s of sources) {
    const def = defs[s.id];
    seen.add(norm(s.name));
    out.push({
      key: `builtin:${s.id}`,
      origin: "builtin",
      id: s.id,
      name: s.name,
      category: def?.category ?? s.category,
      categories: [def?.category ?? s.category],
      connected: s.connected,
      logo: null,
      description: def?.blurb ?? "",
      setup: def?.auth ?? "oauth",
      popular: Boolean(def?.popular),
    });
  }
  const conn = new Map((board?.connections ?? []).map((c) => [c.toolkit, c.id]));
  for (const a of board?.apps ?? []) {
    if (seen.has(norm(a.name))) continue;
    seen.add(norm(a.name));
    out.push({
      key: `composio:${a.slug}`,
      origin: "composio",
      id: a.slug,
      name: a.name,
      category: a.categories[0] ?? "Other",
      categories: a.categories.length ? a.categories : ["Other"],
      connected: conn.has(a.slug),
      logo: a.logo,
      description: a.description,
      setup: a.access === "managed" ? "one-click" : a.access === "none" ? "none" : "own-app",
      popular: false,
      connectionId: conn.get(a.slug),
    });
  }
  // Connections whose app is missing from the catalog still show up.
  for (const [slug, id] of conn) {
    if (!out.some((e) => e.key === `composio:${slug}`) && !seen.has(norm(slug))) {
      out.push({
        key: `composio:${slug}`,
        origin: "composio",
        id: slug,
        name: slug,
        category: "Other",
        categories: ["Other"],
        connected: true,
        logo: null,
        description: "",
        setup: "one-click",
        popular: false,
        connectionId: id,
      });
    }
  }
  return out.sort(
    (a, b) =>
      Number(b.connected) - Number(a.connected) ||
      Number(b.popular) - Number(a.popular) ||
      a.name.localeCompare(b.name),
  );
}

function rank(e: ConnectorEntry, q: string): number {
  if (!q) return 0;
  const n = e.name.toLowerCase();
  if (n === q) return 100;
  if (n.startsWith(q)) return 80;
  if (n.split(/[\s\-_.]+/).some((w) => w.startsWith(q))) return 70;
  if (n.includes(q)) return 60;
  if (e.id.toLowerCase().includes(q)) return 50;
  if (e.categories.some((c) => c.toLowerCase().includes(q))) return 30;
  if (e.description.toLowerCase().includes(q)) return 10;
  return -1;
}

export function filterEntries(
  entries: ConnectorEntry[],
  o: { query: string; tab: ConnectorTab; category: string },
): ConnectorEntry[] {
  const q = o.query.trim().toLowerCase();
  return entries
    .map((e) => ({ e, r: rank(e, q) }))
    .filter(({ e, r }) => {
      if (r < 0) return false;
      if (o.tab === "connected" && !e.connected) return false;
      if (o.tab === "available" && e.connected) return false;
      if (o.category !== "All" && !e.categories.includes(o.category)) return false;
      return true;
    })
    .sort(
      (x, y) =>
        y.r - x.r ||
        Number(y.e.connected) - Number(x.e.connected) ||
        Number(y.e.popular) - Number(x.e.popular) ||
        x.e.name.localeCompare(y.e.name),
    )
    .map(({ e }) => e);
}

/** Categories present in the list, biggest first. */
export function categoryCounts(entries: ConnectorEntry[]): Array<{ name: string; count: number }> {
  const m = new Map<string, number>();
  for (const e of entries) for (const c of e.categories) m.set(c, (m.get(c) ?? 0) + 1);
  return [...m.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}
