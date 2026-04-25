# RTK MCP

Desktop clients do not auto-rewrite shell commands. Use RTK MCP when command output should be compact.

`rtk_init` is a Claude Code hook installer, not a desktop auto-rewrite mechanism. In Claude Desktop, Codex, and Antigravity, tool choice depends on these instructions plus MCP tool descriptions.

## Always

- Use `rtk_should_use({command})` when RTK support is uncertain and output may be long.
- Use `rtk_run` with the **original raw command** when `rtk_should_use.useRtk` is true.
- Use `rtk_read_log` on `teePath` before rerunning failed commands raw.

## Never

- Do not use `rtk_run` for interactive commands, dev servers, watch mode, REPLs, raw JSON/parser output, or file mutation commands (`rm`, `mv`, `cp`, `chmod`, `touch`, `mkdir`).
- Do not use `rtk_run` when the user explicitly asks for raw/no-RTK execution.
- Do not use `rtk_run` for commands where the user passed verbose/detailed flags intentionally (e.g. `--nocapture`, `--verbose`) — RTK respects flag-aware output but the user may want full raw detail.

## Common RTK Workflows

| Task | Tool |
|------|------|
| Non-interactive tests, builds, lint, typecheck, git, search, read, list, package, infra, network | `rtk_run` |
| Savings reports | `rtk_gain` |
| Missed RTK opportunities | `rtk_discover` |
| Setup troubleshooting | `rtk_verify` |
| Failed-command recovery | `rtk_read_log` |

## Supported Commands (100+)

RTK achieves 60-90% token savings across all major ecosystems:

### Files
| Command | Description | Savings |
|---------|-------------|---------|
| `rtk ls` | Directory listing (replaces `ls`, `tree`) | ~80% |
| `rtk read <file>` | Smart file reading (replaces `cat`, `head`, `tail`) | ~30-74% |
| `rtk read <file> -l aggressive` | Signatures only (strips function bodies) | ~74% |
| `rtk smart <file>` | 2-line heuristic code summary | ~95% |
| `rtk find "*.rs" .` | Compact find results, grouped by directory | ~80% |
| `rtk grep "pattern" .` | Grouped search results | ~80% |
| `rtk diff file1 file2` | Condensed diff | ~60% |
| `rtk wc` | Compact word/line count | ~50% |

### Git
| Command | Description | Savings |
|---------|-------------|---------|
| `rtk git status` | Compact status (branch + file summary) | ~80% |
| `rtk git log -n 10` | One-line commits | ~80% |
| `rtk git diff` | Condensed diff | ~75% |
| `rtk git show` | Commit summary + stat + diff | ~80% |
| `rtk git add` | → "ok" | ~92% |
| `rtk git commit -m "msg"` | → "ok abc1234" | ~92% |
| `rtk git push` | → "ok main" | ~92% |
| `rtk git pull` | → "ok 3 files +10 -2" | ~92% |
| `rtk git branch` | Compact branch list | ~70% |
| `rtk git fetch` | → "ok fetched (N new refs)" | ~90% |
| `rtk git stash` | Compact stash operations | ~80% |

### GitHub CLI
| Command | Description | Savings |
|---------|-------------|---------|
| `rtk gh pr list` | Compact PR listing | ~80% |
| `rtk gh pr view 42` | PR details + checks | ~87% |
| `rtk gh issue list` | Compact issue listing | ~80% |
| `rtk gh run list` | Workflow run status | ~82% |

### Test Runners
| Command | Description | Savings |
|---------|-------------|---------|
| `rtk cargo test` | Rust tests (failures only) | ~90% |
| `rtk jest` / `rtk vitest` | Jest/Vitest (failures only) | ~99% |
| `rtk playwright test` | E2E results (failures only) | ~94% |
| `rtk pytest` | Python tests | ~90% |
| `rtk go test` | Go tests (NDJSON) | ~90% |
| `rtk rake test` | Ruby minitest | ~90% |
| `rtk rspec` | RSpec tests (JSON) | ~60%+ |
| `rtk test <cmd>` | Generic test wrapper — failures only | ~90% |
| `rtk err <cmd>` | Errors/warnings only from any command | ~80% |

