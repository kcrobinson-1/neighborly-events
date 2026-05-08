#!/usr/bin/env bash
#
# Read a list of changed file paths on stdin (one per line) and classify the
# change set against the path-classification table in
# docs/plans/vercel-preview-deploy-budget.md (the "Path classification" section
# of the merged plan).
#
# Output one of:
#   docs-only   — no Vercel project affected; preview-deploy gate auto-passes
#   web         — apps/web (neighborly-scavenger-game-web) needs a preview
#   site        — apps/site (neighborly-events-site) needs a preview
#   both        — both projects need previews
#
# Conservative: any path not in a known docs-only category marks both projects
# affected, with a stderr warning so unknown paths get noticed.
#
# Usage:
#   git diff --name-only "$BASE..$HEAD" | scripts/vercel/classify-paths.sh

set -euo pipefail

web=0
site=0

while IFS= read -r file || [ -n "$file" ]; do
  [ -z "$file" ] && continue

  case "$file" in
    # ── Project-specific config files ─────────────────────────────────
    apps/web/vercel.json)
      web=1
      ;;
    apps/site/vercel.json)
      site=1
      ;;

    # ── Workflow + classifier itself: changes affect both projects'
    #    deploy decisions, so rebuild both to verify the new gate ────
    .github/workflows/preview-deploys.yml | scripts/vercel/*)
      web=1
      site=1
      ;;

    # ── Per-project source trees ──────────────────────────────────────
    apps/web/*)
      web=1
      ;;
    apps/site/*)
      site=1
      ;;

    # ── Cross-project build inputs ────────────────────────────────────
    shared/* | \
    package.json | package-lock.json | \
    tsconfig.json | tsconfig.*.json | \
    .node-version | .nvmrc | mise.toml)
      web=1
      site=1
      ;;

    # ── Docs-only categories (no project rebuild needed) ──────────────
    docs/* | \
    supabase/* | \
    tests/* | playwright.*.config.ts | vitest.config.ts | \
    scripts/* | \
    .github/* | \
    AGENTS.md | README.md | eslint.config.mjs | \
    .gitignore | .vercelignore)
      ;;

    # ── Anything unrecognised: be conservative ────────────────────────
    *)
      echo "WARN: classify-paths: unrecognised path '$file' — marking both projects affected" >&2
      web=1
      site=1
      ;;
  esac
done

if [ "$web" -eq 1 ] && [ "$site" -eq 1 ]; then
  echo "both"
elif [ "$web" -eq 1 ]; then
  echo "web"
elif [ "$site" -eq 1 ]; then
  echo "site"
else
  echo "docs-only"
fi
