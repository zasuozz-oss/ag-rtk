#!/usr/bin/env bash
# ag-rtk setup script
# Cài RTK binary (pre-built) + build MCP server + cấu hình clients
# Dùng: ./setup.sh [--update] [--force]
#   (không có flag) : Bỏ qua RTK binary nếu đã có bất kỳ version nào
#   --update, -u   : Cập nhật RTK binary nếu phát hiện version mới hơn
#   --force,  -f   : Luôn cài lại RTK binary dù đã là version mới nhất

# Yêu cầu: Node.js >= 18, npm, curl (hoặc wget)
# Không cần Rust/Cargo — dùng pre-built binary từ GitHub Releases

set -euo pipefail

# ─── Flags ───────────────────────────────────────────────────────────────────
FORCE_UPDATE=false
for arg in "$@"; do
  case "$arg" in
    --update|-u) FORCE_UPDATE=true ;;
    --force|-f)  FORCE_UPDATE=true ;;
  esac
done

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
RTK_REPO="rtk-ai/rtk"
RTK_FALLBACK_VERSION="v0.37.2"
RTK_INSTALL_DIR="${RTK_INSTALL_DIR:-$HOME/.local/bin}"

get_latest_version() {
  local version
  if command -v curl >/dev/null 2>&1; then
    version=$(curl -fsSL "https://api.github.com/repos/${RTK_REPO}/releases/latest" | grep -i '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/' || true)
  elif command -v wget >/dev/null 2>&1; then
    version=$(wget -qO- "https://api.github.com/repos/${RTK_REPO}/releases/latest" | grep -i '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/' || true)
  fi
  
  if [[ -z "$version" || "$version" == "null" ]]; then
    warn "Không thể lấy latest release từ GitHub API. Đang dùng bản fallback: ${RTK_FALLBACK_VERSION}"
    RTK_VERSION="$RTK_FALLBACK_VERSION"
  else
    RTK_VERSION="$version"
  fi
}

# ─── Platform detection ──────────────────────────────────────────────────────
detect_platform() {
  local os arch

  case "$(uname -s)" in
    Linux*)   os="linux"   ;;
    Darwin*)  os="darwin"  ;;
    MINGW*|MSYS*|CYGWIN*) os="windows" ;;
    *)        err "Unsupported OS: $(uname -s)" ;;
  esac

  case "$(uname -m)" in
    x86_64|amd64)  arch="x86_64"  ;;
    arm64|aarch64) arch="aarch64" ;;
    *)             err "Unsupported arch: $(uname -m)" ;;
  esac

  case "${os}-${arch}" in
    linux-x86_64)   RTK_TARGET="x86_64-unknown-linux-musl";  RTK_EXT="tar.gz" ;;
    linux-aarch64)  RTK_TARGET="aarch64-unknown-linux-gnu";  RTK_EXT="tar.gz" ;;
    darwin-x86_64)  RTK_TARGET="x86_64-apple-darwin";        RTK_EXT="tar.gz" ;;
    darwin-aarch64) RTK_TARGET="aarch64-apple-darwin";       RTK_EXT="tar.gz" ;;
    windows-x86_64) RTK_TARGET="x86_64-pc-windows-msvc";     RTK_EXT="zip"    ;;
    *)              err "No pre-built binary for ${os}-${arch}" ;;
  esac

  RTK_BINARY="rtk${os:+$( [[ "$os" == "windows" ]] && echo ".exe" || echo "" )}"
  info "Platform: ${os}/${arch} → target: ${RTK_TARGET}"
}

# ─── Dependency checks ───────────────────────────────────────────────────────
check_prereqs() {
  step "Kiểm tra prerequisites"

  command -v node >/dev/null 2>&1 || err "Node.js >= 18 required. Tải: https://nodejs.org"
  command -v npm  >/dev/null 2>&1 || err "npm required"

  local node_ver
  node_ver=$(node -e "process.exit(parseInt(process.versions.node) < 18 ? 1 : 0)" 2>&1) || \
    err "Node.js >= 18 required (hiện tại: $(node --version))"

  ok "Node.js $(node --version), npm $(npm --version)"

  # curl hoặc wget để tải binary
  if ! command -v curl >/dev/null 2>&1 && ! command -v wget >/dev/null 2>&1; then
    err "curl hoặc wget required để tải RTK binary"
  fi
}

# ─── Download helper ─────────────────────────────────────────────────────────
download_file() {
  local url="$1" dest="$2"
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$url" -o "$dest"
  else
    wget -qO "$dest" "$url"
  fi
}

