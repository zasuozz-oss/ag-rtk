---
name: rtk-commands
description: Use when you need a quick reference for which RTK commands exist, what they do, expected token savings per command, and which flags affect compression behavior
---

# RTK Commands Reference

## Overview

RTK supports **100+ commands** across all major development ecosystems. This skill is a quick-reference cheat sheet so you know exactly which commands to route through `rtk_run`.

**Core principle:** If a command produces text output and is non-interactive, RTK almost certainly supports it. When unsure, use `rtk_should_use` to check.

## Command Categories

### 📁 Files (replaces ls, cat, find, grep)

| RTK Command | Replaces | Savings | Notes |
|-------------|----------|---------|-------|
| `rtk ls .` | `ls`, `tree` | ~80% | Token-optimized directory tree |
| `rtk read file.rs` | `cat`, `head`, `tail` | ~30% | Smart file reading, minimal filter |
| `rtk read file.rs -l aggressive` | `cat` | ~74% | Signatures only, strips function bodies |
| `rtk read file.rs -l none` | `cat` | 0% | No filtering, raw output |
| `rtk smart file.rs` | — | ~95% | 2-line heuristic code summary |
| `rtk find "*.rs" .` | `find`, `fd` | ~80% | Grouped by directory |
| `rtk grep "pattern" .` | `grep`, `rg` | ~80% | Grouped by file |
| `rtk diff file1 file2` | `diff` | ~60% | Condensed diff |
| `rtk wc` | `wc` | ~50% | Compact word/line count |

### 🔀 Git

| RTK Command | Savings | Output Example |
|-------------|---------|----------------|
| `rtk git status` | ~80% | `main \| 3M 1? 1A` + file list |
| `rtk git log -n 10` | ~80% | One-line per commit: `abc123 Fix bug` |
| `rtk git diff` | ~75% | `file.rs (+5/-2)` + changed lines |
| `rtk git show` | ~80% | Commit summary + stat + compact diff |
| `rtk git add` | ~92% | `ok` |
| `rtk git commit -m "msg"` | ~92% | `ok abc1234` |
| `rtk git push` | ~92% | `ok main` |
| `rtk git pull` | ~92% | `ok 3 files +10 -2` |
| `rtk git fetch` | ~90% | `ok fetched (N new refs)` |
| `rtk git branch` | ~70% | Compact branch list |
| `rtk git stash` | ~80% | Compact stash operations |

**Passthrough:** Unsupported git subcommands (rebase, cherry-pick, tag, etc.) are passed to git unchanged, output tracked.

### 🐙 GitHub CLI

| RTK Command | Savings |
|-------------|---------|
| `rtk gh pr list` | ~80% |
| `rtk gh pr view 42` | ~87% |
| `rtk gh pr checks` | ~79% |
| `rtk gh issue list` | ~80% |
| `rtk gh run list` | ~82% |
| `rtk gh api <endpoint>` | ~26% |

### 🧪 Test Runners

| RTK Command | Savings | Strategy |
|-------------|---------|----------|
| `rtk cargo test` | ~90% | Failures only |
| `rtk cargo nextest run` | ~90% | Failures only |
| `rtk jest` | ~99% | Failures only |
| `rtk vitest` | ~99% | Failures only |
| `rtk playwright test` | ~94% | Failures only |
| `rtk pytest` | ~90% | Failures only |
| `rtk go test` | ~90% | NDJSON parsing |
| `rtk rake test` | ~90% | Failures only |
| `rtk rspec` | ~60%+ | JSON parsing |
| `rtk test <any command>` | ~90% | Generic wrapper — failures only |
| `rtk err <any command>` | ~80% | Errors/warnings only |

### 🔨 Build & Lint

| RTK Command | Savings |
|-------------|---------|
| `rtk cargo build` | ~80% |
| `rtk cargo check` | ~80% |
| `rtk cargo clippy` | ~80% |
| `rtk tsc` | ~83% |
| `rtk lint` / `rtk lint biome` | ~84% |
| `rtk next build` | ~87% |
| `rtk prettier --check .` | ~70% |
| `rtk ruff check` | ~80% |
| `rtk mypy` | ~70% |
| `rtk golangci-lint run` | ~85% |
| `rtk rubocop` | ~60%+ |
| `rtk dotnet build` | ~70% |

### 📦 Package Managers

| RTK Command | Savings |
|-------------|---------|
| `rtk pnpm list` | ~70% |
| `rtk pip list` / `pip outdated` | ~60% |
| `rtk bundle install` | ~60% |
| `rtk prisma generate` | ~80% |
| `rtk cargo install` | ~70% |

### 🐳 Containers & Cloud

| RTK Command | Savings |
|-------------|---------|
| `rtk docker ps` | ~80% |
| `rtk docker images` | ~70% |
| `rtk docker logs <container>` | ~60% |
| `rtk docker compose ps` | ~70% |
| `rtk kubectl pods` | ~70% |
| `rtk kubectl logs <pod>` | ~60% |
| `rtk kubectl services` | ~70% |
| `rtk aws sts get-caller-identity` | ~70% |
| `rtk aws ec2 describe-instances` | ~70% |
| `rtk aws lambda list-functions` | ~80% |
| `rtk aws s3 ls` | ~60% |

### 📊 Data & Analytics

| RTK Command | Savings | Notes |
|-------------|---------|-------|
| `rtk json config.json` | ~70% | Structure without values |
| `rtk deps` | ~60% | Dependencies summary |
| `rtk env -f AWS` | ~80% | Filtered env vars |
| `rtk log app.log` | ~70% | Deduplicated logs |
| `rtk curl <url>` | ~50% | Truncate + save full |
| `rtk wget <url>` | ~50% | Download, strip progress |
| `rtk summary <cmd>` | ~80% | Heuristic summary |
| `rtk proxy <cmd>` | 0% | Raw passthrough + tracking |

### 📈 Token Savings Analytics

| RTK Command | Purpose |
|-------------|---------|
| `rtk gain` | Summary stats |
| `rtk gain --graph` | ASCII graph (last 30 days) |
| `rtk gain --history` | Recent command history |
| `rtk gain --daily` | Day-by-day breakdown |
| `rtk gain --all --format json` | JSON export |
| `rtk discover` | Find missed savings opportunities |
| `rtk session` | RTK adoption across recent sessions |

## Flag-Aware Behavior

RTK respects user intent via flags:

| Scenario | Behavior |
|----------|----------|
| Default (no flags) | Aggressive compression |
| `--nocapture` / `--verbose` | Preserves more output (user asked for detail) |
| `-u` / `--ultra-compact` | Extra compression with ASCII icons |
| `-v` / `-vv` / `-vvv` | Shows filtering details on stderr |

## Passthrough / Fallback

If RTK doesn't recognize a command or subcommand, it **executes the raw command unchanged** and tracks the event. RTK **never blocks** command execution.

## Custom Filters

Users can add custom TOML filters in:
- `~/.config/rtk/filters/` — Global filters
- `<project>/.rtk/filters/` — Project-local filters

```toml
[filter]
command = "my-cmd"
strip_lines_matching = ["^Verbose:", "^Debug:"]
keep_lines_matching = ["^error", "^warning"]
max_lines = 50
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Not using RTK for `git status` | One of the highest-savings commands (~80%) |
| Using RTK for dev servers | Dev servers are interactive — use native shell |
| Forgetting `rtk test <cmd>` wrapper | Wraps any test runner for failures-only output |
| Not checking `rtk discover` | Shows which commands you missed |
| Using raw `cat` instead of `rtk read` | `rtk read` is always shorter |
