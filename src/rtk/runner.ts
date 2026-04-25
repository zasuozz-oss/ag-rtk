import { spawn } from 'node:child_process';

export interface CommandResult {
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export interface VerifyResult {
  ok: boolean;
  version: string | null;
  error?: string;
}

export function parseVersionOutput(output: string): { ok: boolean; version: string | null } {
  const match = output.trim().match(/^rtk\s+([0-9]+\.[0-9]+\.[0-9][^\s]*)$/);
  return match ? { ok: true, version: match[1] } : { ok: false, version: null };
}

export function normalizeCommandArgs(command: string, shellString = false): string[] {
  if (shellString) return ['-c', command];
  return command.trim().split(/\s+/).filter(Boolean);
}

export function runProcess(
  command: string,
  args: string[],
  options: { cwd?: string; timeoutMs?: number } = {},
): Promise<CommandResult> {
  const timeoutMs = options.timeoutMs ?? 120_000;

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ command: [command, ...args].join(' '), exitCode: null, stdout, stderr: error.message, timedOut });
    });
    child.on('close', (exitCode) => {
      clearTimeout(timer);
      resolve({ command: [command, ...args].join(' '), exitCode, stdout, stderr, timedOut });
    });
  });
}

export function runCommandString(
  command: string,
  options: { cwd?: string; timeoutMs?: number } = {},
): Promise<CommandResult> {
  const timeoutMs = options.timeoutMs ?? 120_000;

  return new Promise((resolve) => {
    const child = spawn(command, [], {
      cwd: options.cwd,
      shell: process.platform === 'win32' ? 'cmd.exe' : '/bin/sh',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ command, exitCode: null, stdout, stderr: error.message, timedOut });
    });
    child.on('close', (exitCode) => {
      clearTimeout(timer);
      resolve({ command, exitCode, stdout, stderr, timedOut });
    });
  });
}

export async function verifyRtk(): Promise<VerifyResult> {
  const result = await runProcess('rtk', ['--version'], { timeoutMs: 10_000 });
  if (result.exitCode !== 0) {
    return { ok: false, version: null, error: result.stderr || result.stdout || 'rtk --version failed' };
  }
  const parsed = parseVersionOutput(result.stdout);
  return parsed.ok ? { ok: true, version: parsed.version } : { ok: false, version: null, error: result.stdout };
}
