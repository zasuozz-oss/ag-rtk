import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const CLAUDE_HOOK_COMMAND = 'rtk hook claude';

export interface HookInstallResult {
  success: boolean;
  hookCommand: string;
  settingsPatched: boolean;
  message: string;
}

/**
 * Install RTK hooks for Claude Code CLI via `rtk init -g --auto-patch`.
 *
 * This runs the upstream RTK hook installer which:
 * 1. Patches ~/.claude/settings.json to register `rtk hook claude`.
 * 2. Creates ~/.claude/RTK.md.
 * 3. Adds @RTK.md reference to ~/.claude/CLAUDE.md.
 *
 * The settings.json patch merges into existing config.
 */
export async function installClaudeCliHooks(): Promise<HookInstallResult> {
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
  const rtkMdPath = path.join(os.homedir(), '.claude', 'RTK.md');

  try {
    await execFileAsync('rtk', ['--version']);
  } catch {
    return {
      success: false,
      hookCommand: CLAUDE_HOOK_COMMAND,
      settingsPatched: false,
      message: 'RTK binary not found. Run setup.sh to install RTK first.',
    };
  }

  const settingsBackup = `${settingsPath}.pre-ag-rtk.bak`;
  try {
    const settingsContent = await fs.readFile(settingsPath, 'utf8');
    await fs.writeFile(settingsBackup, settingsContent, 'utf8');
  } catch {
    // Missing settings.json is fine; rtk init can create it.
  }

  try {
    const { stdout, stderr } = await execFileAsync('rtk', ['init', '-g', '--auto-patch'], {
      timeout: 30_000,
      env: { ...process.env, PATH: `${path.join(os.homedir(), '.local', 'bin')}:${process.env.PATH}` },
    });

    const settingsHasHook = await hasClaudeHook(settingsPath);
    const rtkMdExists = await fs.access(rtkMdPath).then(() => true).catch(() => false);
    const success = settingsHasHook && rtkMdExists;

    return {
      success,
      hookCommand: CLAUDE_HOOK_COMMAND,
      settingsPatched: settingsHasHook,
      message: success
        ? `Hook configured: ${CLAUDE_HOOK_COMMAND}\n${stdout}${stderr ? `\n${stderr}` : ''}`
        : `rtk init completed but hook command was not found in ${settingsPath}`,
    };
  } catch (error) {
    return {
      success: false,
      hookCommand: CLAUDE_HOOK_COMMAND,
      settingsPatched: false,
      message: `rtk init -g failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function verifyClaudeCliHooks(): Promise<{
  hookInstalled: boolean;
  hookCommand: string;
  settingsHasHook: boolean;
  rtkMdInstalled: boolean;
}> {
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');
  const rtkMdPath = path.join(os.homedir(), '.claude', 'RTK.md');

  const settingsHasHook = await hasClaudeHook(settingsPath);
  const rtkMdInstalled = await fs.access(rtkMdPath).then(() => true).catch(() => false);

  return {
    hookInstalled: settingsHasHook,
    hookCommand: CLAUDE_HOOK_COMMAND,
    settingsHasHook,
    rtkMdInstalled,
  };
}

async function hasClaudeHook(settingsPath: string): Promise<boolean> {
  try {
    const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
    return objectHasHookCommand(settings);
  } catch {
    return false;
  }
}

function objectHasHookCommand(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(objectHasHookCommand);
  if (!value || typeof value !== 'object') return false;

  const record = value as Record<string, unknown>;
  if (record.command === CLAUDE_HOOK_COMMAND) return true;
  return Object.values(record).some(objectHasHookCommand);
}
