import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { ClientName } from './clients.js';

export function getMcpEntry() {
  return process.platform === 'win32'
    ? { command: 'cmd', args: ['/c', 'npx', '-y', 'rtk-mcp@latest', 'mcp'] }
    : { command: 'npx', args: ['-y', 'rtk-mcp@latest', 'mcp'] };
}

export function mergeJsonMcpConfig(existing: unknown): any {
  const config = existing && typeof existing === 'object' ? { ...(existing as Record<string, unknown>) } : {};
  const servers =
    config.mcpServers && typeof config.mcpServers === 'object'
      ? { ...(config.mcpServers as Record<string, unknown>) }
      : {};
  servers.rtk = getMcpEntry();
  config.mcpServers = servers;
  return config;
}

export function renderCodexTomlEntry(): string {
  const command = process.platform === 'win32' ? 'cmd' : 'npx';
  const args =
    process.platform === 'win32'
      ? '["/c", "npx", "-y", "rtk-mcp@latest", "mcp"]'
      : '["-y", "rtk-mcp@latest", "mcp"]';
  return `[mcp_servers.rtk]
command = "${command}"
args = ${args}
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

async function readJson(filePath: string): Promise<unknown> {
  return fs.readFile(filePath, 'utf8').then(JSON.parse).catch(() => ({}));
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
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
  await fs.writeFile(target, `${withoutOld ? `${withoutOld}\n\n` : ''}${entry}`, 'utf8');
  return target;
}
