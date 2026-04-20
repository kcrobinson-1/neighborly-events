const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const tmpRoot = path.join(repoRoot, "tmp");
const miseTomlPath = path.join(repoRoot, "mise.toml");

function readSupabaseCliPinFromMiseToml() {
  try {
    const content = fs.readFileSync(miseTomlPath, "utf8");
    const envSectionMatch = content.match(/\[env\]([\s\S]*?)(?:\n\[|$)/);

    if (!envSectionMatch) {
      return null;
    }

    const versionMatch = envSectionMatch[1].match(
      /SUPABASE_CLI_VERSION\s*=\s*"([^"]+)"/,
    );

    return versionMatch ? versionMatch[1] : null;
  } catch {
    return null;
  }
}

function resolveSupabaseCommand() {
  const localCli = spawnSync("supabase", ["--version"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "ignore",
  });

  if (!localCli.error && localCli.status === 0) {
    return {
      command: "supabase",
      prefixArgs: [],
    };
  }

  const pinnedVersion = readSupabaseCliPinFromMiseToml();
  return {
    command: "npx",
    prefixArgs: pinnedVersion ? [`supabase@${pinnedVersion}`] : ["supabase"],
  };
}

const supabaseCommand = resolveSupabaseCommand();

function formatCommand(command, args) {
  return [command, ...args].join(" ");
}

function run(command, args, options = {}) {
  const {
    capture = false,
    check = true,
    env,
    input,
  } = options;

  let stdio = "inherit";
  if (capture) {
    stdio = ["ignore", "pipe", "pipe"];
  } else if (input !== undefined) {
    stdio = ["pipe", "inherit", "inherit"];
  }

  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    input,
    env: env ? { ...process.env, ...env } : process.env,
    stdio,
  });

  if (result.error) {
    throw new Error(`Failed to run \`${formatCommand(command, args)}\`: ${result.error.message}`);
  }

  if (check && result.status !== 0) {
    const stderr = capture ? `\n${result.stderr ?? ""}` : "";
    throw new Error(`Command failed: \`${formatCommand(command, args)}\`${stderr}`.trim());
  }

  return result;
}

function runSupabase(args, options = {}) {
  return run(supabaseCommand.command, [...supabaseCommand.prefixArgs, ...args], options);
}

function logStep(message) {
  console.log(`\n[local-tests] ${message}`);
}

function ensureCommandAvailable(command, versionArgs, missingMessage) {
  const result = spawnSync(command, versionArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "ignore",
  });

  if (result.error) {
    throw new Error(missingMessage);
  }
}

function ensureDenoAvailable() {
  ensureCommandAvailable(
    "deno",
    ["--version"],
    "Deno is not installed. Install Deno so the Edge Function checks can run locally.",
  );
}

function ensureDockerRuntime() {
  ensureCommandAvailable(
    "docker",
    ["--version"],
    "A Docker API-compatible runtime is required for local Supabase tests. Install and run Docker Desktop, OrbStack, Rancher Desktop, or Podman before running `npm run test:db`.",
  );

  const dockerInfo = run("docker", ["info"], {
    capture: true,
    check: false,
  });

  if (dockerInfo.status !== 0) {
    throw new Error(
      "Docker is installed but the daemon is not available. Start your local Docker runtime before running Supabase database tests.",
    );
  }
}

function hasPlaywrightChromium() {
  const result = run("npx", ["playwright", "install", "--list"], {
    capture: true,
    check: false,
  });

  return result.status === 0 && /chromium-\d+/.test(result.stdout ?? "");
}

function parseSupabaseStatusOutput(output) {
  const trimmedOutput = output?.trim() ?? "";

  if (!trimmedOutput) {
    return null;
  }

  const match = trimmedOutput.match(/\{[\s\S]*\}$/);

  if (!match) {
    throw new Error("Supabase status output did not include the expected JSON payload.");
  }

  return normalizeSupabaseStatus(JSON.parse(match[0]));
}

function normalizeSupabaseStatus(status) {
  if (!status || typeof status !== "object") {
    return status;
  }

  if (!status.FUNCTIONS_URL && typeof status.API_URL === "string") {
    return {
      ...status,
      FUNCTIONS_URL: `${status.API_URL.replace(/\/$/, "")}/functions/v1`,
    };
  }

  return status;
}

function readSupabaseStatus() {
  const result = runSupabase(["status", "-o", "json"], {
    capture: true,
    check: false,
  });

  if (result.status !== 0) {
    return null;
  }

  return parseSupabaseStatusOutput(result.stdout);
}

function isSupabaseStackRunning() {
  return readSupabaseStatus() !== null;
}

function startLocalSupabaseStack() {
  try {
    logStep("Starting local Supabase stack");
    runSupabase(["start"]);
    return true;
  } catch {
    logStep("Cleaning up a partial local Supabase stack before retry");
    runSupabase(["stop"], { check: false });

    logStep("Retrying local Supabase startup");
    runSupabase(["start"]);
    return true;
  }
}

function resetLocalSupabaseDatabase() {
  logStep("Resetting local Supabase database to current migrations");

  try {
    runSupabase(["db", "reset", "--local", "--no-seed"], {
      input: "y\n",
    });
  } catch {
    // CI occasionally flakes here while the storage API is still settling after
    // container restart. Recover by restarting the local stack once, then retry.
    logStep("Local Supabase reset failed; restarting stack before one retry");
    runSupabase(["stop"], { check: false });
    runSupabase(["start"]);
    runSupabase(["db", "reset", "--local", "--no-seed"], {
      input: "y\n",
    });
  }
}

function stopLocalSupabaseStack() {
  logStep("Stopping local Supabase stack");
  runSupabase(["stop"], {
    check: false,
  });
}

module.exports = {
  ensureCommandAvailable,
  ensureDenoAvailable,
  ensureDockerRuntime,
  formatCommand,
  fs,
  hasPlaywrightChromium,
  isSupabaseStackRunning,
  parseSupabaseStatusOutput,
  readSupabaseStatus,
  resetLocalSupabaseDatabase,
  logStep,
  repoRoot,
  run,
  runSupabase,
  startLocalSupabaseStack,
  stopLocalSupabaseStack,
  tmpRoot,
};
