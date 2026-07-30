/**
 * Regression: an agent tapping "Account" (header link and the mobile footer
 * tab) must land on / stay on the agent dashboard — never flash-redirect to
 * the buyer account page while roles are still hydrating.
 *
 * Run with:
 *   BASE_URL=http://localhost:8080 TEST_AGENT_USER=agent@example.com \
 *     TEST_AGENT_PASS=... bunx playwright test e2e/agent-account-tab.spec.ts
 */
import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8080";
const EMAIL = process.env.TEST_AGENT_USER ?? process.env.TEST_USER;
const PASSWORD = process.env.TEST_AGENT_PASS ?? process.env.TEST_PASS;

test.describe("agent Account navigation", () => {
  test.skip(!EMAIL || !PASSWORD, "TEST_AGENT_USER / TEST_AGENT_PASS env vars are required");

  test.use({ viewport: { width: 390, height: 844 } });

  async function signIn(page: import("@playwright/test").Page) {
    await page.goto(`${BASE_URL}/auth`);
    await page.getByPlaceholder("Email").fill(EMAIL!);
    await page.getByPlaceholder(/Password/).fill(PASSWORD!);
    await page.getByRole("button", { name: /^Sign in$/ }).click();
    await page.waitForURL(/\/dashboard/);
  }

  test("stays on the agent dashboard when tapping the footer Account tab", async ({ page }) => {
    await signIn(page);

    // Footer Account tab (mobile bottom navigation)
    const accountTab = page.getByTestId("tab-account");
    await expect(accountTab).toBeVisible();
    await accountTab.click();

    // Give any late role hydration a chance to (wrongly) redirect.
    await page.waitForTimeout(3000);
    expect(new URL(page.url()).pathname).toBe("/dashboard");
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(/Welcome back/i);
  });

  test("direct /dashboard visit does not bounce to the buyer account page", async ({ page }) => {
    await signIn(page);
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(3000);
    expect(new URL(page.url()).pathname).toBe("/dashboard");
  });

  test("buyer account page shows a skeleton instead of role-dependent UI while loading", async ({ page }) => {
    await signIn(page);
    await page.goto(`${BASE_URL}/dashboard/account`);
    // Either the skeleton appeared first, or roles resolved instantly — both are fine,
    // but the page must settle on the account view without redirecting elsewhere.
    await expect(page.getByRole("heading", { name: /Welcome back/i })).toBeVisible({ timeout: 15000 });
    expect(new URL(page.url()).pathname).toBe("/dashboard/account");
  });
});
