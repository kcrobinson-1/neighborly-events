import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);

type RunnerResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
  error: string | null;
};

type RunRecord = {
  workflowName: string;
  event: string;
  headBranch: string;
  headSha: string;
  status: string;
  conclusion: string | null;
  databaseId: number;
  createdAt: string;
  url: string;
};

type Stage = {
  key: string;
  workflowName: string;
  workflowFile: string;
  event: string;
};

type Selection =
  | { kind: "none" }
  | { kind: "pending"; run: RunRecord }
  | { kind: "success"; run: RunRecord }
  | { kind: "failure"; run: RunRecord }
  | { kind: "deadline-exceeded"; lastError: unknown };

type WatcherModule = {
  STAGES: Stage[];
  MIN_GH_VERSION: string;
  STAGE_POLL_INTERVAL_MS: number;
  DEFAULT_DEADLINE_MINUTES: number;
  EXIT_OK: number;
  EXIT_STAGE_FAILED: number;
  EXIT_DEADLINE: number;
  EXIT_INVOCATION: number;
  RUN_JSON_FIELDS: string[];
  parseSemver: (value: string) => [number, number, number] | null;
  meetsMinVersion: (
    actual: [number, number, number] | null,
    min: [number, number, number] | null,
  ) => boolean;
  isEligibleRun: (run: unknown, stage: Stage, mergeSha: string) => boolean;
  selectStageRun: (
    runs: unknown,
    stage: Stage,
    mergeSha: string,
  ) => Selection;
  formatProgressLine: (stageKey: string, status: string, runId: number) => string;
  formatSmokeUrlLine: (url: string) => string;
  parseArgs: (argv: string[]) =>
    | { mergeSha: string; deadlineMinutes: number }
    | { error: string }
    | { help: true };
  pollStage: (input: {
    stage: Stage;
    mergeSha: string;
    runner: (args: string[]) => Promise<RunnerResult>;
    sleep: (ms: number) => Promise<void>;
    now: () => number;
    deadlineMs: number;
  }) => Promise<Selection>;
  runWatch: (input: {
    mergeSha: string;
    deadlineMinutes: number;
    runner: (args: string[]) => Promise<RunnerResult>;
    sleep: (ms: number) => Promise<void>;
    now: () => number;
    stdout: { write: (s: string) => boolean };
    stderr: { write: (s: string) => boolean };
  }) => Promise<number>;
};

const watcher = require(
  "../../scripts/release/post-merge-smoke-watch.cjs",
) as WatcherModule;

const MERGE_SHA = "abcdef1234567890abcdef1234567890abcdef12";
const OTHER_SHA = "0badc0de00000000000000000000000000000000";

const ciStage: Stage = watcher.STAGES[0];
const releaseStage: Stage = watcher.STAGES[1];
const smokeStage: Stage = watcher.STAGES[2];

function ok(stdout: string): RunnerResult {
  return { stdout, stderr: "", exitCode: 0, error: null };
}

function fail(stderr: string, exitCode = 1): RunnerResult {
  return { stdout: "", stderr, exitCode, error: null };
}

function makeRun(overrides: Partial<RunRecord>): RunRecord {
  return {
    workflowName: "CI",
    event: "push",
    headBranch: "main",
    headSha: MERGE_SHA,
    status: "completed",
    conclusion: "success",
    databaseId: 1,
    createdAt: "2026-04-30T16:00:00Z",
    url: "https://github.com/example/example/actions/runs/1",
    ...overrides,
  };
}

function makeBufferStream() {
  const chunks: string[] = [];
  return {
    write: (s: string) => {
      chunks.push(s);
      return true;
    },
    text: () => chunks.join(""),
  };
}

type ScriptedCall = {
  match: (args: string[]) => boolean;
  reply: RunnerResult;
};

