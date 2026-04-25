# RTK MCP Agent Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an RTK MCP companion package that supports Claude, Codex, and Antigravity desktop workflows, installs concise rules/skills, and maintains a local read-only RTK upstream clone without forking.

**Architecture:** Create a TypeScript npm package that exposes `rtk-mcp mcp`, `rtk-mcp setup`, and `rtk-mcp verify`. The MCP server delegates decisions and command execution to the installed `rtk` binary, while setup installs MCP config plus GitNexus-style inline instructions and skills. The bundled RTK source clone under `RTK/` is used only for local study/build/reference and is updated with `git pull --ff-only`; setup never forks, pushes, or mutates upstream remotes. Claude Desktop hardening borrows the useful guard, tee-log, tracking, and MCP annotation patterns from `alexiyous/rtk-mcp-server`, but does not copy its separate TypeScript filter engine because RTK Rust remains the source of truth.

**Tech Stack:** Node.js 18+, TypeScript, `@modelcontextprotocol/sdk`, Vitest, Bash setup scripts, RTK Rust CLI, JSON/TOML config writers.

---

## File Structure

- Create `package.json`: npm metadata, bin entry, scripts.
- Create `tsconfig.json`: TypeScript build config.
- Create `src/cli.ts`: command router for `mcp`, `setup`, `verify`, `sync-rtk`.
- Create `src/mcp/server.ts`: MCP stdio server registration.
- Create `src/mcp/tools.ts`: tool schemas and descriptions with `WHEN TO USE` / `AFTER THIS`.
- Create `src/security/guard.ts`: quote-aware command guard, path traversal guard, and mutation-command blocklist for MCP execution.
- Create `src/rtk/runner.ts`: safe subprocess wrapper around `rtk`.
- Create `src/rtk/rewrite.ts`: `rtk_should_use` logic via `rtk rewrite`.
- Create `src/rtk/tee.ts`: local full-output tee logs for failed MCP runs under `~/.rtk-mcp/tee`.
- Create `src/rtk/audit.ts`: JSONL audit trail for executed and blocked MCP calls under `~/.rtk-mcp/history.jsonl`.
- Create `src/setup/clients.ts`: client enum and config path resolution.
- Create `src/setup/mcp-config.ts`: Claude/Codex/Antigravity MCP config writers.
- Create `src/setup/instructions.ts`: writes `AGENTS.md`, `CLAUDE.md`, rules, and skills.
- Create `src/setup/rtk-source.ts`: clone/update local `RTK/` using clone-only policy.
- Create `src/setup/setup-command.ts`: orchestrates setup.
- Create `src/templates/instructions/RTK.md`: inline agent workflow.
- Create `src/templates/skills/rtk-guide/SKILL.md`.
- Create `src/templates/skills/rtk-run/SKILL.md`.
- Create `src/templates/skills/rtk-recover/SKILL.md`.
- Create `src/templates/skills/rtk-gain/SKILL.md`.
- Create `src/templates/skills/rtk-setup/SKILL.md`.
- Create `setup.sh`: GitNexus-style bootstrap.
- Create `test/setup/rtk-source.test.ts`: local clone/update behavior.
- Create `test/setup/mcp-config.test.ts`: idempotent config writes.
- Create `test/setup/instructions.test.ts`: inline rules and skills installation.
- Create `test/mcp/rewrite.test.ts`: mocked `rtk rewrite` decisions.
- Create `test/mcp/runner.test.ts`: mocked subprocess execution and timeouts.
- Create `test/security/guard.test.ts`: guard tests for metacharacters, path traversal, and blocked mutation commands.
- Create `test/rtk/tee.test.ts`: tee-log path confinement and rotation tests.
- Create `README.md`: English usage.
- Create `README.vi.md`: Vietnamese usage.

## Reference Research: alexiyous/rtk-mcp-server

Source reviewed: <https://github.com/alexiyous/rtk-mcp-server>, local clone `external/alexiyous-rtk-mcp-server`, latest inspected commit `d41535f feat(tracking): wire all 17 runCommand tools into SQLite token tracking`.

Adopt these patterns:
- Claude Desktop config path is `claude_desktop_config.json`: Windows `%APPDATA%\Claude\claude_desktop_config.json`, macOS `~/Library/Application Support/Claude/claude_desktop_config.json`, Linux `~/.config/Claude/claude_desktop_config.json`.
- MCP tool descriptions must be specific enough that Claude Desktop can choose tools without shell hooks.
- Use MCP annotations where available: `readOnlyHint`, `destructiveHint`, `idempotentHint`, and `openWorldHint`.
- Guard shell execution with quote-aware blocking for `;`, `&&`, `&`, `||`, pipes, redirects, backticks, `$()`, and process substitution outside quotes.
- Guard file-path tools against `../`, Windows `..\`, and encoded traversal.
- Save full raw output for failed command runs so the agent can inspect logs before rerunning raw.
- Record blocked commands and command savings/audit history locally.

Do not adopt these patterns:
- Do not replace RTK Rust filters with the fork's TypeScript filters. This project delegates to `rtk` so command behavior stays aligned with upstream RTK.
- Do not present `rtk_init` as a Claude Desktop auto-rewrite solution. In the fork it installs a Claude Code `PreToolUse` Bash hook; Claude Desktop still needs explicit MCP tool selection plus instructions.
- Do not expose 36 separate MCP command tools in the first implementation. Keep the public MCP surface small: `rtk_should_use`, `rtk_run`, `rtk_read_log`, `rtk_gain`, `rtk_discover`, and `rtk_verify`. The detailed command matrix lives in docs and the source of truth remains `rtk rewrite`.

## Task 1: Scaffold npm package

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/cli.ts`
- Create: `README.md`
- Create: `README.vi.md`

- [ ] **Step 1: Write package metadata**

Create `package.json`:

```json
{
  "name": "rtk-mcp",
  "version": "0.1.0",
  "description": "MCP and desktop agent bridge for RTK command-output optimization",
  "type": "module",
  "bin": {
    "rtk-mcp": "dist/cli.js"
  },
  "files": [
    "dist",
    "src/templates",
    "setup.sh",
    "README.md",
    "README.vi.md"
  ],
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/cli.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepack": "npm run build"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "commander": "^12.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.4.5",
    "vitest": "^4.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

- [ ] **Step 2: Write TypeScript config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Add CLI entry**

Create `src/cli.ts`:

```ts
#!/usr/bin/env node
import { Command } from 'commander';
import { startMcpServer } from './mcp/server.js';
import { runSetup } from './setup/setup-command.js';
import { verifyRtk } from './rtk/runner.js';
import { syncRtkSource } from './setup/rtk-source.js';

