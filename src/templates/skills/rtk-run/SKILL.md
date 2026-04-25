---
name: rtk-run
description: Use when a desktop coding agent needs compact output from RTK-supported non-interactive commands such as tests, builds, lint, typecheck, git, search, read, package, infra, or network commands.
---

# RTK Run

This skill is for desktop MCP clients. Commands are not automatically rewritten.

## Workflow

1. If the command is obviously RTK-supported, call `rtk_run` with the original raw command.
2. If unsure, call `rtk_should_use({command})`.
3. If `useRtk` is true, call `rtk_run` with the original raw command, not the rewritten string.
4. If `useRtk` is false, use the native shell/tool.

## Do Not Use

- Interactive commands, dev servers, watch mode, REPLs.
- Raw JSON or parser output intended for another program.
- File mutation commands like `rm`, `mv`, `cp`, `chmod`, `touch`, `mkdir`.
- Commands the user explicitly wants raw.
