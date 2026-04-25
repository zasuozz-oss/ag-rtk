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
  shouldUse: `Decide whether a desktop agent should use RTK for a shell command.

WHEN TO USE: Before running a non-interactive shell command when RTK support is uncertain.
AFTER THIS: If useRtk is true, call rtk_run with the original raw command; rtk_run rechecks and executes the RTK rewrite.`,

  run: `Run an RTK-supported non-interactive command and return compact output.

WHEN TO USE: Tests, builds, lint/typecheck, git, file search/read/list, package, infra, and network commands that RTK supports.
NEVER USE: Interactive commands, dev servers, watch mode, REPLs, raw JSON/parser output, or file mutation commands like rm/mv/cp.
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
