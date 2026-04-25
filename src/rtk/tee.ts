import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export interface TeeOptions {
  teeDir?: string;
  maxFiles?: number;
}

export function getDefaultTeeDir(): string {
  return path.join(os.homedir(), '.rtk-mcp', 'tee');
}

function sanitizeCommand(command: string): string {
  return command.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/_+/g, '_').slice(0, 60);
}

async function rotateTeeLogs(teeDir: string, maxFiles: number): Promise<void> {
  const entries = await fs.readdir(teeDir).catch(() => []);
  const logs = await Promise.all(
    entries
      .filter((name) => name.endsWith('.log'))
      .map(async (name) => {
        const fullPath = path.join(teeDir, name);
        const stat = await fs.stat(fullPath);
        return { fullPath, mtimeMs: stat.mtimeMs };
      }),
  );

  logs.sort((a, b) => a.mtimeMs - b.mtimeMs);
  while (logs.length >= maxFiles) {
    const oldest = logs.shift();
    if (oldest) await fs.unlink(oldest.fullPath).catch(() => undefined);
  }
}

export async function saveTeeLog(command: string, output: string, options: TeeOptions = {}): Promise<string> {
  const teeDir = options.teeDir ?? getDefaultTeeDir();
  const maxFiles = options.maxFiles ?? 100;
  await fs.mkdir(teeDir, { recursive: true });
  await rotateTeeLogs(teeDir, maxFiles);

  const filename = `${Date.now()}_${sanitizeCommand(command)}.log`;
  const target = path.join(teeDir, filename);
  await fs.writeFile(target, `CMD: ${command}\n\n${output}`, 'utf8');
  return target;
}

export async function readTeeLog(logPath: string, options: TeeOptions = {}): Promise<string> {
  const teeDir = path.resolve(options.teeDir ?? getDefaultTeeDir());
  const target = path.resolve(logPath);
  if (target !== teeDir && !target.startsWith(teeDir + path.sep)) {
    throw new Error(`refusing to read tee log outside ${teeDir}`);
  }
  return fs.readFile(target, 'utf8');
}
