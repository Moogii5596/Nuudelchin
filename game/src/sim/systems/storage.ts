/**
 * Агуулах: багтаамж, нэмэх, авах (хуучнаас нь эхэлж), өдрийн муудалт.
 * mvp-spec.md §4.2. 1 л сүү = 1 кг ноос = 1 нэгж.
 */
import type { GameConfig } from '../config';
import { gerStorageBonus } from './ownGers';
import type { Batch, GameState, ProductId } from '../state';

export function capacity(cfg: GameConfig, state: GameState): number {
  // M6.13: томсгосон гэр багтаамж нэмнэ (data/ger.json sizes[k].storage)
  return (cfg.storage.levels[state.storageLevel]?.capacity ?? 0) + gerStorageBonus(cfg, state);
}

export function used(state: GameState): number {
  return state.storage.reduce((s, b) => s + b.amount, 0);
}

export function freeSpace(cfg: GameConfig, state: GameState): number {
  return Math.max(0, capacity(cfg, state) - used(state));
}

export function count(state: GameState, product: ProductId): number {
  return state.storage.filter((b) => b.product === product).reduce((s, b) => s + b.amount, 0);
}

/** Багтах хэмжээгээр нэмж, нэмэгдсэн хэмжээг буцаана */
export function add(cfg: GameConfig, state: GameState, product: ProductId, amount: number, ageDays = 0): number {
  const n = Math.min(amount, freeSpace(cfg, state));
  if (n <= 1e-9) return 0;
  const same = state.storage.find((b) => b.product === product && b.ageDays === ageDays);
  if (same) same.amount += n;
  else state.storage.push({ product, amount: n, ageDays });
  return n;
}

/** Хуучнаас нь эхэлж авна. Авсан хэмжээг буцаана */
export function take(state: GameState, product: ProductId, amount: number): number {
  let need = amount;
  const batches = state.storage.filter((b) => b.product === product).sort((a, b) => b.ageDays - a.ageDays);
  for (const b of batches) {
    if (need <= 1e-9) break;
    const n = Math.min(b.amount, need);
    b.amount -= n;
    need -= n;
  }
  state.storage = state.storage.filter((b) => b.amount > 1e-9);
  return amount - need;
}

/**
 * Өдрийн эцсийн муудалт: сүү 1 өдрийн дараа тараг, 2 өдрийн дараа мууддаг.
 * Муудсан хэмжээг буцаана.
 */
export function dailyStorageAging(cfg: GameConfig, state: GameState): Partial<Record<ProductId, number>> {
  const sp = cfg.products.storage;
  const spoiled: Partial<Record<ProductId, number>> = {};
  const next: Batch[] = [];
  for (const b of state.storage) {
    b.ageDays += 1;
    if (b.product === 'milk' && b.ageDays >= sp.milkSourDays) b.product = 'tarag';
    if (b.product === 'tarag' && b.ageDays >= sp.milkSpoilDays) {
      spoiled.tarag = (spoiled.tarag ?? 0) + b.amount;
      continue;
    }
    next.push(b);
  }
  // Ижил бүтээгдэхүүн, ижил настайг нэгтгэнэ
  const merged: Batch[] = [];
  for (const b of next) {
    const m = merged.find((x) => x.product === b.product && x.ageDays === b.ageDays);
    if (m) m.amount += b.amount;
    else merged.push({ ...b });
  }
  state.storage = merged;
  return spoiled;
}
