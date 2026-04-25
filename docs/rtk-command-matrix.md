# RTK Command Matrix

Source: local `RTK/README.md`, `RTK/src/main.rs`, and `RTK/src/discover/registry.rs`.

| Category | Commands | RTK replacement | Purpose | Replaces |
|---|---|---|---|---|
| Files | `ls`, `tree` | `rtk ls`, `rtk tree` | Compact directory listings | raw `ls`, raw `tree` |
| Files | `cat`, `head`, `tail` reads | `rtk read` | Compact file reading | raw file dumps |
| Files | `grep`, `rg` | `rtk grep` | Grouped search results | raw grep/rg output |
| Files | `find`, `fd` non-pipe usage | `rtk find` | Compact file discovery | raw find/fd output |
| Git | `git status/log/diff/show/add/commit/push/pull/branch/fetch/stash/worktree` | `rtk git ...` | Compact VCS output | raw git output |
| GitHub | `gh pr/issue/run/repo/api/release` without JSON parser flags | `rtk gh ...` | Compact GitHub CLI output | raw gh output |
| Tests | `cargo test`, `pytest`, `go test`, `jest`, `vitest`, `playwright`, `rake test`, `rspec` | matching `rtk` command | Failure-focused test output | raw test logs |
| Build/Lint | `cargo build/check/clippy/fmt`, `tsc`, `eslint`, `biome`, `prettier`, `next build`, `ruff`, `golangci-lint`, `rubocop` | matching `rtk` command | Grouped diagnostics | raw build/lint logs |
| Package | `npm`, `npx`, `pnpm`, `pip`, `uv`, `poetry`, `bundle`, `composer`, `prisma` | matching `rtk` command | Compact package output | raw install/list output |
| Infra | `docker`, `kubectl`, `aws`, `terraform`, `tofu`, `helm`, `gcloud`, `systemctl status` | matching `rtk` command | Compact infra status/logs | raw infra output |
| Network | `curl`, `wget`, `ping`, `rsync` | matching `rtk` command | Compact network output | raw progress/response output |
| Analytics | `gain`, `discover`, `session`, `cc-economics` | `rtk gain`, `rtk discover`, `rtk session`, `rtk cc-economics` | Savings and adoption reports | manual token accounting |
| Setup | `init`, `config`, `verify`, `telemetry`, `trust`, `untrust` | `rtk ...` | Install, verify, configure RTK | manual setup |
