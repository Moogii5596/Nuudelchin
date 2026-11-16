import mn from './mn.json';
import en from './en.json';

export type Lang = 'mn' | 'en';
const tables: Record<Lang, Record<string, string>> = { mn, en };
let lang: Lang = 'mn';

export function setLang(l: Lang): void {
  lang = l;
}

export function getLang(): Lang {
  return lang;
}

/** t('hud.day', { day: 3 }) → "3-р өдөр" */
export function t(key: string, vars: Record<string, string | number> = {}): string {
  const s = tables[lang][key] ?? tables.mn[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
}
