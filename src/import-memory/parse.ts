// Pure parser (no server imports) for memory exports from other tools. It turns each export into a
// flat list of facts. It never guesses: anything it can't read is counted in `skipped`.
//
// Formats handled:
//  - mem0: the output of `memory.get_all()` — either an array, or `{ results: [...] }`. Each item has
//    a `memory` string plus optional `id`, `created_at`, `updated_at`, `categories`, `metadata`.
//  - claude-mem: the JSON export (`exportedAt`, `observations[]`, `sessions[]`, `summaries[]`,
//    `prompts[]`). claude-mem's docs list only the top-level keys and a few per-record keys
//    (`title`, `sdk_session_id`, `created_at_epoch`), so observation text is read from whichever of
//    `title`/`subtitle`/`narrative`/`text` are present, and `facts` if it is an array or JSON array
//    string. Only `observations` and `summaries` are imported — raw prompts are never imported.
//  - jsonl: one JSON object per line, each parsed as one of the two shapes above.

export type MemorySourceKind = "mem0" | "claude-mem";

export interface ImportedFact {
  sourceKind: MemorySourceKind;
  /** Stable id from the source when it has one, otherwise a hash of the text. */
  externalId: string;
  text: string;
  tags: string[];
  createdAt: string | null;
}

export interface ParseResult {
  sourceKind: MemorySourceKind | null;
  facts: ImportedFact[];
  skipped: number;
  error: string | null;
}

const MAX_TEXT = 2000;
const MAX_FACTS = 5000;

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return `h${(h >>> 0).toString(36)}`;
}

function iso(value: unknown, epoch?: unknown): string | null {
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  if (typeof epoch === "number" && Number.isFinite(epoch)) {
    // claude-mem epochs may be seconds or milliseconds.
    const ms = epoch < 1e12 ? epoch * 1000 : epoch;
    return new Date(ms).toISOString();
  }
  return null;
}

function stringList(v: unknown): string[] {
  let list: unknown = v;
  if (typeof v === "string") {
    try {
      list = JSON.parse(v);
    } catch {
      return v.trim() ? [v.trim()] : [];
    }
  }
  return Array.isArray(list) ? list.map(str).filter(Boolean) : [];
}

function fromMem0(item: unknown): ImportedFact | null {
  if (!isObj(item)) return null;
  const text = str(item["memory"]) || str(item["text"]);
  if (!text) return null;
  return {
    sourceKind: "mem0",
    externalId: str(item["id"]) || hash(text),
    text: text.slice(0, MAX_TEXT),
    tags: stringList(item["categories"]),
    createdAt: iso(item["created_at"]),
  };
}

function fromClaudeMemRecord(item: unknown, kind: "observation" | "summary"): ImportedFact | null {
  if (!isObj(item)) return null;
  const parts = [
    str(item["title"]),
    str(item["subtitle"]),
    str(item["narrative"]) || str(item["text"]) || str(item["request"]) || str(item["completed"]),
    ...stringList(item["facts"]),
  ].filter(Boolean);
  const text = [...new Set(parts)].join(" — ");
  if (!text) return null;
  const type = str(item["type"]);
  return {
    sourceKind: "claude-mem",
    externalId: item["id"] != null ? `${kind}:${String(item["id"])}` : `${kind}:${hash(text)}`,
    text: text.slice(0, MAX_TEXT),
    tags: [kind, ...(type ? [type] : []), ...stringList(item["concepts"])],
    createdAt: iso(item["created_at"], item["created_at_epoch"]),
  };
}

function parseValue(data: unknown): ParseResult {
  // claude-mem export object
  if (isObj(data) && Array.isArray(data["observations"])) {
    const raw: [unknown, "observation" | "summary"][] = [
      ...(data["observations"] as unknown[]).map((o): [unknown, "observation"] => [
        o,
        "observation",
      ]),
      ...(Array.isArray(data["summaries"]) ? (data["summaries"] as unknown[]) : []).map(
        (o): [unknown, "summary"] => [o, "summary"],
      ),
    ];
    return collect(
      "claude-mem",
      raw.map(([o, k]) => fromClaudeMemRecord(o, k)),
      raw.length,
    );
  }
  // mem0: { results: [...] } or a bare array
  const arr = isObj(data) && Array.isArray(data["results"]) ? data["results"] : data;
  if (Array.isArray(arr)) {
    return collect("mem0", arr.map(fromMem0), arr.length);
  }
  return {
    sourceKind: null,
    facts: [],
    skipped: 0,
    error: "Unrecognised file: expected a mem0 export (array or {results}) or a claude-mem export.",
  };
}

function collect(
  kind: MemorySourceKind,
  parsed: (ImportedFact | null)[],
  total: number,
): ParseResult {
  const seen = new Set<string>();
  const facts: ImportedFact[] = [];
  for (const f of parsed) {
    if (!f || seen.has(f.externalId)) continue;
    seen.add(f.externalId);
    facts.push(f);
  }
  const capped = facts.slice(0, MAX_FACTS);
  return {
    sourceKind: kind,
    facts: capped,
    skipped: total - capped.length,
    error:
      facts.length > MAX_FACTS
        ? `Only the first ${MAX_FACTS} of ${facts.length} facts were kept.`
        : null,
  };
}

/** Accepts the raw text of an export file (JSON or JSONL). */
export function parseMemoryExport(text: string): ParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { sourceKind: null, facts: [], skipped: 0, error: "The file is empty." };
  try {
    return parseValue(JSON.parse(trimmed));
  } catch {
    // fall through to JSONL
  }
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim());
  const objects: unknown[] = [];
  let badLines = 0;
  for (const line of lines) {
    try {
      objects.push(JSON.parse(line));
    } catch {
      badLines++;
    }
  }
  if (!objects.length) {
    return { sourceKind: null, facts: [], skipped: badLines, error: "Not valid JSON or JSONL." };
  }
  const result = parseValue(objects);
  return { ...result, skipped: result.skipped + badLines };
}
