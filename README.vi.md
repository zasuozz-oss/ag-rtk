# RTK MCP

RTK MCP là cầu nối desktop agent cho RTK. Package này cung cấp MCP tools, rules và skills để Claude Desktop, Codex và Antigravity dùng output gọn của RTK.

## Cài Nhanh

```bash
# 1. Build
npm install && npm run build

# 2. Cài RTK binary + cấu hình tất cả client (khuyến nghị dùng global)
bash setup.sh

# Cập nhật RTK binary khi có phiên bản mới
bash setup.sh --update
```

## MCP Tools

| Tool | Dùng để làm gì |
|---|---|
| `rtk_should_use` | Kiểm tra command có nên chạy qua RTK không |
| `rtk_run` | Chạy command non-interactive được RTK hỗ trợ |
| `rtk_read_log` | Đọc tee log đầy đủ trong `~/.rtk-mcp/tee` sau command lỗi |
| `rtk_gain` | Xem thống kê token tiết kiệm |
| `rtk_discover` | Tìm cơ hội RTK bị bỏ lỡ |
| `rtk_verify` | Kiểm tra RTK binary và setup cơ bản |

## Global vs Workspace

| Chế độ | Flag | Hoạt động |
|--------|------|-----------|
| **Global** | `--global` / `-g` | Ghi thêm RTK rules vào file instruction global + copy skills vào thư mục skills global |
| **Workspace** | _(mặc định)_ | Copy files vào `cwd/.agents/` hoặc `cwd/.claude/` |

### Đường dẫn global từng client

| Client | Instructions | Skills |
|--------|-------------|--------|
| Antigravity | `~/.gemini/GEMINI.md` | `~/.gemini/antigravity/skills/` |
| Claude | `~/.claude/CLAUDE.md` | `~/.claude/skills/` |
| Codex | `~/.codex/AGENTS.md` | `~/.codex/skills/` |

Chế độ global dùng sentinel markers (`<!-- RTK_RULES_START/END -->`) để ghi thêm/cập nhật RTK mà không xóa nội dung cũ.

## Custom Overlay

Đặt file vào `custom/` để ghi đè mặc định mà không cần sửa repo gốc:

```
custom/
├── instructions/
│   └── RTK.md          # Ghi đè src/templates/instructions/RTK.md
└── skills/
    └── rtk-run/
        └── SKILL.md    # Ghi đè src/templates/skills/rtk-run/SKILL.md
```

`setup.sh` tự động áp dụng overlay. File nào trong `custom/` sẽ ưu tiên hơn `src/templates/`.

## Hỗ Trợ Command

RTK hỗ trợ 100+ command. Với các command RTK có filter module nhưng chưa có trong registry (ví dụ `npm test`, `pnpm install`), bridge tự pre-normalize qua local rewrites. Command không nhận dạng được sẽ fallback về `rtk proxy <cmd>` để chạy raw có tracking.

## Mô Hình An Toàn

`rtk_run` có thể chạy command local, nên luôn guard trước khi execute:

- Chặn shell chaining và redirect ngoài quote.
- Chặn command mutate file như `rm`, `mv`, `cp`, `chmod`, `touch`, `mkdir`.
- Lưu raw output khi lỗi vào `~/.rtk-mcp/tee` và đọc qua `rtk_read_log`.

## Chính Sách RTK Source

`RTK/` chỉ là clone local của upstream. Setup dùng `git clone` và `git pull --ff-only`. Không fork, không push, không đổi remote upstream. Nếu `RTK/` được commit lên git (ví dụ để backup), setup tự xóa `RTK/.git` trước khi sync.

## Test Trigger Behavior

Xem [`custom/test-trigger.md`](custom/test-trigger.md) để biết 20 test case kiểm tra khi nào agent dùng đúng `rtk_run` vs native shell. Paste từng prompt vào conversation mới trên desktop client và quan sát tool nào được gọi.
