# RTK MCP

Desktop clients do not auto-rewrite shell commands. Use RTK MCP when command output should be compact.

`rtk_init` is a Claude Code hook installer, not a Claude Desktop auto-rewrite mechanism. In Claude Desktop, Codex, and Antigravity, tool choice depends on these instructions plus MCP tool descriptions.

## Always

- Use `rtk_should_use({command})` when RTK support is uncertain and output may be long.
- Use `rtk_run` with the original raw command when `rtk_should_use.useRtk` is true.
- Use `rtk_read_log` on `teePath` before rerunning failed commands raw.

## Never

- Do not use `rtk_run` for interactive commands, dev servers, watch mode, REPLs, raw JSON/parser output, or file mutation commands like `rm`, `mv`, `cp`, `chmod`, `touch`, `mkdir`.
- Do not use `rtk_run` when the user explicitly asks for raw/no-RTK execution.

## Common RTK Workflows

Use `rtk_run` for supported non-interactive tests, builds, lint/typecheck, git, file search/read/list, package managers, infra, network, and diagnostics commands.

Use `rtk_gain` for savings reports.
Use `rtk_discover` for missed opportunities.
Use `rtk_verify` for setup troubleshooting.
Use `rtk_read_log` for failed-command recovery.
