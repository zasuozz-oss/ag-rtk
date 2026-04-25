import { describe, expect, it } from 'vitest';
import { getRtkSourceCommands } from '../../src/setup/rtk-source.js';

describe('RTK source sync policy', () => {
  it('uses clone when RTK directory is missing', () => {
    expect(getRtkSourceCommands(false)).toEqual([
      ['git', ['clone', 'https://github.com/rtk-ai/rtk.git', 'RTK']],
    ]);
  });

  it('uses pull fast-forward only when RTK directory exists', () => {
    expect(getRtkSourceCommands(true)).toEqual([
      ['git', ['-C', 'RTK', 'pull', '--ff-only']],
    ]);
  });
});
