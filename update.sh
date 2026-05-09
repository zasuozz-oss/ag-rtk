#!/usr/bin/env bash
# ag-rtk update script
# Cập nhật RTK binary từ repo gốc + rebuild custom MCP cho Antigravity
#
# Dùng: ./update.sh
#
# Script này:
#   1. Pull latest ag-rtk repo
#   2. Sync RTK source từ repo gốc (rtk-ai/rtk)
#   3. Rebuild custom MCP server (Antigravity only)
#   4. Cài lại instructions & skills
#
# Các client khác (dùng repo gốc, không cần script này):
#   claude-code : rtk init -g
#   codex-cli   : rtk init -g --codex

set -euo pipefail

# ─── Colors ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info() { echo -e "${CYAN}[INFO]${NC} $*"; }
ok()   { echo -e "${GREEN}[OK]${NC}   $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }
step() { echo -e "\n${BOLD}▶ $*${NC}"; }

# ─── Constants ───────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RTK_UPSTREAM="https://github.com/rtk-ai/rtk.git"
RTK_SOURCE_DIR="${SCRIPT_DIR}/RTK"

# ─── Pull latest repo ────────────────────────────────────────────────────────
pull_repo() {
  step "Pull latest ag-rtk repo"

  cd "$SCRIPT_DIR"

  if [[ ! -d ".git" ]]; then
    err "Không phải git repo. Chạy script này từ thư mục ag-rtk."
  fi

  local before_hash after_hash
  before_hash=$(git rev-parse HEAD 2>/dev/null)

  git pull --ff-only || {
    warn "git pull --ff-only thất bại. Thử git pull thường..."
    git pull || err "git pull thất bại. Resolve conflicts thủ công rồi chạy lại."
  }

  after_hash=$(git rev-parse HEAD 2>/dev/null)

  if [[ "$before_hash" == "$after_hash" ]]; then
    ok "Repo đã mới nhất — không có thay đổi."
  else
    ok "Repo đã cập nhật: ${before_hash:0:7} → ${after_hash:0:7}"
  fi
}

# ─── Sync RTK source (repo gốc → .RTK/ → RTK/) ──────────────────────────────
# Chiến lược:
#   .RTK/ = hidden clone cache (có .git, gitignored) — dùng để pull upstream
#   RTK/  = working copy — chỉ cập nhật file mới/thay đổi, KHÔNG xóa custom edits
sync_rtk_source() {
  step "Sync RTK source từ repo gốc (rtk-ai/rtk)"

  local cache_dir="${SCRIPT_DIR}/.RTK"

  # ── Bước 1: Clone hoặc pull vào .RTK/ (hidden cache) ──
  if [[ -d "${cache_dir}/.git" ]]; then
    info "Cache .RTK/ đã có — pulling latest..."
    git -C "$cache_dir" pull --ff-only || {
      warn "git pull --ff-only thất bại. Thử git pull thường..."
      git -C "$cache_dir" pull || {
        warn "Pull .RTK/ thất bại. Bỏ qua — dùng bản cache cũ."
        # Vẫn tiếp tục sync từ cache cũ
      }
    }
  else
    # Xóa .RTK/ nếu tồn tại nhưng không có .git (hỏng)
    if [[ -d "$cache_dir" ]]; then
      info ".RTK/ tồn tại nhưng không có .git — xóa để clone mới..."
      rm -rf "$cache_dir"
    fi
    info "Clone RTK source vào .RTK/..."
    git clone "$RTK_UPSTREAM" "$cache_dir" || {
      warn "Clone thất bại (network/git lỗi). Bỏ qua."
      return 0
    }
  fi

  ok "Cache .RTK/ đã sẵn sàng."

  # ── Bước 2: Sync .RTK/ → RTK/ (an toàn, không ghi đè custom edits) ──
  step "Sync .RTK/ → RTK/ (chỉ thêm/cập nhật, giữ custom edits)"

  mkdir -p "$RTK_SOURCE_DIR"

  if command -v rsync >/dev/null 2>&1; then
    # rsync: chỉ cập nhật file mới hơn, không xóa file extra trong RTK/
    rsync -a --update --exclude='.git' "${cache_dir}/" "${RTK_SOURCE_DIR}/"
    ok "Đã rsync .RTK/ → RTK/ (giữ nguyên custom edits)."
  else
    # Fallback: cp chỉ thay thế file cũ hơn (--update trên GNU cp)
    # Trên macOS/Windows Git Bash có thể không hỗ trợ --update, dùng cách khác
    info "rsync không có — dùng cp fallback..."
    # Copy toàn bộ, loại trừ .git
    cd "$cache_dir"
    find . -not -path './.git/*' -not -name '.git' -type f | while read -r file; do
      local src="${cache_dir}/${file}"
      local dst="${RTK_SOURCE_DIR}/${file}"
      local dst_dir
      dst_dir=$(dirname "$dst")
      mkdir -p "$dst_dir"
      # Chỉ copy nếu file đích chưa tồn tại hoặc nguồn mới hơn
      if [[ ! -f "$dst" ]] || [[ "$src" -nt "$dst" ]]; then
        cp "$src" "$dst"
      fi
    done
    cd "$SCRIPT_DIR"
    ok "Đã copy .RTK/ → RTK/ (giữ nguyên custom edits)."
  fi

  ok "RTK source đã sync thành công."
}

# ─── Rebuild MCP server ──────────────────────────────────────────────────────
rebuild_mcp() {
  step "Rebuild custom MCP server (Antigravity)"

  cd "$SCRIPT_DIR"

  npm install --prefer-offline 2>/dev/null || npm install
  npm run build

  ok "MCP server rebuilt → dist/"
}

# ─── Reinstall instructions & skills ─────────────────────────────────────────
reinstall_config() {
  step "Cập nhật instructions & skills (Antigravity)"

  cd "$SCRIPT_DIR"

  if [[ ! -f "dist/cli.js" ]]; then
    err "dist/cli.js không tìm thấy. Chạy rebuild trước."
  fi

  node dist/cli.js setup --client antigravity --mode mcp --cwd "$SCRIPT_DIR"
  node dist/cli.js setup --client antigravity --mode instructions --global --cwd "$SCRIPT_DIR"
  node dist/cli.js setup --client antigravity --mode skills --global --cwd "$SCRIPT_DIR"

  ok "Instructions & skills đã cập nhật."
}

# ─── Main ────────────────────────────────────────────────────────────────────
main() {
  echo -e "${BOLD}╔══════════════════════════════════════╗${NC}"
  echo -e "${BOLD}║        ag-rtk Update Script          ║${NC}"
  echo -e "${BOLD}╚══════════════════════════════════════╝${NC}"

  pull_repo
  sync_rtk_source
  rebuild_mcp
  reinstall_config

  echo ""
  echo -e "${GREEN}${BOLD}✓ Update hoàn tất!${NC}"
  echo -e "  Tiếp theo : Restart Antigravity để áp dụng."
  echo ""
  echo -e "${BOLD}Cập nhật RTK binary (nếu cần):${NC}"
  echo -e "  ${CYAN}./setup.sh --update${NC}"
  echo ""
  echo -e "${BOLD}Các client khác (dùng repo gốc):${NC}"
  echo -e "  Claude Code : ${CYAN}rtk init -g${NC}"
  echo -e "  Codex CLI   : ${CYAN}rtk init -g --codex${NC}"
}

main "$@"
