const {
  ensureDockerRuntime,
  fs,
  isSupabaseStackRunning,
  logStep,
  readSupabaseStatus,
  resetLocalSupabaseDatabase,
  run,
  startLocalSupabaseStack,
  stopLocalSupabaseStack,
  tmpRoot,
} = require("./utils.cjs");
const {
  startFunctionsServe,
  stopFunctionsServe,
  writeFunctionsServeEnvFile,
} = require("./function-runtime.cjs");

const functionsEnvPath = `${tmpRoot}/test-redeem-e2e-functions.env`;
const servePollIntervalMs = 250;
const serveReadyTimeoutMs = 45_000;

async function waitForRedeemFunctionsReady(status) {
  const deadline = Date.now() + serveReadyTimeoutMs;
  let lastFailure = "No response yet.";

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${status.FUNCTIONS_URL}/redeem-entitlement`, {
        body: JSON.stringify({ codeSuffix: "0000", eventId: "madrona-music-2026" }),
        headers: {
          Authorization: `Bearer ${status.PUBLISHABLE_KEY}`,
          "Content-Type": "application/json",
          apikey: status.PUBLISHABLE_KEY,
          origin: "http://127.0.0.1:4173",
        },
        method: "POST",
      });

      if ([401, 403].includes(response.status)) {
        return;
      }

      lastFailure = `Unexpected status: ${response.status}`;
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolve) => setTimeout(resolve, servePollIntervalMs));
  }

  throw new Error(
    `Timed out waiting for redeem-entitlement to become ready in local functions runtime. Last failure: ${lastFailure}`,
  );
}

async function main() {
  let startedLocalStack = false;
  let functionsRuntime = null;

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

    writeFunctionsServeEnvFile(functionsEnvPath, {
      allowedOrigins: ["http://127.0.0.1:4173", "http://localhost:4173"],
      sessionSigningSecret: "local-redeem-e2e-session-secret",
    });

    logStep("Starting local Edge Functions runtime");
    functionsRuntime = startFunctionsServe(functionsEnvPath);

    logStep("Waiting for redeem function runtime");
    await waitForRedeemFunctionsReady(status);

    logStep("Running redeem Playwright e2e suite");
    run("npx", ["playwright", "test", "-c", "playwright.redeem.config.ts"], {
      env: {
        TEST_SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
        TEST_SUPABASE_URL: status.API_URL,
        VITE_ENABLE_LOCAL_PROTOTYPE_FALLBACK: "false",
        VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY: status.PUBLISHABLE_KEY,
        VITE_SUPABASE_URL: status.API_URL,
      },
    });
  } finally {
    if (functionsRuntime) {
      logStep("Stopping local Edge Functions runtime");
      await stopFunctionsServe(functionsRuntime.child);
      fs.rmSync(functionsEnvPath, { force: true });
    }

    if (startedLocalStack) {
      stopLocalSupabaseStack();
    }
  }
}

main().catch((error) => {
  console.error(`\nLocal redeem e2e validation failed.\n${error.message}`);
  process.exit(1);
});
