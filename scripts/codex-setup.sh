#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
MISE_INSTALL_URL="https://mise.run"
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

cd "${REPO_ROOT}"

echo "Installing pinned toolchain with mise..."
mise trust --yes mise.toml
mise install
eval "$(mise activate bash)"

SUPABASE_CLI_VERSION="$(mise env --json | node -e 'const fs=require("fs");const data=JSON.parse(fs.readFileSync(0,"utf8"));if(!data.SUPABASE_CLI_VERSION){process.exit(1)}process.stdout.write(String(data.SUPABASE_CLI_VERSION));')"

if ! command -v supabase >/dev/null 2>&1 || [[ "$(supabase --version | grep -Eo '[0-9]+(\.[0-9]+){1,2}' | head -n1)" != "${SUPABASE_CLI_VERSION}" ]]; then
  install_supabase_cli "${SUPABASE_CLI_VERSION}"
fi

echo "Installing npm dependencies from lockfile..."
npm ci

echo "Running environment doctor..."
bash scripts/doctor.sh
