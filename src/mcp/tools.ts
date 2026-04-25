import { z } from 'zod';

export const readOnlyAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

export const runAnnotations = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} as const;

export const schemas = {
  command: {
    command: z.string().min(1).describe('Original raw shell command, e.g. "git status"'),
    cwd: z.string().optional().describe('Working directory'),
  },
  run: {
    command: z.string().min(1).describe('Original raw command. Do not pass shell chains or file mutation commands.'),
    cwd: z.string().optional().describe('Working directory'),
    timeoutMs: z.number().int().positive().default(120_000).describe('Timeout in milliseconds'),
  },
  readLog: {
    path: z.string().min(1).describe('Absolute tee log path returned by rtk_run'),
  },
  args: {
    args: z.array(z.string()).default([]).describe('Optional RTK arguments'),
    cwd: z.string().optional().describe('Working directory'),
  },
};

export const descriptions = {
  shouldUse: `Decide whether a shell command should go through RTK for compact output.

WHEN TO USE: Any time you are about to run a shell command and are unsure if RTK supports it.
AFTER THIS: If useRtk is true, call rtk_run with the original raw command.`,

  run: `Run any non-interactive shell command through RTK and return compact, token-efficient output (60-90% savings).

WHEN TO USE: Use for ALL shell commands by default — including ls, cat, find, grep. RTK supports 100+ commands across git, tests, builds, lint, files, search, package managers, containers, and cloud CLIs. If the user explicitly says to run a specific shell command, always use rtk_run even if a native tool could do something similar.
NEVER USE for: interactive commands (dev servers, watch mode, REPLs), file mutations (rm/mv/cp/mkdir/chmod/touch), raw JSON/parser output piped to another program, or commands the user explicitly wants unfiltered.
AFTER THIS: If the result includes teePath, call rtk_read_log before rerunning raw.`,

  readLog: `Read a full-output tee log created by rtk_run after a failed command.

WHEN TO USE: rtk_run returns a teePath or mentions a full-output log and compact output is insufficient.
NEVER USE: Arbitrary file reads; this tool only reads files under ~/.rtk-mcp/tee.
AFTER THIS: Diagnose from the raw log before deciding whether a raw native rerun is necessary.`,

  gain: `Show RTK token savings analytics.

WHEN TO USE: User asks about savings, history, missed opportunities, or command-output efficiency.
AFTER THIS: Use rtk_discover if missed RTK opportunities matter.`,

  discover: `Find missed RTK savings opportunities from command history.

WHEN TO USE: User asks why RTK is not being used enough or wants workflow optimization.
AFTER THIS: Add useful patterns to instructions or RTK config only after user approval.`,

  verify: `Verify RTK binary availability and basic MCP readiness.

WHEN TO USE: Installing, troubleshooting, or validating RTK MCP setup.
AFTER THIS: Run setup again for any missing client instruction pack.`,
};
