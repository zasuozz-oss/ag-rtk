import { runProcess } from './runner.js';

export interface RewriteDecision {
  useRtk: boolean;
  original: string;
  rewritten: string | null;
  stderr?: string;
}

export function parseRewriteResult(original: string, stdout: string, stderr = ''): RewriteDecision {
  const rewritten = stdout.trim();
  if (!rewritten) return { useRtk: false, original, rewritten: null, stderr: stderr || undefined };
  return { useRtk: rewritten.startsWith('rtk '), original, rewritten, stderr: stderr || undefined };
}

export async function shouldUseRtk(command: string, cwd?: string): Promise<RewriteDecision> {
  const result = await runProcess('rtk', ['rewrite', command], { cwd, timeoutMs: 15_000 });
  return parseRewriteResult(command, result.stdout, result.stderr);
}
