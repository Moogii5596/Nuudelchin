import mn from './mn.json';
import en from './en.json';

export type Lang = 'mn' | 'en';
const tables: Record<Lang, Record<string, string>> = { mn, en };
export const LANG_KEY = 'nuudel.lang';

/**
 * Анхны хэл (хэрэглэгчийн шийдвэр): ?lang=mn|en (туршилт, хадгалахгүй) > хадгалсан сонголт (localStorage) > АНГЛИ.
 * Хөтчийн хэлийг (navigator.language) ТООЦОХГҮЙ: шинэ тоглогч хэлнээс үл хамааран англиар эхэлнэ, Монголыг ⚙ Settings → Language
 * эсвэл эхлэлийн дэлгэцийн хэл солих товчоор сонгоно.
 */
export function resolveLang(search: string, stored: string | null): Lang {
  const q = new URLSearchParams(search).get('lang');
  if (q === 'mn' || q === 'en') return q;
  return stored === 'mn' || stored === 'en' ? stored : 'en';
}

function initialLang(): Lang {
  let search = '';
  let stored: string | null = null;
  try { search = typeof location !== 'undefined' ? location.search : ''; } catch { /* DOM-гүй */ }
  try { stored = typeof localStorage !== 'undefined' ? localStorage.getItem(LANG_KEY) : null; } catch { /* хадгалалт хаалттай */ }
  return resolveLang(search, stored);
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

/** Заасан хэлээр (хос хэлтэй товч: EN · MN хоёр мөр — docs/ui/handoff-1-menu-settings.md) */
export function tIn(l: Lang, key: string, vars: Record<string, unknown> = {}): string {
  const s = tables[l][key] ?? tables.mn[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));
}
