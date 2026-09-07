#!/usr/bin/env node
// Walks the cloned n8n skills repos and emits one JSONL row per doc file
// (each SKILL.md and each references/*.md) — kept file-granular rather than
// concatenated per-skill so search_n8n_docs returns focused, individually
// relevant chunks instead of one giant blob per topic.
//
// Usage: node ingest-skills.mjs <reposDir> > skill-docs.jsonl

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, basename } from "node:path";

const SOURCES = [
  { dir: "skills", repo: "n8n-io/skills", root: "skills/skills" },
  {
    dir: "n8n-skills",
    repo: "czlonkowski/n8n-skills",
    root: "n8n-skills/skills",
    // Only pull skills the official n8n-io/skills repo doesn't cover, to
    // avoid ~90% duplicate content between the two repos.
    onlyDirs: ["n8n-self-hosting", "n8n-mcp-tools-expert", "n8n-validation-expert", "n8n-code-python", "n8n-code-tool"],
  },
];

function walk(dir, out) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name === ".git" || e.name === "assets" || e.name === "examples") continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else if (e.isFile() && e.name.endsWith(".md")) out.push(full);
  }
}

function firstHeading(content) {
  const m = content.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

const reposDir = process.argv[2];
if (!reposDir) {
  console.error("Usage: node ingest-skills.mjs <reposDir>");
  process.exit(1);
}

let total = 0;
for (const src of SOURCES) {
  const rootPath = join(reposDir, src.root);
  let skillDirs;
  try {
    skillDirs = readdirSync(rootPath, { withFileTypes: true }).filter((e) => e.isDirectory());
  } catch {
    console.error(`Skipping ${src.repo} — ${rootPath} not found`);
    continue;
  }

  for (const skillDirEnt of skillDirs) {
    const skillName = skillDirEnt.name;
    if (src.onlyDirs && !src.onlyDirs.includes(skillName)) continue;
    const skillPath = join(rootPath, skillName);
    const files = [];
    walk(skillPath, files);

    for (const file of files) {
      const content = readFileSync(file, "utf8").trim();
      if (!content) continue;
      const relPath = relative(reposDir, file);
      const isMain = basename(file) === "SKILL.md";
      const refTitle = basename(file, ".md").replace(/_/g, " ");
      const heading = firstHeading(content);
      const title = isMain
        ? heading || skillName.replace(/-official$/, "").replace(/-/g, " ")
        : `${skillName.replace(/-official$/, "").replace(/-/g, " ")}: ${refTitle}`;

      const id = relPath
        .replace(/\.md$/, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .toLowerCase()
        .slice(0, 150);

      const tags = [skillName.replace(/-official$/, ""), isMain ? "overview" : "reference"];

      process.stdout.write(
        JSON.stringify({
          id,
          source_repo: src.repo,
          title: title.slice(0, 200),
          content: content.slice(0, 30000),
          tags,
          sort_order: isMain ? 0 : 1,
        }) + "\n",
      );
      total++;
    }
  }
}
console.error(`emitted ${total} skill docs`);
