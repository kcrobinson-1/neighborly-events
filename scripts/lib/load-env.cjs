// Tiny zero-dep `.env`-file loader used by scripts under scripts/release/
// and scripts/testing/ that previously required env vars to be exported
// in the operator's shell. The loader is opt-in per script (each calls
// `loadEnv()` once near the top) and is a no-op when:
//
//   - the file does not exist (the CI default — `.env*` is gitignored), or
//   - a key it would set is already present in `process.env` (so a
//     workflow's `env:` injection always wins over an on-disk file).
//
// The companion `assertProdGuard()` helper prints a one-line banner and a
// short pause when a script is about to write to a non-local Supabase
// host. It auto-skips the pause in CI and non-TTY contexts so workflow
// runs are not slowed down.

const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_ENV_FILE = path.join(__dirname, "..", ".env");

function parseEnvFile(contents) {
  const entries = {};
  const lines = contents.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const equalsIndex = line.indexOf("=");
    if (equalsIndex <= 0) {
      continue;
    }

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    // Strip a single layer of matching surrounding quotes. We do not
    // attempt to interpret `\n` or other escape sequences — that's
    // beyond what these scripts need and would complicate auditing.
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
}

function loadEnv({ envPath = DEFAULT_ENV_FILE, override = false } = {}) {
  if (!fs.existsSync(envPath)) {
    return { loaded: false, path: envPath, applied: [] };
  }

  const contents = fs.readFileSync(envPath, "utf8");
  const entries = parseEnvFile(contents);
  const applied = [];

  for (const [key, value] of Object.entries(entries)) {
    if (!override && Object.prototype.hasOwnProperty.call(process.env, key)) {
      continue;
    }
    process.env[key] = value;
    applied.push(key);
  }

  return { loaded: true, path: envPath, applied };
}

// Returns true when the host portion of a Supabase URL points at a local
// dev stack (Supabase CLI defaults to 127.0.0.1:54321).
function isLocalSupabaseUrl(url) {
  if (!url) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "localhost" ||
      parsed.hostname.endsWith(".local")
    );
  } catch {
    return false;
  }
}

function shouldSkipPause({ env = process.env, stream = process.stdout } = {}) {
  if (env.CI === "true" || env.CI === "1") {
    return true;
  }
  if (process.argv.includes("--yes") || process.argv.includes("-y")) {
    return true;
  }
  if (stream && typeof stream.isTTY === "boolean" && !stream.isTTY) {
    return true;
  }
  return false;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Prints a one-line banner when any of the named URL env vars resolves
// to a non-local Supabase host, and (unless skipped) waits `sleepMs` so
// the operator has a moment to ctrl-C. CI runs always skip the pause.
async function assertProdGuard({
  envNames = ["TEST_SUPABASE_URL"],
  sleepMs = 5000,
  stream = process.stderr,
  scriptLabel = path.basename(process.argv[1] || "script"),
} = {}) {
  const prodHits = [];
  for (const name of envNames) {
    const value = process.env[name];
    if (value && !isLocalSupabaseUrl(value)) {
      prodHits.push({ name, value });
    }
  }

  if (prodHits.length === 0) {
    return { triggered: false, paused: false };
  }

  const summary = prodHits
    .map((hit) => `${hit.name}=${hit.value}`)
    .join(" ");
  stream.write(
    `\n⚠ [${scriptLabel}] writing to PROD: ${summary}\n`,
  );

  if (shouldSkipPause()) {
    return { triggered: true, paused: false };
  }

  stream.write(
    `  ctrl-C within ${Math.round(sleepMs / 1000)}s to abort, or pass --yes to skip this pause.\n\n`,
  );
  await sleep(sleepMs);
  return { triggered: true, paused: true };
}

module.exports = {
  DEFAULT_ENV_FILE,
  assertProdGuard,
  isLocalSupabaseUrl,
  loadEnv,
  parseEnvFile,
  shouldSkipPause,
};
