import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 90000,
  expect: {
    timeout: 15000,
  },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    headless: true,
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "node Backend/src/server.js",
      url: "http://localhost:5000/health",
      reuseExistingServer: true,
      timeout: 60000,
    },
    {
      command: "cmd /c \"cd Frontend && npm run dev\"",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 60000,
    },
  ],
});
