// Contract tests for scripts/lib/load-env.cjs.
//
// The loader is invoked at the top of every script that previously
// required the operator to export Supabase service-role credentials in
// their shell. Three properties matter for both safety and CI behavior:
//
//   1. Absent file → no-op. CI runners never have scripts/.env, and the
//      loader must not raise.
//   2. Present file but key already in process.env → existing value
//      wins. Workflow `env:` blocks always override on-disk values.
//   3. assertProdGuard() banner triggers only on non-local Supabase
//      hosts, and the pause auto-skips in CI / non-TTY contexts.
//
// These are not redundant with one general "smoke" test: each property
// is exercised in isolation so a regression in any single rule fails
// loudly and points at the rule that broke.

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  assertProdGuard,
  isLocalSupabaseUrl,
  loadEnv,
  parseEnvFile,
  shouldSkipPause,
} from "../../scripts/lib/load-env.cjs";

let tempDir: string;
const savedEnv = { ...process.env };

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "load-env-test-"));
});

afterEach(() => {
  rmSync(tempDir, { force: true, recursive: true });
  // Restore env between tests to keep them order-independent.
  for (const key of Object.keys(process.env)) {
    if (!(key in savedEnv)) {
      delete process.env[key];
    }
  }
  for (const [key, value] of Object.entries(savedEnv)) {
    process.env[key] = value;
  }
  vi.restoreAllMocks();
});

describe("parseEnvFile", () => {
  it("parses KEY=VALUE pairs and ignores comments / blanks", () => {
    const parsed = parseEnvFile(
      [
        "# leading comment",
        "",
        "FOO=bar",
        "BAZ=qux",
        "  # indented comment ignored",
        "QUOTED=\"hello world\"",
        "SINGLE='value'",
      ].join("\n"),
    );
    expect(parsed).toEqual({
      FOO: "bar",
      BAZ: "qux",
      QUOTED: "hello world",
      SINGLE: "value",
    });
  });
});

describe("loadEnv", () => {
  it("is a no-op when scripts/.env is absent (CI default)", () => {
    const result = loadEnv({ envPath: join(tempDir, "missing.env") });
    expect(result.loaded).toBe(false);
    expect(result.applied).toEqual([]);
  });

  it("populates missing process.env keys from the file", () => {
    const envPath = join(tempDir, ".env");
    writeFileSync(envPath, "FROM_FILE_ONLY=value-from-file\n");
    delete process.env.FROM_FILE_ONLY;

    const result = loadEnv({ envPath });

    expect(result.loaded).toBe(true);
    expect(result.applied).toEqual(["FROM_FILE_ONLY"]);
    expect(process.env.FROM_FILE_ONLY).toBe("value-from-file");
  });

  it("does not override values already set in process.env (CI safety)", () => {
    const envPath = join(tempDir, ".env");
    writeFileSync(envPath, "ALREADY_SET=from-file\n");
    process.env.ALREADY_SET = "from-shell";

    const result = loadEnv({ envPath });

    expect(result.loaded).toBe(true);
    expect(result.applied).toEqual([]);
    expect(process.env.ALREADY_SET).toBe("from-shell");
  });
});

describe("isLocalSupabaseUrl", () => {
  it("recognizes 127.0.0.1 and localhost as local", () => {
    expect(isLocalSupabaseUrl("http://127.0.0.1:54321")).toBe(true);
    expect(isLocalSupabaseUrl("http://localhost:54321")).toBe(true);
  });

  it("treats hosted Supabase URLs as non-local", () => {
    expect(isLocalSupabaseUrl("https://abc.supabase.co")).toBe(false);
  });
});

describe("shouldSkipPause", () => {
  it("skips when CI=true", () => {
    expect(shouldSkipPause({ env: { CI: "true" }, stream: { isTTY: true } as never })).toBe(true);
  });

  it("skips when stream is explicitly non-TTY", () => {
    expect(shouldSkipPause({ env: {}, stream: { isTTY: false } as never })).toBe(true);
  });

  // Node only sets `isTTY === true` on real TTY streams; piped or
  // redirected output leaves the property `undefined`. The auto-skip
  // must treat that case as non-interactive, otherwise scripted local
  // runs sleep for no benefit.
  it("skips when stream is non-TTY by Node's default (isTTY undefined)", () => {
    expect(shouldSkipPause({ env: {}, stream: {} as never })).toBe(true);
  });

  it("does not skip in an interactive non-CI shell", () => {
    expect(shouldSkipPause({ env: {}, stream: { isTTY: true } as never })).toBe(false);
  });
});

describe("assertProdGuard", () => {
  it("does nothing when all named URLs are local", async () => {
    process.env.TEST_SUPABASE_URL = "http://127.0.0.1:54321";
    const stream = { write: vi.fn() } as unknown as NodeJS.WriteStream;

    const result = await assertProdGuard({
      envNames: ["TEST_SUPABASE_URL"],
      sleepMs: 0,
      stream,
    });

    expect(result.triggered).toBe(false);
    expect(stream.write).not.toHaveBeenCalled();
  });

  it("prints the prod banner without pausing in CI", async () => {
    process.env.CI = "true";
    process.env.TEST_SUPABASE_URL = "https://abc.supabase.co";
    const stream = { write: vi.fn() } as unknown as NodeJS.WriteStream;

    const result = await assertProdGuard({
      envNames: ["TEST_SUPABASE_URL"],
      sleepMs: 5000,
      stream,
    });

    expect(result.triggered).toBe(true);
    expect(result.paused).toBe(false);
    // Banner must mention the offending URL so audit logs surface it.
    const calls = (stream.write as unknown as { mock: { calls: string[][] } }).mock.calls;
    expect(calls[0][0]).toContain("https://abc.supabase.co");
  });
});
