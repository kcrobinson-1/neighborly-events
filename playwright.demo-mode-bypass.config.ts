import { defineConfig, devices } from "@playwright/test";

const baseUrl = "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/demo-mode-bypass.spec.ts",
  outputDir: "tmp/playwright/test-results-demo-mode-bypass",
  reporter: "list",
  use: {
    baseURL: baseUrl,
    trace: "on-first-retry",
  },
  webServer: {
    // The bypass branches do not require a live backend — Playwright
    // route mocks intercept the read-demo-event call. The fake but
    // syntactically valid Supabase URL + publishable key satisfy the
    // useAuthSession() config-status check so the auth state machine
    // reaches "signed_out" instead of falling into the
    // missing_config branch (the bypass branch is gated on
    // sessionState.status === "signed_out").
    command: "npm run dev:web:test",
    env: {
      VITE_ENABLE_LOCAL_PROTOTYPE_FALLBACK: "false",
      VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY: "demo-mode-bypass-fake-key",
      VITE_SUPABASE_URL: "https://demo-mode-bypass.supabase.invalid",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: baseUrl,
  },
  projects: [
    {
      name: "mobile-chromium-demo-mode-bypass",
      use: {
        browserName: "chromium",
        ...devices["iPhone 13"],
      },
    },
  ],
});
