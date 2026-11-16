/**
 * Хэрэглэгчид харагдах мессеж (M6.7b): sim нь текст биш `{ key, params }` буцаана, UI `tm()` (i18n/msg.ts) → `t(key, params)`-ээр
 * орчуулна. Ингэж sim i18n, DOM, Three.js-ээс хараат бус хэвээр. Түлхүүр нь `i18n/mn.json`, `en.json`-ийн `sim.*`.
 */
export type MsgParam = string | number | Msg | readonly (string | number | Msg)[];
export interface Msg {
  key: string;
  params?: Record<string, MsgParam>;
}

/** Орчуулгагүй (хөгжүүлэгчийн/туршилтын цэсийн) бичгийг мессеж болгоно — UI түлхүүргүйгээр шууд харуулна */
export function raw(text: string): Msg {
  return { key: 'sim.raw', params: { text } };
}

export function m(key: string, params?: Record<string, MsgParam>): Msg {
  return params ? { key, params } : { key };
}
