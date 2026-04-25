import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { installSkills, upsertReference } from '../../src/setup/instructions.js';

describe('instruction helpers', () => {
  it('adds a reference once', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rtk-instructions-'));
    const file = path.join(dir, 'AGENTS.md');
    await fs.writeFile(file, '# Rules\n', 'utf8');
    await upsertReference(file, '@RTK.md');
    await upsertReference(file, '@RTK.md');
    const content = await fs.readFile(file, 'utf8');
    expect(content.match(/@RTK\.md/g)?.length).toBe(1);
  });

  it('installs Claude skills under .claude', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rtk-skills-'));
    const files = await installSkills('claude', dir);
    expect(files.some((file) => file.includes(`${path.sep}.claude${path.sep}skills${path.sep}rtk-run`))).toBe(true);
  });
});
