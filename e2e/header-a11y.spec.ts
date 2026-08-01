/**
 * Accessibility checks for the header navigation dropdowns.
 *
 * Run with:
 *   bunx playwright test e2e/header-a11y.spec.ts
 */
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const MENUS = [
  { trigger: /^Property Requests$/, menuId: "requests-menu" },
  { trigger: /^Agents$/, menuId: "agents-menu" },
  { trigger: /^More$/, menuId: "more-menu" },
];

test.describe("Header dropdown accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
  });

  for (const { trigger, menuId } of MENUS) {
    test(`${menuId}: no serious axe violations while open`, async ({ page }) => {
      const button = page.getByRole("button", { name: trigger }).first();
      await button.focus();
      await button.press("ArrowDown");
      await expect(page.locator(`#${menuId}`)).toBeVisible();

      const results = await new AxeBuilder({ page })
        .include("header")
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const blocking = results.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? "")
      );
      expect(
        blocking,
        blocking.map((v) => `${v.id}: ${v.help}`).join("\n")
      ).toEqual([]);
    });

    test(`${menuId}: exposes ARIA wiring and traps Tab focus`, async ({ page }) => {
      const button = page.getByRole("button", { name: trigger }).first();
      await expect(button).toHaveAttribute("aria-haspopup", "menu");
      await expect(button).toHaveAttribute("aria-expanded", "false");

      await button.focus();
      await button.press("ArrowDown");
      await expect(button).toHaveAttribute("aria-expanded", "true");
      await expect(button).toHaveAttribute("aria-controls", menuId);

      const menu = page.locator(`#${menuId}`);
      await expect(menu).toHaveAttribute("aria-labelledby", `${menuId.replace("-menu", "-button")}`);

      const items = menu.getByRole("menuitem");
      const count = await items.count();
      expect(count).toBeGreaterThan(0);
      await expect(items.first()).toBeFocused();

      // Tab cycles through [trigger, ...items] and never leaves the menu.
      const ringSize = count + 1;
      for (let i = 0; i < ringSize + 1; i++) {
        await page.keyboard.press("Tab");
        const inside = await page.evaluate((id) => {
          const el = document.activeElement;
          const m = document.getElementById(id);
          const t = document.getElementById(id.replace("-menu", "-button"));
          return !!el && (!!m?.contains(el) || el === t);
        }, menuId);
        expect(inside).toBe(true);
      }

      // Shift+Tab stays trapped too.
      for (let i = 0; i < ringSize; i++) {
        await page.keyboard.press("Shift+Tab");
        const inside = await page.evaluate((id) => {
          const el = document.activeElement;
          const m = document.getElementById(id);
          const t = document.getElementById(id.replace("-menu", "-button"));
          return !!el && (!!m?.contains(el) || el === t);
        }, menuId);
        expect(inside).toBe(true);
      }

      // Escape closes and restores focus to the trigger.
      await page.keyboard.press("Escape");
      await expect(button).toHaveAttribute("aria-expanded", "false");
      await expect(button).toBeFocused();
    });
  }
});
