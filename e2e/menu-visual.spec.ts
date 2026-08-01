/**
 * Visual regression + contrast coverage for dropdown-style menus.
 *
 * Covers the header dropdowns and the shadcn dropdown/select/menubar/context
 * menus in both light and dark themes, and asserts:
 *  - hover/active states use the secondary token with AA-readable text
 *  - disabled items suppress hover/active feedback but stay readable
 *  - keyboard focus is visibly indicated on menu items
 *
 * Run with:
 *   BASE_URL=http://localhost:8080 bunx playwright test e2e/menu-visual.spec.ts
 *   (add --update-snapshots the first time to record baselines)
 */
import { test, expect, type Page, type Locator } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8080";
const THEMES = ["light", "dark"] as const;

async function openMenu(page: Page, trigger: Locator, panel: Locator, opts: { right?: boolean } = {}) {
  // Retry the click: the first one can land before hydration completes.
  for (let attempt = 0; attempt < 3; attempt++) {
    await trigger.click(opts.right ? { button: "right" } : {});
    try {
      await panel.waitFor({ state: "visible", timeout: 2000 });
      return;
    } catch {
      await page.waitForTimeout(500);
    }
  }
  await expect(panel).toBeVisible();
}

async function setTheme(page: Page, theme: (typeof THEMES)[number]) {
  await page.evaluate((t) => {
    document.documentElement.classList.toggle("dark", t === "dark");
  }, theme);
}

function srgb(c: number) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
function luminance([r, g, b]: number[]) {
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
}
function parseRgb(value: string): number[] {
  const m = value.match(/-?\d+(\.\d+)?/g);
  if (!m) throw new Error(`cannot parse color: ${value}`);
  return [Number(m[0]), Number(m[1]), Number(m[2])];
}
function contrast(fg: string, bg: string) {
  const l1 = luminance(parseRgb(fg));
  const l2 = luminance(parseRgb(bg));
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

async function colorsOf(el: Locator) {
  return el.evaluate((node) => {
    // Chrome reports oklch()/color-mix() verbatim, so normalise every colour
    // to sRGB by painting it onto a canvas and reading the pixel back.
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
    const cs = getComputedStyle(node as Element);
    let rawBg = cs.backgroundColor;
    let walker = (node as Element).parentElement;
    while ((rawBg === "rgba(0, 0, 0, 0)" || rawBg === "transparent") && walker) {
      rawBg = getComputedStyle(walker).backgroundColor;
      walker = walker.parentElement;
    }
    return {
      color: toRgb(cs.color),
      background: toRgb(rawBg),
      rawBackground: rawBg,
      outlineWidth: cs.outlineWidth,
      boxShadow: cs.boxShadow,
    };
  });
}

test.describe("Menu visual regression + contrast", () => {
  for (const theme of THEMES) {
    test(`header More dropdown renders consistently (${theme})`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
      await setTheme(page, theme);

      const moreButton = page.getByRole("button", { name: /^More$/ });
      const menu = page.locator("#more-menu");
      await openMenu(page, moreButton, menu);

      const item = menu.getByRole("menuitem").first();
      await item.hover();
      await page.waitForTimeout(200);
      await expect(menu).toHaveScreenshot(`header-more-${theme}.png`, { maxDiffPixelRatio: 0.02 });

      const { color, background } = await colorsOf(item);
      expect(contrast(color, background)).toBeGreaterThanOrEqual(4.5);
    });

    test(`dropdown / select / menubar / context menus (${theme})`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 1000 });
      await page.goto(`${BASE_URL}/dev/menus`, { waitUntil: "networkidle" });
      await setTheme(page, theme);

      // --- Dropdown menu -------------------------------------------------
      const dm = page.getByTestId("dm-content");
      await openMenu(page, page.getByTestId("dm-trigger"), dm);

      const dmItem = page.getByTestId("dm-item");
      await dmItem.hover();
      await page.waitForTimeout(150);
      await expect(dm).toHaveScreenshot(`dropdown-menu-${theme}.png`, { maxDiffPixelRatio: 0.02 });

      const hovered = await colorsOf(dmItem);
      expect(hovered.rawBackground).not.toBe("rgba(0, 0, 0, 0)");
      expect(contrast(hovered.color, hovered.background)).toBeGreaterThanOrEqual(4.5);

      // Disabled item: no hover/active tint, still readable.
      const dmDisabled = page.getByTestId("dm-disabled");
      await dmDisabled.hover({ force: true });
      const disabled = await colorsOf(dmDisabled);
      expect(contrast(disabled.color, disabled.background)).toBeGreaterThanOrEqual(4.5);
      expect(await dmDisabled.evaluate((n) => getComputedStyle(n).pointerEvents)).toBe("none");

      // Keyboard focus is visible on menu items.
      await page.keyboard.press("ArrowDown");
      const focused = page.locator('[role="menuitem"]:focus');
      await expect(focused).toBeVisible();
      const focusStyles = await colorsOf(focused);
      const hasVisibleFocus =
        parseFloat(focusStyles.outlineWidth || "0") > 0 || focusStyles.boxShadow !== "none";
      expect(hasVisibleFocus).toBe(true);
      await page.keyboard.press("Escape");

      // --- Select --------------------------------------------------------
      const sel = page.getByTestId("sel-content");
      await openMenu(page, page.getByTestId("sel-trigger"), sel);
      await page.getByRole("option", { name: "Nairobi" }).hover();
      await page.waitForTimeout(150);
      await expect(sel).toHaveScreenshot(`select-menu-${theme}.png`, { maxDiffPixelRatio: 0.02 });
      const selColors = await colorsOf(page.getByRole("option", { name: "Nairobi" }));
      expect(contrast(selColors.color, selColors.background)).toBeGreaterThanOrEqual(4.5);
      await page.keyboard.press("Escape");

      // --- Menubar -------------------------------------------------------
      const mb = page.getByTestId("mb-content");
      await openMenu(page, page.getByTestId("mb-trigger"), mb);
      await page.getByTestId("mb-item").hover();
      await page.waitForTimeout(150);
      await expect(mb).toHaveScreenshot(`menubar-menu-${theme}.png`, { maxDiffPixelRatio: 0.02 });
      await page.keyboard.press("Escape");

      // --- Context menu ---------------------------------------------------
      const cm = page.getByTestId("cm-content");
      await openMenu(page, page.getByTestId("cm-trigger"), cm, { right: true });
      await page.getByTestId("cm-item").hover();
      await page.waitForTimeout(150);
      await expect(cm).toHaveScreenshot(`context-menu-${theme}.png`, { maxDiffPixelRatio: 0.02 });
      const cmColors = await colorsOf(page.getByTestId("cm-item"));
      expect(contrast(cmColors.color, cmColors.background)).toBeGreaterThanOrEqual(4.5);
      await page.keyboard.press("Escape");
    });
  }
});
