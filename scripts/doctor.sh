#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MISE_FILE="${REPO_ROOT}/mise.toml"
export PATH="${HOME}/.local/bin:${PATH}"

EXIT_MISSING_TOOL=10
EXIT_WRONG_VERSION=11
EXIT_DEPS_MISSING=12
EXIT_MISSING_ENV=20
EXIT_UNKNOWN=99

fail() {
  local code="$1"
  shift
  echo "doctor: $*" >&2
  exit "${code}"
}

read_pin() {
  local key="$1"
  local value
  value="$(awk -F'"' -v key="${key}" '$1 ~ ("^" key " = ") { print $2 }' "${MISE_FILE}")"
  if [[ -z "${value}" ]]; then
    fail "${EXIT_UNKNOWN}" "missing pin for ${key} in mise.toml"
  fi
  printf '%s' "${value}"
}

command_version() {
  local cmd="$1"
  local raw
  raw="$("${cmd}" --version 2>/dev/null | head -n1 || true)"
  printf '%s' "${raw}" | grep -Eo '[0-9]+(\.[0-9]+){1,2}' | head -n1
}

assert_command_exists() {
  local cmd="$1"
  command -v "${cmd}" >/dev/null 2>&1 || fail "${EXIT_MISSING_TOOL}" "missing tool: ${cmd}"
}

assert_version() {
  local label="$1"
  local actual="$2"
  local expected="$3"
  if [[ -z "${actual}" ]]; then
    fail "${EXIT_WRONG_VERSION}" "${label} version could not be determined"
  fi
  if [[ "${actual}" != "${expected}" ]]; then
    fail "${EXIT_WRONG_VERSION}" "${label} version mismatch (expected ${expected}, got ${actual})"
  fi
}

cd "${REPO_ROOT}"

[[ -f "${MISE_FILE}" ]] || fail "${EXIT_UNKNOWN}" "mise.toml not found"

if command -v mise >/dev/null 2>&1; then
  if ! mise env --json >/dev/null 2>&1; then
    fail "${EXIT_UNKNOWN}" "mise environment could not be loaded (check trust and install state)"
  fi
  eval "$(mise activate bash)"
fi

EXPECTED_NODE="$(read_pin "node")"
EXPECTED_DENO="$(read_pin "deno")"
EXPECTED_SUPABASE="$(read_pin "SUPABASE_CLI_VERSION")"

assert_command_exists "node"
assert_command_exists "npm"
assert_command_exists "deno"
assert_command_exists "supabase"

assert_version "node" "$(command_version node)" "${EXPECTED_NODE}"
assert_version "deno" "$(command_version deno)" "${EXPECTED_DENO}"
assert_version "supabase" "$(command_version supabase)" "${EXPECTED_SUPABASE}"

[[ -d "${REPO_ROOT}/node_modules" ]] || fail "${EXIT_DEPS_MISSING}" "node_modules is missing; run npm ci"

if ! npm ci --ignore-scripts --prefer-offline --dry-run >/dev/null 2>&1; then
  fail "${EXIT_DEPS_MISSING}" "npm dependencies are out of sync with package-lock.json"
fi

if ! deno check --no-lock supabase/functions/issue-session/index.ts >/dev/null 2>&1; then
  fail "${EXIT_DEPS_MISSING}" "Deno dependency resolution failed for supabase/functions imports"
fi

echo "doctor: environment OK"
exit 0
