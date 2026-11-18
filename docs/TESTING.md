# Testing across screens and browsers (Polypane, Playwright, BrowserStack)

- **Unit/logic tests:** `npm test` (all `tools/skill-tests`).
- **Browser smoke tests:** `npm run test:e2e` builds the app, starts it, and opens `/`, `/billing`, `/connectors` at four sizes
  (desktop 1440, tablet 820, phone 390, small phone 320). Fails on uncaught browser errors or sideways scrolling.
  Already have Chromium? `E2E_CHROMIUM_PATH=/path/to/chrome npm run test:e2e`. Otherwise run `npx playwright install chromium` once.
  Test an already-deployed copy: `E2E_BASE_URL=https://your-app npm run test:e2e`.
- **BrowserStack (real browsers/phones):** `npm i -D browserstack-node-sdk`, set `BROWSERSTACK_USERNAME`/`BROWSERSTACK_ACCESS_KEY`,
  edit `browserstack.yml` if you want other devices, then `E2E_BASE_URL=https://your-app npm run test:browserstack`. Not run here (needs your account).
- **Polypane (manual):** open your dev server (`npm run dev`, port 8080) in Polypane and view these panes side by side: 320, 390, 820, 1440.
  Use its overlay for overflow, contrast and accessibility checks. Signed-in pages (chat, suppliers, analytics) need a real login, so check them here by eye.

The smoke tests only cover signed-out pages. Add signed-in checks once you have a test account.
