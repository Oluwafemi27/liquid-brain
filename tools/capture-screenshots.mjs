// Captures the README screenshots from a running copy of ADUF using the "Continue as demo" button,
// so no personal account or data is ever shown.
//   node tools/capture-screenshots.mjs https://liquid-brain.vercel.app
// Needs Playwright's Chromium (`npx playwright install chromium`). Output: docs/screenshots/*.jpg
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const base = (process.argv[2] ?? "http://127.0.0.1:4173").replace(/\/$/, "");
const out = new URL("../docs/screenshots/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });

const pages = [
  ["brain", "/"],
  ["goals", "/goals"],
  ["automations", "/automations"],
  ["memory", "/memory"],
  ["analytics", "/analytics"],
  ["schedule", "/schedule"],
  ["settings", "/settings"],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
const page = await ctx.newPage();
await page.goto(base, { waitUntil: "networkidle" });
await page.getByRole("button", { name: /continue as demo/i }).first().click();
await page.waitForSelector("text=/demo/i", { timeout: 30_000 });
await page.waitForTimeout(4000);

for (const [name, path] of pages) {
  await page.goto(base + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(3500); // let charts and the 3D scene settle
  await page.screenshot({ path: `${out}${name}.jpg`, type: "jpeg", quality: 85 });
  console.log("saved", name);
}
await browser.close();
