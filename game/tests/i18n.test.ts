/**
 * M6.7 Англи хэл: mn.json ба en.json түлхүүр, placeholder адил; UI кодод кирилл string literal үлдээгүй; кодод хэрэглэсэн
 * түлхүүр бүр хоёр хэлэнд байгаа. (sim/-ийн мессеж — CommandResult.msg, үйл явдал — одоогоор Монгол: M6.7-ийн үргэлжлэл.)
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '..', 'src');
const CYR = /[А-Яа-яЁёӨөҮү]/;
const read = (p: string): string => readFileSync(p, 'utf8');
const json = (n: string): Record<string, string> => JSON.parse(read(join(SRC, 'i18n', n))) as Record<string, string>;
const ph = (s: string): string => (s.match(/\{[A-Za-z_]\w*\}/g) ?? []).sort().join(',');

/** i18n шаардлагатай (хэрэглэгчид харагдах текстийн) файлууд */
const UI_FILES = ['main.ts', 'pwa.ts', 'device.ts', 'render/worldmap.ts', 'render/ui', 'input'];
function walk(p: string): string[] {
  if (!existsSync(p)) return [];
  if (statSync(p).isFile()) return p.endsWith('.ts') ? [p] : [];
  return readdirSync(p).flatMap((n) => walk(join(p, n)));
}

/** string/template literal-уудыг (коммент, regex-ээс гадуур) задлана: [текст, эхлэх индекс] */
function literals(src: string): [string, number][] {
  const out: [string, number][] = [];
  const strEnd = (i: number): number => { const q = src[i]; let j = i + 1; while (j < src.length && src[j] !== q) j += src[j] === '\\' ? 2 : 1; return j + 1; };
  const exprEnd = (i: number): number => {
    let d = 0, j = i;
    while (j < src.length) {
      const c = src[j]!;
      if (c === '\'' || c === '"') { j = strEnd(j); continue; }
      if (c === '`') { j = tpl(j).end; continue; }
      if (c === '{') d++;
      if (c === '}') { if (d === 0) return j; d--; }
      j++;
    }
    return j;
  };
  const tpl = (i: number): { end: number } => {
    let j = i + 1, cur = '';
    const start = i;
    while (j < src.length && src[j] !== '`') {
      if (src[j] === '\\') { cur += src.slice(j, j + 2); j += 2; continue; }
      if (src[j] === '$' && src[j + 1] === '{') {
        const e = exprEnd(j + 2);
        scan(j + 2, e);
        j = e + 1;
        continue;
      }
      cur += src[j++];
    }
    out.push([cur, start]);
    return { end: j + 1 };
  };
  const scan = (from: number, to: number): void => {
    let j = from, prev = '';
    while (j < to) {
      const c = src[j]!;
      if (c === '/' && src[j + 1] === '/') { while (j < to && src[j] !== '\n') j++; continue; }
      if (c === '/' && src[j + 1] === '*') { j = src.indexOf('*/', j + 2) + 2; continue; }
      if (c === '\'' || c === '"') { const e = strEnd(j); out.push([src.slice(j + 1, e - 1), j]); j = e; prev = 'x'; continue; }
      if (c === '`') { j = tpl(j).end; prev = 'x'; continue; }
      if (c === '/' && (prev === '' || '(,=:[!&|?{};+-*<>~^%'.includes(prev))) {   // regex
        let k = j + 1, cls = false;
        while (k < to && (src[k] !== '/' || cls)) { if (src[k] === '\\') k++; else if (src[k] === '[') cls = true; else if (src[k] === ']') cls = false; k++; }
        j = k + 1; prev = 'x'; continue;
      }
      if (!/\s/.test(c)) prev = c;
      j++;
    }
  };
  scan(0, src.length);
  return out;
}

describe('i18n: mn.json ↔ en.json', () => {
  const pairs: [string, string][] = [['mn.json', 'en.json'], ['npc.mn.json', 'npc.en.json']];
  for (const [a, b] of pairs) {
    if (!existsSync(join(SRC, 'i18n', a)) || !existsSync(join(SRC, 'i18n', b))) continue;
    it(`${a} ба ${b}: түлхүүр адил, placeholder адил, англи хэсэгт кирилл байхгүй`, () => {
      const A = json(a), B = json(b);
      expect(Object.keys(A).filter((k) => !(k in B)), `${b}-д дутуу`).toEqual([]);
      expect(Object.keys(B).filter((k) => !(k in A)), `${a}-д дутуу`).toEqual([]);
      for (const k of Object.keys(A)) {
        expect(ph(B[k]!), `placeholder ${k}`).toBe(ph(A[k]!));
        expect(CYR.test(B[k]!), `${b} ${k}: кирилл — «${B[k]}»`).toBe(false);
        expect(B[k]!.trim().length, `${b} ${k} хоосон`).toBeGreaterThan(0);
      }
    });
  }
});

describe('i18n: кодын хэрэглээ', () => {
  const files = UI_FILES.flatMap((f) => walk(join(SRC, f)));

  it('UI кодод кирилл string literal үлдээгүй (комментоос гадуур; i18n-skip, Error/console, хэлний нэр хориглоогүй)', () => {
    const bad: string[] = [];
    for (const f of files) {
      const src = read(f);
      for (const [text, at] of literals(src)) {
        if (!CYR.test(text)) continue;
        const lineStart = src.lastIndexOf('\n', at) + 1;
        const lineEnd = src.indexOf('\n', at);
        const line = src.slice(lineStart, lineEnd < 0 ? undefined : lineEnd);
        if (line.includes('i18n-skip')) continue;
        if (/(new\s+\w*Error|console\.\w+)\s*\(/.test(src.slice(Math.max(0, at - 80), at))) continue;   // хөгжүүлэгчийн алдаа
        if (text === 'Монгол') continue;   // хэлний сонголтын товч — өөрийн хэл дээр
        bad.push(`${relative(SRC, f)}:${src.slice(0, at).split('\n').length} «${text.slice(0, 50)}»`);
      }
    }
    expect(bad, 'эдгээрийг t(\'түлхүүр\')-ээр солино').toEqual([]);
  });

  it('кодод шууд бичсэн t(\'түлхүүр\') бүр mn.json, en.json-д байна', () => {
    const mn = json('mn.json'), en = json('en.json');
    const npcMn = existsSync(join(SRC, 'i18n', 'npc.mn.json')) ? json('npc.mn.json') : {};
    const missing: string[] = [];
    for (const f of walk(SRC)) {
      for (const m of read(f).matchAll(/\bt\(\s*'([A-Za-z0-9_.\-]+)'/g)) {
        const k = m[1]!;
        if (k.endsWith('.')) continue;   // динамик түлхүүр t('camp.' + id)
        if (!(k in mn) && !(k in npcMn)) missing.push(`${relative(SRC, f)}: ${k}`);
        else if (k in mn && !(k in en)) missing.push(`${relative(SRC, f)}: ${k} (en)`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('хэл: тест (Node) орчинд анхдагч Монгол', async () => {
    const { getLang, t } = await import('../src/i18n/i18n');
    expect(getLang()).toBe('mn');
    expect(t('menu.continue')).toBe('Үргэлжлүүлэх');
  });
});