const program = new Command();

program
  .name('rtk-mcp')
  .description('RTK MCP server and desktop agent setup bridge')
  .version('0.1.0');

program
  .command('mcp')
  .description('Start the RTK MCP server over stdio')
  .action(async () => {
    await startMcpServer();
  });

program
  .command('setup')
  .description('Install MCP config, instructions, skills, and local RTK source clone')
  .option('--client <client>', 'claude, codex, antigravity, or all', 'all')
  .option('--mode <mode>', 'mcp, instructions, skills, rtk-source, or all', 'all')
  .option('--cwd <path>', 'workspace root for project-local files', process.cwd())
  .action(async (options) => {
    await runSetup(options);
  });

program
  .command('verify')
  .description('Verify RTK binary and RTK MCP setup')
  .action(async () => {
    const result = await verifyRtk();
    console.log(JSON.stringify(result, null, 2));
    process.exit(result.ok ? 0 : 1);
  });

program
  .command('sync-rtk')
  .description('Clone or update local RTK upstream source without forking')
  .option('--cwd <path>', 'workspace root', process.cwd())
  .action(async (options) => {
    const result = await syncRtkSource(options.cwd);
    console.log(JSON.stringify(result, null, 2));
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
```

- [ ] **Step 4: Build and confirm expected missing imports**

Run: `npm install`
Expected: dependencies install successfully.

Run: `npm run build`
Expected: FAIL because imported modules are not created yet.

- [ ] **Step 5: Commit scaffold**

```bash
git add package.json tsconfig.json src/cli.ts README.md README.vi.md
git commit -m "chore: scaffold rtk mcp package"
```

## Task 2: Implement RTK subprocess runner

**Files:**
- Create: `src/rtk/runner.ts`
- Test: `test/mcp/runner.test.ts`

- [ ] **Step 1: Write failing runner tests**

Create `test/mcp/runner.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseVersionOutput, normalizeCommandArgs } from '../../src/rtk/runner.js';

describe('rtk runner helpers', () => {
  it('parses rtk version output', () => {
    expect(parseVersionOutput('rtk 0.37.2\n')).toEqual({ ok: true, version: '0.37.2' });
  });

  it('rejects non-rtk version output', () => {
    expect(parseVersionOutput('other 1.0.0\n')).toEqual({ ok: false, version: null });
  });

  it('normalizes command strings for rtk run', () => {
    expect(normalizeCommandArgs('git status')).toEqual(['git', 'status']);
  });

  it('preserves quoted command as one shell string when requested', () => {
    expect(normalizeCommandArgs('git status && cargo test', true)).toEqual(['-c', 'git status && cargo test']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/mcp/runner.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement runner helpers and subprocess wrapper**

Create `src/rtk/runner.ts`:

```ts
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
```

- [ ] **Step 4: Run runner tests**

Run: `npm test -- test/mcp/runner.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit runner**

```bash
git add src/rtk/runner.ts test/mcp/runner.test.ts
git commit -m "feat: add rtk subprocess runner"
```

## Task 3: Implement RTK rewrite decision

**Files:**
- Create: `src/rtk/rewrite.ts`
- Test: `test/mcp/rewrite.test.ts`

- [ ] **Step 1: Write failing rewrite parser tests**

Create `test/mcp/rewrite.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseRewriteResult } from '../../src/rtk/rewrite.js';

describe('parseRewriteResult', () => {
  it('detects supported rewrites', () => {
    expect(parseRewriteResult('git status', 'rtk git status\n')).toEqual({
      useRtk: true,
      original: 'git status',
      rewritten: 'rtk git status',
    });
  });

  it('detects unchanged unsupported commands', () => {
    expect(parseRewriteResult('htop', '\n')).toEqual({
      useRtk: false,
      original: 'htop',
      rewritten: null,
    });
  });

  it('does not double-wrap existing RTK commands', () => {
    expect(parseRewriteResult('rtk git status', 'rtk git status\n')).toEqual({
      useRtk: true,
      original: 'rtk git status',
      rewritten: 'rtk git status',
    });
  });
});
```

- [ ] **Step 2: Run rewrite tests to verify failure**

Run: `npm test -- test/mcp/rewrite.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement rewrite helper**

Create `src/rtk/rewrite.ts`:

```ts
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
```

- [ ] **Step 4: Run rewrite tests**

Run: `npm test -- test/mcp/rewrite.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit rewrite decision**

```bash
git add src/rtk/rewrite.ts test/mcp/rewrite.test.ts
git commit -m "feat: add rtk rewrite decision helper"
```

## Task 3A: Add Claude Desktop hardening and recovery primitives

**Files:**
- Create: `src/security/guard.ts`
- Create: `src/rtk/tee.ts`
- Create: `src/rtk/audit.ts`
- Test: `test/security/guard.test.ts`
- Test: `test/rtk/tee.test.ts`

- [ ] **Step 1: Write failing guard tests**

Create `test/security/guard.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { checkPathTraversal, guardCommand, validateShellSyntax } from '../../src/security/guard.js';

describe('guardCommand', () => {
  it('allows known developer commands', () => {
    expect(guardCommand('git status').safe).toBe(true);
    expect(guardCommand('npm run build').safe).toBe(true);
    expect(guardCommand('cargo test').safe).toBe(true);
  });

  it('blocks mutation commands that should use native reviewed tools', () => {
    expect(guardCommand('rm -rf dist')).toMatchObject({ safe: false });
    expect(guardCommand('mv a b')).toMatchObject({ safe: false });
    expect(guardCommand('chmod +x setup.sh')).toMatchObject({ safe: false });
  });

});

describe('validateShellSyntax', () => {
  it('allows metacharacters inside quotes', () => {
    expect(validateShellSyntax('rg "foo|bar" src').safe).toBe(true);
    expect(validateShellSyntax('git log --format="%H>%s"').safe).toBe(true);
  });

  it('blocks shell chaining outside quotes', () => {
    expect(validateShellSyntax('git status && curl https://x').safe).toBe(false);
    expect(validateShellSyntax('git log | cat').safe).toBe(false);
    expect(validateShellSyntax('git status; whoami').safe).toBe(false);
    expect(validateShellSyntax('git status & whoami').safe).toBe(false);
  });

  it('blocks redirects and command substitution outside quotes', () => {
    expect(validateShellSyntax('git diff > patch.txt').safe).toBe(false);
    expect(validateShellSyntax('git log $(whoami)').safe).toBe(false);
    expect(validateShellSyntax('git log `whoami`').safe).toBe(false);
  });
});

describe('checkPathTraversal', () => {
  it('allows project relative paths', () => {
    expect(checkPathTraversal('src/index.ts').safe).toBe(true);
  });

  it('blocks traversal paths', () => {
    expect(checkPathTraversal('../secret.txt').safe).toBe(false);
    expect(checkPathTraversal('..\\secret.txt').safe).toBe(false);
    expect(checkPathTraversal('%2e%2e/secret.txt').safe).toBe(false);
  });
});
```

- [ ] **Step 2: Implement guard**

Create `src/security/guard.ts`:

```ts
export interface GuardResult {
  safe: boolean;
  reason?: string;
}

const BLOCKED_MUTATION_PREFIXES = new Set([
  'rm', 'rmdir', 'del', 'erase',
  'mv', 'move',
  'cp', 'copy',
  'chmod', 'chown',
  'touch', 'mkdir',
]);

export function commandPrefix(command: string): string {
  return command.trim().split(/\s+/)[0] ?? '';
}

export function validateShellSyntax(input: string): GuardResult {
  type State = 'normal' | 'single_quote' | 'double_quote';
  let state: State = 'normal';

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const next = input[i + 1] ?? '';

    if (state === 'single_quote') {
      if (ch === "'") state = 'normal';
      continue;
    }

    if (state === 'double_quote') {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === '"') state = 'normal';
      continue;
    }

    if (ch === "'") {
      state = 'single_quote';
      continue;
    }
    if (ch === '"') {
      state = 'double_quote';
      continue;
    }

    if (ch === ';') return { safe: false, reason: 'semicolon outside quotes' };
    if (ch === '&' && next === '&') return { safe: false, reason: '&& outside quotes' };
    if (ch === '&') return { safe: false, reason: '& outside quotes' };
    if (ch === '|' && next === '|') return { safe: false, reason: '|| outside quotes' };
    if (ch === '|') return { safe: false, reason: 'pipe outside quotes' };
    if (ch === '<' && next === '(') return { safe: false, reason: 'process substitution outside quotes' };
    if (ch === '>' && next === '(') return { safe: false, reason: 'process substitution outside quotes' };
    if (ch === '>' || ch === '<') return { safe: false, reason: 'redirect outside quotes' };
    if (ch === '`') return { safe: false, reason: 'backtick substitution outside quotes' };
    if (ch === '$' && next === '(') return { safe: false, reason: 'command substitution outside quotes' };
  }

  return { safe: true };
}

export function guardCommand(command: string): GuardResult {
  const prefix = commandPrefix(command);
  if (!prefix) return { safe: false, reason: 'empty command' };
  if (BLOCKED_MUTATION_PREFIXES.has(prefix)) {
    return { safe: false, reason: `mutation command '${prefix}' must use native reviewed tools, not rtk_run` };
  }
  return validateShellSyntax(command);
}

export function checkPathTraversal(filePath: string): GuardResult {
  const decoded = decodeURIComponent(filePath).replace(/\\/g, '/');
  if (decoded.includes('../') || decoded.includes('/..')) {
    return { safe: false, reason: "path traversal '..' is not allowed" };
  }
  if (/%2e%2e/i.test(filePath)) {
    return { safe: false, reason: 'encoded path traversal is not allowed' };
  }
  return { safe: true };
}
```

- [ ] **Step 3: Write failing tee tests**

Create `test/rtk/tee.test.ts`:

```ts
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readTeeLog, saveTeeLog } from '../../src/rtk/tee.js';

describe('tee logs', () => {
  it('saves and reads a failed command log', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rtk-tee-'));
    const file = await saveTeeLog('git status', 'fatal: not a repo', { teeDir: dir });
    await expect(readTeeLog(file, { teeDir: dir })).resolves.toContain('fatal: not a repo');
  });

  it('blocks reading logs outside the tee directory', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rtk-tee-'));
    await expect(readTeeLog(path.join(os.tmpdir(), 'outside.log'), { teeDir: dir })).rejects.toThrow(/outside/);
  });
});
```

- [ ] **Step 4: Implement tee logs**

Create `src/rtk/tee.ts`:

```ts
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
  const logs = await Promise.all(entries.filter((name) => name.endsWith('.log')).map(async (name) => {
    const fullPath = path.join(teeDir, name);
    const stat = await fs.stat(fullPath);
    return { fullPath, mtimeMs: stat.mtimeMs };
  }));

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
```

- [ ] **Step 5: Implement JSONL audit**

Create `src/rtk/audit.ts`:

```ts
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export interface AuditEvent {
  timestamp: string;
  tool: string;
  command?: string;
  cwd?: string;
  exitCode?: number | null;
  rawTokens?: number;
  compactTokens?: number;
  blockedReason?: string;
  teePath?: string;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function getAuditPath(): string {
  return path.join(os.homedir(), '.rtk-mcp', 'history.jsonl');
}

export async function recordAudit(event: Omit<AuditEvent, 'timestamp'>): Promise<void> {
  const target = getAuditPath();
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.appendFile(target, JSON.stringify({ timestamp: new Date().toISOString(), ...event }) + '\n', 'utf8');
}
```

- [ ] **Step 6: Run hardening tests**

Run: `npm test -- test/security/guard.test.ts test/rtk/tee.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit hardening primitives**

```bash
git add src/security/guard.ts src/rtk/tee.ts src/rtk/audit.ts test/security/guard.test.ts test/rtk/tee.test.ts
git commit -m "feat: add rtk mcp guard and tee logs"
```

## Task 4: Implement MCP server and tools

**Files:**
- Create: `src/mcp/tools.ts`
- Create: `src/mcp/server.ts`

- [ ] **Step 1: Define MCP tool schemas**

Create `src/mcp/tools.ts`:

Use these MCP annotations exactly:
- `rtk_should_use`, `rtk_read_log`, `rtk_gain`, `rtk_discover`, `rtk_verify`: `readOnlyHint: true`, `destructiveHint: false`, `idempotentHint: true`, `openWorldHint: false`.
- `rtk_run`: `readOnlyHint: false`, `destructiveHint: false`, `idempotentHint: false`, `openWorldHint: false`. `rtk_run` can execute commands, but the guard blocks shell chaining and known mutation commands.

```ts
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const RTK_TOOLS: Tool[] = [
  {
    name: 'rtk_should_use',
    description: `Decide whether a desktop agent should use RTK for a shell command.

WHEN TO USE: Before running a non-interactive shell command when RTK support is uncertain.
AFTER THIS: If useRtk is true, call rtk_run with the original raw command; rtk_run rechecks and executes the RTK rewrite.`,
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command to evaluate, e.g. "git status"' },
        cwd: { type: 'string', description: 'Working directory for RTK rewrite decisions' },
      },
      required: ['command'],
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'rtk_run',
    description: `Run an RTK-supported non-interactive command and return compact output.

WHEN TO USE: Tests, builds, lint/typecheck, git, file search/read/list, package, infra, and network commands that RTK supports.
NEVER USE: Interactive commands, dev servers, watch mode, REPLs, raw JSON/parser output, or file mutation commands like rm/mv/cp.
AFTER THIS: If the result includes teePath, call rtk_read_log before rerunning raw.`,
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Original raw command to run. Do not pass shell chains or file mutation commands.' },
        cwd: { type: 'string', description: 'Working directory' },
        timeoutMs: { type: 'number', description: 'Timeout in milliseconds', default: 120000 },
      },
      required: ['command'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: 'rtk_read_log',
    description: `Read a full-output tee log created by rtk_run after a failed command.

WHEN TO USE: rtk_run returns a teePath or mentions a full-output log and compact output is insufficient.
NEVER USE: Arbitrary file reads; this tool only reads files under ~/.rtk-mcp/tee.
AFTER THIS: Diagnose from the raw log before deciding whether a raw native rerun is necessary.`,
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute tee log path returned by rtk_run' },
      },
      required: ['path'],
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'rtk_gain',
    description: `Show RTK token savings analytics.

WHEN TO USE: User asks about savings, history, missed opportunities, or command-output efficiency.
AFTER THIS: Use rtk_discover if missed RTK opportunities matter.`,
    inputSchema: {
      type: 'object',
      properties: {
        args: { type: 'array', items: { type: 'string' }, description: 'Optional gain flags such as --history, --daily, --format json' },
        cwd: { type: 'string', description: 'Working directory' },
      },
      required: [],
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'rtk_discover',
    description: `Find missed RTK savings opportunities from command history.

WHEN TO USE: User asks why RTK is not being used enough or wants workflow optimization.
AFTER THIS: Add useful patterns to instructions or RTK config only after user approval.`,
    inputSchema: {
      type: 'object',
      properties: {
        args: { type: 'array', items: { type: 'string' }, description: 'Optional discover flags such as --all or --since 7' },
        cwd: { type: 'string', description: 'Working directory' },
      },
      required: [],
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'rtk_verify',
    description: `Verify RTK binary availability and basic MCP readiness.

WHEN TO USE: Installing, troubleshooting, or validating RTK MCP setup.
AFTER THIS: Run setup again for any missing client instruction pack.`,
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
];
```

- [ ] **Step 2: Implement MCP server**

Create `src/mcp/server.ts`:

```ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { RTK_TOOLS } from './tools.js';
import { runCommandString, runProcess, verifyRtk } from '../rtk/runner.js';
import { shouldUseRtk } from '../rtk/rewrite.js';
import { guardCommand } from '../security/guard.js';
import { estimateTokens, recordAudit } from '../rtk/audit.js';
import { readTeeLog, saveTeeLog } from '../rtk/tee.js';

function nextHint(toolName: string, resultText: string): string {
  if (toolName === 'rtk_run' && resultText.includes('"teePath"')) {
    return '\n\n---\n**Next:** Call `rtk_read_log` with `teePath` before rerunning the raw command.';
  }
  if (toolName === 'rtk_should_use') {
    return '\n\n---\n**Next:** If `useRtk` is true, run the command through `rtk_run`; otherwise use the native shell/tool.';
  }
  if (toolName === 'rtk_gain') {
    return '\n\n---\n**Next:** Use `rtk_discover` when you need missed savings opportunities.';
  }
  return '';
}

export async function startMcpServer(): Promise<void> {
  const server = new Server(
    { name: 'rtk-mcp', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: RTK_TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const input = (args ?? {}) as Record<string, unknown>;

    try {
      let result: unknown;

      if (name === 'rtk_should_use') {
        result = await shouldUseRtk(String(input.command), input.cwd ? String(input.cwd) : undefined);
      } else if (name === 'rtk_run') {
        const command = String(input.command);
        const cwd = input.cwd ? String(input.cwd) : undefined;
        const timeoutMs = typeof input.timeoutMs === 'number' ? input.timeoutMs : 120_000;
        const guard = guardCommand(command);
        if (!guard.safe) {
          await recordAudit({ tool: 'rtk_run', command, cwd, blockedReason: guard.reason });
          throw new Error(`blocked: ${guard.reason}`);
        }
        const decision = await shouldUseRtk(command, cwd);
        if (!decision.useRtk || !decision.rewritten) {
          await recordAudit({ tool: 'rtk_run', command, cwd, blockedReason: 'rtk rewrite returned no supported command' });
          throw new Error('RTK does not support this command. Use the native shell/tool instead.');
        }
        const run = await runCommandString(decision.rewritten, { cwd, timeoutMs });
        const raw = run.stdout + (run.stderr ? `\n${run.stderr}` : '');
        const teePath = run.exitCode && run.exitCode !== 0 ? await saveTeeLog(command, raw) : undefined;
        await recordAudit({
          tool: 'rtk_run',
          command,
          cwd,
          exitCode: run.exitCode,
          compactTokens: estimateTokens(raw),
          teePath,
        });
        result = { ...run, rewritten: decision.rewritten, teePath };
      } else if (name === 'rtk_read_log') {
        result = await readTeeLog(String(input.path));
      } else if (name === 'rtk_gain') {
        const toolArgs = Array.isArray(input.args) ? input.args.map(String) : [];
        result = await runProcess('rtk', ['gain', ...toolArgs], { cwd: input.cwd ? String(input.cwd) : undefined });
      } else if (name === 'rtk_discover') {
        const toolArgs = Array.isArray(input.args) ? input.args.map(String) : [];
        result = await runProcess('rtk', ['discover', ...toolArgs], { cwd: input.cwd ? String(input.cwd) : undefined });
      } else if (name === 'rtk_verify') {
        result = await verifyRtk();
      } else {
        throw new Error(`Unknown RTK tool: ${name}`);
      }

      const text = typeof result === 'string' ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: 'text', text: text + nextHint(name, text) }] };
    } catch (error) {
      return {
        content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
```

- [ ] **Step 3: Build server**

Run: `npm run build`
Expected: PASS after all imports compile.

- [ ] **Step 4: Commit MCP server**

```bash
git add src/mcp/tools.ts src/mcp/server.ts
git commit -m "feat: add rtk mcp server"
```

## Task 5: Implement clone-only RTK source sync

**Files:**
- Create: `src/setup/rtk-source.ts`
- Test: `test/setup/rtk-source.test.ts`

- [ ] **Step 1: Write tests for clone-only policy helpers**

Create `test/setup/rtk-source.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getRtkSourceCommands } from '../../src/setup/rtk-source.js';

describe('RTK source sync policy', () => {
  it('uses clone when RTK directory is missing', () => {
    expect(getRtkSourceCommands(false)).toEqual([
      ['git', ['clone', 'https://github.com/rtk-ai/rtk.git', 'RTK']],
    ]);
  });

  it('uses pull fast-forward only when RTK directory exists', () => {
    expect(getRtkSourceCommands(true)).toEqual([
      ['git', ['-C', 'RTK', 'pull', '--ff-only']],
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify failure**

Run: `npm test -- test/setup/rtk-source.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement RTK source sync**

Create `src/setup/rtk-source.ts`:

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { runProcess } from '../rtk/runner.js';

const RTK_REPO_URL = 'https://github.com/rtk-ai/rtk.git';

export interface RtkSourceResult {
  ok: boolean;
  path: string;
  action: 'cloned' | 'updated' | 'failed';
  output: string;
}

export function getRtkSourceCommands(exists: boolean): Array<[string, string[]]> {
  return exists
    ? [['git', ['-C', 'RTK', 'pull', '--ff-only']]]
    : [['git', ['clone', RTK_REPO_URL, 'RTK']]];
}

export async function syncRtkSource(cwd: string): Promise<RtkSourceResult> {
  const rtkDir = path.join(cwd, 'RTK');
  const hasGit = await fs.stat(path.join(rtkDir, '.git')).then(() => true).catch(() => false);
  const [cmd, args] = getRtkSourceCommands(hasGit)[0];
  const result = await runProcess(cmd, args, { cwd, timeoutMs: 120_000 });

  return {
    ok: result.exitCode === 0,
    path: rtkDir,
    action: result.exitCode === 0 ? (hasGit ? 'updated' : 'cloned') : 'failed',
    output: `${result.stdout}${result.stderr}`,
  };
}
```

- [ ] **Step 4: Run RTK source tests**

Run: `npm test -- test/setup/rtk-source.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify current local clone**

Run: `node dist/cli.js sync-rtk --cwd .`
Expected: JSON result with `"action": "updated"` and `"ok": true` because `RTK/` already exists.

- [ ] **Step 6: Commit clone-only sync**

```bash
git add src/setup/rtk-source.ts test/setup/rtk-source.test.ts
git commit -m "feat: add clone-only rtk source sync"
```

## Task 6: Implement client MCP config writers

**Files:**
- Create: `src/setup/clients.ts`
- Create: `src/setup/mcp-config.ts`
- Test: `test/setup/mcp-config.test.ts`

- [ ] **Step 1: Write config tests**

Create `test/setup/mcp-config.test.ts`:

```ts
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getClaudeDesktopConfigPath, mergeJsonMcpConfig, renderCodexTomlEntry } from '../../src/setup/mcp-config.js';

describe('MCP config writers', () => {
  it('merges JSON mcp server config idempotently', () => {
    const config = mergeJsonMcpConfig({ mcpServers: { other: { command: 'x' } } });
    expect(config.mcpServers.rtk).toEqual({
      command: 'npx',
      args: ['-y', 'rtk-mcp@latest', 'mcp'],
    });
    expect(config.mcpServers.other.command).toBe('x');
  });

  it('renders Codex TOML entry', () => {
    expect(renderCodexTomlEntry()).toContain('[mcp_servers.rtk]');
    expect(renderCodexTomlEntry()).toContain('command = "npx"');
  });

  it('resolves Claude Desktop config path on Windows', () => {
    expect(getClaudeDesktopConfigPath('win32', { APPDATA: 'C:\\Users\\A\\AppData\\Roaming' }, 'C:\\Users\\A')).toBe(
      path.join('C:\\Users\\A\\AppData\\Roaming', 'Claude', 'claude_desktop_config.json'),
    );
  });
});
```

- [ ] **Step 2: Run config tests to verify failure**

Run: `npm test -- test/setup/mcp-config.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: Implement client resolution and config helpers**

Create `src/setup/clients.ts`:

```ts
export type ClientName = 'claude' | 'codex' | 'antigravity';

export function expandClients(client: string): ClientName[] {
  if (client === 'all') return ['claude', 'codex', 'antigravity'];
  if (client === 'claude' || client === 'codex' || client === 'antigravity') return [client];
  throw new Error(`Unsupported client: ${client}`);
}

export function expandModes(mode: string): Array<'mcp' | 'instructions' | 'skills' | 'rtk-source'> {
  if (mode === 'all') return ['mcp', 'instructions', 'skills', 'rtk-source'];
  if (mode === 'mcp' || mode === 'instructions' || mode === 'skills' || mode === 'rtk-source') return [mode];
  throw new Error(`Unsupported mode: ${mode}`);
}
```

Create `src/setup/mcp-config.ts`:

```ts
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { ClientName } from './clients.js';

export function getMcpEntry() {
  return process.platform === 'win32'
    ? { command: 'cmd', args: ['/c', 'npx', '-y', 'rtk-mcp@latest', 'mcp'] }
    : { command: 'npx', args: ['-y', 'rtk-mcp@latest', 'mcp'] };
}

export function mergeJsonMcpConfig(existing: any): any {
  const config = existing && typeof existing === 'object' ? existing : {};
  config.mcpServers = config.mcpServers && typeof config.mcpServers === 'object' ? config.mcpServers : {};
  config.mcpServers.rtk = getMcpEntry();
  return config;
}

export function renderCodexTomlEntry(): string {
  return `[mcp_servers.rtk]
command = "npx"
args = ["-y", "rtk-mcp@latest", "mcp"]
`;
}

export function getClaudeDesktopConfigPath(
  platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
  home = os.homedir(),
): string {
  if (platform === 'win32') {
    const appData = env.APPDATA || path.join(home, 'AppData', 'Roaming');
    return path.join(appData, 'Claude', 'claude_desktop_config.json');
  }
  if (platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  }
  return path.join(home, '.config', 'Claude', 'claude_desktop_config.json');
}

async function readJson(filePath: string): Promise<any> {
  return fs.readFile(filePath, 'utf8').then(JSON.parse).catch(() => ({}));
}

async function writeJson(filePath: string, data: any): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

export async function installMcpConfig(client: ClientName): Promise<string> {
  if (client === 'antigravity') {
    const target = path.join(os.homedir(), '.gemini', 'antigravity', 'mcp_config.json');
    await writeJson(target, mergeJsonMcpConfig(await readJson(target)));
    return target;
  }

  if (client === 'claude') {
    const target = getClaudeDesktopConfigPath();
    await writeJson(target, mergeJsonMcpConfig(await readJson(target)));
    return target;
  }

  const target = path.join(process.env.CODEX_HOME || path.join(os.homedir(), '.codex'), 'config.toml');
  const entry = renderCodexTomlEntry();
  const current = await fs.readFile(target, 'utf8').catch(() => '');
  const withoutOld = current.replace(/\n?\[mcp_servers\.rtk\][\s\S]*?(?=\n\[|$)/g, '').trim();
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, `${withoutOld ? withoutOld + '\n\n' : ''}${entry}`, 'utf8');
  return target;
}
```

- [ ] **Step 4: Run config tests**

Run: `npm test -- test/setup/mcp-config.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit config writers**

```bash
git add src/setup/clients.ts src/setup/mcp-config.ts test/setup/mcp-config.test.ts
git commit -m "feat: add mcp config writers"
```

## Task 7: Implement GitNexus-style instructions and skills

**Files:**
- Create: `src/templates/instructions/RTK.md`
- Create: `src/templates/skills/rtk-guide/SKILL.md`
- Create: `src/templates/skills/rtk-run/SKILL.md`
- Create: `src/templates/skills/rtk-recover/SKILL.md`
- Create: `src/templates/skills/rtk-gain/SKILL.md`
- Create: `src/templates/skills/rtk-setup/SKILL.md`
- Create: `src/setup/instructions.ts`
- Test: `test/setup/instructions.test.ts`

- [ ] **Step 1: Write instruction installer tests**

Create `test/setup/instructions.test.ts`:

```ts
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { upsertReference } from '../../src/setup/instructions.js';

describe('instruction helpers', () => {
  it('adds a reference once', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rtk-instructions-'));
    const file = path.join(dir, 'AGENTS.md');
    await fs.writeFile(file, '# Rules\n', 'utf8');
    await upsertReference(file, '@RTK.md');
    await upsertReference(file, '@RTK.md');
    const content = await fs.readFile(file, 'utf8');
    expect(content.match(/@RTK\.md/g)?.length).toBe(1);
  });
});
```

- [ ] **Step 2: Create concise RTK instruction file**

Create `src/templates/instructions/RTK.md`:

```md
# RTK MCP

Desktop clients do not auto-rewrite shell commands. Use RTK MCP when command output should be compact.

`rtk_init` is a Claude Code hook installer, not a Claude Desktop auto-rewrite mechanism. In Claude Desktop, Codex, and Antigravity, tool choice depends on these instructions plus MCP tool descriptions.

## Always

- Use `rtk_should_use({command})` when RTK support is uncertain and output may be long.
- Use `rtk_run` with the original raw command when `rtk_should_use.useRtk` is true.
- Use `rtk_read_log` on `teePath` before rerunning failed commands raw.

## Never

- Do not use `rtk_run` for interactive commands, dev servers, watch mode, REPLs, raw JSON/parser output, or file mutation commands like `rm`, `mv`, `cp`, `chmod`, `touch`, `mkdir`.
- Do not use `rtk_run` when the user explicitly asks for raw/no-RTK execution.

## Common RTK Workflows

Use `rtk_run` for supported non-interactive tests, builds, lint/typecheck, git, file search/read/list, package managers, infra, network, and diagnostics commands.

Use `rtk_gain` for savings reports.
Use `rtk_discover` for missed opportunities.
Use `rtk_verify` for setup troubleshooting.
Use `rtk_read_log` for failed-command recovery.
```

- [ ] **Step 3: Create skills**

Create `src/templates/skills/rtk-run/SKILL.md`:

```md
---
name: rtk-run
description: Use when a desktop coding agent needs compact output from RTK-supported non-interactive commands such as tests, builds, lint, typecheck, git, search, read, package, infra, or network commands.
---

# RTK Run

This skill is for desktop MCP clients. Commands are not automatically rewritten.

## Workflow

1. If the command is obviously RTK-supported, call `rtk_run` with the original raw command.
2. If unsure, call `rtk_should_use({command})`.
3. If `useRtk` is true, call `rtk_run` with the original raw command, not the rewritten string.
4. If `useRtk` is false, use the native shell/tool.

## Do Not Use

- Interactive commands, dev servers, watch mode, REPLs.
- Raw JSON or parser output intended for another program.
- File mutation commands like `rm`, `mv`, `cp`, `chmod`, `touch`, `mkdir`.
- Commands the user explicitly wants raw.
```

Create `src/templates/skills/rtk-recover/SKILL.md`:

```md
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
```

Create `src/templates/skills/rtk-gain/SKILL.md`:

```md
---
name: rtk-gain
description: Use when the user asks about RTK token savings, gain reports, missed commands, command discovery, or improving command-output efficiency.
---

# RTK Gain

Use `rtk_gain` for savings reports and `rtk_discover` for missed opportunities.

## Workflow

1. Use `rtk_gain` for current savings.
2. Use `rtk_gain({args:["--history"]})` for recent commands.
3. Use `rtk_discover` for commands that should have used RTK.
4. Recommend config or instruction changes only after reviewing discover output.
```

Create `src/templates/skills/rtk-setup/SKILL.md`:

```md
---
name: rtk-setup
description: Use when installing, verifying, or troubleshooting RTK MCP, RTK binary, desktop app config, skills, rules, or agent instructions.
---

# RTK Setup

Use `rtk_verify` first. Then check MCP config and instruction files for the target client.

## Client Files

| Client | MCP | Instructions |
|---|---|---|
| Claude Desktop | Windows `%APPDATA%\Claude\claude_desktop_config.json`; macOS `~/Library/Application Support/Claude/claude_desktop_config.json`; Linux `~/.config/Claude/claude_desktop_config.json` | `CLAUDE.md`, `RTK.md`, skills |
| Codex | `~/.codex/config.toml` | `AGENTS.md`, `RTK.md`, skills |
| Antigravity | `~/.gemini/antigravity/mcp_config.json` | `.agents/rules`, `.agents/skills` |
```

Create `src/templates/skills/rtk-guide/SKILL.md`:

```md
---
name: rtk-guide
description: Use when the user asks what RTK tools are available, when to use RTK, how desktop RTK MCP works, or which RTK workflow applies.
---

# RTK Guide

## Tools

| Tool | Use |
|---|---|
| `rtk_should_use` | Decide if a command should go through RTK |
| `rtk_run` | Run supported non-interactive commands with compact output |
| `rtk_read_log` | Read full-output tee logs after failed RTK runs |
| `rtk_gain` | Show token savings |
| `rtk_discover` | Find missed RTK opportunities |
| `rtk_verify` | Check setup |

## Skills

| Task | Skill |
|---|---|
| Run compact command output | `rtk-run` |
| Recover failed command detail | `rtk-recover` |
| Savings and discovery | `rtk-gain` |
| Setup and troubleshooting | `rtk-setup` |
```

- [ ] **Step 4: Implement instruction installer**

Create `src/setup/instructions.ts`:

```ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ClientName } from './clients.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesRoot = path.resolve(__dirname, '..', 'templates');

export async function upsertReference(filePath: string, reference: string): Promise<void> {
  const current = await fs.readFile(filePath, 'utf8').catch(() => '');
  if (current.split(/\r?\n/).some((line) => line.trim() === reference)) return;
  const next = `${current.trim() ? current.trim() + '\n\n' : ''}${reference}\n`;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, next, 'utf8');
}

async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  for (const entry of await fs.readdir(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(srcPath, destPath);
    else await fs.copyFile(srcPath, destPath);
  }
}

export async function installInstructions(client: ClientName, cwd: string): Promise<string[]> {
  const written: string[] = [];
  const rtkMdSource = path.join(templatesRoot, 'instructions', 'RTK.md');
  const rtkMdTarget = path.join(cwd, 'RTK.md');
  await fs.copyFile(rtkMdSource, rtkMdTarget);
  written.push(rtkMdTarget);

  if (client === 'claude') {
    const claudeMd = path.join(cwd, 'CLAUDE.md');
    await upsertReference(claudeMd, '@RTK.md');
    written.push(claudeMd);
  }

  if (client === 'codex') {
    const agentsMd = path.join(cwd, 'AGENTS.md');
    await upsertReference(agentsMd, '@RTK.md');
    written.push(agentsMd);
  }

  if (client === 'antigravity') {
    const rulesDir = path.join(cwd, '.agents', 'rules');
    await fs.mkdir(rulesDir, { recursive: true });
    const target = path.join(rulesDir, 'rtk.md');
    await fs.copyFile(rtkMdSource, target);
    written.push(target);
  }

  return written;
}

export async function installSkills(client: ClientName, cwd: string): Promise<string[]> {
  const source = path.join(templatesRoot, 'skills');
  const target = client === 'claude'
    ? path.join(cwd, '.claude', 'skills')
    : path.join(cwd, '.agents', 'skills');
  await copyDir(source, target);
  return (await fs.readdir(source)).map((name) => path.join(target, name, 'SKILL.md'));
}
```

- [ ] **Step 5: Run instruction tests**

Run: `npm test -- test/setup/instructions.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit instructions and skills**

```bash
git add src/templates src/setup/instructions.ts test/setup/instructions.test.ts
git commit -m "feat: add rtk instruction and skill pack"
```

## Task 8: Implement setup orchestration and Bash bootstrap

**Files:**
- Create: `src/setup/setup-command.ts`
- Create: `setup.sh`

- [ ] **Step 1: Implement setup orchestrator**

Create `src/setup/setup-command.ts`:

```ts
import { expandClients, expandModes } from './clients.js';
import { installMcpConfig } from './mcp-config.js';
import { installInstructions, installSkills } from './instructions.js';
import { syncRtkSource } from './rtk-source.js';

export async function runSetup(options: { client: string; mode: string; cwd: string }): Promise<void> {
  const clients = expandClients(options.client);
  const modes = expandModes(options.mode);
  const results: string[] = [];

  if (modes.includes('rtk-source')) {
    const result = await syncRtkSource(options.cwd);
    results.push(`RTK source: ${result.action} ${result.path}`);
  }

  for (const client of clients) {
    if (modes.includes('mcp')) {
      results.push(`${client} MCP: ${await installMcpConfig(client)}`);
    }
    if (modes.includes('instructions')) {
      const files = await installInstructions(client, options.cwd);
      results.push(`${client} instructions: ${files.join(', ')}`);
    }
  }

  if (modes.includes('skills')) {
    for (const client of clients) {
      const files = await installSkills(client, options.cwd);
      results.push(`${client} skills: ${files.length} installed`);
    }
  }

  for (const line of results) console.log(line);
}
```

- [ ] **Step 2: Create Bash bootstrap**

Create `setup.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info() { echo -e "${CYAN}[INFO]${NC} $*"; }
ok() { echo -e "${GREEN}  ✓${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err() { echo -e "${RED}[ERROR]${NC} $*"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RTK_DIR="$SCRIPT_DIR/RTK"

check_prereqs() {
  command -v node >/dev/null 2>&1 || { err "Node.js >= 18 required"; exit 1; }
  command -v npm >/dev/null 2>&1 || { err "npm required"; exit 1; }
  command -v git >/dev/null 2>&1 || { err "git required"; exit 1; }
  if ! command -v rtk >/dev/null 2>&1; then
    warn "rtk binary not found. Install RTK first: https://github.com/rtk-ai/rtk"
  else
    ok "rtk $(rtk --version)"
  fi
}

sync_rtk_source() {
  info "Syncing RTK source clone"
  if [ -d "$RTK_DIR/.git" ]; then
    git -C "$RTK_DIR" pull --ff-only
    ok "RTK updated"
  else
    git clone https://github.com/rtk-ai/rtk.git "$RTK_DIR"
    ok "RTK cloned"
  fi
}

main() {
  check_prereqs
  sync_rtk_source
  npm install
  npm run build
  node dist/cli.js setup --client all --mode all --cwd "$SCRIPT_DIR"
  ok "RTK MCP setup complete. Restart Claude/Codex/Antigravity."
}

main "$@"
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Smoke run setup in project mode**

Run: `node dist/cli.js setup --client codex --mode instructions --cwd .`
Expected: creates or updates `AGENTS.md` and `RTK.md` in workspace.

- [ ] **Step 5: Commit setup orchestration**

```bash
git add src/setup/setup-command.ts setup.sh
git commit -m "feat: add setup orchestration"
```

## Task 9: Documentation and command matrix

**Files:**
- Modify: `README.md`
- Modify: `README.vi.md`
- Create: `docs/rtk-command-matrix.md`

- [ ] **Step 1: Create command matrix from current RTK README and registry**

Create `docs/rtk-command-matrix.md`:

```md
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
```

- [ ] **Step 2: Write README quick start**

Update `README.md` with:

```md
# RTK MCP

RTK MCP is a desktop agent bridge for RTK. It gives Claude, Codex, and Antigravity MCP tools plus rules and skills for compact command output.

## Quick Start

```bash
./setup.sh
```

Manual:

```bash
npm install
npm run build
node dist/cli.js setup --client all --mode all
```

## MCP Tools

| Tool | Use |
|---|---|
| `rtk_should_use` | Decide whether a command should use RTK |
| `rtk_run` | Run supported non-interactive command through RTK |
| `rtk_read_log` | Read failed-command tee logs from `~/.rtk-mcp/tee` |
| `rtk_gain` | Show savings analytics |
| `rtk_discover` | Find missed opportunities |
| `rtk_verify` | Verify setup |

## Claude Desktop

Setup writes the MCP server entry to `claude_desktop_config.json`:

- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

Claude Desktop does not run RTK shell hooks. It must choose the MCP tools from descriptions and installed instruction files.

## Security Model

`rtk_run` executes local commands, so it is guarded before execution:

- Blocks shell chaining and redirection outside quotes.
- Blocks known file mutation commands such as `rm`, `mv`, `cp`, `chmod`, `touch`, and `mkdir`.
- Requires `rtk rewrite` support before execution, so RTK remains the command support allowlist.
- Saves failed raw output under `~/.rtk-mcp/tee` and exposes it through `rtk_read_log`.

## RTK Source Policy

`RTK/` is a local upstream clone only. Setup uses `git clone` and `git pull --ff-only`. It never forks, pushes, or changes upstream remotes.
```

- [ ] **Step 3: Write Vietnamese README**

Update `README.vi.md` with equivalent Vietnamese content.

- [ ] **Step 4: Commit docs**

```bash
git add README.md README.vi.md docs/rtk-command-matrix.md
git commit -m "docs: document rtk mcp usage and command matrix"
```

## Task 10: Final verification

**Files:**
- Modify only if verification exposes bugs.

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Verify hardening tests**

Run: `npm test -- test/security/guard.test.ts test/rtk/tee.test.ts`
Expected: PASS.

- [ ] **Step 4: Verify RTK binary**

Run: `node dist/cli.js verify`
Expected: JSON with `"ok": true` and an RTK version if RTK is installed; otherwise a clear error.

- [ ] **Step 5: Verify local RTK source update**

Run: `node dist/cli.js sync-rtk --cwd .`
Expected: JSON with `"ok": true`, `"action": "updated"`, and path ending in `RTK`.

- [ ] **Step 6: Verify setup idempotency**

Run twice:

```bash
node dist/cli.js setup --client codex --mode instructions --cwd .
node dist/cli.js setup --client codex --mode instructions --cwd .
```

Expected: `AGENTS.md` contains exactly one `@RTK.md` reference.

- [ ] **Step 7: Verify Claude Desktop config rendering**

Run: `npm test -- test/setup/mcp-config.test.ts`
Expected: PASS and Windows path test points to `%APPDATA%\Claude\claude_desktop_config.json`.

- [ ] **Step 8: Commit verification fixes**

If files changed:

```bash
git add <changed-files>
git commit -m "fix: address verification issues"
```

## Self-Review

- Spec coverage: Requirements are covered: no fork, local clone/update, GitNexus-style setup, multi-client MCP config, correct Claude Desktop config path, desktop instruction pack, concise skill names, `rtk_should_use`, guarded `rtk_run`, tee-log recovery, command matrix, and verification. The `alexiyous/rtk-mcp-server` research is incorporated as hardening and Claude Desktop setup guidance without replacing RTK Rust behavior.
- Placeholder scan: No TBD/TODO placeholders remain in implementation steps.
- Type consistency: `useRtk`, `rewritten`, `rtk_should_use`, `rtk_run`, `installMcpConfig`, and `syncRtkSource` are consistent across tasks.
