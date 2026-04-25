import { describe, expect, it } from 'vitest';
import { checkPathTraversal, guardCommand, validateShellSyntax } from '../../src/security/guard.js';

describe('guardCommand', () => {
  it('allows known developer commands', () => {
    expect(guardCommand('git status').safe).toBe(true);
    expect(guardCommand('npm run build').safe).toBe(true);
    expect(guardCommand('cargo test').safe).toBe(true);
  });

  it('blocks mutation commands that should use native reviewed tools', () => {
    expect(guardCommand('rm -rf dist')).toMatchObject({ safe: false });
    expect(guardCommand('mv a b')).toMatchObject({ safe: false });
    expect(guardCommand('chmod +x setup.sh')).toMatchObject({ safe: false });
  });
});

describe('validateShellSyntax', () => {
  it('allows metacharacters inside quotes', () => {
    expect(validateShellSyntax('rg "foo|bar" src').safe).toBe(true);
    expect(validateShellSyntax('git log --format="%H>%s"').safe).toBe(true);
  });

  it('blocks shell chaining outside quotes', () => {
    expect(validateShellSyntax('git status && curl https://x').safe).toBe(false);
    expect(validateShellSyntax('git log | cat').safe).toBe(false);
    expect(validateShellSyntax('git status; whoami').safe).toBe(false);
    expect(validateShellSyntax('git status & whoami').safe).toBe(false);
  });

  it('blocks redirects and command substitution outside quotes', () => {
    expect(validateShellSyntax('git diff > patch.txt').safe).toBe(false);
    expect(validateShellSyntax('git log $(whoami)').safe).toBe(false);
    expect(validateShellSyntax('git log `whoami`').safe).toBe(false);
  });
});

describe('checkPathTraversal', () => {
  it('allows project relative paths', () => {
    expect(checkPathTraversal('src/index.ts').safe).toBe(true);
  });

  it('blocks traversal paths', () => {
    expect(checkPathTraversal('../secret.txt').safe).toBe(false);
    expect(checkPathTraversal('..\\secret.txt').safe).toBe(false);
    expect(checkPathTraversal('%2e%2e/secret.txt').safe).toBe(false);
  });
});
