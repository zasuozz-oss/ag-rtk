# RTK MCP

RTK MCP is a desktop agent bridge for RTK. It gives Claude Desktop, Codex, and Antigravity MCP tools plus rules and skills for compact command output.

## Quick Start

```bash
# 1. Build
npm install && npm run build

# 2. Install RTK binary + configure all clients (global recommended)
bash setup.sh

# Update RTK binary when a new version is available
bash setup.sh --update
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

## Global vs Workspace Install

| Mode | Flag | What it does |
|------|------|-------------|
| **Global** | `--global` / `-g` | Appends RTK rules to global instruction file + copies skills to global skills dir |
| **Workspace** | _(default)_ | Copies files to `cwd/.agents/` or `cwd/.claude/` |

### Global paths per client

| Client | Instructions | Skills |
|--------|-------------|--------|
| Antigravity | `~/.gemini/GEMINI.md` | `~/.gemini/antigravity/skills/` |
| Claude | `~/.claude/CLAUDE.md` | `~/.claude/skills/` |
| Codex | `~/.codex/AGENTS.md` | `~/.codex/skills/` |

Global mode uses sentinel markers (`<!-- RTK_RULES_START/END -->`) to safely append/update RTK content without touching existing rules.

## Custom Overlay

Drop files into `custom/` to override defaults without touching the repo:

```
custom/
├── instructions/
│   └── RTK.md          # Overrides src/templates/instructions/RTK.md
└── skills/
    └── rtk-run/
        └── SKILL.md    # Overrides src/templates/skills/rtk-run/SKILL.md
```

`setup.sh` applies the overlay automatically. Any file in `custom/` takes precedence over `src/templates/`.

## Command Support

RTK natively supports 100+ commands. For commands RTK has filter modules for but are missing from its registry (e.g. `npm test`, `pnpm install`), the bridge pre-normalizes them via local rewrites. Unrecognized commands fall back to `rtk proxy <cmd>` for tracked raw execution.

## Security Model

`rtk_run` executes local commands, so it is guarded before execution:

- Blocks shell chaining and redirection outside quotes.
- Blocks known file mutation commands such as `rm`, `mv`, `cp`, `chmod`, `touch`, and `mkdir`.
- Saves failed raw output under `~/.rtk-mcp/tee` and exposes it through `rtk_read_log`.

## RTK Source Policy

`RTK/` is a local upstream clone only. Setup uses `git clone` and `git pull --ff-only`. It never forks, pushes, or changes upstream remotes. If `RTK/` is committed to git (e.g. as backup), setup automatically strips `RTK/.git` before syncing.

## Testing Trigger Behavior

See [`custom/test-trigger.md`](custom/test-trigger.md) for 20 test cases that validate when agents correctly use `rtk_run` vs native shell tools. Run each prompt in a fresh desktop client conversation and observe which tools are called.
