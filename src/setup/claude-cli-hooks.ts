import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface HookInstallResult {
  success: boolean;
  hookPath: string;
  settingsPatched: boolean;
  message: string;
}

/**
 * Install RTK hooks for Claude Code CLI via `rtk init -g --auto-patch`.
 *
 * This runs the upstream RTK hook installer which:
 * 1. Creates ~/.claude/hooks/rtk-rewrite.sh.
 * 2. Patches ~/.claude/settings.json to register the PreToolUse hook.
 * 3. Creates ~/.claude/RTK.md.
 * 4. Adds @RTK.md reference to ~/.claude/CLAUDE.md.
 *
 * The settings.json patch merges into existing config.
 */
export async function installClaudeCliHooks(): Promise<HookInstallResult> {
  const hookPath = path.join(os.homedir(), '.claude', 'hooks', 'rtk-rewrite.sh');
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');

  try {
    await execFileAsync('rtk', ['--version']);
  } catch {
    return {
      success: false,
      hookPath,
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

    const hookExists = await fs.access(hookPath).then(() => true).catch(() => false);

    return {
      success: hookExists,
      hookPath,
      settingsPatched: true,
      message: hookExists
        ? `Hook installed: ${hookPath}\n${stdout}${stderr ? `\n${stderr}` : ''}`
        : `rtk init completed but hook not found at ${hookPath}`,
    };
  } catch (error) {
    return {
      success: false,
      hookPath,
      settingsPatched: false,
      message: `rtk init -g failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export async function verifyClaudeCliHooks(): Promise<{
  hookInstalled: boolean;
  hookPath: string;
  settingsHasHook: boolean;
}> {
  const hookPath = path.join(os.homedir(), '.claude', 'hooks', 'rtk-rewrite.sh');
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');

  const hookInstalled = await fs.access(hookPath).then(() => true).catch(() => false);

  let settingsHasHook = false;
  try {
    const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
    const hooks = settings?.hooks?.PreToolUse;
    if (Array.isArray(hooks)) {
      settingsHasHook = hooks.some((hook: unknown) => {
        if (!hook || typeof hook !== 'object') return false;
        const command = (hook as { command?: unknown }).command;
        return typeof command === 'string' && command.includes('rtk-rewrite');
      });
    }
  } catch {
    // Missing or invalid settings.json means no hook is registered.
  }

  return { hookInstalled, hookPath, settingsHasHook };
}
