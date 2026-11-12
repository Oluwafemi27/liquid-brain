import { defineConfig, devices } from "@playwright/test";

// Smoke tests that open ADUF in a real browser at the screen sizes people actually use.
// Local run: `npm run test:e2e` (builds the app, starts it, tests it in Chromium).
// BrowserStack run: `npm run test:browserstack` (same tests on real devices; see docs/TESTING.md).
const PORT = Number(process.env["E2E_PORT"] ?? 4173);
const external = process.env["E2E_BASE_URL"]; // test an already-running or deployed copy instead

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: process.env["CI"] ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: external ?? `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    // Optional: use a Chromium you already have instead of downloading one.
    ...(process.env["E2E_CHROMIUM_PATH"] ? { launchOptions: { executablePath: process.env["E2E_CHROMIUM_PATH"] } } : {}),
  },
  // Polypane-style breakpoints: the sizes the test file also loops over.
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 820, height: 1180 }, hasTouch: true } },
    { name: "phone", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
    { name: "small-phone", use: { ...devices["Desktop Chrome"], viewport: { width: 320, height: 640 }, hasTouch: true, isMobile: true } },
  ],
  webServer: external
    ? undefined
    : {
        command: `npm run build:node && PORT=${PORT} node .output/server/index.mjs`,
        url: `http://127.0.0.1:${PORT}/api/health`,
        timeout: 240_000,
        reuseExistingServer: !process.env["CI"],
      },
});
