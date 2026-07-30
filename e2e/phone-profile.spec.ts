/**
 * End-to-end: sign in, save a phone number on the profile page, reload and
 * confirm the value persisted and the profile shows "Phone number confirmed".
 *
 * Run with:
 *   BASE_URL=http://localhost:8080 TEST_USER=you@example.com TEST_PASS=... \
 *     bunx playwright test e2e/phone-profile.spec.ts
 */
import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8080";
const EMAIL = process.env.TEST_USER;
const PASSWORD = process.env.TEST_PASS;
// Unique-ish Kenyan number so the uniqueness check does not trip on reruns.
const PHONE = process.env.TEST_PHONE ?? "+2547" + String(Date.now()).slice(-8);

test.describe("profile phone number", () => {
  test.skip(!EMAIL || !PASSWORD, "TEST_USER / TEST_PASS env vars are required");

  test("saves a phone number and keeps it verified after refresh", async ({ page }) => {
    // 1. Sign in
    await page.goto(`${BASE_URL}/auth`);
    await page.getByPlaceholder("Email").fill(EMAIL!);
    await page.getByPlaceholder(/Password/).fill(PASSWORD!);
    await page.getByRole("button", { name: /^Sign in$/ }).click();
    await page.waitForURL(/\/dashboard/);

    // 2. Invalid input is rejected client-side
    await page.goto(`${BASE_URL}/dashboard/profile`);
    const input = page.getByLabel("Phone number").first();
    await input.fill("12345");
    await page.getByRole("button", { name: /Save number/ }).click();
    await expect(page.getByRole("alert")).toContainText(/valid phone number/i);

    // 3. Valid input saves and toasts success
    await input.fill(PHONE);
    await page.getByRole("button", { name: /Save number/ }).click();
    await expect(page.getByText(/Phone number saved/i)).toBeVisible({ timeout: 15000 });

    // 4. Reload — value and verified status persist
    await page.reload();
    await expect(page.getByText(PHONE)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText("Phone number confirmed")).toBeVisible();
  });
});
