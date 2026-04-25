---
name: rtk-setup
description: Use when installing, verifying, or troubleshooting RTK MCP, RTK binary, desktop app config, skills, rules, or agent instructions.
---

# RTK Setup

Use `rtk_verify` first. Then check MCP config and instruction files for the target client.

## Client Files

| Client | MCP | Instructions |
|---|---|---|
| Claude Desktop | Windows `%APPDATA%\Claude\claude_desktop_config.json`; macOS `~/Library/Application Support/Claude/claude_desktop_config.json`; Linux `~/.config/Claude/claude_desktop_config.json` | `CLAUDE.md`, `RTK.md`, skills |
| Codex | `~/.codex/config.toml` | `AGENTS.md`, `RTK.md`, skills |
| Antigravity | `~/.gemini/antigravity/mcp_config.json` | `.agents/rules`, `.agents/skills` |
