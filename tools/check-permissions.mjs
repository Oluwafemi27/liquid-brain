// Fails if the plain-language permissions catalog (what users are told ADUF can access) drifts from
// the scopes actually requested in lib/server/oauth-providers.ts. Run: npm run check:permissions
import { readFileSync } from "node:fs";

const providers = readFileSync("src/lib/server/oauth-providers.ts", "utf8");
const catalog = readFileSync("src/lib/permissions-catalog.ts", "utf8");
const requested = {};
for (const m of providers.matchAll(/^ {2}(\w+): \{[\s\S]*?\n {4}scope:\s*"([^"]*)"/gm)) requested[m[1]] = m[2];
// Google connectors share one provider block ("google") with per-product scopes.
const googleScopes = [...providers.matchAll(/https:\/\/www\.googleapis\.com\/auth\/[\w.]+/g)].map((m) => m[0]);

let bad = 0;
for (const m of catalog.matchAll(/scopes: \[([^\]]*)\]/g)) {
  for (const s of m[1].matchAll(/"([^"]+)"/g)) {
    const scope = s[1];
    const found = scope.startsWith("https://www.googleapis.com/") ? googleScopes.includes(scope) : Object.values(requested).some((r) => r.includes(scope.split(",")[0]));
    if (!found) { console.error(`Catalog lists a scope that isn't requested: ${scope}`); bad++; }
  }
}
// And the reverse for Google: every requested Google scope must be described.
for (const s of googleScopes) if (!catalog.includes(s)) { console.error(`Requested but not described to users: ${s}`); bad++; }
if (bad) process.exit(1);
console.log("permissions catalog matches requested scopes");
