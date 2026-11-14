/**
 * Газарт унасан бүтээгдэхүүн муудах (Farm Frenzy маяг). mvp-spec.md §4.1.
 * M4.5: мал сүү, ноосоо өглөө хоносон газраа үлдээнэ — systems/night.ts → morning().
 */
import type { GameConfig } from '../config';
import type { GameState, ProductId } from '../state';
import { fullDayMinutes } from '../clock';

function bump(rec: Partial<Record<ProductId, number>>, p: ProductId, n: number): void {
  rec[p] = (rec[p] ?? 0) + n;
}

/** Минут бүр: газарт байгаа бүтээгдэхүүн хуучирна. Сүү → тараг → муудна; ноос салхинд хийснэ */
export function groundAgingStep(cfg: GameConfig, state: GameState): void {
  const g = cfg.products.ground;
  const dayLen = fullDayMinutes(cfg.time);
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
