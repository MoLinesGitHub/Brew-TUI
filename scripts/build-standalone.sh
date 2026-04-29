#!/usr/bin/env bash
# Build a single-file standalone binary using Bun.
# Eliminates the Homebrew node@22 dependency chain (24+ packages on first install)
# at the cost of a ~60 MB self-contained executable.
#
# Status: EXPERIMENTAL. Validated:
#   - Build succeeds (bun-darwin-arm64)
#   - Non-interactive subcommands work (`status`, `revalidate`)
#   - i18n works (LANG=es)
#   - Ink loads correctly (raw-mode error path reached when stdin is not a TTY)
# Pending:
#   - Manual interactive TUI validation in a real terminal
#   - linux-x64 / linux-arm64 / darwin-x64 cross-compile validation
#   - @inkjs/ui native module behavior (TextInput, Spinner)
#   - Smart Cleanup / Security Audit views (heavy features)
#
# Usage:
#   ./scripts/build-standalone.sh [target]
# Targets: bun-darwin-arm64 (default), bun-darwin-x64, bun-linux-x64, bun-linux-arm64

set -euo pipefail

TARGET="${1:-bun-darwin-arm64}"
OUT_DIR="dist-standalone"
OUT="${OUT_DIR}/brew-tui-${TARGET}"

if ! command -v bun >/dev/null 2>&1; then
  echo "bun not found. Install with: brew install oven-sh/bun/bun"
  exit 1
fi

if [[ ! -f build/index.js ]]; then
  echo "build/index.js missing. Running 'npm run build' first."
  npm run build
fi

mkdir -p "${OUT_DIR}"

bun build \
  --compile \
  --target="${TARGET}" \
  --outfile="${OUT}" \
  build/index.js

echo
echo "Built: ${OUT}"
ls -lh "${OUT}"
file "${OUT}"
