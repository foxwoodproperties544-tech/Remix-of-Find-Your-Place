import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "fs";

// Use a system-installed Chromium when available (e.g. this sandbox), otherwise
// fall back to Playwright's bundled browser.
const systemChromium = existsSync("/bin/chromium") ? "/bin/chromium" : undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "line",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:8080",
    trace: "on-first-retry",
    launchOptions: {
      executablePath: systemChromium,
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
