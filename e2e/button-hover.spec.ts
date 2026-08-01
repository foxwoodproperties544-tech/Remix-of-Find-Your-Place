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

/**
 * Chrome reports oklch()/color-mix() verbatim, so every colour is normalised
 * to sRGB by painting it onto a 1x1 canvas and reading the pixel back.
 */
const NORMALISER = `(() => {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d");
  return (value) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return "rgb(" + r + ", " + g + ", " + b + ")";
  };
})()`;

/** Resolved token colours (rgb strings) for the current theme. */
async function tokens(page: Page) {
  return page.evaluate(`(() => {
    const toRgb = ${NORMALISER};
    const cs = getComputedStyle(document.documentElement);
    const v = (name) => toRgb(cs.getPropertyValue(name).trim());
    return {
      secondary: v("--secondary"),
      secondaryForeground: v("--secondary-foreground"),
      primary: v("--primary"),
      primaryForeground: v("--primary-foreground"),
    };
  })()`) as Promise<Record<"secondary" | "secondaryForeground" | "primary" | "primaryForeground", string>>;
}

async function styleOf(el: Locator) {
  return el.evaluate((node) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d")!;
    const toRgb = (value: string) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "#000";
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return `rgb(${r}, ${g}, ${b})`;
    };
    const s = getComputedStyle(node as Element);
    let rawBg = s.backgroundColor;
    let walker = (node as Element).parentElement;
    while ((rawBg === "rgba(0, 0, 0, 0)" || rawBg === "transparent") && walker) {
      rawBg = getComputedStyle(walker).backgroundColor;
      walker = walker.parentElement;
    }
    return {
      color: toRgb(s.color),
      background: toRgb(rawBg),
      rawBackground: s.backgroundColor,
      outlineColor: toRgb(s.outlineColor),
      outlineWidth: s.outlineWidth,
      boxShadow: s.boxShadow,
    };
  });
}

/** Dismiss the cookie banner so it never intercepts clicks/hovers. */
async function dismissConsent(page: Page) {
  const accept = page.getByRole("button", { name: /accept all/i });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click().catch(() => {});
    await page.waitForTimeout(200);
  }
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
      // Keyboard focus (not programmatic) is what triggers :focus-visible.
      await page.keyboard.press("Tab");
      for (let i = 0; i < 40; i++) {
        if (await btn.evaluate((el) => el === document.activeElement)) break;
        await page.keyboard.press("Tab");
      }
      await expect(btn).toBeFocused();
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
      await dismissConsent(page);
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
      await dismissConsent(page);
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
      await expect(nav).toBeVisible();
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