function scriptedRunner(calls: ScriptedCall[]) {
  const seen: string[][] = [];
  let i = 0;
  return {
    runner: async (args: string[]): Promise<RunnerResult> => {
      seen.push(args);
      const next = calls[i];
      if (!next) {
        throw new Error(
          `unexpected runner call (no scripted reply left): ${args.join(" ")}`,
        );
      }
      if (!next.match(args)) {
        throw new Error(
          `runner call did not match scripted expectation #${i}: got ${args.join(" ")}`,
        );
      }
      i += 1;
      return next.reply;
    },
    seen,
    remaining: () => calls.length - i,
  };
}

function virtualClock(start = 0) {
  let value = start;
  return {
    now: () => value,
    sleep: async (ms: number) => {
      value += ms;
    },
    advance: (ms: number) => {
      value += ms;
    },
    set: (ms: number) => {
      value = ms;
    },
  };
}

function preflightCalls(): ScriptedCall[] {
  return [
    {
      match: (args) => args.length === 1 && args[0] === "--version",
      reply: ok("gh version 2.89.0 (2026-03-26)\n"),
    },
    {
      match: (args) =>
        args[0] === "auth" &&
        args[1] === "status" &&
        args.includes("--hostname") &&
        args.includes("github.com"),
      reply: ok("Logged in to github.com as test\n"),
    },
  ];
}

function runListReply(runs: RunRecord[]): RunnerResult {
  return ok(JSON.stringify(runs));
}

function runListCall(predicate: (args: string[]) => boolean, runs: RunRecord[]): ScriptedCall {
  return {
    match: (args) =>
      args[0] === "run" && args[1] === "list" && predicate(args),
    reply: runListReply(runs),
  };
}

describe("post-merge-smoke-watch / version helpers", () => {
  it("parses gh --version output", () => {
    expect(watcher.parseSemver("gh version 2.89.0 (2026-03-26)\n")).toEqual([
      2, 89, 0,
    ]);
    expect(watcher.parseSemver("gh version 2.93.1 (xxx)")).toEqual([2, 93, 1]);
    expect(watcher.parseSemver("not a version")).toBeNull();
  });

  it("requires the documented minimum version", () => {
    expect(watcher.MIN_GH_VERSION).toBe("2.89.0");
    expect(watcher.meetsMinVersion([2, 89, 0], [2, 89, 0])).toBe(true);
    expect(watcher.meetsMinVersion([2, 88, 99], [2, 89, 0])).toBe(false);
    expect(watcher.meetsMinVersion([3, 0, 0], [2, 89, 0])).toBe(true);
    expect(watcher.meetsMinVersion(null, [2, 89, 0])).toBe(false);
  });

  it("requests only the documented JSON field set", () => {
    expect(watcher.RUN_JSON_FIELDS).toEqual([
      "databaseId",
      "workflowName",
      "event",
      "headBranch",
      "headSha",
      "status",
      "conclusion",
      "createdAt",
      "url",
    ]);
  });
});

describe("post-merge-smoke-watch / SHA + eligibility filter", () => {
  it("requires workflow name, event, branch, and SHA to all match", () => {
    const baseline = makeRun({});
    expect(watcher.isEligibleRun(baseline, ciStage, MERGE_SHA)).toBe(true);
    expect(watcher.isEligibleRun(makeRun({ headSha: OTHER_SHA }), ciStage, MERGE_SHA)).toBe(false);
    expect(watcher.isEligibleRun(makeRun({ headBranch: "feature/x" }), ciStage, MERGE_SHA)).toBe(false);
    expect(watcher.isEligibleRun(makeRun({ event: "workflow_dispatch" }), ciStage, MERGE_SHA)).toBe(false);
    expect(watcher.isEligibleRun(makeRun({ workflowName: "Other" }), ciStage, MERGE_SHA)).toBe(false);
    expect(watcher.isEligibleRun(null, ciStage, MERGE_SHA)).toBe(false);
  });

  it("rejects workflow_dispatch smoke runs even on the matching SHA", () => {
    const dispatch = makeRun({
      workflowName: "Production Admin Smoke",
      event: "workflow_dispatch",
    });
    expect(watcher.isEligibleRun(dispatch, smokeStage, MERGE_SHA)).toBe(false);
  });
});

