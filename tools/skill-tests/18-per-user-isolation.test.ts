import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

// Regression guard: one person's keys, tokens and connections must never be readable by another
// account. The modules below hold secrets, so none of them may use the shared "default" workspace.
const ok = (c: unknown, m: string) => { if (!c) { console.error("FAIL", m); process.exit(1); } console.log("ok  ", m); };
const root = path.resolve(process.cwd(), "src");
const read = (rel: string) => readFileSync(path.join(root, rel), "utf8");

const SECRET_HOLDERS = [
  "lib/server/model-keys.ts",
  "lib/server/connector-keys.ts",
  "lib/server/connectors.ts",
  "lib/server/google-auth.ts",
  "lib/server/google-sources.ts",
  "lib/server/connection-health.ts",
  "lib/server/n8n-connection.ts",
  "skills/services/meta-ads.ts",
];
for (const f of SECRET_HOLDERS) ok(!/DEFAULT_WORKSPACE_ID/.test(read(f)), `${f} never uses the shared workspace`);

// Every function that reads a key or token takes the owner as its first argument.
const sig = (file: string, name: string) => new RegExp(`function ${name}\\(\\s*userId: string`).test(read(file));
ok(sig("lib/server/model-keys.ts", "resolveModelKey"), "resolveModelKey takes the owner");
ok(/function resolveDefaultModelKey\(userId: string \| null\)/.test(read("lib/server/model-keys.ts")), "resolveDefaultModelKey takes the owner");
ok(sig("lib/server/model-keys.ts", "storeModelKey"), "storeModelKey takes the owner");
ok(sig("lib/server/google-auth.ts", "getGoogleAccessToken"), "getGoogleAccessToken takes the owner");
ok(sig("lib/server/connector-keys.ts", "resolveConnectorSecret"), "resolveConnectorSecret takes the owner");
ok(sig("lib/server/n8n-connection.ts", "resolveN8nConnection"), "resolveN8nConnection takes the owner");

// The model-key API is per account, not admin-only and not shared.
const route = read("routes/api/model-keys.ts");
ok(!/requireAdmin/.test(route), "model keys can be managed by their own owner (not only admins)");
ok(/listModelKeyStatuses\(auth\.userId\)/.test(route), "the key list shows only the caller's keys");

// No server file may pass a shared workspace id to the secret-reading RPCs.
function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = path.join(dir, n);
    statSync(p).isDirectory() ? walk(p, out) : /\.tsx?$/.test(n) && out.push(p);
  }
  return out;
}
const rpcs = /(get_decrypted_model_key|store_model_key|get_default_model_key|get_decrypted_connector_secret|store_connector_secret|get_decrypted_n8n_connection)/;
for (const f of walk(root)) {
  const s = readFileSync(f, "utf8");
  if (rpcs.test(s)) ok(!/p_workspace_id:\s*DEFAULT_WORKSPACE_ID/.test(s), `${path.relative(root, f)} passes an owner, not the shared workspace, to secret RPCs`);
}
console.log("done");
