export interface GuardResult {
  safe: boolean;
  reason?: string;
}

const BLOCKED_MUTATION_PREFIXES = new Set([
  'rm',
  'rmdir',
  'del',
  'erase',
  'mv',
  'move',
  'cp',
  'copy',
  'chmod',
  'chown',
  'touch',
  'mkdir',
]);

export function commandPrefix(command: string): string {
  return command.trim().split(/\s+/)[0] ?? '';
}

export function validateShellSyntax(input: string): GuardResult {
  type State = 'normal' | 'single_quote' | 'double_quote';
  let state: State = 'normal';

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const next = input[i + 1] ?? '';

    if (state === 'single_quote') {
      if (ch === "'") state = 'normal';
      continue;
    }

    if (state === 'double_quote') {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === '"') state = 'normal';
      continue;
    }

    if (ch === "'") {
      state = 'single_quote';
      continue;
    }
    if (ch === '"') {
      state = 'double_quote';
      continue;
    }

    if (ch === ';') return { safe: false, reason: 'semicolon outside quotes' };
    if (ch === '&' && next === '&') return { safe: false, reason: '&& outside quotes' };
    if (ch === '&') return { safe: false, reason: '& outside quotes' };
    if (ch === '|' && next === '|') return { safe: false, reason: '|| outside quotes' };
    if (ch === '|') return { safe: false, reason: 'pipe outside quotes' };
    if (ch === '<' && next === '(') return { safe: false, reason: 'process substitution outside quotes' };
    if (ch === '>' && next === '(') return { safe: false, reason: 'process substitution outside quotes' };
    if (ch === '>' || ch === '<') return { safe: false, reason: 'redirect outside quotes' };
    if (ch === '`') return { safe: false, reason: 'backtick substitution outside quotes' };
    if (ch === '$' && next === '(') return { safe: false, reason: 'command substitution outside quotes' };
  }

  return { safe: true };
}

export function guardCommand(command: string): GuardResult {
  const prefix = commandPrefix(command);
  if (!prefix) return { safe: false, reason: 'empty command' };
  if (BLOCKED_MUTATION_PREFIXES.has(prefix)) {
    return { safe: false, reason: `mutation command '${prefix}' must use native reviewed tools, not rtk_run` };
  }
  return validateShellSyntax(command);
}

export function checkPathTraversal(filePath: string): GuardResult {
  const decoded = decodeURIComponent(filePath).replace(/\\/g, '/');
  if (decoded.includes('../') || decoded.includes('/..')) {
    return { safe: false, reason: "path traversal '..' is not allowed" };
  }
  if (/%2e%2e/i.test(filePath)) {
    return { safe: false, reason: 'encoded path traversal is not allowed' };
  }
  return { safe: true };
}
