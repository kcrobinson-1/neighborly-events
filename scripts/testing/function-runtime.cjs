const { spawn } = require("node:child_process");
const path = require("node:path");

const { fs, getSupabaseCommandInvocation, repoRoot } = require("./utils.cjs");

const serveShutdownTimeoutMs = 5_000;

function writeFunctionsServeEnvFile(envFilePath, { allowedOrigins, sessionSigningSecret }) {
  fs.mkdirSync(path.dirname(envFilePath), { recursive: true });

  // The local Edge Functions runtime injects the reserved SUPABASE_* values
  // itself, so the env file only needs the repo-owned trust configuration.
  fs.writeFileSync(
    envFilePath,
    [
      `SESSION_SIGNING_SECRET=${sessionSigningSecret}`,
      // EXTRA_ALLOWED_ORIGINS is additive on top of the in-code
      // defaultAllowedOrigins set (which already includes the
      // localhost dev origins these tests use), so duplicate values
      // are harmless. Kept here so individual e2e scripts can pin
      // their own origin list explicitly without depending on the
      // exact contents of the in-code defaults.
      `EXTRA_ALLOWED_ORIGINS=${allowedOrigins.join(",")}`,
      "",
    ].join("\n"),
  );
}

function startFunctionsServe(envFilePath) {
  const supabase = getSupabaseCommandInvocation();
  const child = spawn(
    supabase.command,
    [...supabase.prefixArgs, "functions", "serve", "--env-file", envFilePath],
    {
      cwd: repoRoot,
      detached: process.platform !== "win32",
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  let output = "";

  const appendOutput = (chunk) => {
    output += chunk.toString();
  };

  child.stdout.on("data", appendOutput);
  child.stderr.on("data", appendOutput);

  return {
    child,
    getOutput() {
      return output.trim();
    },
  };
}

function signalFunctionsServe(serveProcess, signal) {
  if (!serveProcess || serveProcess.exitCode !== null) {
    return;
  }

  try {
    if (process.platform !== "win32" && serveProcess.pid) {
      process.kill(-serveProcess.pid, signal);
      return;
    }
  } catch {
    // Fall back to signaling the direct child process below.
  }

  try {
    serveProcess.kill(signal);
  } catch {
    // Ignore already-exited processes during shutdown cleanup.
  }
}

async function stopFunctionsServe(serveProcess) {
  if (!serveProcess || serveProcess.killed || serveProcess.exitCode !== null) {
    return;
  }

  const closed = new Promise((resolve) => {
    serveProcess.once("close", resolve);
  });

  signalFunctionsServe(serveProcess, "SIGTERM");

  const timedClose = Promise.race([
    closed,
    new Promise((resolve) => setTimeout(resolve, serveShutdownTimeoutMs)),
  ]);

  await timedClose;

  if (serveProcess.exitCode !== null) {
    return;
  }

  signalFunctionsServe(serveProcess, "SIGKILL");
  serveProcess.stdout?.destroy();
  serveProcess.stderr?.destroy();

  await Promise.race([
    closed,
    new Promise((resolve) => setTimeout(resolve, 1_000)),
  ]);
}

module.exports = {
  startFunctionsServe,
  stopFunctionsServe,
  writeFunctionsServeEnvFile,
};
