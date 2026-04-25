#!/usr/bin/env node
import { Command } from 'commander';
import { startMcpServer } from './mcp/server.js';
import { verifyRtk } from './rtk/runner.js';
import { runSetup } from './setup/setup-command.js';
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
