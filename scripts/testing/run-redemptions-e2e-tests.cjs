const {
  ensureDockerRuntime,
  isSupabaseStackRunning,
  logStep,
  readSupabaseStatus,
  resetLocalSupabaseDatabase,
  run,
  startLocalSupabaseStack,
  stopLocalSupabaseStack,
} = require("./utils.cjs");

// B.2a's monitoring page makes no Edge Function calls — the authorization
// probe uses PostgREST RPCs (is_organizer_for_event, is_root_admin), the
// list fetch is a direct PostgREST .select(), and auth callback runs
// through Supabase Auth directly. We deliberately do NOT boot
// `functions serve` here. If a future change introduces an Edge Function
// dependency in this flow, the B.2a plan names it as a stop-and-revisit
// moment rather than silently re-adding the functions runtime.

async function main() {
  let startedLocalStack = false;

  try {
    logStep("Checking Docker runtime for local Supabase");
    ensureDockerRuntime();

    if (isSupabaseStackRunning()) {
      logStep("Reusing existing local Supabase stack");
    } else {
      startedLocalStack = startLocalSupabaseStack();
    }

    if (process.env.NEIGHBORLY_SKIP_DB_RESET !== "1") {
      resetLocalSupabaseDatabase();
    }

    const status = readSupabaseStatus();

    if (!status?.API_URL || !status.PUBLISHABLE_KEY || !status.SERVICE_ROLE_KEY) {
      throw new Error(
        "Local Supabase status did not include API_URL, PUBLISHABLE_KEY, and SERVICE_ROLE_KEY.",
      );
    }

    logStep("Running redemptions Playwright e2e suite");
    run("npx", ["playwright", "test", "-c", "playwright.redemptions.config.ts"], {
      env: {
        TEST_SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
        TEST_SUPABASE_URL: status.API_URL,
        VITE_ENABLE_LOCAL_PROTOTYPE_FALLBACK: "false",
        VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY: status.PUBLISHABLE_KEY,
        VITE_SUPABASE_URL: status.API_URL,
      },
    });
  } finally {
    if (startedLocalStack) {
      stopLocalSupabaseStack();
    }
  }
}

main().catch((error) => {
  console.error(`\nLocal redemptions e2e validation failed.\n${error.message}`);
  process.exit(1);
});
