import fs from 'node:fs/promises';
import path from 'node:path';
import { runProcess } from '../rtk/runner.js';

export interface RtkSourceResult {
  ok: boolean;
  action: 'cloned' | 'updated';
  path: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

export function getRtkSourceCommands(exists: boolean): Array<[string, string[]]> {
  return exists
    ? [['git', ['-C', 'RTK', 'pull', '--ff-only']]]
    : [['git', ['clone', 'https://github.com/rtk-ai/rtk.git', 'RTK']]];
}

export async function syncRtkSource(cwd: string): Promise<RtkSourceResult> {
  const rtkPath = path.resolve(cwd, 'RTK');
  const exists = await fs.stat(path.join(rtkPath, '.git')).then(() => true).catch(() => false);
  const [[command, args]] = getRtkSourceCommands(exists);
  const result = await runProcess(command, args, { cwd, timeoutMs: 120_000 });

  return {
    ok: result.exitCode === 0,
    action: exists ? 'updated' : 'cloned',
    path: rtkPath,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
  };
}
