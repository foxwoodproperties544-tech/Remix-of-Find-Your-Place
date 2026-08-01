/**
 * Visual regression: white hover text + primary active-page background.
 *
 * Snapshots the button harness (resting + hovered + focused) and the header
 * navigation (active page, hovered link) in light and dark themes so any
 * regression in the hover/active colour contract is caught visually.
 *
 * Run with:
 *   BASE_URL=http://localhost:8080 bunx playwright test e2e/hover-active-visual.spec.ts
 *   (add --update-snapshots the first time to record baselines)
 */
import { test, expect, type Page } from "@playwright/test";

const THEMES = ["light", "dark"] as const;

async function setTheme(page: Page, theme: (typeof THEMES)[number]) {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
  }, theme);
  await page.waitForTimeout(150);
}

/** Dismiss the cookie banner so it never covers the snapshot area. */
async function dismissConsent(page: Page) {
  const accept = page.getByRole("button", { name: /accept all/i });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click().catch(() => {});
    await page.waitForTimeout(200);
  }
}

async function calmPage(page: Page) {
  // Freeze animations/transitions so snapshots are deterministic.
  await page.addStyleTag({
    content: `*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }`,
  });
}

for (const theme of THEMES) {
  test.describe(`hover/active visual regression (${theme})`, () => {
    test(`button variants: resting, hovered and focused (${theme})`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto("/dev/buttons", { waitUntil: "domcontentloaded" });
      await setTheme(page, theme);
      await dismissConsent(page);
      await calmPage(page);
      const row = page.getByTestId("variant-row");
      await row.waitFor();

      await expect(row).toHaveScreenshot(`buttons-resting-${theme}.png`, { maxDiffPixelRatio: 0.02 });

      await page.getByTestId("btn-default").hover();
      await page.waitForTimeout(120);
      await expect(row).toHaveScreenshot(`buttons-hover-default-${theme}.png`, {
        maxDiffPixelRatio: 0.02,
      });

      await page.getByTestId("btn-outline").hover();
      await page.waitForTimeout(120);
      await expect(row).toHaveScreenshot(`buttons-hover-outline-${theme}.png`, {
        maxDiffPixelRatio: 0.02,
      });

      await page.getByTestId("btn-ghost").focus();
      await page.getByTestId("btn-ghost").hover();
      await page.waitForTimeout(120);
      await expect(row).toHaveScreenshot(`buttons-focus-hover-ghost-${theme}.png`, {
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`desktop header: active page + hovered link (${theme})`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto("/blog", { waitUntil: "domcontentloaded" });
      await setTheme(page, theme);
      await dismissConsent(page);
      await calmPage(page);
      const nav = page.getByTestId("primary-nav");
      await nav.waitFor();

      await expect(nav).toHaveScreenshot(`header-nav-active-${theme}.png`, {
        maxDiffPixelRatio: 0.02,
      });

      await nav.locator('a:not([aria-current="page"])').first().hover();
      await page.waitForTimeout(150);
      await expect(nav).toHaveScreenshot(`header-nav-hover-${theme}.png`, {
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`mobile header: active page + hovered link (${theme})`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/blog", { waitUntil: "domcontentloaded" });
      await setTheme(page, theme);
      await dismissConsent(page);
      await calmPage(page);
      const toggle = page.getByRole("button", { name: "Toggle menu" });
      await toggle.waitFor();
      const nav = page.getByTestId("mobile-nav");
      for (let attempt = 0; attempt < 3; attempt++) {
        await toggle.click();
        try {
          await nav.waitFor({ state: "visible", timeout: 3000 });
          break;
        } catch {
          await page.waitForTimeout(600);
        }
      }
      await page.waitForTimeout(150);

      await expect(nav).toHaveScreenshot(`mobile-nav-active-${theme}.png`, {
        maxDiffPixelRatio: 0.02,
      });

      await nav.locator('a:not([aria-current="page"])').first().hover();
      await page.waitForTimeout(150);
      await expect(nav).toHaveScreenshot(`mobile-nav-hover-${theme}.png`, {
        maxDiffPixelRatio: 0.02,
      });
    });
  });
}
