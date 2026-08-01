import { defineConfig, devices } from "@playwright/test";

/**
 * CI-friendly Playwright config.
 *
 * By default we use Playwright's own bundled Chromium (installed via
 * `npx playwright install --with-deps chromium`), so nothing depends on a
 * sandbox-specific binary path. If you need to point at a system Chromium,
 * set PLAYWRIGHT_CHROMIUM_PATH explicitly.
 */
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
const baseURL = process.env.BASE_URL ?? "http://localhost:8080";
const reuseServer = !process.env.CI && !process.env.BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["line"]] : "line",
  use: {
    baseURL,
    trace: "on-first-retry",
    launchOptions: chromiumPath ? { executablePath: chromiumPath } : {},
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --port 8080",
        url: "http://localhost:8080",
        reuseExistingServer: reuseServer,
        timeout: 180_000,
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
