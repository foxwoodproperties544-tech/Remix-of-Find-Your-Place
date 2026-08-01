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
      // Painted backgrounds can come from absolutely positioned overlays
      // (e.g. the teal footer band), so sample the real rendered pixel behind
      // each field instead of walking computed ancestor backgrounds.
      const fields = page.locator(FIELD_SELECTOR);
      const count = await fields.count();
      const colors: { bg: string; fg: string }[] = [];

      for (let i = 0; i < count; i++) {
        const field = fields.nth(i);
        if (!(await field.isVisible().catch(() => false))) continue;
        const shot = (await field.screenshot().catch(() => null)) as Buffer | null;
        if (!shot) continue;
        const measured = await page.evaluate(
          async ({ b64, sel, index }) => {
            const blob = await (await fetch(`data:image/png;base64,${b64}`)).blob();
            const bitmap = await createImageBitmap(blob);
            const canvas = document.createElement("canvas");
            canvas.width = bitmap.width;
            canvas.height = bitmap.height;
            const ctx = canvas.getContext("2d")!;
            ctx.drawImage(bitmap, 0, 0);
            // A few px inside the border is background, never glyph pixels.
            const x = Math.min(6, canvas.width - 1);
            const y = Math.round(canvas.height / 2);
            const d = ctx.getImageData(x, y, 1, 1).data;
            const back: [number, number, number] = [d[0], d[1], d[2]];

            const el = [...document.querySelectorAll(sel)][index] as HTMLElement;
            const probe = document.createElement("canvas");
            probe.width = probe.height = 1;
            const pctx = probe.getContext("2d")!;
            pctx.clearRect(0, 0, 1, 1);
            pctx.fillStyle = "#000";
            pctx.fillStyle = getComputedStyle(el).color;
            pctx.fillRect(0, 0, 1, 1);
            const c = pctx.getImageData(0, 0, 1, 1).data;
            const a = c[3] / 255;
            const blend = (v: number, bk: number) => Math.round(v * a + bk * (1 - a));
            return {
              bg: `rgb(${back[0]}, ${back[1]}, ${back[2]})`,
              fg: `rgb(${blend(c[0], back[0])}, ${blend(c[1], back[1])}, ${blend(c[2], back[2])})`,
            };
          },
          { b64: shot.toString("base64"), sel: FIELD_SELECTOR, index: i }
        );
        colors.push(measured);
      }

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