### Build & Lint
| Command | Description | Savings |
|---------|-------------|---------|
| `rtk cargo build` / `check` / `clippy` | Rust build/check/lint | ~80% |
| `rtk tsc` | TypeScript errors grouped by file | ~83% |
| `rtk lint` / `rtk lint biome` | ESLint/Biome grouped by rule | ~84% |
| `rtk next build` | Next.js build compact | ~87% |
| `rtk prettier --check .` | Files needing formatting | ~70% |
| `rtk ruff check` | Python linting (JSON) | ~80% |
| `rtk mypy` | Python type checker | ~70% |
| `rtk golangci-lint run` | Go linting (JSON) | ~85% |
| `rtk rubocop` | Ruby linting (JSON) | ~60%+ |

### Package Managers
| Command | Description | Savings |
|---------|-------------|---------|
| `rtk pnpm list` | Compact dependency tree | ~70% |
| `rtk pip list` / `outdated` | Python packages (auto-detect uv) | ~60% |
| `rtk bundle install` | Ruby gems (strip Using lines) | ~60% |
| `rtk prisma generate` | Schema generation (no ASCII art) | ~80% |
| `rtk cargo install` | Strip dep compilation noise | ~70% |

### Containers & Cloud
| Command | Description | Savings |
|---------|-------------|---------|
| `rtk docker ps` | Compact container list | ~80% |
| `rtk docker images` | Compact image list | ~70% |
| `rtk docker logs <c>` | Deduplicated logs | ~60% |
| `rtk kubectl pods` | Compact pod list | ~70% |
| `rtk kubectl logs <pod>` | Deduplicated logs | ~60% |
| `rtk aws <subcommand>` | AWS CLI compact (sts, ec2, lambda, s3, etc.) | ~60-80% |

### Data & Analytics
| Command | Description | Savings |
|---------|-------------|---------|
| `rtk json config.json` | Structure without values | ~70% |
| `rtk deps` | Dependencies summary | ~60% |
| `rtk env -f AWS` | Filtered env vars | ~80% |
| `rtk log app.log` | Deduplicated logs | ~70% |
| `rtk curl <url>` | Truncate + save full output | ~50% |
| `rtk summary <cmd>` | Heuristic summary of long output | ~80% |
| `rtk proxy <cmd>` | Raw passthrough + tracking (0% savings) | 0% |

## Configuration

RTK config: `~/.config/rtk/config.toml` (macOS: `~/Library/Application Support/rtk/config.toml`)

```toml
[hooks]
exclude_commands = ["curl", "playwright"]    # skip rewrite for these

[tee]
enabled = true          # save raw output on failure (default: true)
mode = "failures"       # "failures", "always", or "never"
max_files = 20          # rotation: keep last N files

[filters]
ignore_dirs = [".git", "node_modules", "target", "__pycache__"]
ignore_files = ["*.lock", "*.min.js"]
```

**Useful env vars:**

| Variable | Description |
|----------|-------------|
| `RTK_DISABLED=1` | Disable RTK for a single command |
| `RTK_TEE_DIR` | Override the tee directory |
| `RTK_TELEMETRY_DISABLED=1` | Disable telemetry |

## Windows Notes

- **Native Windows (PowerShell/cmd):** Filters work, but auto-rewrite hook does NOT work. Use `rtk <cmd>` explicitly.
- **WSL:** Full support — install via `curl -fsSL ... | sh` then `rtk init -g`.
- **Antigravity setup:** `rtk init --agent antigravity` creates `.agents/rules/antigravity-rtk-rules.md` (prompt-level, no auto-rewrite).

## Global Flags

| Flag | Description |
|------|-------------|
| `-u` / `--ultra-compact` | ASCII icons, inline format (extra savings) |
| `-v` / `--verbose` | Increase verbosity (-v, -vv, -vvv) |
| `--skip-env` | Set `SKIP_ENV_VALIDATION=1` for child processes |

## Related Skills

| Situation | Skill |
|-----------|-------|
| Running commands with compact output | `rtk-run` |
| Recovering detail from failed commands | `rtk-recover` |
| Analyzing savings and optimization | `rtk-gain` |
| Installing or troubleshooting RTK | `rtk-setup` |
| Overview of all RTK tools and skills | `rtk-guide` |
| Full command reference and cheat sheet | `rtk-commands` |
