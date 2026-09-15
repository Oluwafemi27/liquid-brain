/**
 * remark-gfm (used by ChatMarkdown) only renders a pipe table when it's
 * strict GFM: a header row, a "|---|---|" delimiter row right under it,
 * and every row on its own line. The agent is instructed to produce that
 * (see agent.ts's "Formatting: use tables" section), but because the
 * table has to live inside a JSON string value ({"reply": "..."}), models
 * sometimes collapse it onto one line and drop the delimiter row — e.g.
 * "| Pillar | Action | Metric | | Content | Post 3 Reels... | Ongoing |"
 * with no "\n" between cells at all. remark-gfm doesn't recognize that as
 * a table, so it prints literally — exactly the bug in the screenshot.
 *
 * This repairs that shape before the text ever reaches ReactMarkdown, so
 * it fixes both future replies and any already-broken messages already
 * sitting in Supabase. It's conservative by design: anything that doesn't
 * clearly look like a flattened table is left completely untouched.
 */

const MIN_PIPES_TO_CONSIDER = 5;
const MIN_CELLS_TO_CONSIDER = 6;

/** True if `block` already has a real GFM delimiter row ("| --- | --- |"),
 *  meaning remark-gfm will render it fine on its own — leave it alone. */
function hasDelimiterRow(block: string): boolean {
  return /^\s*\|?(\s*:?-{2,}:?\s*\|)+\s*:?-{2,}:?\s*\|?\s*$/m.test(block);
}

/** True if the block already spans multiple lines with a "|" near the
 *  start of at least two of them — i.e. rows are already newline-
 *  separated, just missing the delimiter row. */
function looksLikeMultilineRows(block: string): string[] | null {
  const lines = block.split("\n").map((l) => l.trim());
  const pipeLines = lines.filter((l) => l.startsWith("|") && l.endsWith("|") && l.length > 2);
  if (pipeLines.length < 2) return null;
  return pipeLines;
}

/** Splits a single flattened line like
 *  "| Pillar | Action | Metric | | Content | Post 3... | Ongoing |"
 *  back into rows of cells, using the empty token produced by adjacent
 *  "| |" row boundaries as the row separator. Returns null if the result
 *  doesn't look like a clean rectangular table. */
function splitFlattenedRow(block: string): string[][] | null {
  const tokens = block.split("|").map((t) => t.trim());
  // Drop the leading/trailing empty tokens from the outer "|" delimiters.
  if (tokens[0] === "") tokens.shift();
  if (tokens[tokens.length - 1] === "") tokens.pop();
  if (tokens.length < MIN_CELLS_TO_CONSIDER) return null;

  const rows: string[][] = [];
  let current: string[] = [];
  for (const token of tokens) {
    if (token === "") {
      if (current.length > 0) {
        rows.push(current);
        current = [];
      }
      continue;
    }
    current.push(token);
  }
  if (current.length > 0) rows.push(current);

  if (rows.length < 2) return null;
  const cols = rows[0]!.length;
  if (cols < 2) return null;
  // Every row must agree on column count, or this isn't really a clean
  // table and we should leave the original text alone rather than guess.
  if (!rows.every((r) => r.length === cols)) return null;

  return rows;
}

function rowsToMarkdownTable(rows: string[][]): string {
  const cols = rows[0]!.length;
  const header = rows[0]!;
  const body = rows.slice(1);
  const lines = [
    `| ${header.join(" | ")} |`,
    `| ${Array(cols).fill("---").join(" | ")} |`,
    ...body.map((r) => `| ${r.join(" | ")} |`),
  ];
  return lines.join("\n");
}

function repairBlock(block: string): string {
  const pipeCount = (block.match(/\|/g) ?? []).length;
  if (pipeCount < MIN_PIPES_TO_CONSIDER) return block;
  if (hasDelimiterRow(block)) return block; // already valid GFM

  // Case 1: rows already on their own lines, just missing the delimiter.
  const pipeLines = looksLikeMultilineRows(block);
  if (pipeLines) {
    const cols = (pipeLines[0]!.match(/\|/g) ?? []).length - 1;
    if (cols >= 2) {
      const [head, ...rest] = pipeLines;
      const delimiter = `| ${Array(cols).fill("---").join(" | ")} |`;
      return [head, delimiter, ...rest].join("\n");
    }
    return block;
  }

  // Case 2: the whole thing is flattened onto one line/paragraph.
  const rows = splitFlattenedRow(block);
  if (!rows) return block;
  return rowsToMarkdownTable(rows);
}

/** Repairs malformed pipe-tables in a chat message, paragraph by
 *  paragraph, and returns everything else completely unchanged. Safe to
 *  run on every message — text with no "|" characters (the vast
 *  majority) is a no-op. */
export function repairPseudoTables(input: string): string {
  if (!input.includes("|")) return input;
  return input
    .split(/\n{2,}/)
    .map(repairBlock)
    .join("\n\n");
}
