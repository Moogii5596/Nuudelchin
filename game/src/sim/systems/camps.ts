/**
 * Бууц сэлгэх (mvp-spec.md §7.3). Нүүх хугацаанд малчин завгүй.
 * Нүүж дуусахад шинэ бууцны тор (тухайн бууцны доройтлоор) үүсч, мал шинэ бууцанд ирнэ.
 * Газарт үлдсэн бүтээгдэхүүн хаягдана.
 */
import type { GameConfig } from '../config';
import type { Rng } from '../rng';
import type { GameState } from '../state';
import { buildGrid } from './pasture';
import { spawnWolves } from './wolves';
import { relocateDogs } from './dogs';
import { bestTruck } from './trip';

export function moveHours(cfg: GameConfig, state: GameState, byTruck: boolean): number {
  const m = cfg.camps.move;
  const ger = state.home === 'ger';
  if (byTruck) return ger ? Number(m.truckHoursGer) : Number(m.truckHoursTent);
  return ger ? Number(m.cartHoursGer) : Number(m.cartHoursTent);
}

export function startMove(cfg: GameConfig, state: GameState, to: string): string | null {
  if (!cfg.camps.camps[to]) return 'Ийм бууц алга';
  if (to === state.campId) return 'Аль хэдийн энэ бууцанд байна';
  if (state.trip || state.move || state.player.away) return 'Малчин завгүй';
  const truck = bestTruck(cfg, state);
  const byTruck = truck !== null;
  if (truck) {
    const trips = state.home === 'ger' ? Number(cfg.camps.move.truckTripsGer) : Number(cfg.camps.move.truckTripsTent);
    const liters = (cfg.vehicles.campDistanceKm * 2 * trips * cfg.vehicles[truck].fuelPer100km) / 100;
    const cost = liters * cfg.vehicles.fuelPricePerL;
    state.money -= cost;
    state.today.expenses.fuel = (state.today.expenses.fuel ?? 0) + cost;
  }
  state.move = { to, remaining: Math.round(moveHours(cfg, state, byTruck) * 60) };
  state.player.away = true;
  return null;
}

export function moveStep(cfg: GameConfig, state: GameState, rng: Rng): boolean {
  const mv = state.move;
  if (!mv) return false;
  mv.remaining -= 1;
  if (mv.remaining > 0) return false;
  // Нүүж ирлээ
  for (const it of state.items) state.today.spoiled[it.product] = (state.today.spoiled[it.product] ?? 0) + it.amount;
  state.items = [];
  state.campId = mv.to;
  state.grass = buildGrid(cfg, mv.to, state.camps[mv.to]?.degrade ?? 0, rng);
  const home = cfg.camps.home;
  for (const a of state.animals) {
    const ang = rng.range(0, Math.PI * 2), r = a.riding ? 0 : rng.range(8, 20);
    a.x = a.riding ? home.post.x : home.x + 25 + Math.cos(ang) * r;
    a.z = a.riding ? home.post.z : home.z + Math.sin(ang) * r;
    a.tx = a.x;
    a.tz = a.z;
    a.mode = 'graze';
    a.thirst = Math.min(a.thirst, 30);   // нүүх замдаа ус уусан
  }
  state.player.x = home.x + 2;
  state.player.z = home.z + 6;
  state.player.away = false;
  state.player.mounted = false;
  state.player.horseCalled = false;
  const peaceful = state.wolves.peaceful;
  state.wolves = spawnWolves(cfg, state.seed, mv.to);
  state.wolves.peaceful = peaceful;
  relocateDogs(cfg, state);
  state.move = null;
  return true;
}
