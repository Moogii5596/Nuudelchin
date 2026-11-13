/**
 * Бүтээгдэхүүн: мал газарт унагана, газарт муудна (Farm Frenzy маяг). mvp-spec.md §4.1.
 */
import type { GameConfig } from '../config';
import type { Rng } from '../rng';
import type { GameState, ProductId } from '../state';

function bump(rec: Partial<Record<ProductId, number>>, p: ProductId, n: number): void {
  rec[p] = (rec[p] ?? 0) + n;
}

function drop(state: GameState, rng: Rng, product: ProductId, amount: number, x: number, z: number): void {
  state.items.push({ id: state.nextId++, product, amount, x: x + rng.range(-0.6, 0.6), z: z + rng.range(-0.6, 0.6), age: 0 });
  bump(state.today.dropped, product, amount);
}

/** Минут бүр: сүүтэй үнээ идэшээ гүйцэж байгаа бол сав сүү унагана */
export function productionStep(cfg: GameConfig, state: GameState, rng: Rng): void {
  const m = cfg.products.drops.milk;
  const dayLen = cfg.time.dayEndMinute - cfg.time.dayStartMinute;
  const progress = (state.time.minute - cfg.time.dayStartMinute) / dayLen;
  for (const a of state.animals) {
    if (a.species !== 'cow' || a.sex !== 'f' || !a.lactating) continue;
    if (a.gutFill < m.minGutFillPace * progress) continue; // идэшээ гүйцэхгүй бол сүү гарахгүй
    a.milkTimer += 0.6 + 0.6 * a.condition; // тарган үнээ илүү сүүтэй (grazing-livestock.md §1.5)
    if (a.milkTimer >= m.everyHours * 60) {
      a.milkTimer -= m.everyHours * 60;
      drop(state, rng, 'milk', m.amount, a.x, a.z);
    }
  }
}

/** Өдрийн эцэс: ноос, ноолуур (тарга хангалттай бол) */
export function dailyFiber(cfg: GameConfig, state: GameState, rng: Rng): void {
  const w = cfg.products.drops.wool;
  const c = cfg.products.drops.cashmere;
  for (const a of state.animals) {
    const rule = a.species === 'sheep' ? w : a.species === 'goat' ? c : null;
    if (!rule || a.age < 1) continue;
    if (a.condition < rule.minCondition) continue;
    a.fiberDays += 1;
    if (a.fiberDays >= rule.everyDays) {
      a.fiberDays -= rule.everyDays;
      drop(state, rng, a.species === 'sheep' ? 'wool' : 'cashmere', rule.amount, a.x, a.z);
    }
  }
}

/** Минут бүр: газарт байгаа бүтээгдэхүүн хуучирна. Сүү → тараг → муудна; ноос салхинд хийснэ */
export function groundAgingStep(cfg: GameConfig, state: GameState): void {
  const g = cfg.products.ground;
  const dayLen = cfg.time.dayEndMinute - cfg.time.dayStartMinute;
  let removed = false;
  for (const it of state.items) {
    it.age += 1;
    if (it.product === 'milk' && it.age >= g.milkSourHours * 60) it.product = 'tarag';
    else if (it.product === 'tarag' && it.age >= (g.milkSourHours + g.taragSpoilHours) * 60) {
      bump(state.today.spoiled, 'tarag', it.amount);
      it.amount = 0;
      removed = true;
    } else if ((it.product === 'wool' || it.product === 'cashmere') && it.age >= g.fiberBlowAwayDays * dayLen) {
      bump(state.today.spoiled, it.product, it.amount);
      it.amount = 0;
      removed = true;
    }
  }
  if (removed) state.items = state.items.filter((it) => it.amount > 0);
  // Гарт барьж яваа бүтээгдэхүүн ч мөн хуучирна (сүү → тараг)
  for (const c of state.player.carry) {
    c.age += 1;
    if (c.product === 'milk' && c.age >= g.milkSourHours * 60) c.product = 'tarag';
  }
}
