#!/usr/bin/env node

// Runs scripts/db/permissions-snapshot.sql against the local Supabase
// Postgres container and writes the result to shared/db/permissions.snapshot.md.
//
// The snapshot is the committed answer to "what RLS state, grants,
// policies, function SECURITY mode, and function EXECUTE grants are
// in force on `public.X` today" per the contract in
// docs/plans/db-permissions-snapshot.md. Determinism (CCI-2) and
// coverage (CCI-1) are owned by the SQL file; this wrapper is the
// transport.
//
// Runs psql inside the supabase_db container because the local dev
// environment doesn't ship a host psql; the supabase Docker stack
// always does, and `npm run test:db` already requires the same
// runtime so the dependency footprint matches.

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const {
  ensureDockerRuntime,
  isSupabaseStackRunning,
  logStep,
  repoRoot,
} = require("../testing/utils.cjs");

const sqlPath = path.join(__dirname, "permissions-snapshot.sql");
const outPath = path.join(repoRoot, "shared", "db", "permissions.snapshot.md");

function readProjectId() {
  const configPath = path.join(repoRoot, "supabase", "config.toml");
  const content = fs.readFileSync(configPath, "utf8");
  const match = content.match(/^\s*project_id\s*=\s*"([^"]+)"/m);
  if (!match) {
    throw new Error(
      `Could not find project_id in ${configPath}; expected a top-level project_id = "<name>" line.`,
    );
  }
  return match[1];
}

function main() {
  logStep("Checking Docker runtime for local Supabase");
  ensureDockerRuntime();

  if (!isSupabaseStackRunning()) {
    throw new Error(
      "Local Supabase stack is not running. Start it with `supabase start` or run `npm run test:db` once before regenerating the snapshot.",
    );
  }

  const projectId = readProjectId();
  const container = `supabase_db_${projectId}`;

  logStep(`Running permissions-snapshot.sql in container ${container}`);

  const sql = fs.readFileSync(sqlPath, "utf8");
  const result = spawnSync(
    "docker",
    [
      "exec",
      "-i",
      container,
      "psql",
      "-U",
      "postgres",
      "-d",
      "postgres",
      "--quiet",
      "--no-psqlrc",
      "-v",
      "ON_ERROR_STOP=1",
      "-f",
      "-",
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      input: sql,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );

  if (result.error) {
    throw new Error(
      `Failed to run docker exec psql: ${result.error.message}`,
    );
  }

  if (result.status !== 0) {
    throw new Error(
      `psql exited with status ${result.status}\n${result.stderr ?? ""}`.trim(),
    );
  }

  // psql with -f - emits an extra trailing newline beyond the
  // SETOF text output; we preserve whatever the server emits but
  // strip any psql-side artifacts that are not part of the markdown.
  let output = result.stdout;
  if (!output.endsWith("\n")) {
    output += "\n";
  }

  fs.writeFileSync(outPath, output);
  logStep(`Wrote ${path.relative(repoRoot, outPath)}`);
}

try {
  main();
} catch (error) {
  console.error(`\nPermissions snapshot generation failed.\n${error.message}`);
  process.exit(1);
}
