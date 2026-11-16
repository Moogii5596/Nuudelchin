/**
 * Тоглогчийн бие даасан гэрүүд (M6.13, mvp-spec §3.2): гол гэр (`state.home`/`homeSize`, бууцны төвд) + нэмэлт гэрүүд (`state.extraGers`,
 * хотын сул цэгт автоматаар). Гэр бүр 1 ганц бие туслахын ор (хэмжээ орны тоонд нөлөөлөхгүй). Нүүх хугацаа, шатахуун, агуулахын
 * багтаамж — гэр бүрийн `moveMult`, `storage`-ийн нийлбэр. Гэр зарах — гэр/майхны дэлгүүрт үнийн 50%, сүүлийн гэрийг зарахгүй.
 * Айлын туслахын гэр (`helpers.dwellings` familyGer) энд ОРОХГҮЙ: бага 4 ханат, тоонд ороогүй, зарагдахгүй.
 */
import type { GameConfig } from '../config';
import type { GameState } from '../state';
import { m, type Msg } from '../msg';
import { nearTradeDoor } from './sumtown';

export interface ExtraGer { size: string; x: number; z: number }

export interface OwnGer { size: string; x: number; z: number; main: boolean }

/** Бүх өөрийн гэр: гол гэр (майхан биш бол) эхэнд, дараа нь нэмэлтүүд */
export function ownGers(cfg: GameConfig, state: GameState): OwnGer[] {
  const out: OwnGer[] = [];
  if (state.home === 'ger') out.push({ size: state.homeSize, x: cfg.camps.home.x, z: cfg.camps.home.z, main: true });
  for (const g of state.extraGers) out.push({ size: g.size, x: g.x, z: g.z, main: false });
  return out;
}

export const gerCount = (cfg: GameConfig, state: GameState): number => ownGers(cfg, state).length;

/** Нүүх хугацаа, рейс, шатахууны үржвэр: гэр бүрийн moveMult-ийн нийлбэр (майхан/гэргүй бол 1) */
export function moveMultSum(cfg: GameConfig, state: GameState): number {
  const gs = ownGers(cfg, state);
  return gs.length ? gs.reduce((s, g) => s + (cfg.ger.sizes[g.size]?.moveMult ?? 1), 0) : 1;
}

/** Гэр бүрийн агуулахын нэмэлт багтаамжийн нийлбэр */
export function gerStorageBonus(cfg: GameConfig, state: GameState): number {
  return ownGers(cfg, state).reduce((s, g) => s + (cfg.ger.sizes[g.size]?.storage ?? 0), 0);
}

/** Нэмэлт гэр худалдаж авах үнэ (гол гэртэй байх ёстой; хэмжээг худалдан авахдаа сонгоно) */
export function gerAddPrice(cfg: GameConfig, state: GameState, size: string): number {
  if (state.home !== 'ger' || !cfg.ger.sizes[size]) return Infinity;
  return cfg.ger.sizes[size]!.price;
}

/** Гэр зарах үнэ = хэмжээний үнийн sellRatio (50%) */
export function gerSellPrice(cfg: GameConfig, size: string): number {
  return Math.round((cfg.ger.sizes[size]?.price ?? 0) * cfg.ger.upgrade.sellRatio);
}

/** Хотын сул цэг: чөлөөт байрлал (айлын/туслахын байр, нэмэлт гэртэй давхцахгүй) */
const SLOTS: [number, number][] = [[-16, 12], [-18, -8], [-6, 22], [14, -30], [-28, 2], [4, 30]];
export function freeDwellingSlot(state: GameState): { x: number; z: number } {
  const used = [...state.helpers.dwellings, ...state.extraGers];
  for (const [x, z] of SLOTS) if (!used.some((d) => Math.hypot(d.x - x, d.z - z) < 1)) return { x, z };
  return { x: -30 + used.length * 6, z: 30 };
}

/** Нэмэлт гэрийг хүргэнэ (худалдан авалт ачаа буулгахад) */
export function addExtraGer(state: GameState, size: string): void {
  const s = freeDwellingSlot(state);
  state.extraGers.push({ size, x: s.x, z: s.z });
}

/**
 * Гэр зарна: index 0 = гол гэр, 1… = нэмэлтүүд. Зөвхөн гэр/майхны дэлгүүрийн үүдэнд; сүүлийн гэрийг зарахгүй;
 * гол гэрийг зарвал эхний нэмэлт гэр гол болно. Орлого = үнийн 50%.
 */
export function sellGer(cfg: GameConfig, state: GameState, index: number, proximity: boolean): Msg | null {
  if (proximity && nearTradeDoor(cfg, state)?.role !== 'ger_tent') return m('sim.go_to_the_ger_shop');
  const gs = ownGers(cfg, state);
  const g = gs[index];
  if (!g) return m('sim.no_such_ger');
  if (gs.length <= 1) return m('sim.you_cannot_sell_the_last_ger');
  if (g.main) {
    const next = state.extraGers.shift()!;   // эхний нэмэлт гэр гол болно (гол гэрийн байрлал бууцны төвд)
    state.homeSize = next.size;
  } else {
    state.extraGers.splice(index - (state.home === 'ger' ? 1 : 0), 1);
  }
  state.money += gerSellPrice(cfg, g.size);
  return null;
}

/** Нэмэлт гэр, гол гэр хоёрыг ялгах хаалганы id: `ger|<i>` — i нь extraGers-ийн индекс */
export const extraDoorId = (i: number): string => `ger|${i}`;

/** Орсон хаалганы гэрийн хэмжээ (дотор өрөө): гол гэр = homeSize, `ger|i` = нэмэлт гэр */
export function gerSizeOfDoor(state: GameState, doorId: string | undefined): string {
  const mt = /^ger\|(\d+)$/.exec(doorId ?? '');
  return mt ? state.extraGers[Number(mt[1])]?.size ?? state.homeSize : state.homeSize;
}

/** Зарах боломжтой жагсаалт (UI): [index, size] */
export function sellableGers(cfg: GameConfig, state: GameState): { index: number; size: string; price: number }[] {
  const gs = ownGers(cfg, state);
  if (gs.length <= 1) return [];
  return gs.map((g, index) => ({ index, size: g.size, price: gerSellPrice(cfg, g.size) }));
}

