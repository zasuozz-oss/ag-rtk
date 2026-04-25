# RTK MCP

Desktop clients do not auto-rewrite shell commands. **Default to `rtk_run` for all shell commands.** Only use native shell for: interactive commands (dev servers, watch mode, REPLs), file mutations (`rm`/`mv`/`cp`/`mkdir`/`chmod`/`touch`), raw JSON/parser output, or when the user explicitly wants unfiltered output.

## Always

- Use `rtk_should_use({command})` when RTK support is uncertain and output may be long.
- Use `rtk_run` with the **original raw command** when `rtk_should_use.useRtk` is true.
- Use `rtk_read_log` on `teePath` before rerunning failed commands raw.

## Never

- Do not use `rtk_run` for interactive commands, dev servers, watch mode, REPLs, raw JSON/parser output, or file mutation commands (`rm`, `mv`, `cp`, `chmod`, `touch`, `mkdir`).
- Do not use `rtk_run` when the user explicitly asks for raw/no-RTK execution.
- Do not use `rtk_run` for commands where the user passed verbose/detailed flags intentionally (e.g. `--nocapture`, `--verbose`).
- Do not use `rtk_run` when the user describes a task in natural language and a native agent tool (Read, Glob, Grep) can satisfy it directly — e.g. "show me the contents of X" → Read tool. Exception: if the user explicitly says to run a specific shell command (e.g. "run cat X", "run ls -la"), always use `rtk_run`.

## RTK Workflows

| Task | Tool |
|------|------|
| Tests, builds, lint, typecheck, git, search, files, package, infra, network | `rtk_run` |
| Savings reports | `rtk_gain` |
| Missed RTK opportunities | `rtk_discover` |
| Setup troubleshooting | `rtk_verify` |
| Failed-command recovery | `rtk_read_log` |
| Full command reference (100+ commands) | `rtk-commands` skill |

## Related Skills

| Situation | Skill |
|-----------|-------|
| Running commands with compact output | `rtk-run` |
| Recovering detail from failed commands | `rtk-recover` |
| Analyzing savings and optimization | `rtk-gain` |
| Installing or troubleshooting RTK | `rtk-setup` |
| Overview of all RTK tools and skills | `rtk-guide` |
| Full command reference and cheat sheet | `rtk-commands` |
