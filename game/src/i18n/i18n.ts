import mn from './mn.json';
import en from './en.json';

export type Lang = 'mn' | 'en';
const tables: Record<Lang, Record<string, string>> = { mn, en };
export const LANG_KEY = 'nuudel.lang';

/** Анхны хэл: хадгалсан сонголт, үгүй бол хөтчийн хэл (mn* → Монгол, бусад → English). Модулиуд ачаалагдахаас өмнө тогтоогдоно */
function initialLang(): Lang {
  if (typeof window === 'undefined') return 'mn';   // тест (Node): Монгол
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === 'mn' || v === 'en') return v;
  } catch { /* хадгалалт хаалттай */ }
  try {
    return typeof navigator !== 'undefined' && /^mn/i.test(navigator.language) ? 'mn' : typeof navigator !== 'undefined' ? 'en' : 'mn';
  } catch {
    return 'mn';
  }
}

let lang: Lang = initialLang();

export function setLang(l: Lang): void {
  lang = l;
}

export function getLang(): Lang {
  return lang;
}

/** t('hud.day', { day: 3 }) → "3-р өдөр" */
export function t(key: string, vars: Record<string, unknown> = {}): string {
  const s = tables[lang][key] ?? tables.mn[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
}