describe("post-merge-smoke-watch / selectStageRun", () => {
  it("returns none when no eligible runs exist", () => {
    const off = [makeRun({ headSha: OTHER_SHA })];
    expect(watcher.selectStageRun(off, ciStage, MERGE_SHA)).toEqual({ kind: "none" });
    expect(watcher.selectStageRun([], ciStage, MERGE_SHA)).toEqual({ kind: "none" });
    expect(watcher.selectStageRun(null, ciStage, MERGE_SHA)).toEqual({ kind: "none" });
  });

  it("prefers in-progress runs over completed runs for the same SHA", () => {
    const completedSuccess = makeRun({
      databaseId: 100,
      status: "completed",
      conclusion: "success",
      createdAt: "2026-04-30T15:00:00Z",
    });
    const queued = makeRun({
      databaseId: 200,
      status: "queued",
      conclusion: null,
      createdAt: "2026-04-30T16:00:00Z",
    });
    const result = watcher.selectStageRun(
      [completedSuccess, queued],
      ciStage,
      MERGE_SHA,
    );
    expect(result.kind).toBe("pending");
    if (result.kind === "pending") expect(result.run.databaseId).toBe(200);
  });

  it("picks the most recent successful run when multiple completed", () => {
    const older = makeRun({
      databaseId: 1,
      conclusion: "success",
      createdAt: "2026-04-30T14:00:00Z",
    });
    const newer = makeRun({
      databaseId: 2,
      conclusion: "success",
      createdAt: "2026-04-30T15:00:00Z",
    });
    const result = watcher.selectStageRun([older, newer], ciStage, MERGE_SHA);
    expect(result.kind).toBe("success");
    if (result.kind === "success") expect(result.run.databaseId).toBe(2);
  });

  it("reports the most-recent failure when no success exists", () => {
    const fail1 = makeRun({
      databaseId: 1,
      conclusion: "failure",
      createdAt: "2026-04-30T14:00:00Z",
    });
    const fail2 = makeRun({
      databaseId: 2,
      conclusion: "failure",
      createdAt: "2026-04-30T15:00:00Z",
    });
    const result = watcher.selectStageRun([fail1, fail2], ciStage, MERGE_SHA);
    expect(result.kind).toBe("failure");
    if (result.kind === "failure") expect(result.run.databaseId).toBe(2);
  });
});

describe("post-merge-smoke-watch / output formatting", () => {
  it("formats progress lines with stage key + run id", () => {
    expect(watcher.formatProgressLine("ci", "succeeded", 12345)).toBe(
      "[ci] succeeded (run 12345)",
    );
    expect(watcher.formatProgressLine("smoke", "failed", 99)).toBe(
      "[smoke] failed (run 99)",
    );
  });

  it("emits the load-bearing SMOKE_URL line on its own", () => {
    expect(
      watcher.formatSmokeUrlLine(
        "https://github.com/example/example/actions/runs/777",
      ),
    ).toBe("SMOKE_URL=https://github.com/example/example/actions/runs/777");
  });
});

describe("post-merge-smoke-watch / parseArgs", () => {
  it("accepts a 40-char SHA and applies the documented default deadline", () => {
    const result = watcher.parseArgs([MERGE_SHA]);
    expect(result).toEqual({
      mergeSha: MERGE_SHA,
      deadlineMinutes: watcher.DEFAULT_DEADLINE_MINUTES,
    });
  });

  it("accepts --deadline-minutes with a positive integer", () => {
    expect(watcher.parseArgs([MERGE_SHA, "--deadline-minutes", "10"])).toEqual({
      mergeSha: MERGE_SHA,
      deadlineMinutes: 10,
    });
  });

  it("rejects malformed flags, missing SHA, and invalid SHA", () => {
    expect(watcher.parseArgs([])).toMatchObject({ error: expect.any(String) });
    expect(watcher.parseArgs(["not-a-sha"])).toMatchObject({
      error: expect.stringContaining("invalid merge SHA"),
    });
    expect(
      watcher.parseArgs([MERGE_SHA, "--deadline-minutes", "abc"]),
    ).toMatchObject({ error: expect.stringContaining("--deadline-minutes") });
    expect(watcher.parseArgs([MERGE_SHA, "--unknown"])).toMatchObject({
      error: expect.stringContaining("unknown flag"),
    });
  });
});

