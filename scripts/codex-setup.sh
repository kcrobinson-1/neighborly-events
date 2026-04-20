#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MISE_INSTALL_URL="https://mise.run"
MISE_FILE="mise.toml"
export PATH="${HOME}/.local/bin:${PATH}"

ensure_mise() {
  if command -v mise >/dev/null 2>&1; then
    return
  fi

  echo "Installing mise..."
  curl -fsSL "${MISE_INSTALL_URL}" | sh
}

ensure_mise

install_supabase_cli() {
  local version="$1"
  local os
  local arch
  local platform
  local url
  local tmp_dir

  os="$(uname -s | tr '[:upper:]' '[:lower:]')"
  arch="$(uname -m)"

  case "${os}/${arch}" in
    linux/x86_64) platform="linux_amd64" ;;
    linux/aarch64|linux/arm64) platform="linux_arm64" ;;
    darwin/x86_64) platform="darwin_amd64" ;;
    darwin/arm64) platform="darwin_arm64" ;;
    *)
      echo "Unsupported platform for Supabase CLI install: ${os}/${arch}" >&2
      exit 1
      ;;
  esac

  url="https://github.com/supabase/cli/releases/download/v${version}/supabase_${platform}.tar.gz"
  tmp_dir="$(mktemp -d)"

  echo "Installing Supabase CLI ${version} from ${url}..."
  curl -fsSL "${url}" -o "${tmp_dir}/supabase.tar.gz"
  tar -xzf "${tmp_dir}/supabase.tar.gz" -C "${tmp_dir}"

  mkdir -p "${HOME}/.local/bin"
  install -m 0755 "${tmp_dir}/supabase" "${HOME}/.local/bin/supabase"
  rm -rf "${tmp_dir}"
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
    # Setup uses generic non-zero exits; doctor.sh owns typed exit taxonomy.
    echo "Missing pinned value for ${key} in [${section}] of ${MISE_FILE}" >&2
    exit 1
  fi

  printf '%s' "${value}"
}

find_deno_cache_target() {
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

  echo "No Supabase function entrypoint found for Deno cache warmup." >&2
  exit 1
}

warm_deno_import_graph() {
  local entrypoint
  entrypoint="$(find_deno_cache_target)"

  echo "Warming Deno import graph via ${entrypoint}..."
  deno cache --no-lock "${entrypoint}"
}

cd "${REPO_ROOT}"

echo "Installing pinned toolchain with mise..."
mise trust --yes "${MISE_FILE}"
mise install
eval "$(mise activate bash)"

SUPABASE_CLI_VERSION="$(read_pin "env" "SUPABASE_CLI_VERSION")"

if ! command -v supabase >/dev/null 2>&1 || [[ "$(supabase --version | grep -Eo '[0-9]+(\.[0-9]+){1,2}' | head -n1)" != "${SUPABASE_CLI_VERSION}" ]]; then
  install_supabase_cli "${SUPABASE_CLI_VERSION}"
fi

echo "Installing npm dependencies from lockfile..."
npm ci

warm_deno_import_graph

echo "Running environment doctor..."
bash scripts/doctor.sh
