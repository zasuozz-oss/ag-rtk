import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import type { ClientName } from './clients.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RTK_SENTINEL_START = '<!-- RTK_RULES_START -->';
const RTK_SENTINEL_END = '<!-- RTK_RULES_END -->';

function templatesRoot(): string {
  return path.resolve(__dirname, '..', '..', 'src', 'templates');
}

function customRoot(): string {
  return path.resolve(__dirname, '..', '..', 'custom');
}

/** Resolve template path: custom/ overrides src/templates/ when the file exists. */
async function resolveTemplate(relative: string): Promise<string> {
  const custom = path.join(customRoot(), relative);
  return fs.access(custom).then(() => custom).catch(() => path.join(templatesRoot(), relative));
}

// ---------------------------------------------------------------------------
// Global home dirs per client
// ---------------------------------------------------------------------------

function globalHome(client: ClientName): string {
  const home = os.homedir();
  switch (client) {
    case 'antigravity':
      return path.join(home, '.gemini', 'antigravity');
    case 'claude':
    case 'claude-cli':
      return path.join(home, '.claude');
    case 'codex':
      return path.join(home, '.codex');
  }
}

function globalInstructionsPath(client: ClientName): string {
  const home = os.homedir();
  switch (client) {
    case 'antigravity':
      // Gemini CLI reads ~/.gemini/GEMINI.md as global instructions for ALL projects
      return path.join(home, '.gemini', 'GEMINI.md');
    case 'claude':
    case 'claude-cli':
      return path.join(home, '.claude', 'CLAUDE.md');
    case 'codex':
      return path.join(home, '.codex', 'AGENTS.md');
  }
}

function globalSkillsPath(client: ClientName): string {
  return path.join(globalHome(client), 'skills');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/**
 * Append or update RTK rules block in a markdown file using sentinel markers.
 * Existing content outside the markers is NEVER touched.
 * If RTK block already exists, it is replaced in-place.
 * If not, the block is appended at the end.
 */
async function upsertRtkBlock(targetFile: string, rtkContent: string): Promise<void> {
  await fs.mkdir(path.dirname(targetFile), { recursive: true });
  const current = await fs.readFile(targetFile, 'utf8').catch(() => '');
  const block = `${RTK_SENTINEL_START}\n${rtkContent.trim()}\n${RTK_SENTINEL_END}`;

  if (current.includes(RTK_SENTINEL_START) && current.includes(RTK_SENTINEL_END)) {
    // Replace existing RTK block in-place, preserving everything else
    const re = new RegExp(
      `${escapeRegex(RTK_SENTINEL_START)}[\\s\\S]*?${escapeRegex(RTK_SENTINEL_END)}`,
    );
    const updated = current.replace(re, block);
    await fs.writeFile(targetFile, updated, 'utf8');
  } else {
    // Append RTK block at the end
    const separator = current.trim() ? '\n\n' : '';
    await fs.writeFile(targetFile, `${current.trimEnd()}${separator}${block}\n`, 'utf8');
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// Install instructions (rules)
// ---------------------------------------------------------------------------

export async function installInstructions(client: ClientName, cwd: string, global = false): Promise<string[]> {
  const written: string[] = [];
  const rtkMdSource = await resolveTemplate('instructions/RTK.md');
  const rtkContent = await fs.readFile(rtkMdSource, 'utf8');

  if (global) {
    // Global mode: append RTK block to the client's global instructions file
    const targetFile = globalInstructionsPath(client);
    await upsertRtkBlock(targetFile, rtkContent);
    written.push(targetFile);
    return written;
  }

  // Workspace mode (per-project)
  const rtkMdTarget = path.join(cwd, 'RTK.md');
  await fs.copyFile(rtkMdSource, rtkMdTarget);
  written.push(rtkMdTarget);

  if (client === 'claude' || client === 'claude-cli') {
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

// ---------------------------------------------------------------------------
// Install skills
// ---------------------------------------------------------------------------

export async function installSkills(client: ClientName, cwd: string, global = false): Promise<string[]> {
  const defaultSource = path.join(templatesRoot(), 'skills');
  const customSource = path.join(customRoot(), 'skills');

  let target: string;
  if (global) {
    target = globalSkillsPath(client);
  } else if (client === 'claude' || client === 'claude-cli') {
    target = path.join(cwd, '.claude', 'skills');
  } else {
    target = path.join(cwd, '.agents', 'skills');
  }

  // Copy default skills first, then overlay custom/ overrides on top
  await copyDir(defaultSource, target);
  const hasCustom = await fs.access(customSource).then(() => true).catch(() => false);
  if (hasCustom) await copyDir(customSource, target);

  return (await fs.readdir(defaultSource)).map((name) => path.join(target, name, 'SKILL.md'));
}
