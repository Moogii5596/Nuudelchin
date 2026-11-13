/**
 * Сумын төвийн аялал: тэрэг/машинд ачаа ачиж зарах, бараа, мал авах (mvp-spec.md §5).
 * Хагас замд (сумын төвд) зарж, авна. Буцаж ирэхэд авсан зүйл хүргэгдэнэ.
 */
import type { GameConfig } from '../config';
import type { Rng } from '../rng';
import { newAnimal, type BuyOrder, type GameState, type ProductId, type TripState, type VehicleId } from '../state';
import { buyPrice, salePrice } from './animals';
import * as storage from './storage';

export function vehicleCfg(cfg: GameConfig, v: VehicleId) {
  return cfg.vehicles[v];
}

export function productPrice(cfg: GameConfig, p: ProductId): number {
  return (cfg.products.prices as Record<string, number>)[p] ?? 0;
}

export function orderPrice(cfg: GameConfig, state: GameState, o: BuyOrder): number {
  switch (o.kind) {
    case 'animal':
      return buyPrice({ species: o.species, sex: o.sex, age: o.age, condition: 0.6 }, cfg.animals);
    case 'processor':
      return cfg.processing[o.id].price;
    case 'storage':
      return cfg.storage.levels[state.storageLevel + 1]?.price ?? Infinity;
    case 'ger':
      return cfg.economy.gerPrice;
    case 'vehicle':
      return cfg.vehicles[o.id].price;
  }
}

export interface TripPlan {
  vehicle: VehicleId;
  sell: Partial<Record<ProductId, number>>;
  sellAnimalIds?: number[];
  buy: BuyOrder[];
}

/** Аялал эхлүүлэх. Алдаа бол тайлбар буцаана */
export function startTrip(cfg: GameConfig, state: GameState, plan: TripPlan): string | null {
  if (state.trip) return 'Аялал явж байна';
  if (!state.vehicles.includes(plan.vehicle)) return 'Тээвэр байхгүй';
  const v = vehicleCfg(cfg, plan.vehicle);
  const units = Object.values(plan.sell).reduce((s, n) => s + (n ?? 0), 0);
  if (units > v.capacity + 1e-9) return `Ачаа багтахгүй (${units}/${v.capacity})`;
  const sellAnimals = state.animals.filter((a) => plan.sellAnimalIds?.includes(a.id) && !a.riding);
  const slots = sellAnimals.reduce((s, a) => s + (a.species === 'cow' || a.species === 'horse' ? v.sheepSlots / v.cowSlots : 1), 0);
  if (slots > v.sheepSlots + 1e-9) return 'Мал багтахгүй';
  const cargo: Partial<Record<ProductId, number>> = {};
  for (const [p, n] of Object.entries(plan.sell)) {
    const got = storage.take(state, p as ProductId, n ?? 0);
    if (got > 0) cargo[p as ProductId] = got;
  }
  // Зарах малыг тэргэнд ачна (сүргээс гарна), үнийг одоо тооцоолно
  let animalIncome = 0;
  for (const a of sellAnimals) animalIncome += salePrice(a, cfg.animals);
  state.animals = state.animals.filter((a) => !sellAnimals.includes(a));
  const trip: TripState = {
    vehicle: plan.vehicle,
    elapsed: 0,
    total: Math.round(v.oneWayHours * 2 * 60),
    arrived: false,
    cargo,
    buy: plan.buy,
    income: animalIncome,
    bought: [],
  };
  state.trip = trip;
  state.player.away = true;
  const km = cfg.vehicles.sumCenterKm * 2;
  const fuel = (km * v.fuelPer100km) / 100;
  if (fuel > 0) spend(state, 'fuel', fuel * cfg.vehicles.fuelPricePerL);
  return null;
}

function spend(state: GameState, key: string, amount: number): void {
  state.money -= amount;
  state.today.expenses[key] = (state.today.expenses[key] ?? 0) + amount;
}

export function tripStep(cfg: GameConfig, state: GameState, rng: Rng): void {
  const t = state.trip;
  if (!t) return;
  t.elapsed += 1;
  if (!t.arrived && t.elapsed >= t.total / 2) {
    t.arrived = true;
    // Зарах
    for (const [p, n] of Object.entries(t.cargo)) {
      const inc = (n ?? 0) * productPrice(cfg, p as ProductId);
      t.income += inc;
      state.today.income[p as ProductId] = (state.today.income[p as ProductId] ?? 0) + inc;
    }
    const animalIncome = t.income - Object.entries(t.cargo).reduce((s, [p, n]) => s + (n ?? 0) * productPrice(cfg, p as ProductId), 0);
    if (animalIncome > 0) state.today.income.animals = (state.today.income.animals ?? 0) + animalIncome;
    state.money += t.income;
    // Авах (мөнгө хүрвэл)
    for (const o of t.buy) {
      const price = orderPrice(cfg, state, o);
      if (state.money >= price) {
        spend(state, 'buy_' + o.kind, price);
        t.bought.push(o);
      }
    }
  }
  if (t.elapsed >= t.total) {
    deliver(cfg, state, rng, t.bought);
    state.trip = null;
    state.player.away = false;
  }
}

function deliver(cfg: GameConfig, state: GameState, rng: Rng, orders: BuyOrder[]): void {
  const home = cfg.camps.home;
  for (const o of orders) {
    switch (o.kind) {
      case 'animal':
        state.animals.push(
          newAnimal(cfg, rng, state.nextId++, { species: o.species, sex: o.sex, age: o.age, x: home.x + 8 + rng.range(-3, 3), z: home.z + rng.range(-3, 3) }),
        );
        break;
      case 'processor':
        state.processors.push({ kind: o.id, remaining: 0, pending: {} });
        break;
      case 'storage':
        state.storageLevel = Math.min(state.storageLevel + 1, cfg.storage.levels.length - 1);
        break;
      case 'ger':
        state.home = 'ger';
        break;
      case 'vehicle':
        if (!state.vehicles.includes(o.id)) state.vehicles.push(o.id);
        break;
    }
  }
}
