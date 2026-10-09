import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "pnpm --filter api dev",
      env: {
        API_CORS_ORIGINS: "http://127.0.0.1:3100",
        API_PORT: "4100",
        DATABASE_URL: "postgresql://orbit:orbit@localhost:55432/orbit_test?schema=public",
        JWT_ACCESS_SECRET: "playwright-access-secret-that-is-long-enough",
        JWT_REFRESH_SECRET: "playwright-refresh-secret-that-is-long-enough",
        NODE_ENV: "test",
      },
      reuseExistingServer: false,
      timeout: 30_000,
      url: "http://127.0.0.1:4100/health",
    },
    {
      command:
        "API_URL=http://127.0.0.1:4100 pnpm --filter web build && API_URL=http://127.0.0.1:4100 pnpm --filter web start --hostname 127.0.0.1 --port 3100",
      reuseExistingServer: false,
      timeout: 90_000,
      url: "http://127.0.0.1:3100",
    },
  ],
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } }
          : {}),
      },
    },
  ],
});
