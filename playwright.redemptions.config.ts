import { defineConfig, devices } from "@playwright/test";

const baseUrl = "http://127.0.0.1:4173";

export default defineConfig({
  outputDir: "tmp/playwright/test-results-redemptions",
  projects: [
    {
      name: "mobile-chromium-redemptions",
      use: {
        browserName: "chromium",
        ...devices["iPhone 13"],
      },
    },
  ],
  reporter: "list",
  testDir: "./tests/e2e",
  testMatch: "**/mobile-smoke.redemptions.spec.ts",
  use: {
    baseURL: baseUrl,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev:web:test",
    env: {
      VITE_ENABLE_LOCAL_PROTOTYPE_FALLBACK: "false",
      VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY:
        process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? "",
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? "",
    },
    reuseExistingServer: false,
    url: baseUrl,
  },
});
