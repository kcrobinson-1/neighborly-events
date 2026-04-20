#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MISE_FILE="${REPO_ROOT}/mise.toml"
DENO_DOCTOR_ANCHOR="${REPO_ROOT}/supabase/functions/_shared/doctor-check-anchor.ts"
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
  local section="$1"
  local key="$2"
  local value

  value="$(
    awk -F'"' -v section="${section}" -v key="${key}" '
      /^\[.*\]$/ {
        in_section = ($0 == "[" section "]")
        next
      }
      in_section && $1 ~ ("^" key " = ") {
        print $2
        exit
      }
    ' "${MISE_FILE}"
  )"

  if [[ -z "${value}" ]]; then
    fail "${EXIT_UNKNOWN}" "missing pin for ${key} in [${section}] of mise.toml"
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

normalize_version() {
  local value="$1"
  printf '%s' "${value}" | sed -E 's/^v//'
}

assert_optional_version_file_matches_node() {
  local file="$1"
  local expected="$2"
  local actual

  # .nvmrc/.node-version are optional compatibility files in this repo.
  # When present, they must match the pinned mise Node version.
  [[ -f "${file}" ]] || return 0

  actual="$(tr -d '[:space:]' < "${file}")"
  if [[ -z "${actual}" ]]; then
    fail "${EXIT_WRONG_VERSION}" "${file} is empty; expected Node ${expected}"
  fi

  if [[ "$(normalize_version "${actual}")" != "$(normalize_version "${expected}")" ]]; then
    fail "${EXIT_WRONG_VERSION}" "${file} does not match pinned Node version in mise.toml (expected ${expected}, got ${actual})"
  fi
}

assert_required_env_vars() {
  # Requirements are intentionally caller-driven so cloud/local contexts can
  # enforce different env surfaces without editing this script.
  local required="${DOCTOR_REQUIRED_ENV_VARS:-}"
  local env_name

  if [[ -z "${required}" ]]; then
    return 0
  fi

  # Accept comma or whitespace separators.
  required="${required//,/ }"

  for env_name in ${required}; do
    if [[ -z "${!env_name:-}" ]]; then
      fail "${EXIT_MISSING_ENV}" "required environment variable is missing: ${env_name}"
    fi
  done
}

check_deno_offline_smoke() {
  if [[ ! -f "${DENO_DOCTOR_ANCHOR}" ]]; then
    fail "${EXIT_UNKNOWN}" "Deno doctor anchor missing: ${DENO_DOCTOR_ANCHOR}"
  fi

  if ! deno check --no-lock --no-remote "${DENO_DOCTOR_ANCHOR}" >/dev/null 2>&1; then
    fail "${EXIT_DEPS_MISSING}" "offline Deno check failed for ${DENO_DOCTOR_ANCHOR}"
  fi
}

find_deno_entrypoint_smoke_target() {
  local preferred="${REPO_ROOT}/supabase/functions/issue-session/index.ts"
  local entrypoint

  if [[ -f "${preferred}" ]]; then
    printf '%s' "${preferred}"
    return 0
  fi

  for entrypoint in "${REPO_ROOT}"/supabase/functions/*/index.ts; do
    if [[ -f "${entrypoint}" ]]; then
      printf '%s' "${entrypoint}"
      return 0
    fi
  done

  fail "${EXIT_UNKNOWN}" "no Supabase function entrypoint found for Deno import smoke check"
}

check_deno_entrypoint_import_smoke() {
  local entrypoint
  local output

  entrypoint="$(find_deno_entrypoint_smoke_target)"

  output="$(deno check --no-lock "${entrypoint}" 2>&1)" || fail \
    "${EXIT_DEPS_MISSING}" \
    "Deno dependency resolution failed for ${entrypoint}: ${output}"

  # `deno check` can self-heal by downloading missing imports. Doctor treats
  # any download as dependency drift and fails instead of reporting green.
  if printf '%s' "${output}" | grep -q '^Download '; then
    fail \
      "${EXIT_DEPS_MISSING}" \
      "Deno check for ${entrypoint} required network downloads; warm and pin dependencies before running doctor"
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

EXPECTED_NODE="$(read_pin "tools" "node")"
EXPECTED_DENO="$(read_pin "tools" "deno")"
EXPECTED_SUPABASE="$(read_pin "env" "SUPABASE_CLI_VERSION")"

assert_command_exists "node"
assert_command_exists "npm"
assert_command_exists "deno"
assert_command_exists "supabase"

assert_version "node" "$(command_version node)" "${EXPECTED_NODE}"
assert_version "deno" "$(command_version deno)" "${EXPECTED_DENO}"
assert_version "supabase" "$(command_version supabase)" "${EXPECTED_SUPABASE}"
assert_optional_version_file_matches_node "${REPO_ROOT}/.nvmrc" "${EXPECTED_NODE}"
assert_optional_version_file_matches_node "${REPO_ROOT}/.node-version" "${EXPECTED_NODE}"
assert_required_env_vars

[[ -d "${REPO_ROOT}/node_modules" ]] || fail "${EXIT_DEPS_MISSING}" "node_modules is missing; run npm ci"

if ! npm ci --ignore-scripts --prefer-offline --dry-run >/dev/null 2>&1; then
  fail "${EXIT_DEPS_MISSING}" "npm dependencies are out of sync with package-lock.json"
fi

check_deno_offline_smoke
check_deno_entrypoint_import_smoke

echo "doctor: environment OK"
exit 0