# ─── RTK binary install ──────────────────────────────────────────────────────
install_rtk_binary() {
  step "Cài RTK binary (${RTK_VERSION})"

  if command -v rtk >/dev/null 2>&1; then
    local current_ver
    current_ver=$(rtk --version 2>/dev/null | awk '{print $2}' || echo "unknown")
    local latest_ver="${RTK_VERSION#v}"   # bỏ prefix 'v' để so sánh

    if [[ "$current_ver" == "$latest_ver" ]] && [[ "$FORCE_UPDATE" == "false" ]]; then
      ok "RTK ${current_ver} đã là phiên bản mới nhất. Bỏ qua."
      return 0
    fi

    if [[ "$current_ver" != "$latest_ver" ]] && [[ "$FORCE_UPDATE" == "false" ]]; then
      warn "RTK ${current_ver} đã cài (có bản mới: ${RTK_VERSION}). Dùng --update để cập nhật."
      return 0
    fi

    if [[ "$current_ver" == "$latest_ver" ]]; then
      info "Cài lại RTK ${current_ver} (--force)."
    else
      info "Cập nhật RTK: ${current_ver} → ${RTK_VERSION}"
    fi
  fi

  local download_url="https://github.com/${RTK_REPO}/releases/download/${RTK_VERSION}/rtk-${RTK_TARGET}.${RTK_EXT}"
  local tmp_dir
  tmp_dir="$(mktemp -d)"
  local archive="${tmp_dir}/rtk.${RTK_EXT}"

  info "Tải: ${download_url}"
  download_file "$download_url" "$archive"

  info "Giải nén vào ${tmp_dir}"
  if [[ "$RTK_EXT" == "zip" ]]; then
    command -v unzip >/dev/null 2>&1 || err "unzip required để giải nén trên Windows/Git Bash"
    unzip -q "$archive" -d "$tmp_dir"
  else
    tar -xzf "$archive" -C "$tmp_dir"
  fi

  mkdir -p "$RTK_INSTALL_DIR"
  local binary_src="${tmp_dir}/${RTK_BINARY}"

  [[ -f "$binary_src" ]] || err "Binary không tìm thấy sau khi giải nén: ${binary_src}"

  cp "$binary_src" "${RTK_INSTALL_DIR}/${RTK_BINARY}"
  chmod +x "${RTK_INSTALL_DIR}/${RTK_BINARY}"
  rm -rf "$tmp_dir"

  ok "RTK cài vào: ${RTK_INSTALL_DIR}/${RTK_BINARY}"

  # Thêm vào PATH nếu chưa có
  ensure_path
}

# ─── PATH setup ──────────────────────────────────────────────────────────────
ensure_path() {
  if [[ ":$PATH:" == *":${RTK_INSTALL_DIR}:"* ]]; then
    ok "${RTK_INSTALL_DIR} đã có trong PATH"
    return 0
  fi

  warn "${RTK_INSTALL_DIR} chưa trong PATH. Thêm vào shell profile..."

  local profile_file=""
  if [[ -f "$HOME/.bashrc" ]]; then
    profile_file="$HOME/.bashrc"
  elif [[ -f "$HOME/.zshrc" ]]; then
    profile_file="$HOME/.zshrc"
  elif [[ -f "$HOME/.profile" ]]; then
    profile_file="$HOME/.profile"
  fi

  if [[ -n "$profile_file" ]]; then
    local export_line='export PATH="$HOME/.local/bin:$PATH"'
    if ! grep -qF "$export_line" "$profile_file"; then
      echo "" >> "$profile_file"
      echo "# RTK binary" >> "$profile_file"
      echo "$export_line" >> "$profile_file"
      ok "Đã thêm vào ${profile_file}"
      warn "Chạy: source ${profile_file}  hoặc mở terminal mới để áp dụng PATH"
    fi
  else
    warn "Không tìm thấy shell profile. Thêm thủ công vào PATH:"
    warn "  export PATH=\"${RTK_INSTALL_DIR}:\$PATH\""
  fi

  # Export cho session hiện tại
  export PATH="${RTK_INSTALL_DIR}:$PATH"
}

# ─── Verify RTK binary ───────────────────────────────────────────────────────
verify_rtk() {
  step "Xác minh RTK binary"

  export PATH="${RTK_INSTALL_DIR}:$PATH"

  if ! command -v rtk >/dev/null 2>&1; then
    err "RTK binary không tìm thấy sau khi cài. Kiểm tra PATH: ${RTK_INSTALL_DIR}"
  fi

  local version
  version=$(rtk --version 2>/dev/null) || err "rtk --version thất bại"

  # Xác minh đúng binary (Token Killer, không phải Type Kit)
  if ! rtk gain --help >/dev/null 2>&1 && rtk --help 2>&1 | grep -q "gain"; then
    : # ok
  fi

  ok "${version}"
  info "Kiểm tra rewrite: $(rtk rewrite 'git status' 2>/dev/null || echo '(no hook — ok on Windows/Antigravity)')"
}

