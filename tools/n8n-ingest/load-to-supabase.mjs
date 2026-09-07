#!/usr/bin/env node
// Loads templates.jsonl (produced by ingest.mjs) into n8n_workflow_templates
// using the Supabase JS client — this is the reliable path for bulk data;
// hand-writing SQL INSERT text for thousands of rows of arbitrary JSON is
// exactly the kind of thing that silently corrupts on a stray brace, so
// don't do that. The client handles JSON encoding correctly and batches
// efficiently.
//
// Usage:
//   SUPABASE_URL=https://xxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=xxx \
//   node load-to-supabase.mjs templates.jsonl [--limit 2000]
//
// Safe to re-run: uses upsert on the (source_repo, source_path) unique
// constraint, so it resumes / de-dupes automatically.

import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline";
import { createReadStream } from "node:fs";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const file = process.argv[2];
if (!file) {
  console.error("Usage: node load-to-supabase.mjs <templates.jsonl> [--limit N]");
  process.exit(1);
}
const limitFlag = process.argv.indexOf("--limit");
const limit = limitFlag > -1 ? Number(process.argv[limitFlag + 1]) : Infinity;

const supabase = createClient(url, key);
const BATCH_SIZE = 200;

async function main() {
  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  let batch = [];
  let total = 0;
  let inserted = 0;
  let failed = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    if (total >= limit) break;
    const row = JSON.parse(line);
    batch.push({
      source_repo: row.source_repo,
      source_path: row.source_path,
      name: row.name,
      description: row.description,
      category: row.category,
      integrations: row.integrations,
      trigger_type: row.trigger_type,
      node_count: row.node_count,
      tags: row.tags,
      workflow_json: row.workflow_json,
      checksum: row.checksum,
      quality_score: row.quality_score,
    });
    total++;

    if (batch.length >= BATCH_SIZE) {
      const { error, count } = await supabase
        .from("n8n_workflow_templates")
        .upsert(batch, { onConflict: "source_repo,source_path", ignoreDuplicates: true, count: "exact" });
      if (error) {
        console.error(`Batch failed at row ${total}:`, error.message);
        failed += batch.length;
      } else {
        inserted += count ?? batch.length;
      }
      console.log(`Progress: ${total} read, ~${inserted} inserted, ${failed} failed`);
      batch = [];
    }
  }
  if (batch.length) {
    const { error, count } = await supabase
      .from("n8n_workflow_templates")
      .upsert(batch, { onConflict: "source_repo,source_path", ignoreDuplicates: true, count: "exact" });
    if (error) {
      console.error("Final batch failed:", error.message);
      failed += batch.length;
    } else {
      inserted += count ?? batch.length;
    }
  }
  console.log(`Done. ${total} read, ~${inserted} inserted, ${failed} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
