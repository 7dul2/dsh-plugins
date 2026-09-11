#!/bin/bash
# Install (or update) the dsh runtime the managed launcher boots from:
# a dedicated pnpm project under $DSH_RUNTIME_DIR holding @deepseek-ai/dsh.
#
# Usage: install-runtime.sh [version]   (default: latest)
# Environment:
#   DSH_RUNTIME_DIR  runtime directory (default ~/.dsh/runtime)

set -euo pipefail
RUNTIME_DIR="${DSH_RUNTIME_DIR:-$HOME/.dsh/runtime}"
VERSION="${1:-latest}"

if ! command -v pnpm >/dev/null 2>&1; then
	echo "[install-runtime] pnpm not found on PATH — install pnpm first" >&2
	exit 1
fi

mkdir -p "$RUNTIME_DIR"
cd "$RUNTIME_DIR"
if [ ! -f package.json ]; then
	pnpm init
fi
pnpm add "@deepseek-ai/dsh@${VERSION}"

echo "[install-runtime] runtime ready: $RUNTIME_DIR"
echo "[install-runtime] start it with: bin/dsh-web (next to this script)"
