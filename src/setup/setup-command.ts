import { expandClients, expandModes } from './clients.js';
import { installInstructions, installSkills } from './instructions.js';
import { installMcpConfig } from './mcp-config.js';
import { syncRtkSource } from './rtk-source.js';

export async function runSetup(options: {
  client: string;
  mode: string;
  cwd: string;
  global: boolean;
}): Promise<void> {
  const clients = expandClients(options.client);
  const modes = expandModes(options.mode);
  const isGlobal = options.global;
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
      const files = await installInstructions(client, options.cwd, isGlobal);
      const scope = isGlobal && client === 'antigravity' ? '(global)' : '(workspace)';
      results.push(`${client} instructions ${scope}: ${files.join(', ')}`);
    }
  }

  if (modes.includes('skills')) {
    for (const client of clients) {
      const files = await installSkills(client, options.cwd, isGlobal);
      const scope = isGlobal && client === 'antigravity' ? '(global)' : '(workspace)';
      results.push(`${client} skills ${scope}: ${files.length} installed`);
    }
  }

  for (const line of results) console.log(line);
}