describe("post-merge-smoke-watch / pollStage", () => {
  it("falls back to the recent-runs query when --commit returns nothing", async () => {
    const successRun = makeRun({ databaseId: 42 });
    const { runner } = scriptedRunner([
      runListCall(
        (a) => a.includes("--commit") && a.includes(MERGE_SHA),
        [],
      ),
      runListCall(
        (a) =>
          a.includes("--branch") &&
          a.includes("main") &&
          a.includes("--event") &&
          a.includes("push"),
        [successRun],
      ),
    ]);
    const clock = virtualClock();
    const result = await watcher.pollStage({
      stage: ciStage,
      mergeSha: MERGE_SHA,
      runner,
      sleep: clock.sleep,
      now: clock.now,
      deadlineMs: 60_000,
    });
    expect(result.kind).toBe("success");
    if (result.kind === "success") expect(result.run.databaseId).toBe(42);
  });

  it("keeps polling while the eligible run is queued, then resolves to success", async () => {
    const queued = makeRun({
      databaseId: 50,
      status: "queued",
      conclusion: null,
    });
    const completed = makeRun({
      databaseId: 50,
      status: "completed",
      conclusion: "success",
    });
    const { runner } = scriptedRunner([
      runListCall((a) => a.includes("--commit"), [queued]),
      runListCall((a) => a.includes("--commit"), [completed]),
    ]);
    const clock = virtualClock();
    const result = await watcher.pollStage({
      stage: ciStage,
      mergeSha: MERGE_SHA,
      runner,
      sleep: clock.sleep,
      now: clock.now,
      deadlineMs: 60 * 60 * 1000,
    });
    expect(result.kind).toBe("success");
    expect(clock.now()).toBeGreaterThanOrEqual(watcher.STAGE_POLL_INTERVAL_MS);
  });

  it("reports failure when the chosen run completes with non-success", async () => {
    const failed = makeRun({
      databaseId: 77,
      status: "completed",
      conclusion: "failure",
    });
    const { runner } = scriptedRunner([
      runListCall((a) => a.includes("--commit"), [failed]),
    ]);
    const clock = virtualClock();
    const result = await watcher.pollStage({
      stage: ciStage,
      mergeSha: MERGE_SHA,
      runner,
      sleep: clock.sleep,
      now: clock.now,
      deadlineMs: 60 * 60 * 1000,
    });
    expect(result.kind).toBe("failure");
    if (result.kind === "failure") expect(result.run.databaseId).toBe(77);
  });

  it("ignores wrong-SHA runs even when --commit returns them", async () => {
    const wrongSha = makeRun({ headSha: OTHER_SHA, databaseId: 1 });
    const fallbackSuccess = makeRun({ databaseId: 2 });
    const { runner } = scriptedRunner([
      runListCall((a) => a.includes("--commit"), [wrongSha]),
      runListCall((a) => a.includes("--branch"), [fallbackSuccess]),
    ]);
    const clock = virtualClock();
    const result = await watcher.pollStage({
      stage: ciStage,
      mergeSha: MERGE_SHA,
      runner,
      sleep: clock.sleep,
      now: clock.now,
      deadlineMs: 60_000,
    });
    expect(result.kind).toBe("success");
    if (result.kind === "success") expect(result.run.databaseId).toBe(2);
  });

  it("returns deadline-exceeded when the clock passes the deadline", async () => {
    const queued = makeRun({
      databaseId: 9,
      status: "queued",
      conclusion: null,
    });
    const { runner } = scriptedRunner(
      Array.from({ length: 10 }, () => runListCall(() => true, [queued])),
    );
    const clock = virtualClock();
    const result = await watcher.pollStage({
      stage: releaseStage,
      mergeSha: MERGE_SHA,
      runner,
      sleep: clock.sleep,
      now: clock.now,
      deadlineMs: watcher.STAGE_POLL_INTERVAL_MS, // first sleep crosses it
    });
    expect(result.kind).toBe("deadline-exceeded");
  });
});

