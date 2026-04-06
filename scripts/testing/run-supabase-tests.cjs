const {
  ensureDockerRuntime,
  isSupabaseStackRunning,
  logStep,
  run,
  startLocalSupabaseStack,
  stopLocalSupabaseStack,
} = require("./utils.cjs");

function main() {
  let startedLocalStack = false;

  try {
    logStep("Checking Docker runtime for local Supabase");
    ensureDockerRuntime();

    if (isSupabaseStackRunning()) {
      logStep("Reusing existing local Supabase stack");
    } else {
      startedLocalStack = startLocalSupabaseStack();
    }

    logStep("Running Edge Function integration tests");
    run("npm", ["run", "test:functions:integration"]);

    logStep("Running database tests");
    run("npm", ["run", "test:db"]);
  } finally {
    if (startedLocalStack) {
      stopLocalSupabaseStack();
    }
  }
}

try {
  main();
} catch (error) {
  console.error(`\nLocal Supabase validation failed.\n${error.message}`);
  process.exit(1);
}
