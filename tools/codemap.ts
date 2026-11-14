/**
 * CODEMAP үүсгэгч. Гараар засахгүй, зөвхөн скриптээр:
 *
 *   cd game && npm run codemap
 *
 * Гаралт:
 *   docs/CODEMAP.md        — файл бүрийн хэмжээ/мөр/export, функц/классын мөрийн дугаар,
 *                            docs/*.md-ийн `##` гарчгийн мөрийн муж (нэг мөрт нэг зүйл, grep-д)
 *   docs/CONTEXT.md        — `<!-- codemap:start/end -->` блок (mvp-spec, visuals-plan-ийн хэсгийн индекс)
 *
 * `tests/docs.test.ts` энэ файлын `generate()`-ийг ашиглан хуучраагүйг шалгана.
 * Хэмжээг мөрийн төгсгөлийг (CRLF→LF) нэг мөр болгож тоолно: Windows/Linux-д ижил гарна.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const CONTEXT_START = '<!-- codemap:start -->';
export const CONTEXT_END = '<!-- codemap:end -->';
/** Мөрийн мужийг CONTEXT-д индекслэх баримтууд. */
export const INDEXED_DOCS = ['docs/mvp-spec.md', 'docs/visuals-plan.md'];

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.obsidian', '_archive', 'v1', 'shots']);

export interface Generated {
  codemap: string;
  context: string;
}

function norm(text: string): string {
  return text.replace(/\r\n/g, '\n');
}

function readNorm(path: string): string {
  return norm(readFileSync(path, 'utf8'));
}

function walk(dir: string, accept: (name: string) => boolean): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(name)) out.push(...walk(full, accept));
    } else if (accept(name)) {
      out.push(full);
    }
  }
  return out;
}

function lineCount(text: string): number {
  if (text.length === 0) return 0;
  return text.endsWith('\n') ? text.split('\n').length - 1 : text.split('\n').length;
}

function kb(text: string): string {
  return (Buffer.byteLength(text, 'utf8') / 1024).toFixed(1) + 'KB';
}

interface Sym {
  line: number;
  kind: string;
  name: string;
  exported: boolean;
}

const NOT_METHODS = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'function', 'constructor']);

