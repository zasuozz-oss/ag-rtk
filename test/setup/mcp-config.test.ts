import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getClaudeDesktopConfigPath, mergeJsonMcpConfig, renderCodexTomlEntry } from '../../src/setup/mcp-config.js';

describe('MCP config writers', () => {
  it('merges JSON mcp server config idempotently', () => {
    const config = mergeJsonMcpConfig({ mcpServers: { other: { command: 'x' } } });
    // Should use the running Node executable + dist/cli.js instead of npx.
    expect(config.mcpServers.rtk.command).toBe(process.execPath);
    expect(config.mcpServers.rtk.args[0]).toContain('dist');
    expect(config.mcpServers.rtk.args[0]).toContain('cli.js');
    expect(config.mcpServers.rtk.args[1]).toBe('mcp');
    // Must preserve existing servers
    expect(config.mcpServers.other.command).toBe('x');
  });

  it('renders Codex TOML entry', () => {
    const toml = renderCodexTomlEntry();
    expect(toml).toContain('[mcp_servers.rtk]');
    expect(toml).toContain(`command = "${process.execPath.replace(/\\/g, '/')}"`);
    expect(toml).toContain('cli.js');
    expect(toml).toContain('mcp');
  });

  it('resolves Claude Desktop config path on Windows', () => {
    expect(getClaudeDesktopConfigPath('win32', { APPDATA: 'C:\\Users\\A\\AppData\\Roaming' }, 'C:\\Users\\A')).toBe(
      path.join('C:\\Users\\A\\AppData\\Roaming', 'Claude', 'claude_desktop_config.json'),
    );
  });
});
