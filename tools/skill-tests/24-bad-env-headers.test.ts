import { buildCsp, safeOrigin, withSecurityHeaders } from "@/lib/security-headers";

const ok = (c: unknown, m: string) => {
  if (!c) {
    console.error("FAIL", m);
    process.exit(1);
  }
  console.log("ok  ", m);
};

ok(safeOrigin("https://abc.supabase.co/") === "https://abc.supabase.co", "a normal address is read");
ok(safeOrigin(" abc.supabase.co ") === "https://abc.supabase.co", "a missing https:// and stray spaces are tolerated");
ok(safeOrigin('"https://abc.supabase.co"') === "https://abc.supabase.co", "quotes pasted into the setting are tolerated");
ok(safeOrigin("") === undefined && safeOrigin(undefined) === undefined, "empty is simply unset");
ok(safeOrigin("not a url at all ::") === undefined, "junk is ignored instead of throwing");

for (const bad of ["abc.supabase.co", "::::", " ", "ftp://x"]) {
  let threw = false;
  try {
    buildCsp({ SUPABASE_URL: bad, NODE_ENV: "production" });
  } catch {
    threw = true;
  }
  ok(!threw, `buildCsp never throws for SUPABASE_URL=${JSON.stringify(bad)}`);
}
const res = withSecurityHeaders(new Response("hi"), new Request("https://aduf.me/"), {
  SUPABASE_URL: "::::",
  NODE_ENV: "production",
});
ok(res.status === 200 && Boolean(res.headers.get("content-security-policy")), "a bad setting still serves the page with protection on");
console.log("done");
