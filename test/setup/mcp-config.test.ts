import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getClaudeDesktopConfigPath, mergeJsonMcpConfig, renderCodexTomlEntry } from '../../src/setup/mcp-config.js';

describe('MCP config writers', () => {
  it('merges JSON mcp server config idempotently', () => {
    const config = mergeJsonMcpConfig({ mcpServers: { other: { command: 'x' } } });
    expect(config.mcpServers.rtk).toEqual(
      process.platform === 'win32'
        ? { command: 'cmd', args: ['/c', 'npx', '-y', 'rtk-mcp@latest', 'mcp'] }
        : { command: 'npx', args: ['-y', 'rtk-mcp@latest', 'mcp'] },
    );
    expect(config.mcpServers.other.command).toBe('x');
  });

  it('renders Codex TOML entry', () => {
    expect(renderCodexTomlEntry()).toContain('[mcp_servers.rtk]');
    expect(renderCodexTomlEntry()).toContain(process.platform === 'win32' ? 'command = "cmd"' : 'command = "npx"');
  });

  it('resolves Claude Desktop config path on Windows', () => {
    expect(getClaudeDesktopConfigPath('win32', { APPDATA: 'C:\\Users\\A\\AppData\\Roaming' }, 'C:\\Users\\A')).toBe(
      path.join('C:\\Users\\A\\AppData\\Roaming', 'Claude', 'claude_desktop_config.json'),
    );
  });
});
