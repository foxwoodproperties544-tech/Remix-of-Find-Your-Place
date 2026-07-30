/**
 * Header More dropdown: keyboard/ARIA support and About Us navigation.
 *
 * Run with:
 *   BASE_URL=http://localhost:8080 bunx playwright test e2e/header-more-dropdown.spec.ts
 */
import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:8080";

test.describe("Header More dropdown — About Us", () => {
  test("desktop: opens More dropdown via keyboard and navigates to About Us", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.setViewportSize({ width: 1440, height: 900 });

    const moreButton = page.getByRole("button", { name: /^More$/ });
    await expect(moreButton).toBeVisible();
    await expect(moreButton).toHaveAttribute("aria-haspopup", "menu");
    await expect(moreButton).toHaveAttribute("aria-expanded", "false");

    // Keyboard users open the menu with ArrowDown; the first item is focused.
    await moreButton.focus();
    await moreButton.press("ArrowDown");
    await expect(moreButton).toHaveAttribute("aria-expanded", "true");
    await expect(moreButton).toHaveAttribute("aria-controls", "more-menu");

    const aboutLink = page.getByRole("menuitem", { name: /About Us/i }).first();
    await expect(aboutLink).toBeVisible();
    await expect(aboutLink).toBeFocused();
    await aboutLink.click();

    await page.waitForURL(/\/about-us$/);
    expect(new URL(page.url()).pathname).toBe("/about-us");
    await expect(page.getByRole("heading", { name: /About Us/i, level: 1 })).toBeVisible();
  });

  test("keyboard: cycles through More items and closes with Escape", async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.setViewportSize({ width: 1440, height: 900 });

    const moreButton = page.getByRole("button", { name: /^More$/ });
    await moreButton.focus();
    await moreButton.press("ArrowDown");

    const aboutLink = page.getByRole("menuitem", { name: /About Us/i }).first();
    await expect(aboutLink).toBeFocused();

    await aboutLink.press("ArrowDown");
    const listingPackages = page.getByRole("menuitem", { name: /Listing Packages/i }).first();
    await expect(listingPackages).toBeFocused();

    await listingPackages.press("Escape");
    await expect(moreButton).toHaveAttribute("aria-expanded", "false");
    await expect(moreButton).toBeFocused();
  });

  test("mobile: About Us appears inside the More accordion and links correctly", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/`);

    const menuButton = page.getByRole("button", { name: /Toggle menu/i });
    await menuButton.click();

    const moreAccordion = page.getByRole("button", { name: /^More$/ }).first();
    await expect(moreAccordion).toBeVisible();
    await expect(moreAccordion).toHaveAttribute("aria-expanded", "false");
    await moreAccordion.click();
    await expect(moreAccordion).toHaveAttribute("aria-expanded", "true");

    const aboutLink = page.getByRole("link", { name: /About Us/i }).first();
    await expect(aboutLink).toBeVisible();
    await aboutLink.click();

    await page.waitForURL(/\/about-us$/);
    expect(new URL(page.url()).pathname).toBe("/about-us");
    await expect(page.getByRole("heading", { name: /About Us/i, level: 1 })).toBeVisible();
  });
});

