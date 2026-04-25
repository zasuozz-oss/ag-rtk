import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export interface AuditEvent {
  timestamp: string;
  tool: string;
  command?: string;
  cwd?: string;
  exitCode?: number | null;
  rawTokens?: number;
  compactTokens?: number;
  blockedReason?: string;
  teePath?: string;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function getAuditPath(): string {
  return path.join(os.homedir(), '.rtk-mcp', 'history.jsonl');
}

export async function recordAudit(event: Omit<AuditEvent, 'timestamp'>): Promise<void> {
  try {
    const target = getAuditPath();
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.appendFile(target, JSON.stringify({ timestamp: new Date().toISOString(), ...event }) + '\n', 'utf8');
  } catch {
    // Audit failure must not break command execution.
  }
}
