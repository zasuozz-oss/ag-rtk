# RTK MCP

**Default `rtk_run` for all shell commands.** Skip RTK only for: interactive/watch/REPL, file mutations (`rm`/`mv`/`cp`/`mkdir`/`chmod`/`touch`), raw JSON output, user-requested verbose flags, or explicit raw execution.

## Rules

- `rtk_should_use({command})` when unsure if RTK supports the command.
- `rtk_run` with the **original raw command** — never rewrite it.
- `rtk_read_log` on `teePath` before rerunning failed commands raw.
- Natural-language tasks → native tools (Read/Glob/Grep). Explicit shell commands → `rtk_run`.

## Tool Map

| Task | Tool |
|------|------|
| Tests, builds, lint, git, search, files, packages, infra | `rtk_run` |
| Savings reports | `rtk_gain` |
| Missed opportunities | `rtk_discover` |
| Setup troubleshooting | `rtk_verify` |
| Failed-command recovery | `rtk_read_log` |