export function extractSymbols(text: string): Sym[] {
  const lines = text.split('\n');
  const out: Sym[] = [];
  let currentClass = '';
  lines.forEach((raw, i) => {
    const line = i + 1;
    let m: RegExpMatchArray | null;
    if (/^\}/.test(raw)) currentClass = '';
    if ((m = raw.match(/^(export\s+)?(?:default\s+)?(?:async\s+)?function\*?\s+(\w+)/))) {
      out.push({ line, kind: 'fn', name: m[2] ?? '', exported: !!m[1] });
    } else if ((m = raw.match(/^(export\s+)?(?:abstract\s+)?class\s+(\w+)/))) {
      currentClass = m[2] ?? '';
      out.push({ line, kind: 'class', name: currentClass, exported: !!m[1] });
    } else if ((m = raw.match(/^export\s+(type|interface|enum)\s+(\w+)/))) {
      out.push({ line, kind: m[1] ?? 'type', name: m[2] ?? '', exported: true });
    } else if ((m = raw.match(/^export\s+(?:const|let|var)\s+(\w+)/))) {
      out.push({ line, kind: 'const', name: m[1] ?? '', exported: true });
    } else if ((m = raw.match(/^const\s+(\w+)\s*(?::[^=]+)?=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*(?::[^=]+)?=>/))) {
      out.push({ line, kind: 'fn', name: m[1] ?? '', exported: false });
    } else if (
      currentClass &&
      (m = raw.match(/^  (?:(?:public|private|protected|static|async|override|readonly)\s+)*(?:get\s+|set\s+)?(\w+)\s*(?:<[^>]*>)?\(.*\)\s*(?::\s*[^{]+)?\{\s*$/))
    ) {
      const name = m[1] ?? '';
      if (!NOT_METHODS.has(name)) out.push({ line, kind: 'method', name: `${currentClass}.${name}`, exported: false });
    }
  });
  return out;
}

interface Heading {
  line: number;
  end: number;
  text: string;
}

export function extractH2(text: string): Heading[] {
  const lines = text.split('\n');
  const total = lineCount(text);
  const out: Heading[] = [];
  let inFence = false;
  let inFront = lines[0] === '---';
  lines.forEach((raw, i) => {
    if (inFront) {
      if (i > 0 && raw === '---') inFront = false;
      return;
    }
    if (/^```/.test(raw)) inFence = !inFence;
    if (!inFence && /^## /.test(raw)) out.push({ line: i + 1, end: total, text: raw.slice(3).trim() });
  });
  out.forEach((h, idx) => {
    const next = out[idx + 1];
    if (next) h.end = next.line - 1;
  });
  return out;
}

function shortLabel(title: string): string {
  const t = title.replace(/\s*[(—–].*$/, '').replace(/[🙋✅⏳]/gu, '').trim();
  return t.length > 30 ? t.slice(0, 29) + '…' : t;
}

function indexLine(rel: string, headings: Heading[]): string {
  const parts = headings.map((h) => {
    const num = h.text.match(/^(\d+(?:–\d+)?)\.\s*(.*)$/);
    const label = shortLabel(num ? (num[2] ?? '') : h.text);
    return `${num ? '§' + num[1] + ' ' : ''}${label} ${h.line}–${h.end}`;
  });
  return `- \`${rel}\`: ${parts.join(' · ')}`;
}

export function generate(root: string): Generated {
  const rel = (p: string): string => relative(root, p).split('\\').join('/');
  const out: string[] = [
    '# CODEMAP — автоматаар үүсгэсэн (гараар бүү засаарай). Шинэчлэх: `cd game && npm run codemap`',
    "# Хайх: `grep -n '<түлхүүр>' docs/CODEMAP.md` → олдсон мужийг л `sed -n 'a,bp' <файл>`. Ажлын эхэнд бүтнээр нь УНШИХГҮЙ.",
    '# Мөр: FILE <зам> <хэмжээ> <мөр>L exports: … | SYM <зам>:<мөр> <төрөл> <нэр> | DOC <зам>:<эхлэл>-<төгсгөл> <гарчиг>',
  ];

  const codeFiles = [
    ...walk(join(root, 'game', 'src'), (n) => n.endsWith('.ts')),
    ...walk(join(root, 'tools'), (n) => n.endsWith('.ts') && n !== 'codemap.ts'),
    join(root, 'tools', 'codemap.ts'),
  ];
  for (const file of codeFiles) {
    if (!existsSync(file)) continue;
    const text = readNorm(file);
    const syms = extractSymbols(text);
    const exp = syms.filter((s) => s.exported).map((s) => s.name);
    const expStr = exp.length > 14 ? exp.slice(0, 14).join(',') + `,+${exp.length - 14}` : exp.join(',');
    out.push(`FILE ${rel(file)} ${kb(text)} ${lineCount(text)}L${expStr ? ' exports: ' + expStr : ''}`);
    for (const s of syms) out.push(`SYM ${rel(file)}:${s.line} ${s.kind} ${s.name}`);
  }

  for (const file of walk(join(root, 'game', 'tests'), (n) => n.endsWith('.ts'))) {
    const text = readNorm(file);
    out.push(`FILE ${rel(file)} ${kb(text)} ${lineCount(text)}L`);
  }

  const block = [
    CONTEXT_START,
    '_Автомат (`cd game && npm run codemap`), гараар бүү засаарай. Хэсгийн мөрийн муж: `sed -n \'a,bp\' <файл>`._',
    ...INDEXED_DOCS.map((d) => indexLine(d, extractH2(readNorm(join(root, d))))),
    CONTEXT_END,
  ].join('\n');

  const ctxPath = join(root, 'docs', 'CONTEXT.md');
  const ctx = readNorm(ctxPath);
  const a = ctx.indexOf(CONTEXT_START);
  const b = ctx.indexOf(CONTEXT_END);
  let context = ctx;
  if (a >= 0 && b > a) context = ctx.slice(0, a) + block + ctx.slice(b + CONTEXT_END.length);
  const docFiles = walk(join(root, 'docs'), (n) => n.endsWith('.md') && n !== 'CODEMAP.md');
  for (const file of docFiles) {
    const r = rel(file);
    const text = r === 'docs/CONTEXT.md' ? context : readNorm(file);
    if (text.trim().length === 0) continue;
    const hs = extractH2(text);
    out.push(`FILE ${r} ${kb(text)} ${lineCount(text)}L`);
    for (const h of hs) out.push(`DOC ${r}:${h.line}-${h.end} ## ${h.text.length > 90 ? h.text.slice(0, 89) + '…' : h.text}`);
  }

  return { codemap: out.join('\n') + '\n', context };
}

function main(): void {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const g = generate(root);
  writeFileSync(join(root, 'docs', 'CODEMAP.md'), g.codemap, 'utf8');
  writeFileSync(join(root, 'docs', 'CONTEXT.md'), g.context, 'utf8');
  console.log(`docs/CODEMAP.md: ${g.codemap.split('\n').length - 1} мөр, ${kb(g.codemap)}; docs/CONTEXT.md индекс шинэчлэгдлээ`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
