import { defineConfig } from "vitest/config";

export default defineConfig({
  // Use the automatic JSX runtime so .tsx files in shared/ — outside any
  // per-app tsconfig include glob — transform without needing
  // `import React from "react"` boilerplate. apps/web's tsconfig.app.json
  // already declares `jsx: "react-jsx"`; this matches that contract for
  // shared/ files vitest transforms directly.
  esbuild: {
    jsx: "automatic",
  },
  test: {
    // The shared-domain tests are happy in Node, but the frontend hook tests
    // need a browser-like environment. Using one jsdom config keeps the early
    // test rollout simple while we build out the rest of the suite.
    environment: "jsdom",
    exclude: ["tests/supabase/functions/**/*.test.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});
