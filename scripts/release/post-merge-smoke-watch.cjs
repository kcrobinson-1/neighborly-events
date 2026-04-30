"use strict";

const { spawn } = require("node:child_process");

const STAGES = [
  {
    key: "ci",
    workflowName: "CI",
    workflowFile: "ci.yml",
    event: "push",
  },
  {
    key: "release",
    workflowName: "Release",
    workflowFile: "release.yml",
    event: "workflow_run",
  },
  {
    key: "smoke",
    workflowName: "Production Admin Smoke",
    workflowFile: "production-admin-smoke.yml",
    event: "workflow_run",
  },
];

const RUN_JSON_FIELDS = [
  "databaseId",
  "workflowName",
  "event",
  "headBranch",
  "headSha",
  "status",
  "conclusion",
  "createdAt",
  "url",
];

const MIN_GH_VERSION = "2.89.0";
const STAGE_POLL_INTERVAL_MS = 15_000;
const RECENT_RUN_LIMIT = 50;
const DEFAULT_DEADLINE_MINUTES = 45;

const EXIT_OK = 0;
const EXIT_STAGE_FAILED = 1;
const EXIT_DEADLINE = 2;
const EXIT_INVOCATION = 3;

function parseSemver(value) {
  const match = String(value ?? "").match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function meetsMinVersion(actual, min) {
  if (!actual || !min) return false;
  for (let i = 0; i < 3; i += 1) {
    if (actual[i] > min[i]) return true;
    if (actual[i] < min[i]) return false;
  }
  return true;
}

function isEligibleRun(run, stage, mergeSha) {
  return (
    run != null &&
    run.workflowName === stage.workflowName &&
    run.event === stage.event &&
    run.headBranch === "main" &&
    run.headSha === mergeSha
  );
}

function selectStageRun(runs, stage, mergeSha) {
  if (!Array.isArray(runs)) return { kind: "none" };
  const eligible = runs
    .filter((r) => isEligibleRun(r, stage, mergeSha))
    .slice()
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  if (eligible.length === 0) return { kind: "none" };

  const pending = eligible.find((r) => r.status !== "completed");
  if (pending) return { kind: "pending", run: pending };

  const successful = eligible.find((r) => r.conclusion === "success");
  if (successful) return { kind: "success", run: successful };

  return { kind: "failure", run: eligible[0] };
}

function formatProgressLine(stageKey, status, runId) {
  return `[${stageKey}] ${status} (run ${runId})`;
}

function formatSmokeUrlLine(url) {
  return `SMOKE_URL=${url}`;
}

function realRunner(args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn("gh", args, {
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });
    const stdoutChunks = [];
    const stderrChunks = [];
    child.stdout.on("data", (chunk) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk) => stderrChunks.push(chunk));
    child.on("error", (error) => {
      resolve({ stdout: "", stderr: "", exitCode: 127, error: error.message });
    });
    child.on("close", (code) => {
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
        exitCode: code ?? 1,
        error: null,
      });
    });
  });
}

async function ghJsonRunList(runner, args) {
  const result = await runner([
    "run",
    "list",
    ...args,
    "--limit",
    String(RECENT_RUN_LIMIT),
    "--json",
    RUN_JSON_FIELDS.join(","),
  ]);
  if (result.exitCode !== 0) {
    return { ok: false, runs: [], result };
  }
  try {
    const parsed = JSON.parse(result.stdout || "[]");
    return { ok: true, runs: Array.isArray(parsed) ? parsed : [], result };
  } catch (error) {
    return {
      ok: false,
      runs: [],
      result: { ...result, error: `unparseable JSON: ${error.message}` },
    };
  }
}

async function lookupStageRuns(runner, stage, mergeSha) {
  const primary = await ghJsonRunList(runner, [
    "--commit",
    mergeSha,
    "--workflow",
    stage.workflowFile,
  ]);
  if (!primary.ok) return primary;
  const primarySelection = selectStageRun(primary.runs, stage, mergeSha);
  if (primarySelection.kind !== "none") {
    return { ok: true, runs: primary.runs };
  }
  const fallback = await ghJsonRunList(runner, [
    "--workflow",
    stage.workflowFile,
    "--branch",
    "main",
    "--event",
    stage.event,
  ]);
  if (!fallback.ok) return fallback;
  return { ok: true, runs: fallback.runs };
}

async function pollStage({
  stage,
  mergeSha,
  runner,
  sleep,
  now,
  deadlineMs,
}) {
  let lastError = null;
  for (;;) {
    if (now() >= deadlineMs) {
      return { kind: "deadline-exceeded", lastError };
    }
    const lookup = await lookupStageRuns(runner, stage, mergeSha);
    if (!lookup.ok) {
      lastError = lookup.result;
    } else {
      lastError = null;
      const selection = selectStageRun(lookup.runs, stage, mergeSha);
      if (selection.kind === "success" || selection.kind === "failure") {
        return selection;
      }
    }
    if (now() >= deadlineMs) {
      return { kind: "deadline-exceeded", lastError };
    }
    await sleep(STAGE_POLL_INTERVAL_MS);
  }
}

