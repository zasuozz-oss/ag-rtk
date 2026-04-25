import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { estimateTokens, recordAudit } from '../rtk/audit.js';
import { readTeeLog, saveTeeLog } from '../rtk/tee.js';
import { runCommandString, runProcess, verifyRtk } from '../rtk/runner.js';
import { shouldUseRtk } from '../rtk/rewrite.js';
import { guardCommand } from '../security/guard.js';
import { descriptions, readOnlyAnnotations, runAnnotations, schemas } from './tools.js';

function textContent(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

function jsonContent(value: unknown, hint = '') {
  const text = JSON.stringify(value, null, 2);
  return textContent(hint ? `${text}\n\n---\n${hint}` : text);
}

export async function startMcpServer(): Promise<void> {
  const server = new McpServer({ name: 'rtk-mcp', version: '0.1.0' });

  server.registerTool(
    'rtk_should_use',
    {
      title: 'Should Use RTK',
      description: descriptions.shouldUse,
      inputSchema: schemas.command,
      annotations: readOnlyAnnotations,
    },
    async ({ command, cwd }) => {
      const decision = await shouldUseRtk(command, cwd);
      return jsonContent(
        decision,
        '**Next:** If `useRtk` is true, run the original raw command through `rtk_run`; otherwise use the native shell/tool.',
      );
    },
  );

  server.registerTool(
    'rtk_run',
    {
      title: 'Run RTK Command',
      description: descriptions.run,
      inputSchema: schemas.run,
      annotations: runAnnotations,
    },
    async ({ command, cwd, timeoutMs }) => {
      const guard = guardCommand(command);
      if (!guard.safe) {
        await recordAudit({ tool: 'rtk_run', command, cwd, blockedReason: guard.reason });
        return textContent(`blocked: ${guard.reason}`);
      }

      const decision = await shouldUseRtk(command, cwd);
      // Fall back to rtk proxy when RTK has no specific filter for this command.
      // proxy = raw passthrough + analytics tracking (0% savings but command still runs).
      const rewritten = decision.useRtk && decision.rewritten
        ? decision.rewritten
        : `rtk proxy ${command}`;

      const run = await runCommandString(rewritten, { cwd, timeoutMs });
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

      return jsonContent(
        { ...run, rewritten, teePath },
        teePath ? '**Next:** Call `rtk_read_log` with `teePath` before rerunning the raw command.' : '',
      );
    },
  );

  server.registerTool(
    'rtk_read_log',
    {
      title: 'Read RTK Tee Log',
      description: descriptions.readLog,
      inputSchema: schemas.readLog,
      annotations: readOnlyAnnotations,
    },
    async ({ path }) => textContent(await readTeeLog(path)),
  );

  server.registerTool(
    'rtk_gain',
    {
      title: 'RTK Token Savings',
      description: descriptions.gain,
      inputSchema: schemas.args,
      annotations: readOnlyAnnotations,
    },
    async ({ args, cwd }) => {
      const result = await runProcess('rtk', ['gain', ...args], { cwd });
      return jsonContent(result, '**Next:** Use `rtk_discover` when you need missed savings opportunities.');
    },
  );

  server.registerTool(
    'rtk_discover',
    {
      title: 'RTK Discover',
      description: descriptions.discover,
      inputSchema: schemas.args,
      annotations: readOnlyAnnotations,
    },
    async ({ args, cwd }) => jsonContent(await runProcess('rtk', ['discover', ...args], { cwd })),
  );

  server.registerTool(
    'rtk_verify',
    {
      title: 'Verify RTK',
      description: descriptions.verify,
      inputSchema: {},
      annotations: readOnlyAnnotations,
    },
    async () => jsonContent(await verifyRtk()),
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
