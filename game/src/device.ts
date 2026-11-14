/**
 * Төхөөрөмж ба графикийн чанар (утас / компьютер).
 * Нэг код, нэг линк: мэдрэгч дэлгэцтэй бол утасны удирдлага, хөнгөн график автоматаар асна.
 *
 * URL параметр: ?mobile=1 (компьютер дээр утасны горим турших) · ?mobile=0 · ?q=low|mid|high
 * Чанарыг тоглоом дотроос сольж болно (localStorage-д хадгална).
 */
const qs = new URLSearchParams(location.search);

const mq = (q: string): boolean => typeof matchMedia === 'function' && matchMedia(q).matches;

/** Мэдрэгч дэлгэц үндсэн удирдлага уу (утас, таблет) */
export const isTouch: boolean =
  qs.get('mobile') === '1' || (qs.get('mobile') !== '0' && (mq('(pointer: coarse)') || (navigator.maxTouchPoints > 0 && mq('(hover: none)'))));

export type Quality = 'low' | 'mid' | 'high';
export const QUALITIES: Quality[] = ['low', 'mid', 'high'];
export const QUALITY_NAME: Record<Quality, string> = { low: 'Хөнгөн', mid: 'Дунд', high: 'Өндөр' };

const QKEY = 'nuudel.quality';
function stored(): Quality | null {
  try {
    const v = localStorage.getItem(QKEY);
    return v && (QUALITIES as string[]).includes(v) ? (v as Quality) : null;
  } catch {
    return null;
  }
}

export const quality: Quality =
  ((QUALITIES as string[]).includes(qs.get('q') ?? '') ? (qs.get('q') as Quality) : null) ?? stored() ?? (isTouch ? 'low' : 'high');

export function setQuality(q: Quality): void {
  try {
    localStorage.setItem(QKEY, q);
  } catch {
    /* хувийн горимд хадгалахгүй байж болно */
  }
}

export interface QualitySpec {
  antialias: boolean;
  maxDpr: number;
  shadows: boolean;
  shadowMap: number;
  flakes: number;
}

export const QUALITY_SPEC: Record<Quality, QualitySpec> = {
  low: { antialias: false, maxDpr: 1.25, shadows: false, shadowMap: 512, flakes: 700 },
  mid: { antialias: true, maxDpr: 1.5, shadows: true, shadowMap: 1024, flakes: 1400 },
  high: { antialias: true, maxDpr: 2, shadows: true, shadowMap: 2048, flakes: 2200 },
};

export const Q: QualitySpec = QUALITY_SPEC[quality];

/** Товчны нэрийг утасны товчны дүрсээр солих (зааврын бичиг, мэдэгдэлд) */
export const KEY_ICON: Record<string, string> = {
  E: '✋', B: '📦', T: '🧺', M: '🏕', J: '👥', Tab: '🗺', V: '🚚', F: '🐎', Q: '🐺', K: '🐕', N: '📯',
  U: '🪵', H: '🐴', Z: '🛡', G: '🌿', F1: '❓', Space: '📣', Shift: '⏩', Enter: '▶',
};

export function touchKeys(s: string): string {
  if (!isTouch) return s;
  return s
    .replace(/<kbd>([A-Za-z0-9]+)<\/kbd>/g, (m, k: string) => (KEY_ICON[k] ? `<kbd>${KEY_ICON[k]}</kbd>` : m))
    .replace(/\((Q|E|T|B|M|J|K|N|V|F|U|H|Z|G|F1)\)/g, (_m, k: string) => `(${KEY_ICON[k]})`)
    .replace(/\(1\/2\/3\)/g, '(⏱)')
    .replace(/(^|[\s(·,—])(Q|E|T|B|M|J|K|N|V|F|U|H|Tab|Space|F1)(?=[\s),·—:]|$)/g, (_m, pre: string, k: string) => pre + KEY_ICON[k]);
}
