import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { readTeeLog, saveTeeLog } from '../../src/rtk/tee.js';

describe('tee logs', () => {
  it('saves and reads a failed command log', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rtk-tee-'));
    const file = await saveTeeLog('git status', 'fatal: not a repo', { teeDir: dir });
    await expect(readTeeLog(file, { teeDir: dir })).resolves.toContain('fatal: not a repo');
  });

  it('blocks reading logs outside the tee directory', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rtk-tee-'));
    await expect(readTeeLog(path.join(os.tmpdir(), 'outside.log'), { teeDir: dir })).rejects.toThrow(/outside/);
  });
});
