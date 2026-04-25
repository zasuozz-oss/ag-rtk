#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info() { echo -e "${CYAN}[INFO]${NC} $*"; }
ok() { echo -e "${GREEN}[OK]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err() { echo -e "${RED}[ERROR]${NC} $*"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RTK_DIR="$SCRIPT_DIR/RTK"

check_prereqs() {
  command -v node >/dev/null 2>&1 || { err "Node.js >= 18 required"; exit 1; }
  command -v npm >/dev/null 2>&1 || { err "npm required"; exit 1; }
  command -v git >/dev/null 2>&1 || { err "git required"; exit 1; }
  if ! command -v rtk >/dev/null 2>&1; then
    warn "rtk binary not found. Install RTK first: https://github.com/rtk-ai/rtk"
  else
    ok "$(rtk --version)"
  fi
}

sync_rtk_source() {
  info "Syncing RTK source clone"
  if [ -d "$RTK_DIR/.git" ]; then
    git -C "$RTK_DIR" pull --ff-only
    ok "RTK updated"
  else
    git clone https://github.com/rtk-ai/rtk.git "$RTK_DIR"
    ok "RTK cloned"
  fi
}

main() {
  check_prereqs
  sync_rtk_source
  npm install
  npm run build
  node dist/cli.js setup --client all --mode all --cwd "$SCRIPT_DIR"
  ok "RTK MCP setup complete. Restart Claude/Codex/Antigravity."
}

main "$@"
