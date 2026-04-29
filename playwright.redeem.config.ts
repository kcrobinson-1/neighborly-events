import { defineConfig, devices } from "@playwright/test";

const baseUrl = "http://127.0.0.1:4173";
const readyUrl = `${baseUrl}/__auth-e2e-ready`;

export default defineConfig({
  outputDir: "tmp/playwright/test-results-redeem",
  projects: [
    {
      name: "mobile-chromium-redeem",
      use: {
        browserName: "chromium",
        ...devices["iPhone 13"],
      },
    },
  ],
  reporter: "list",
  testDir: "./tests/e2e",
  testMatch: "**/mobile-smoke.redeem.spec.ts",
  use: {
    baseURL: baseUrl,
    trace: "on-first-retry",
  },
  webServer: {
    command: "node scripts/testing/run-auth-e2e-dev-server.cjs",
    env: {
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
        process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
        "",
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "",
      VITE_ENABLE_LOCAL_PROTOTYPE_FALLBACK: "false",
      VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY:
        process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? "",
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? "",
    },
    reuseExistingServer: false,
    timeout: 120_000,
    url: readyUrl,
  },
});
