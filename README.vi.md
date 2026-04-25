# RTK MCP

RTK MCP là cầu nối desktop agent cho RTK. Package này cung cấp MCP tools, rules và skills để Claude Desktop, Codex và Antigravity dùng output gọn của RTK.

## Cài Nhanh

```bash
./setup.sh
```

Cài thủ công:

```bash
npm install
npm run build
node dist/cli.js setup --client all --mode all
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

## Claude Desktop

Setup ghi MCP server vào `claude_desktop_config.json`:

- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

Claude Desktop không chạy shell hook của RTK. Agent phải chọn MCP tools dựa trên mô tả tool và file hướng dẫn đã cài.

## Mô Hình An Toàn

`rtk_run` có thể chạy command local, nên luôn guard trước khi execute:

- Chặn shell chaining và redirect ngoài quote.
- Chặn command mutate file như `rm`, `mv`, `cp`, `chmod`, `touch`, `mkdir`.
- Yêu cầu `rtk rewrite` hỗ trợ trước khi chạy, nên RTK vẫn là allowlist nguồn.
- Lưu raw output khi lỗi vào `~/.rtk-mcp/tee` và đọc qua `rtk_read_log`.

## Chính Sách RTK Source

`RTK/` chỉ là clone local của upstream. Setup dùng `git clone` và `git pull --ff-only`. Không fork, không push, không đổi remote upstream.
