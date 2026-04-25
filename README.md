# RTK MCP

RTK MCP is a desktop agent bridge for RTK. It gives Claude Desktop, Codex, and Antigravity MCP tools plus rules and skills for compact command output.

## Quick Start

```bash
./setup.sh
```

Manual:

```bash
npm install
npm run build
node dist/cli.js setup --client all --mode all
```

## MCP Tools

| Tool | Use |
|---|---|
| `rtk_should_use` | Decide whether a command should use RTK |
| `rtk_run` | Run supported non-interactive command through RTK |
| `rtk_read_log` | Read failed-command tee logs from `~/.rtk-mcp/tee` |
| `rtk_gain` | Show savings analytics |
| `rtk_discover` | Find missed opportunities |
| `rtk_verify` | Verify setup |

## Claude Desktop

Setup writes the MCP server entry to `claude_desktop_config.json`:

- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

Claude Desktop does not run RTK shell hooks. It must choose the MCP tools from descriptions and installed instruction files.

## Security Model

`rtk_run` executes local commands, so it is guarded before execution:

- Blocks shell chaining and redirection outside quotes.
- Blocks known file mutation commands such as `rm`, `mv`, `cp`, `chmod`, `touch`, and `mkdir`.
- Requires `rtk rewrite` support before execution, so RTK remains the command support allowlist.
- Saves failed raw output under `~/.rtk-mcp/tee` and exposes it through `rtk_read_log`.

## RTK Source Policy

`RTK/` is a local upstream clone only. Setup uses `git clone` and `git pull --ff-only`. It never forks, pushes, or changes upstream remotes.
