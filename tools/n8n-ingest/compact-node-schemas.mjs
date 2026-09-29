#!/usr/bin/env node
// Distills yigitkonur/n8n-schema-generator's ~1,275 raw schema files (18MB)
// into one compact index: per node type, just what's needed to catch a
// hallucinated node type or missing required parameter before we ever try
// to deploy — not the full property UI schema, which is far more than an
// AI-generated workflow needs to be validated against and would bloat the
// bundle/DB row unnecessarily.
//
// Usage: node compact-node-schemas.mjs <schemaGeneratorDir> > node-schema-index.json

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("Usage: node compact-node-schemas.mjs <schemaGeneratorDir>");
  process.exit(1);
}

function loadDir(sub) {
  const full = join(dir, "schemas", sub);
  let files;
  try {
    files = readdirSync(full).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  return files.map((f) => {
    try {
      return JSON.parse(readFileSync(join(full, f), "utf8"));
    } catch {
      return null;
    }
  }).filter(Boolean);
}

const meta = JSON.parse(readFileSync(join(dir, "schemas", "_meta.json"), "utf8"));
const nodes = loadDir("nodes");
const credentials = loadDir("credentials");

const nodeIndex = {};
for (const n of nodes) {
  if (!n.name) continue;
  const type = `n8n-nodes-base.${n.name}`;
  const requiredTopLevel = (n.properties || [])
    .filter((p) => p.required === true)
    .map((p) => p.name);
  // "operation"/"resource" enums are the #1 thing generated JSON gets wrong
  // (inventing a resource/operation combo that doesn't exist on that node).
  const operationProp = (n.properties || []).find((p) => p.name === "operation" && Array.isArray(p.options));
  const resourceProp = (n.properties || []).find((p) => p.name === "resource" && Array.isArray(p.options));
  nodeIndex[type] = {
    displayName: n.displayName || n.name,
    group: n.group || [],
    ...(resourceProp ? { resources: resourceProp.options.map((o) => o.value) } : {}),
    ...(operationProp ? { operations: operationProp.options.map((o) => o.value) } : {}),
    ...(requiredTopLevel.length ? { required: requiredTopLevel } : {}),
  };
}

const credentialIndex = {};
for (const c of credentials) {
  if (!c.name) continue;
  credentialIndex[c.name] = {
    displayName: c.displayName || c.name,
    requiredFields: (c.properties || []).filter((p) => p.required !== false).map((p) => p.name),
  };
}

process.stdout.write(
  JSON.stringify(
    {
      n8nVersion: meta.n8nVersion,
      generatedAt: new Date().toISOString(),
      source: "yigitkonur/n8n-schema-generator",
      nodeCount: Object.keys(nodeIndex).length,
      credentialCount: Object.keys(credentialIndex).length,
      nodes: nodeIndex,
      credentials: credentialIndex,
    },
    null,
    0,
  ),
);
console.error(`nodes=${Object.keys(nodeIndex).length} credentials=${Object.keys(credentialIndex).length}`);
