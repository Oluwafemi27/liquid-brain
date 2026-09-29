#!/usr/bin/env node
// Walks the cloned template repos, validates each JSON file as a real n8n
// workflow export (has "nodes" array + "connections" object), extracts
// searchable metadata, de-dupes by checksum, and writes newline-delimited
// JSON to stdout — one line per template row, ready to batch-insert into
// n8n_workflow_templates.
//
// Usage: node ingest.mjs <reposDir> > templates.jsonl

import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { readdirSync } from "node:fs";
import { join, relative, basename, extname } from "node:path";

const REPOS = [
  { dir: "n8n-workflows", repo: "zie619/n8n-workflows" },
  { dir: "awesome-n8n-templates", repo: "enescingoz/awesome-n8n-templates" },
  { dir: "AI-Workflow-Hub-2000-", repo: "emretasss/AI-Workflow-Hub-2000-" },
  { dir: "n8n-workflow-all-templates", repo: "zengfr/n8n-workflow-all-templates" },
  {
    dir: "Project-management-n8n-with-task-management-and-photo-reports",
    repo: "datadrivenconstruction/Project-management-n8n-with-task-management-and-photo-reports",
  },
];

const SKIP_NAMES = new Set(["package.json", "package-lock.json", "tsconfig.json", "composer.json"]);

// n8n node type -> friendly integration slug. Kept small and pattern-based
// since node type strings are like "n8n-nodes-base.shopify" or
// "n8n-nodes-base.httpRequest" or "@n8n/n8n-nodes-langchain.openAi".
function integrationFromNodeType(type) {
  if (!type) return null;
  const last = type.split(".").pop() || type;
  return last
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

const TRIGGER_HINTS = ["trigger", "webhook", "cron", "schedule", "poll"];

function classifyTrigger(nodes) {
  for (const n of nodes) {
    const t = (n?.type || "").toLowerCase();
    if (t.includes("webhook")) return "webhook";
  }
  for (const n of nodes) {
    const t = (n?.type || "").toLowerCase();
    if (t.includes("cron") || t.includes("schedule")) return "schedule";
  }
  for (const n of nodes) {
    const t = (n?.type || "").toLowerCase();
    if (TRIGGER_HINTS.some((h) => t.includes(h))) return "app_event";
  }
  return "manual";
}

function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name === ".git" || e.name === ".playwright-mcp") continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.isFile() && extname(e.name) === ".json" && !SKIP_NAMES.has(e.name)) out.push(full);
  }
}

function firstSentence(text, max = 240) {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

function extractDescription(wf, fallbackName) {
  // Community exports often stash a human description in a Sticky Note
  // node, or in a top-level "meta"/"description" field. Fall back to the
  // filename-derived name if nothing else is present.
  if (typeof wf.description === "string" && wf.description.trim()) return firstSentence(wf.description);
  const sticky = (wf.nodes || []).find((n) => (n?.type || "").toLowerCase().includes("stickynote"));
  const stickyText = sticky?.parameters?.content;
  if (typeof stickyText === "string" && stickyText.trim()) return firstSentence(stickyText);
  return firstSentence(fallbackName);
}

function slugCategory(relPath, repoDir) {
  const parts = relPath.split("/").filter(Boolean);
  // First directory under the repo root that isn't the repo name itself.
  const candidate = parts.find((p) => p !== repoDir && !/^\d+$/.test(p) && extname(p) !== ".json");
  if (!candidate) return null;
  return candidate.replace(/[_-]+/g, " ").trim().slice(0, 60);
}

function nameFromFilename(file) {
  return basename(file, ".json")
    .replace(/^\d+[_-]?/, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const reposDir = process.argv[2];
if (!reposDir) {
  console.error("Usage: node ingest.mjs <reposDir>");
  process.exit(1);
}

const seenChecksums = new Set();
let scanned = 0;
let valid = 0;
let duplicate = 0;
let invalid = 0;

for (const { dir, repo } of REPOS) {
  const repoPath = join(reposDir, dir);
  const files = [];
  walk(repoPath, files);

  for (const file of files) {
    scanned++;
    let raw;
    try {
      raw = readFileSync(file, "utf8");
    } catch {
      invalid++;
      continue;
    }
    let wf;
    try {
      wf = JSON.parse(raw);
    } catch {
      invalid++;
      continue;
    }
    if (!wf || typeof wf !== "object" || !Array.isArray(wf.nodes) || wf.nodes.length === 0) {
      invalid++;
      continue;
    }
    // "connections" should exist for anything but a single-node workflow;
    // accept its absence only for genuinely trivial workflows.
    if (wf.connections !== undefined && typeof wf.connections !== "object") {
      invalid++;
      continue;
    }

    const checksum = createHash("sha256").update(JSON.stringify(wf)).digest("hex");
    if (seenChecksums.has(checksum)) {
      duplicate++;
      continue;
    }
    seenChecksums.add(checksum);

    const relPath = relative(reposDir, file);
    const fallbackName = nameFromFilename(file);
    const name = (typeof wf.name === "string" && wf.name.trim()) || fallbackName || "Untitled workflow";
    const description = extractDescription(wf, fallbackName);
    const integrations = [
      ...new Set(
        wf.nodes
          .map((n) => integrationFromNodeType(n?.type))
          .filter(Boolean)
          .filter((s) => !["stickynote", "set", "no-op", "merge", "code", "function", "if", "switch", "split-in-batches", "wait"].includes(s)),
      ),
    ].slice(0, 25);
    const triggerType = classifyTrigger(wf.nodes);
    const category = slugCategory(relPath, dir);
    const tags = [category, triggerType].filter(Boolean);

    let qualityScore = 0;
    if (triggerType !== "manual") qualityScore += 2;
    if (wf.connections && Object.keys(wf.connections).length > 0) qualityScore += 2;
    if (wf.nodes.length >= 3) qualityScore += 1;
    if (description && description.length > 20) qualityScore += 1;

    out({
      source_repo: repo,
      source_path: relPath,
      name: name.slice(0, 200),
      description,
      category,
      integrations,
      trigger_type: triggerType,
      node_count: wf.nodes.length,
      tags,
      workflow_json: wf,
      checksum,
      quality_score: qualityScore,
    });
    valid++;
  }
}

function out(row) {
  process.stdout.write(JSON.stringify(row) + "\n");
}

console.error(
  `scanned=${scanned} valid=${valid} duplicate=${duplicate} invalid=${invalid} unique=${seenChecksums.size}`,
);