describe("post-merge-smoke-watch / runWatch", () => {
  it("walks the full chain and prints SMOKE_URL on green", async () => {
    const ciRun = makeRun({ databaseId: 11 });
    const releaseRun = makeRun({
      workflowName: "Release",
      event: "workflow_run",
      databaseId: 12,
    });
    const smokeRun = makeRun({
      workflowName: "Production Admin Smoke",
      event: "workflow_run",
      databaseId: 13,
      url: "https://github.com/example/example/actions/runs/13",
    });
    const { runner } = scriptedRunner([
      ...preflightCalls(),
      runListCall((a) => a.includes("ci.yml") && a.includes("--commit"), [ciRun]),
      runListCall(
        (a) => a.includes("release.yml") && a.includes("--commit"),
        [releaseRun],
      ),
      runListCall(
        (a) =>
          a.includes("production-admin-smoke.yml") && a.includes("--commit"),
        [smokeRun],
      ),
    ]);
    const stdout = makeBufferStream();
    const stderr = makeBufferStream();
    const clock = virtualClock();
    const code = await watcher.runWatch({
      mergeSha: MERGE_SHA,
      deadlineMinutes: 5,
      runner,
      sleep: clock.sleep,
      now: clock.now,
      stdout,
      stderr,
    });
    expect(code).toBe(watcher.EXIT_OK);
    const out = stdout.text();
    expect(out).toContain(`[watch] sha=${MERGE_SHA}`);
    expect(out).toContain("[ci] succeeded (run 11)");
    expect(out).toContain("[release] succeeded (run 12)");
    expect(out).toContain("[smoke] succeeded (run 13)");
    expect(out).toContain(
      "SMOKE_URL=https://github.com/example/example/actions/runs/13",
    );
    expect(stderr.text()).toBe("");
  });

  it("prints failed-step logs and exits 1 when CI fails — no SMOKE_URL", async () => {
    const ciFail = makeRun({
      databaseId: 21,
      status: "completed",
      conclusion: "failure",
    });
    const { runner } = scriptedRunner([
      ...preflightCalls(),
      runListCall((a) => a.includes("ci.yml") && a.includes("--commit"), [ciFail]),
      {
        match: (a) =>
          a[0] === "run" &&
          a[1] === "view" &&
          a[2] === "21" &&
          a.includes("--log-failed"),
        reply: ok("FAILED STEP LOG: build broke\n"),
      },
    ]);
    const stdout = makeBufferStream();
    const stderr = makeBufferStream();
    const clock = virtualClock();
    const code = await watcher.runWatch({
      mergeSha: MERGE_SHA,
      deadlineMinutes: 5,
      runner,
      sleep: clock.sleep,
      now: clock.now,
      stdout,
      stderr,
    });
    expect(code).toBe(watcher.EXIT_STAGE_FAILED);
    const out = stdout.text();
    expect(out).toContain("[ci] failed (run 21)");
    expect(out).toContain("FAILED STEP LOG: build broke");
    expect(out).not.toContain("SMOKE_URL=");
    expect(stderr.text()).toContain("ci stage failed");
  });

  it("never emits SMOKE_URL when the smoke run itself fails", async () => {
    const ciRun = makeRun({ databaseId: 31 });
    const releaseRun = makeRun({
      workflowName: "Release",
      event: "workflow_run",
      databaseId: 32,
    });
    const smokeFail = makeRun({
      workflowName: "Production Admin Smoke",
      event: "workflow_run",
      databaseId: 33,
      status: "completed",
      conclusion: "failure",
    });
    const { runner } = scriptedRunner([
      ...preflightCalls(),
      runListCall((a) => a.includes("ci.yml"), [ciRun]),
      runListCall((a) => a.includes("release.yml"), [releaseRun]),
      runListCall(
        (a) => a.includes("production-admin-smoke.yml"),
        [smokeFail],
      ),
      {
        match: (a) =>
          a[0] === "run" && a[1] === "view" && a[2] === "33",
        reply: ok("smoke failure log\n"),
      },
    ]);
    const stdout = makeBufferStream();
    const stderr = makeBufferStream();
    const clock = virtualClock();
    const code = await watcher.runWatch({
      mergeSha: MERGE_SHA,
      deadlineMinutes: 5,
      runner,
      sleep: clock.sleep,
      now: clock.now,
      stdout,
      stderr,
    });
    expect(code).toBe(watcher.EXIT_STAGE_FAILED);
    expect(stdout.text()).not.toContain("SMOKE_URL=");
    expect(stdout.text()).toContain("[smoke] failed (run 33)");
  });

  it("exits 2 with no SMOKE_URL when the deadline expires mid-chain", async () => {
    const ciRun = makeRun({ databaseId: 41 });
    const queuedRelease = makeRun({
      workflowName: "Release",
      event: "workflow_run",
      databaseId: 42,
      status: "queued",
      conclusion: null,
    });
    const { runner } = scriptedRunner([
      ...preflightCalls(),
      runListCall((a) => a.includes("ci.yml"), [ciRun]),
      // Release polls forever in queued state; tight deadline triggers exit 2.
      ...Array.from({ length: 5 }, () =>
        runListCall((a) => a.includes("release.yml"), [queuedRelease]),
      ),
    ]);
    const stdout = makeBufferStream();
    const stderr = makeBufferStream();
    const clock = virtualClock();
    const code = await watcher.runWatch({
      mergeSha: MERGE_SHA,
      deadlineMinutes: 0.1, // 6 seconds; first sleep is 15s, so deadline trips
      runner,
      sleep: clock.sleep,
      now: clock.now,
      stdout,
      stderr,
    });
    expect(code).toBe(watcher.EXIT_DEADLINE);
    expect(stdout.text()).toContain("[ci] succeeded (run 41)");
    expect(stdout.text()).toContain("[release] deadline exceeded before completion");
    expect(stdout.text()).not.toContain("SMOKE_URL=");
  });

  it("exits 3 when gh is below the documented minimum version", async () => {
    const { runner } = scriptedRunner([
      {
        match: (a) => a[0] === "--version",
        reply: ok("gh version 2.50.0 (old)\n"),
      },
    ]);
    const stdout = makeBufferStream();
    const stderr = makeBufferStream();
    const clock = virtualClock();
    const code = await watcher.runWatch({
      mergeSha: MERGE_SHA,
      deadlineMinutes: 5,
      runner,
      sleep: clock.sleep,
      now: clock.now,
      stdout,
      stderr,
    });
    expect(code).toBe(watcher.EXIT_INVOCATION);
    expect(stderr.text()).toContain(watcher.MIN_GH_VERSION);
  });

  it("exits 3 when gh auth status fails for github.com", async () => {
    const { runner } = scriptedRunner([
      {
        match: (a) => a[0] === "--version",
        reply: ok("gh version 2.93.0 (recent)\n"),
      },
      {
        match: (a) => a[0] === "auth" && a[1] === "status",
        reply: fail("not logged in\n"),
      },
    ]);
    const stdout = makeBufferStream();
    const stderr = makeBufferStream();
    const clock = virtualClock();
    const code = await watcher.runWatch({
      mergeSha: MERGE_SHA,
      deadlineMinutes: 5,
      runner,
      sleep: clock.sleep,
      now: clock.now,
      stdout,
      stderr,
    });
    expect(code).toBe(watcher.EXIT_INVOCATION);
    expect(stderr.text()).toContain("github.com");
  });
});
