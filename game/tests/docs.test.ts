import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate } from '../../tools/codemap';

/**
 * Баримтын хөнгөн шалгалт (docs ба код зөрөхөөс сэргийлнэ). Зөвхөн гурван зүйл:
 *   1. docs/CODEMAP.md ба CONTEXT-ийн автомат индекс хуучраагүй;
 *   2. game/src доторх файл бүр docs/CONTEXT.md §3-д дурдагдсан;
 *   3. [[холбоос]] бүр байгаа файл руу заасан.
 */
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SKIP = new Set(['node_modules', 'dist', '.git', '.obsidian']);

const read = (p: string): string => readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

function walk(dir: string, accept: (n: string) => boolean): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP.has(name)) out.push(...walk(full, accept));
    } else if (accept(name)) out.push(full);
  }
  return out;
}

const posix = (p: string): string => relative(ROOT, p).split('\\').join('/');

describe('баримтын нийцэл', () => {
  it('CODEMAP ба CONTEXT-ийн автомат индекс хуучраагүй', () => {
    const g = generate(ROOT);
    const fix = 'Засах: `cd game && npm run codemap` ажиллуулаад docs/CODEMAP.md, docs/CONTEXT.md-ийг хамт хадгал.';
    expect(read(join(ROOT, 'docs', 'CODEMAP.md')), `docs/CODEMAP.md хуучирсан. ${fix}`).toBe(g.codemap);
    expect(read(join(ROOT, 'docs', 'CONTEXT.md')), `docs/CONTEXT.md-ийн codemap блок хуучирсан. ${fix}`).toBe(g.context);
  });

  it('game/src-ийн файл бүр CONTEXT-д дурдагдсан', () => {
    const ctx = read(join(ROOT, 'docs', 'CONTEXT.md'));
    const sections = ctx.split(/^### /m).slice(1);
    const sectionFor = (top: string): string => sections.filter((s) => s.startsWith(top + '/')).join('\n');
    const missing: string[] = [];
    for (const file of walk(join(ROOT, 'game', 'src'), (n) => n.endsWith('.ts'))) {
      const rel = relative(join(ROOT, 'game', 'src'), file).split('\\').join('/');
      const top = rel.includes('/') ? (rel.split('/')[0] ?? '') : '';
      const hay = top === 'sim' || top === 'render' ? sectionFor(top) : ctx;
      const re = new RegExp('[`/]' + basename(rel).replace(/\./g, '\\.') + '`');
      if (!re.test(hay)) missing.push(rel);
    }
    expect(
      missing,
      `docs/CONTEXT.md §3 (Файлын зураглал)-д дараах файлуудыг нэм (sim/ → sim хэсэгт, render/ → render хэсэгт, бусад → «Бусад»): ${missing.join(', ')}`,
    ).toEqual([]);
  });

  it('[[холбоос]] бүр байгаа файл руу заасан', () => {
    const docs = [
      ...readdirSync(ROOT).filter((n) => n.endsWith('.md')).map((n) => join(ROOT, n)),
      ...walk(join(ROOT, 'docs'), (n) => n.endsWith('.md') && n !== 'CODEMAP.md'),
    ].filter((f) => read(f).trim().length > 0);
    const names = new Set(docs.map((f) => basename(f, '.md')));
    const broken: string[] = [];
    for (const file of docs) {
      const text = read(file).replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
      for (const m of text.matchAll(/\[\[([^\]\n]+)\]\]/g)) {
        const target = (m[1] ?? '').split('|')[0]?.split('#')[0]?.trim() ?? '';
        if (target && !names.has(target) && !existsSync(join(dirname(file), target))) broken.push(`${posix(file)}: [[${target}]]`);
      }
    }
    expect(
      broken,
      'Байхгүй файл руу заасан холбоос. Засах: [[нэр]] нь root эсвэл docs/ доторх .md файлын нэртэй (өргөтгөлгүй) таарах ёстой; шинэ файлыг docs/INDEX.md-д нэм.',
    ).toEqual([]);
  });
});
