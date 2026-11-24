import { readFileSync } from "node:fs";
import path from "node:path";

const ok = (c: unknown, m: string) => {
  if (!c) {
    console.error("FAIL", m);
    process.exit(1);
  }
  console.log("ok  ", m);
};

const html = readFileSync(path.join(process.cwd(), "src/content/portfolio.html"), "utf8");
const route = readFileSync(path.join(process.cwd(), "src/routes/portfolio.ts"), "utf8");
const embeds = [
  ...html.matchAll(/<iframe[^>]*src="https:\/\/www\.youtube-nocookie\.com\/embed\/([\w-]{11})/g),
].map((m) => m[1]);
ok(embeds.length === 8 && new Set(embeds).size === 8, "all 8 videos are on-page players");
ok(!/href="[^"]*(youtu\.be|youtube\.com)/.test(html), "no link sends a visitor to YouTube");
ok(route.includes("frame-src https://www.youtube-nocookie.com"), "the page policy lets players load");
console.log("done");
