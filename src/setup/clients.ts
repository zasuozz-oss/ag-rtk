export type ClientName = 'claude' | 'claude-cli' | 'codex' | 'antigravity';
export type SetupMode = 'mcp' | 'instructions' | 'skills' | 'hooks' | 'rtk-source';

export function expandClients(client: string): ClientName[] {
  if (client === 'all') return ['claude', 'claude-cli', 'codex', 'antigravity'];
  if (['claude', 'claude-cli', 'codex', 'antigravity'].includes(client)) return [client as ClientName];
  throw new Error(`Unsupported client: ${client}`);
}

export function expandModes(mode: string): SetupMode[] {
  if (mode === 'all') return ['mcp', 'instructions', 'skills', 'hooks', 'rtk-source'];
  if (['mcp', 'instructions', 'skills', 'hooks', 'rtk-source'].includes(mode)) return [mode as SetupMode];
  throw new Error(`Unsupported mode: ${mode}`);
}
