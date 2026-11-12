// Runs every tools/skill-tests/*.test.ts: bundles it with esbuild (stubbing the database, the model API and the
// server-only guard) and executes it in Node. esbuild is fetched on demand with npx (it is not a project dependency). Usage: node tools/run-skill-tests.mjs   (exit code 1 on any failure)
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "tools/skill-tests");
const tests = readdirSync(dir).filter((f) => f.endsWith(".test.ts")).sort();
let failed = 0;
for (const t of tests) {
  const out = path.join(dir, `.${t}.cjs`);
  const alias = {
    "@/lib/server/supabase": path.join(dir, "supabase-stub.ts"),
    "@tanstack/react-start/server-only": path.join(dir, "server-only-stub.js"),
    "@": path.join(root, "src"),
  };
  if (t.startsWith("08-")) { delete alias["@/lib/server/supabase"]; alias["@supabase/supabase-js"] = path.join(dir, "supabase-stub.ts"); }
  if (t.startsWith("07-")) alias["@composio/core"] = path.join(dir, "composio-stub.ts");
  if (t.startsWith("04-")) alias["@/lib/server/model-providers"] = path.join(dir, "model-providers-stub.ts");
  const args = ["--yes", "esbuild", path.join(dir, t), "--bundle", "--platform=node", "--format=cjs", `--outfile=${out}`, "--external:@e2b/code-interpreter", ...(t.startsWith("12-") ? ["--external:pdf-parse"] : []), "--log-level=error",
    ...Object.entries(alias).map(([k, v]) => `--alias:${k}=${v}`)];
  const built = spawnSync("npx", args, { encoding: "utf8", cwd: root });
  if (built.status !== 0) { failed++; console.log(`FAIL  ${t}  (build)\n${built.stderr}`); continue; }
  const r = spawnSync("node", [out], { encoding: "utf8", cwd: root });
  rmSync(out, { force: true });
  const lines = (r.stdout ?? "").split("\n").filter((l) => l.startsWith("ok"));
  // A test that ends early (e.g. an unresolved promise lets Node exit 0) must not pass: tests that print "done" must reach it.
  const needsDone = readFileSync(path.join(dir, t), "utf8").includes('console.log("done")');
  const bad = r.status !== 0 || (needsDone && !(r.stdout ?? "").includes("done"));
  if (bad) failed++;
  console.log(`${bad ? "FAIL" : "PASS"}  ${t}  (${lines.length} checks)`);
  if (bad) console.log((r.stdout ?? "").split("\n").filter((l) => !l.startsWith("ok")).join("\n") + (r.stderr ?? ""));
}
process.exit(failed ? 1 : 0);
