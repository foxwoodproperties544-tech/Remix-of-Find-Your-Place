import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES = ["/auth", "/contact", "/mortgage", "/properties"];
const FIELD_SELECTOR =
  "input:not([type=hidden]):not([type=checkbox]):not([type=radio]),textarea,select";

/** Relative luminance of a computed colour resolved to rgb() by the browser. */
function luminance(rgb: string): number | null {
  const m = rgb.match(/[\d.]+/g);
  if (!m || m.length < 3) return null;
  const [r, g, b] = m.slice(0, 3).map((v) => Number(v) / 255);
  const f = (u: number) => (u <= 0.03928 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

for (const theme of ["light", "dark"] as const) {
  for (const path of PAGES) {
    test(`${theme} ${path}: field tint keeps AA text contrast`, async ({ page }) => {
      await page.goto(path);
      if (theme === "dark") {
        await page.evaluate(() => document.documentElement.classList.add("dark"));
      }
      const colors = await page.evaluate((sel) => {
        const ctx = document.createElement("canvas").getContext("2d")!;
        const to = (v: string) => {
          ctx.fillStyle = "#000";
          ctx.fillStyle = v;
          return ctx.fillStyle as string;
        };
        return [...document.querySelectorAll(sel)].map((e) => {
          const s = getComputedStyle(e as HTMLElement);
          return { bg: to(s.backgroundColor), fg: to(s.color) };
        });
      }, FIELD_SELECTOR);

      for (const { bg, fg } of colors) {
        const hexToRgb = (h: string) =>
          h.startsWith("#")
            ? `rgb(${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)})`
            : h;
        const l1 = luminance(hexToRgb(bg));
        const l2 = luminance(hexToRgb(fg));
        if (l1 == null || l2 == null) continue;
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        expect(ratio, `contrast for field ${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
      }
    });

    test(`${theme} ${path}: focus state is visible and announced`, async ({ page }) => {
      await page.goto(path);
      if (theme === "dark") {
        await page.evaluate(() => document.documentElement.classList.add("dark"));
      }
      const field = page.locator(FIELD_SELECTOR).first();
      if ((await field.count()) === 0) test.skip();
      await field.focus();
      const state = await field.evaluate((e) => {
        const s = getComputedStyle(e as HTMLElement);
        const el = e as HTMLElement;
        return {
          ring: s.boxShadow !== "none",
          named:
            !!el.getAttribute("aria-label") ||
            !!el.getAttribute("aria-labelledby") ||
            !!el.closest("label") ||
            (!!el.id && !!document.querySelector(`label[for="${el.id}"]`)) ||
            !!el.getAttribute("placeholder"),
        };
      });
      expect(state.ring).toBe(true);
      expect(state.named).toBe(true);
    });

    test(`${theme} ${path}: no serious axe violations on form controls`, async ({ page }) => {
      await page.goto(path);
      if (theme === "dark") {
        await page.evaluate(() => document.documentElement.classList.add("dark"));
      }
      const results = await new AxeBuilder({ page })
        .withRules(["label", "select-name", "aria-input-field-name", "form-field-multiple-labels"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
}

test("visual regression: form fields on the sign-in page", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.locator("form").first()).toHaveScreenshot("auth-form-light.png", {
    maxDiffPixelRatio: 0.02,
  });
});
