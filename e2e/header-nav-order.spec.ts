import { test, expect, type Page } from "@playwright/test";

const EXPECTED = [
  "Buy",
  "Rent",
  "Lease",
  "Airbnbs",
  "Property Requests",
  "Agents",
  "More",
  "Blog",
  "Contact Us",
];

/** The consent banner can cover the header until dismissed. */
async function dismissConsent(page: Page) {
  const accept = page.getByRole("button", { name: /accept all/i });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click().catch(() => {});
    await page.waitForTimeout(200);
  }
}

/** Clicks until the target becomes visible (first click can precede hydration). */
async function openUntilVisible(page: Page, trigger: Page["locator"] extends never ? never : ReturnType<Page["locator"]>, target: ReturnType<Page["locator"]>) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await trigger.click();
    try {
      await target.waitFor({ state: "visible", timeout: 3000 });
      return;
    } catch {
      await page.waitForTimeout(600);
    }
  }
  await expect(target).toBeVisible();
}

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
  }, theme);
}

for (const theme of ["light", "dark"] as const) {
  test(`desktop header menu renders in the correct order (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await setTheme(page, theme);
    const items = page.locator('[data-testid="primary-nav"] [data-nav-item]');
    await expect(items).toHaveCount(EXPECTED.length);
    expect(await items.evaluateAll((els) => els.map((e) => e.getAttribute("data-nav-item")))).toEqual(EXPECTED);
  });

  test(`mobile header menu uses the same order (${theme})`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await setTheme(page, theme);
    await dismissConsent(page);
    const toggle = page.getByRole("button", { name: "Toggle menu" });
    await toggle.waitFor();
    const items = page.locator('[data-testid="mobile-nav"] [data-mobile-nav-item]');
    await openUntilVisible(page, toggle, items.first());
    expect(await items.evaluateAll((els) => els.map((e) => e.getAttribute("data-mobile-nav-item")))).toEqual(EXPECTED);
  });
}

test("submenus open, trap focus and close with the keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await dismissConsent(page);

  for (const id of ["requests", "agents", "more"]) {
    const trigger = page.locator(`#${id}-button`);
    await trigger.waitFor();
    const menu = page.locator(`#${id}-menu`);

    // ArrowDown opens the menu and moves focus to the first item. Retry: the
    // first key press can land before hydration attaches the handler.
    for (let attempt = 0; attempt < 3; attempt++) {
      await trigger.focus();
      await page.keyboard.press("ArrowDown");
      try {
        await menu.waitFor({ state: "visible", timeout: 3000 });
        break;
      } catch {
        await page.waitForTimeout(600);
      }
    }
    await expect(menu).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const focusedInMenu = await page.evaluate(
      (mid) => !!document.getElementById(mid)?.contains(document.activeElement),
      `${id}-menu`
    );
    expect(focusedInMenu).toBe(true);

    // Tab is trapped inside the open menu.
    await page.keyboard.press("Tab");
    const stillInside = await page.evaluate((mid) => {
      const m = document.getElementById(mid);
      const t = document.getElementById(mid.replace("-menu", "-button"));
      return !!(m?.contains(document.activeElement) || t === document.activeElement);
    }, `${id}-menu`);
    expect(stillInside).toBe(true);

    // Escape closes it and restores focus to the trigger.
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  }
});

test("current page is highlighted in the main menu", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/blog");
  const blog = page.locator('[data-testid="primary-nav"] [data-nav-item="Blog"]');
  await expect(blog).toHaveAttribute("aria-current", "page");
  await expect(blog).toHaveClass(/text-primary/);
});
