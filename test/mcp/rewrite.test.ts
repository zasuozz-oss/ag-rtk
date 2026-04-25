import { describe, expect, it } from 'vitest';
import { parseRewriteResult } from '../../src/rtk/rewrite.js';

describe('parseRewriteResult', () => {
  it('detects supported rewrites', () => {
    expect(parseRewriteResult('git status', 'rtk git status\n')).toEqual({
      useRtk: true,
      original: 'git status',
      rewritten: 'rtk git status',
    });
  });

  it('detects unchanged unsupported commands', () => {
    expect(parseRewriteResult('htop', '\n')).toEqual({
      useRtk: false,
      original: 'htop',
      rewritten: null,
    });
  });

  it('does not double-wrap existing RTK commands', () => {
    expect(parseRewriteResult('rtk git status', 'rtk git status\n')).toEqual({
      useRtk: true,
      original: 'rtk git status',
      rewritten: 'rtk git status',
    });
  });
});
