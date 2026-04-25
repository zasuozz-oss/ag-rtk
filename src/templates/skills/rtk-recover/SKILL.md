---
name: rtk-recover
description: Use when an RTK command fails, prints a full-output log path, hides needed detail, or the user asks to inspect raw command output.
---

# RTK Recover

RTK may save raw output to a tee log when a command fails.

## Workflow

1. Inspect the compact failure output first.
2. If it includes `teePath` or a full-output path, call `rtk_read_log` with that path.
3. Use the raw log to diagnose.
4. Rerun raw only when the log is insufficient or stale.
