import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "pnpm --filter api dev",
      env: {
        API_CORS_ORIGINS: "http://127.0.0.1:3000,http://localhost:3000",
      },
      reuseExistingServer: true,
      timeout: 30_000,
      url: "http://127.0.0.1:4000/health",
    },
    {
      command:
        "API_URL=http://127.0.0.1:4000 NEXT_PUBLIC_API_URL=http://127.0.0.1:4000 pnpm --filter web build && API_URL=http://127.0.0.1:4000 NEXT_PUBLIC_API_URL=http://127.0.0.1:4000 pnpm --filter web start --hostname 127.0.0.1 --port 3000",
      reuseExistingServer: true,
      timeout: 90_000,
      url: "http://127.0.0.1:3000",
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
