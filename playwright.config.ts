import { defineConfig, devices } from "@playwright/test";

const iphone = devices["iPhone 14"];

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  use: {
    baseURL:
      process.env.BASE_URL ||
      process.env.PLAYWRIGHT_BASE_URL ||
      "http://localhost:3000",
    viewport: iphone.viewport,
    deviceScaleFactor: iphone.deviceScaleFactor,
    isMobile: iphone.isMobile,
    hasTouch: iphone.hasTouch,
    userAgent: iphone.userAgent,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "mobile",
      use: { browserName: "chromium", channel: "chrome" },
    },
  ],
});
