#!/usr/bin/env node
// Loads skill-docs.jsonl (from ingest-skills.mjs) into n8n_skill_docs via
// the Supabase JS client — same reliability rationale as load-to-supabase.mjs:
// don't hand-write SQL for large arbitrary text blobs.
//
// Usage:
//   SUPABASE_URL=https://xxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=xxx \
//   node load-skill-docs.mjs skill-docs.jsonl

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const file = process.argv[2];
if (!file) {
  console.error("Usage: node load-skill-docs.mjs <skill-docs.jsonl>");
  process.exit(1);
}

const supabase = createClient(url, key);
const rows = readFileSync(file, "utf8")
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l));

const { error, count } = await supabase
  .from("n8n_skill_docs")
  .upsert(rows, { onConflict: "id", count: "exact" });

if (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}
console.log(`Loaded ${count ?? rows.length} skill docs.`);