async function preflight(runner, stderr) {
  const versionResult = await runner(["--version"]);
  if (versionResult.exitCode !== 0) {
    stderr.write(
      `error: gh CLI is not available (${versionResult.error ?? versionResult.stderr.trim() ?? "no output"})\n`,
    );
    return EXIT_INVOCATION;
  }
  const actual = parseSemver(versionResult.stdout);
  const min = parseSemver(MIN_GH_VERSION);
  if (!meetsMinVersion(actual, min)) {
    stderr.write(
      `error: gh CLI must be >= ${MIN_GH_VERSION}; saw ${versionResult.stdout.split("\n")[0].trim() || "unknown"}\n`,
    );
    return EXIT_INVOCATION;
  }
  const authResult = await runner([
    "auth",
    "status",
    "--hostname",
    "github.com",
  ]);
  if (authResult.exitCode !== 0) {
    stderr.write(
      `error: gh is not authenticated for github.com — run \`gh auth login --hostname github.com\`\n`,
    );
    return EXIT_INVOCATION;
  }
  return EXIT_OK;
}

async function fetchFailedLog(runner, runId) {
  const result = await runner([
    "run",
    "view",
    String(runId),
    "--log-failed",
  ]);
  return result;
}

async function runWatch({
  mergeSha,
  deadlineMinutes,
  runner,
  sleep,
  now,
  stdout,
  stderr,
}) {
  const preflightCode = await preflight(runner, stderr);
  if (preflightCode !== EXIT_OK) return preflightCode;

  const chainLabel = STAGES.map((s) => s.workflowName).join(" → ");
  stdout.write(
    `[watch] sha=${mergeSha} deadline=${deadlineMinutes}m chain=${chainLabel}\n`,
  );

  const deadlineMs = now() + deadlineMinutes * 60 * 1000;
  let smokeRun = null;

  for (const stage of STAGES) {
    const result = await pollStage({
      stage,
      mergeSha,
      runner,
      sleep,
      now,
      deadlineMs,
    });
    if (result.kind === "deadline-exceeded") {
      stdout.write(
        `[${stage.key}] deadline exceeded before completion\n`,
      );
      const detail = result.lastError?.error ?? result.lastError?.stderr;
      if (detail) stderr.write(`error: last gh error: ${detail.toString().trim()}\n`);
      stderr.write(
        `error: deadline of ${deadlineMinutes} minutes exceeded waiting for ${stage.key}\n`,
      );
      return EXIT_DEADLINE;
    }
    if (result.kind === "failure") {
      stdout.write(
        `${formatProgressLine(stage.key, "failed", result.run.databaseId)}\n`,
      );
      const logResult = await fetchFailedLog(runner, result.run.databaseId);
      if (logResult.exitCode === 0) {
        stdout.write(logResult.stdout);
      } else {
        stderr.write(
          `error: could not fetch failed-step logs for run ${result.run.databaseId}: ${logResult.stderr.trim() || logResult.error || "unknown gh error"}\n`,
        );
      }
      stderr.write(`error: ${stage.key} stage failed (${result.run.url})\n`);
      return EXIT_STAGE_FAILED;
    }
    stdout.write(
      `${formatProgressLine(stage.key, "succeeded", result.run.databaseId)}\n`,
    );
    if (stage.key === "smoke") smokeRun = result.run;
  }

  if (!smokeRun) {
    stderr.write(
      `error: chain completed without a smoke run; this should be unreachable\n`,
    );
    return EXIT_STAGE_FAILED;
  }
  stdout.write(`${formatSmokeUrlLine(smokeRun.url)}\n`);
  return EXIT_OK;
}

function parseArgs(argv) {
  const positional = [];
  let deadlineMinutes = DEFAULT_DEADLINE_MINUTES;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--deadline-minutes") {
      const next = argv[i + 1];
      if (!next || !/^\d+$/.test(next)) {
        return { error: "--deadline-minutes requires a positive integer" };
      }
      deadlineMinutes = Number(next);
      if (deadlineMinutes <= 0) {
        return { error: "--deadline-minutes must be > 0" };
      }
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      return { help: true };
    } else if (arg.startsWith("--")) {
      return { error: `unknown flag: ${arg}` };
    } else {
      positional.push(arg);
    }
  }
  if (positional.length !== 1) {
    return {
      error: "expected exactly one positional argument: <merge-sha>",
    };
  }
  if (!/^[0-9a-f]{7,40}$/i.test(positional[0])) {
    return { error: `invalid merge SHA: ${positional[0]}` };
  }
  return { mergeSha: positional[0], deadlineMinutes };
}

function printUsage(stream) {
  stream.write(
    "Usage: node scripts/release/post-merge-smoke-watch.cjs <merge-sha> [--deadline-minutes <N>]\n",
  );
}

function realSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.help) {
    printUsage(process.stdout);
    return EXIT_OK;
  }
  if (parsed.error) {
    process.stderr.write(`error: ${parsed.error}\n`);
    printUsage(process.stderr);
    return EXIT_INVOCATION;
  }
  return runWatch({
    mergeSha: parsed.mergeSha,
    deadlineMinutes: parsed.deadlineMinutes,
    runner: realRunner,
    sleep: realSleep,
    now: () => Date.now(),
    stdout: process.stdout,
    stderr: process.stderr,
  });
}

if (require.main === module) {
  main().then(
    (code) => process.exit(code),
    (error) => {
      process.stderr.write(`error: unhandled exception: ${error?.stack ?? error}\n`);
      process.exit(EXIT_INVOCATION);
    },
  );
}

module.exports = {
  STAGES,
  MIN_GH_VERSION,
  STAGE_POLL_INTERVAL_MS,
  DEFAULT_DEADLINE_MINUTES,
  EXIT_OK,
  EXIT_STAGE_FAILED,
  EXIT_DEADLINE,
  EXIT_INVOCATION,
  RUN_JSON_FIELDS,
  parseSemver,
  meetsMinVersion,
  isEligibleRun,
  selectStageRun,
  formatProgressLine,
  formatSmokeUrlLine,
  parseArgs,
  preflight,
  pollStage,
  runWatch,
};
