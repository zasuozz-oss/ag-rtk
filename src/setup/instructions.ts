import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ClientName } from './clients.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function templatesRoot(): string {
  return path.resolve(__dirname, '..', '..', 'src', 'templates');
}

export async function upsertReference(filePath: string, reference: string): Promise<void> {
  const current = await fs.readFile(filePath, 'utf8').catch(() => '');
  if (current.split(/\r?\n/).some((line) => line.trim() === reference)) return;
  const next = `${current.trim() ? `${current.trim()}\n\n` : ''}${reference}\n`;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, next, 'utf8');
}

async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  for (const entry of await fs.readdir(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(srcPath, destPath);
    else await fs.copyFile(srcPath, destPath);
  }
}

export async function installInstructions(client: ClientName, cwd: string): Promise<string[]> {
  const written: string[] = [];
  const rtkMdSource = path.join(templatesRoot(), 'instructions', 'RTK.md');
  const rtkMdTarget = path.join(cwd, 'RTK.md');
  await fs.copyFile(rtkMdSource, rtkMdTarget);
  written.push(rtkMdTarget);

  if (client === 'claude') {
    const claudeMd = path.join(cwd, 'CLAUDE.md');
    await upsertReference(claudeMd, '@RTK.md');
    written.push(claudeMd);
  }

  if (client === 'codex') {
    const agentsMd = path.join(cwd, 'AGENTS.md');
    await upsertReference(agentsMd, '@RTK.md');
    written.push(agentsMd);
  }

  if (client === 'antigravity') {
    const rulesDir = path.join(cwd, '.agents', 'rules');
    await fs.mkdir(rulesDir, { recursive: true });
    const target = path.join(rulesDir, 'rtk.md');
    await fs.copyFile(rtkMdSource, target);
    written.push(target);
  }

  return written;
}

export async function installSkills(client: ClientName, cwd: string): Promise<string[]> {
  const source = path.join(templatesRoot(), 'skills');
  const target = client === 'claude' ? path.join(cwd, '.claude', 'skills') : path.join(cwd, '.agents', 'skills');
  await copyDir(source, target);
  return (await fs.readdir(source)).map((name) => path.join(target, name, 'SKILL.md'));
}
