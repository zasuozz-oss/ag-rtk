import { describe, expect, it } from 'vitest';
import { normalizeCommandArgs, parseVersionOutput } from '../../src/rtk/runner.js';

describe('rtk runner helpers', () => {
  it('parses rtk version output', () => {
    expect(parseVersionOutput('rtk 0.37.2\n')).toEqual({ ok: true, version: '0.37.2' });
  });

  it('rejects non-rtk version output', () => {
    expect(parseVersionOutput('other 1.0.0\n')).toEqual({ ok: false, version: null });
  });

  it('normalizes command strings for rtk run', () => {
    expect(normalizeCommandArgs('git status')).toEqual(['git', 'status']);
  });

  it('preserves quoted command as one shell string when requested', () => {
    expect(normalizeCommandArgs('git status && cargo test', true)).toEqual(['-c', 'git status && cargo test']);
  });
});
