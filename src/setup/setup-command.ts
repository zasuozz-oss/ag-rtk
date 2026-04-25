import { expandClients, expandModes } from './clients.js';
import { installInstructions, installSkills } from './instructions.js';
import { installMcpConfig } from './mcp-config.js';
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
