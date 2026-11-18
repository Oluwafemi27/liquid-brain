import { createServer } from "node:net";
import JSZip from "jszip";
import { builtinScan, listZipEntries, scanFile, scanMediaPiece, scanWithClamd } from "@/lib/server/file-scan";
import { discardImmediately, expiresAt, fileTtlHours, largeFileBytes, purgeExpiredFiles } from "@/lib/server/file-retention";
import { _setKv, createMemoryKv, createRedisKv, getKv, hashKey } from "@/lib/server/kv";
import { sharedRetryAfter, withRateLimit, _resetRateLimits } from "@/lib/server/rate-limit";

const ok = (c: unknown, m: string) => { if (!c) { console.error("FAIL", m); process.exit(1); } console.log("ok  ", m); };
const u8 = (s: string) => new Uint8Array(Buffer.from(s, "latin1"));
const zipOf = async (files: Record<string, string | Uint8Array>) => {
  const z = new JSZip();
  for (const [n, c] of Object.entries(files)) z.file(n, c);
  return new Uint8Array(await z.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
};
const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";
const pdf = (extra = "") => u8(`%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n${extra}\ntrailer<</Root 1 0 R>>\n%%EOF`);

(async () => {
  // ---- built-in scanner ----
  ok(builtinScan("notes.txt", u8("hello world")) === null, "a plain text file passes");
  ok(builtinScan("report.pdf", pdf()) === null, "a normal PDF passes");
  ok(builtinScan("report.pdf", u8("MZ\x90\x00 this is a program")) !== null, "a Windows program renamed .pdf is blocked");
  ok(builtinScan("photo.jpg", u8("\x7fELF....")) !== null, "a Linux program renamed .jpg is blocked");
  ok(builtinScan("setup.exe", u8("anything")) !== null && builtinScan("run.ps1", u8("x")) !== null, "program and script extensions are blocked");
  ok(builtinScan("invoice.pdf.exe", u8("x")) !== null, "a double extension is still caught");
  ok(builtinScan("virus.txt", u8(EICAR)) !== null, "the EICAR test file is caught");
  ok(builtinScan("fake.pdf", u8("just text")) !== null, "a fake PDF is blocked");
  ok(builtinScan("evil.pdf", pdf("<</S/JavaScript/JS (app.alert(1))>>")) !== null, "a PDF with JavaScript is blocked");
  ok(builtinScan("evil.pdf", pdf("<</S/Launch/Win<</F(cmd.exe)>>>>")) !== null, "a PDF that launches programs is blocked");
  ok(builtinScan("evil.pdf", pdf("/EmbeddedFile")) !== null, "a PDF hiding attached files is blocked");
  ok(builtinScan("pic.png", u8("not an image at all")) !== null, "a fake picture is blocked");
  ok(builtinScan("pic.png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0])) === null, "a real PNG header passes");
  ok(builtinScan("page.html", u8("<html><script>alert(1)</script></html>")) !== null, "HTML with scripts is blocked");
  ok(builtinScan("art.svg", u8('<svg onload="x()"></svg>')) !== null, "SVG with scripts is blocked");
  ok(builtinScan("script.sh", u8("#!/bin/bash\necho hi")) === null, "a shell script is accepted as text to read (never run)");

  const docx = await zipOf({ "[Content_Types].xml": "<x/>", "word/document.xml": "<w>hello</w>" });
  ok(builtinScan("a.docx", docx) === null, "a normal docx passes");
  ok(builtinScan("a.docx", await zipOf({ "word/document.xml": "<w/>", "word/vbaProject.bin": "macro" })) !== null, "a docx with macros is blocked");
  ok(builtinScan("a.docx", await zipOf({ "word/document.xml": "<w/>", "word/embeddings/oleObject1.bin": "equation" })) === null, "a docx with a harmless equation object still passes");
  ok(builtinScan("a.zip", await zipOf({ "ok.txt": "x", "tool.exe": "x" })) !== null, "an archive containing a program is blocked");
  ok(builtinScan("a.zip", await zipOf({ "../../etc/passwd": "x" })) !== null, "an archive with path tricks is blocked");
  ok(builtinScan("a.docx", u8("this is not a zip")) !== null, "a docx that isn't a zip is blocked");
  const bomb = await zipOf({ "big.txt": new Uint8Array(80 * 1024 * 1024) });
  ok(bomb.byteLength < 500_000 && builtinScan("data.zip", bomb) !== null, "a zip bomb (80 MB squeezed into a few KB) is blocked");
  const hidden = await zipOf({ "x.txt": "hello" });
  ok(builtinScan("renamed.txt", hidden) === null, "an innocent archive under another name passes");
  const evilHidden = await zipOf({ "tool.exe": "x" });
  ok(builtinScan("notes.txt", evilHidden) !== null, "a zip with a program, disguised as .txt, is blocked");
  const locked = Buffer.from(await zipOf({ "s.txt": "secret" }));
  for (let i = 0; i < locked.length - 4; i++) if (locked.readUInt32LE(i) === 0x02014b50) { locked.writeUInt16LE(locked.readUInt16LE(i + 8) | 1, i + 8); break; }
  ok(builtinScan("locked.zip", new Uint8Array(locked)) !== null, "a password-protected zip is blocked (can't be checked)");
  ok((listZipEntries(docx) ?? []).some((e) => e.name === "word/document.xml") && listZipEntries(u8("nope")) === null, "zip table of contents is read without unpacking");

  ok(scanMediaPiece("jpeg", new Uint8Array([0xff, 0xd8, 0xff, 0xe0])) === null, "a real JPEG frame passes");
  ok(scanMediaPiece("jpeg", u8("MZ....")) !== null && scanMediaPiece("jpeg", u8("hello")) !== null, "a program or non-picture posing as a video frame is blocked");
  ok(scanMediaPiece("audio", u8("RIFF....WAVE")) === null && scanMediaPiece("audio", u8("#!/bin/sh")) !== null && scanMediaPiece("audio", u8("<html>")) !== null, "audio chunks: real audio passes, scripts and pages are blocked");

  // ---- engines (ClamAV protocol against a fake daemon, VirusTotal fingerprint) ----
  let received = 0;
  const fake = createServer((sock) => {
    const chunks: Buffer[] = [];
    sock.on("data", (d) => {
      chunks.push(d);
      const all = Buffer.concat(chunks);
      if (all.subarray(0, 10).toString() !== "zINSTREAM\0") return;
      let p = 10, total = 0;
      while (p + 4 <= all.length) { const n = all.readUInt32BE(p); p += 4; if (n === 0) { received = total; const infected = all.toString("latin1").includes("EICAR-STANDARD") ; sock.end(infected ? "stream: Eicar-Signature FOUND\0" : "stream: OK\0"); return; } p += n; total += n; }
    });
  });
  await new Promise<void>((r) => fake.listen(0, "127.0.0.1", () => r()));
  const port = (fake.address() as { port: number }).port;
  const big = new Uint8Array(300_000).fill(65);
  const r1 = await scanWithClamd(big, "127.0.0.1", port);
  ok(!r1.infected && received === 300_000, "ClamAV protocol: a 300 KB file streams in chunks and comes back OK");
  const r2 = await scanWithClamd(u8("zzz " + EICAR), "127.0.0.1", port);
  ok(r2.infected && r2.signature === "Eicar-Signature", "ClamAV protocol: a FOUND answer names the signature");
  const env = { CLAMAV_HOST: "127.0.0.1", CLAMAV_PORT: String(port) };
  const s1 = await scanFile("notes.txt", u8("hello"), { env });
  ok(s1.verdict === "clean" && s1.engines.join() === "built-in,ClamAV", "a clean file is scanned by the built-in checks and ClamAV");
  const s2 = await scanFile("x.bin", u8("...EICAR-STANDARD...pad"), { env, clamd: async () => ({ infected: true, signature: "Win.Test.X" }) });
  ok(s2.verdict === "blocked" && /Win\.Test\.X/.test(s2.reason ?? ""), "ClamAV detections block the file with the reason");
  const down = await scanFile("notes.txt", u8("hello"), { env: { CLAMAV_HOST: "127.0.0.1", CLAMAV_PORT: "1" } });
  ok(down.verdict === "blocked" && /isn't reachable/.test(down.reason ?? ""), "scanner down: the file is refused (fails safe)");
  const open = await scanFile("notes.txt", u8("hello"), { env: { CLAMAV_HOST: "127.0.0.1", CLAMAV_PORT: "1", SCAN_FAIL_OPEN: "true" } });
  ok(open.verdict === "clean" && open.warnings.length === 1, "fail-open mode lets it through with a warning");
  const vt = await scanFile("a.txt", u8("hello"), { env: { VIRUSTOTAL_API_KEY: "k" }, virusTotal: async () => ({ malicious: 9, known: true }) });
  ok(vt.verdict === "blocked", "VirusTotal flagging the fingerprint blocks the file");
  const vtErr = await scanFile("a.txt", u8("hello"), { env: { VIRUSTOTAL_API_KEY: "k" }, virusTotal: async () => { throw new Error("429"); } });
  ok(vtErr.verdict === "clean" && vtErr.warnings.length === 1, "a VirusTotal outage doesn't block uploads (the hash lookup is a bonus layer)");
  const none = await scanFile("a.txt", u8("hello"), { env: {} });
  ok(none.verdict === "clean" && none.engines.join() === "built-in", "with no extra engines the built-in scan still always runs");
  fake.close();

  // ---- retention rules ----
  ok(fileTtlHours({}) === 23 && fileTtlHours({ ATTACHMENT_TTL_HOURS: "6" }) === 6 && fileTtlHours({ ATTACHMENT_TTL_HOURS: "72" }) === 24 && fileTtlHours({ ATTACHMENT_TTL_HOURS: "x" }) === 23, "file lifetime defaults to 23h and can never exceed 24h");
  const t0 = Date.UTC(2026, 0, 1);
  ok(new Date(expiresAt(t0, {})).getTime() - t0 === 23 * 3_600_000, "expiry time is created + 23 hours");
  ok(largeFileBytes({}) === 8 * 1024 * 1024, "'large' defaults to 8 MB");
  ok(discardImmediately("video", 1, {}) && discardImmediately("audio", 1, {}) && discardImmediately("document", 9 * 1024 * 1024, {}) && !discardImmediately("document", 1024, {}) && !discardImmediately("image", 2 * 1024 * 1024, {}), "video, audio and big files are discarded right away; small documents and images wait for the 24h limit");
  const purged = await purgeExpiredFiles();
  ok(purged.files === 0 && purged.errors === 0, "purge is a safe no-op when no database is configured");

  // ---- kv: memory ----
  let clock = 1000;
  const mem = createMemoryKv(() => clock);
  await mem.set("a", { n: 1 }, 10);
  ok((await mem.get<{ n: number }>("a"))?.n === 1, "memory store: set and get");
  clock += 11_000;
  ok((await mem.get("a")) === null, "memory store: values expire");
  ok((await mem.incr("c", 5)) === 1 && (await mem.incr("c", 5)) === 2, "memory store: counters count up");
  clock += 6_000;
  ok((await mem.incr("c", 5)) === 1, "memory store: counters reset after their window");

  // ---- kv: Redis with fake client, outage and recovery ----
  const data = new Map<string, string>();
  let broken = false;
  const calls: string[] = [];
  const fakeRedis = {
    get: async (k: string) => { calls.push("get"); if (broken) throw new Error("down"); return data.get(k) ?? null; },
    set: async (k: string, v: string, _m: "EX", ttl: number) => { calls.push(`set ${ttl}`); if (broken) throw new Error("down"); data.set(k, v); },
    del: async (k: string) => { if (broken) throw new Error("down"); data.delete(k); },
    eval: async (_s: string, _n: number, k: string) => { if (broken) throw new Error("down"); const n = Number(data.get(k) ?? 0) + 1; data.set(k, String(n)); return n; },
    on: () => undefined,
  };
  let rclock = 0;
  const redis = createRedisKv(fakeRedis, createMemoryKv(() => rclock), () => rclock);
  await redis.set("tok", { id: "u1" }, 45);
  ok(data.get("tok") === '{"id":"u1"}' && (await redis.get<{ id: string }>("tok"))?.id === "u1" && calls.includes("set 45"), "Redis store: values are shared as JSON with an expiry");
  ok((await redis.incr("rl", 60)) === 1 && (await redis.incr("rl", 60)) === 2, "Redis store: counters are shared");
  broken = true;
  await redis.set("x", 1, 10);
  ok((await redis.get<number>("x")) === 1, "Redis outage: the app keeps working from memory");
  const before = calls.length;
  await redis.get("x"); await redis.get("x");
  ok(calls.length === before, "after a failure Redis isn't hammered for 10 seconds");
  broken = false; rclock += 11_000;
  await redis.set("y", 2, 10);
  ok(data.has("y"), "Redis is used again after the pause");
  ok(hashKey("secret-token") !== "secret-token" && hashKey("a") !== hashKey("b") && hashKey("a").length === 32, "tokens are hashed before they touch Redis");
  ok((await getKv({})).kind === "memory", "no REDIS_URL means the in-memory store");

  // ---- shared rate limit across servers ----
  _setKv(createRedisKv(fakeRedis, createMemoryKv(), Date.now));
  data.clear();
  const cfg = { limit: 3, windowMs: 60_000 };
  const T = 1_700_000_000_000;
  const results: number[] = [];
  for (let i = 0; i < 5; i++) results.push(await sharedRetryAfter("chat:u1", cfg, T));
  ok(results.slice(0, 3).every((r) => r === 0) && results[3]! >= 1 && results[4]! >= 1, "shared limit: the 4th request in a minute is refused no matter which server it hits");
  ok((await sharedRetryAfter("chat:u2", cfg, T)) === 0, "shared limit: other people are unaffected");
  _resetRateLimits();
  data.clear();
  let ran = 0;
  const outcomes: number[] = [];
  for (let i = 0; i < 5; i++) outcomes.push((await withRateLimit("k:u9", { limit: 3, windowMs: 60_000 }, async () => { ran++; return new Response("x"); })).status);
  ok(ran === 3 && outcomes.join() === "200,200,200,429,429", "withRateLimit enforces the shared limit and frees slots");
  _setKv(null);

  console.log("done");
})();
