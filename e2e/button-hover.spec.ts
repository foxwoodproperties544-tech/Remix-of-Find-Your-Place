/**
 * Hover / active / focus colour contract.
 *
 * Asserts, on desktop and mobile viewports and in both themes:
 *  - every Button variant hovers to the secondary (orange) background with
 *    white text
 *  - header nav links (desktop + mobile) hover to secondary with white text
 *  - the active page link paints the primary (teal) background with white text
 *  - focus-visible rings stay readable (>= 3:1) against hover/active
 *    backgrounds
 *
 * Run with:
 *   BASE_URL=http://localhost:8080 bunx playwright test e2e/button-hover.spec.ts
 */
import { test, expect, type Page, type Locator } from "@playwright/test";

const THEMES = ["light", "dark"] as const;
const VARIANTS = ["default", "destructive", "outline", "secondary", "ghost"] as const;

function srgb(c: number) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
function parseRgb(value: string): number[] {
  const m = value.match(/-?\d+(\.\d+)?/g);
  if (!m) throw new Error(`cannot parse color: ${value}`);
  return [Number(m[0]), Number(m[1]), Number(m[2])];
}
function luminance(rgb: number[]) {
  return 0.2126 * srgb(rgb[0]) + 0.7152 * srgb(rgb[1]) + 0.0722 * srgb(rgb[2]);
}
function contrast(a: string, b: string) {
  const l1 = luminance(parseRgb(a));
  const l2 = luminance(parseRgb(b));
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

async function setTheme(page: Page, theme: (typeof THEMES)[number]) {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
  }, theme);
}

/** Resolved token colours (rgb strings) for the current theme. */
async function tokens(page: Page) {
  return page.evaluate(() => {
    const probe = document.createElement("div");
    document.body.appendChild(probe);
    const read = (value: string) => {
      probe.style.color = value;
      const c = getComputedStyle(probe).color;
      return c;
    };
    const out = {
      secondary: read("var(--color-secondary)"),
      secondaryForeground: read("var(--color-secondary-foreground)"),
      primary: read("var(--color-primary)"),
      primaryForeground: read("var(--color-primary-foreground)"),
    };
    probe.remove();
    return out;
  });
}

async function styleOf(el: Locator) {
  return el.evaluate((node) => {
    const s = getComputedStyle(node);
    return {
      color: s.color,
      background: s.backgroundColor,
      outlineColor: s.outlineColor,
      outlineWidth: s.outlineWidth,
      boxShadow: s.boxShadow,
    };
  });
}

function isWhite(color: string) {
  const [r, g, b] = parseRgb(color);
  return r > 245 && g > 245 && b > 245;
}

function near(a: string, b: string, tolerance = 6) {
  const x = parseRgb(a);
  const y = parseRgb(b);
  return x.slice(0, 3).every((v, i) => Math.abs(v - y[i]) <= tolerance);
}

for (const theme of THEMES) {
  test.describe(`button + nav hover colours (${theme})`, () => {
    test(`every button variant hovers to secondary with white text (${theme})`, async ({ page }) => {
      await page.goto("/dev/buttons", { waitUntil: "domcontentloaded" });
      await setTheme(page, theme);
      await page.getByTestId("button-harness").waitFor();
      const t = await tokens(page);

      expect(isWhite(t.secondaryForeground), "secondary-foreground should be white").toBe(true);

      for (const variant of VARIANTS) {
        const btn = page.getByTestId(`btn-${variant}`);
        await btn.hover();
        await page.waitForTimeout(120);
        const s = await styleOf(btn);
        expect(near(s.background, t.secondary), `${variant} hover background`).toBe(true);
        expect(isWhite(s.color), `${variant} hover text should be white`).toBe(true);
        expect(contrast(s.color, s.background)).toBeGreaterThanOrEqual(3);
      }
    });

    test(`disabled buttons keep their resting colours on hover (${theme})`, async ({ page }) => {
      await page.goto("/dev/buttons", { waitUntil: "domcontentloaded" });
      await setTheme(page, theme);
      const t = await tokens(page);
      const btn = page.getByTestId("btn-disabled-default");
      await btn.hover({ force: true });
      await page.waitForTimeout(120);
      const s = await styleOf(btn);
      expect(near(s.background, t.secondary)).toBe(false);
    });

    test(`focus ring stays readable over hover and active backgrounds (${theme})`, async ({ page }) => {
      await page.goto("/dev/buttons", { waitUntil: "domcontentloaded" });
      await setTheme(page, theme);
      const btn = page.getByTestId("btn-default");
      await btn.focus();
      await btn.hover();
      await page.waitForTimeout(120);
      const s = await styleOf(btn);
      expect(parseFloat(s.outlineWidth)).toBeGreaterThanOrEqual(2);
      expect(contrast(s.outlineColor, s.background)).toBeGreaterThanOrEqual(3);
    });

    test(`desktop header: hover is secondary + white, active page is primary + white (${theme})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto("/blog", { waitUntil: "domcontentloaded" });
      await setTheme(page, theme);
      const nav = page.getByTestId("primary-nav");
      await nav.waitFor();
      const t = await tokens(page);

      const active = nav.locator('[aria-current="page"]').first();
      await expect(active).toBeVisible();
      const activeStyle = await styleOf(active);
      expect(near(activeStyle.background, t.primary), "active page background is primary").toBe(true);
      expect(isWhite(activeStyle.color), "active page text is white").toBe(true);
      expect(contrast(activeStyle.color, activeStyle.background)).toBeGreaterThanOrEqual(4.5);

      // Focus ring must stay visible over the teal active background.
      await active.focus();
      const activeFocus = await styleOf(active);
      expect(contrast(activeFocus.outlineColor, activeFocus.background)).toBeGreaterThanOrEqual(3);

      const other = nav.locator('a:not([aria-current="page"])').first();
      await other.hover();
      await page.waitForTimeout(150);
      const hovered = await styleOf(other);
      expect(near(hovered.background, t.secondary), "nav hover background is secondary").toBe(true);
      expect(isWhite(hovered.color), "nav hover text is white").toBe(true);
    });

    test(`mobile header: hover is secondary + white, active page is primary + white (${theme})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/blog", { waitUntil: "domcontentloaded" });
      await setTheme(page, theme);
      await page.getByRole("button", { name: "Toggle menu" }).click();
      const nav = page.getByTestId("mobile-nav");
      await nav.waitFor();
      const t = await tokens(page);

      const active = nav.locator('[aria-current="page"]').first();
      await expect(active).toBeVisible();
      const activeStyle = await styleOf(active);
      expect(near(activeStyle.background, t.primary)).toBe(true);
      expect(isWhite(activeStyle.color)).toBe(true);

      const other = nav.locator('a:not([aria-current="page"])').first();
      await other.hover();
      await page.waitForTimeout(150);
      const hovered = await styleOf(other);
      expect(near(hovered.background, t.secondary)).toBe(true);
      expect(isWhite(hovered.color)).toBe(true);
    });
  });
}
