import { runProcess } from './runner.js';

export interface RewriteDecision {
  useRtk: boolean;
  original: string;
  rewritten: string | null;
  stderr?: string;
}

/**
 * Commands that RTK has filter modules for but are missing from the rewrite registry.
 * Maps a regex that matches the shell command prefix to the RTK prefix to prepend.
 * These run through the actual RTK filter (e.g. npm_cmd.rs), not proxy.
 */
const LOCAL_REWRITES: Array<[RegExp, string]> = [
  [/^npm(\s|$)/, 'rtk'],     // npm_cmd.rs  — handles all npm subcommands
  [/^pnpm(\s|$)/, 'rtk'],    // pnpm_cmd.rs — handles all pnpm subcommands
];

function tryLocalRewrite(command: string): RewriteDecision | null {
  const cmd = command.trim();
  for (const [pattern, prefix] of LOCAL_REWRITES) {
    if (pattern.test(cmd)) {
      const rewritten = `${prefix} ${cmd}`;
      return { useRtk: true, original: command, rewritten };
    }
  }
  return null;
}

export function parseRewriteResult(original: string, stdout: string, stderr = ''): RewriteDecision {
  const rewritten = stdout.trim();
  if (!rewritten) return { useRtk: false, original, rewritten: null, stderr: stderr || undefined };
  return { useRtk: rewritten.startsWith('rtk '), original, rewritten, stderr: stderr || undefined };
}

export async function shouldUseRtk(command: string, cwd?: string): Promise<RewriteDecision> {
  // Check local rewrites first for commands RTK supports but the registry doesn't map yet.
  const local = tryLocalRewrite(command);
  if (local) return local;

  const result = await runProcess('rtk', ['rewrite', command], { cwd, timeoutMs: 15_000 });
  return parseRewriteResult(command, result.stdout, result.stderr);
}
