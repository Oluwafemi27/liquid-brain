import { expect, test } from "@playwright/test";

// Pages anyone can open without signing in. Signed-in pages need real accounts, so they are
// covered by the BrowserStack/manual checklist in docs/TESTING.md instead.
const PAGES = ["/", "/billing", "/connectors"];

test("health route answers and leaks no secrets", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(JSON.stringify(body)).not.toMatch(/sk_|eyJ|dsn|token/i);
});

for (const path of PAGES) {
  test(`${path} loads without errors or sideways scrolling`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const res = await page.goto(path, { waitUntil: "networkidle" });
    expect(res?.status(), "page status").toBeLessThan(400);
    await expect(page.locator("body")).not.toBeEmpty();
    // Content must fit the screen width (the #1 mobile bug).
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, "horizontal overflow in px").toBeLessThanOrEqual(1);
    expect(errors, "uncaught browser errors").toEqual([]);
  });
}
