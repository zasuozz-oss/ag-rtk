export type ClientName = 'claude' | 'codex' | 'antigravity';
export type SetupMode = 'mcp' | 'instructions' | 'skills' | 'rtk-source';

export function expandClients(client: string): ClientName[] {
  if (client === 'all') return ['claude', 'codex', 'antigravity'];
  if (client === 'claude' || client === 'codex' || client === 'antigravity') return [client];
  throw new Error(`Unsupported client: ${client}`);
}

export function expandModes(mode: string): SetupMode[] {
  if (mode === 'all') return ['mcp', 'instructions', 'skills', 'rtk-source'];
  if (mode === 'mcp' || mode === 'instructions' || mode === 'skills' || mode === 'rtk-source') return [mode];
  throw new Error(`Unsupported mode: ${mode}`);
}