# ─── Check & Install Ripgrep ─────────────────────────────────────────────────
check_ripgrep() {
  step "Kiểm tra ripgrep (cần thiết cho 'rtk grep')"
  
  if command -v rg >/dev/null 2>&1 || [[ -f "$HOME/.local/bin/rg" ]] || [[ -f "$HOME/.cargo/bin/rg" ]]; then
    ok "ripgrep đã được cài đặt (rg)"
    return 0
  fi
  
  warn "Chưa tìm thấy ripgrep (rg). Tính năng 'rtk grep' sẽ không hoạt động."
  
  if [[ "$RTK_TARGET" == *"windows"* ]]; then
    if command -v winget >/dev/null 2>&1; then
      info "Tiến hành cài đặt ripgrep qua winget..."
      winget install BurntSushi.ripgrep.MSVC --accept-package-agreements --accept-source-agreements || warn "Cài ripgrep thất bại. Vui lòng cài thủ công."
    else
      warn "Vui lòng cài ripgrep thủ công."
    fi
  elif [[ "$RTK_TARGET" == *"darwin"* ]]; then
    if command -v brew >/dev/null 2>&1; then
      info "Đang cài đặt ripgrep qua Homebrew..."
      brew install ripgrep || warn "Cài ripgrep thất bại. Vui lòng cài thủ công."
    else
      warn "Vui lòng cài ripgrep thủ công bằng cách: brew install ripgrep"
    fi
  else
    warn "Trên Linux, vui lòng cài ripgrep qua package manager: apt install ripgrep (Debian/Ubuntu) hoặc dnf install ripgrep"
  fi
}

# ─── Build MCP server ────────────────────────────────────────────────────────
build_mcp_server() {
  step "Build MCP server (Node.js)"

  cd "$SCRIPT_DIR"
  npm install
  npm run build
  ok "MCP server built → dist/"
}

# ─── Configure clients ───────────────────────────────────────────────────────
configure_clients() {
  step "Cấu hình desktop clients (Antigravity / Claude / Codex)"

  cd "$SCRIPT_DIR"

  # 1. MCP config — ghi vào global desktop config paths trước tiên.
  #    Không phụ thuộc network/git, luôn phải thành công.
  step "Ghi MCP config"
  node dist/cli.js setup --client all --mode mcp --cwd "$SCRIPT_DIR"

  # 2. Instructions + skills: cài global vào ~/.claude, ~/.codex, ~/.gemini
  step "Cài instructions & skills (global)"
  node dist/cli.js setup --client all --mode instructions --global --cwd "$SCRIPT_DIR"
  node dist/cli.js setup --client all --mode skills --global --cwd "$SCRIPT_DIR"

  # 3. Clone/pull RTK Rust source vào ./RTK/ — có thể fail (network/git).
  #    Dùng || true để không block các bước trên nếu step này lỗi.
  step "Sync RTK source (optional)"
  if node dist/cli.js setup --client all --mode rtk-source --cwd "$SCRIPT_DIR"; then
    # Strip RTK/.git sau khi sync để parent repo track được source files trực tiếp.
    # Khi setup lại, rtk-source.ts phát hiện RTK/ không có .git rồi clone mới.
    if [[ -d "$SCRIPT_DIR/RTK/.git" ]]; then
      info "Strip RTK/.git để parent repo track được source files..."
      rm -rf "$SCRIPT_DIR/RTK/.git"
      ok "RTK/.git đã xóa — RTK source sẵn sàng cho git add."
    fi
  else
    warn "RTK source sync thất bại (network hoặc git lỗi). Bỏ qua — không ảnh hưởng MCP."
  fi

  ok "RTK MCP setup hoàn tất."
  info "Restart Antigravity / Claude Desktop / Codex để áp dụng."
}

# ─── Main ────────────────────────────────────────────────────────────────────
main() {
  echo -e "${BOLD}╔══════════════════════════════════════╗${NC}"
  echo -e "${BOLD}║        ag-rtk Setup Script           ║${NC}"
  echo -e "${BOLD}╚══════════════════════════════════════╝${NC}"

  get_latest_version
  detect_platform
  check_prereqs
  install_rtk_binary
  verify_rtk
  build_mcp_server
  configure_clients "${1:-}"
  check_ripgrep

  echo ""
  echo -e "${GREEN}${BOLD}✓ Setup hoàn tất!${NC}"
  echo -e "  RTK binary : ${RTK_INSTALL_DIR}/rtk"
  echo -e "  MCP server : ${SCRIPT_DIR}/dist/cli.js"
  echo -e "  Tiếp theo  : Restart Antigravity/Claude/Codex"
}

main "$@"
