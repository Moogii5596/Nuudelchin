/**
 * Худалдаачин (сумын төв), тээврийн тусламжийн функцууд (mvp-spec.md §5).
 * M4.6 (хэрэглэгчийн шийдвэр 2026-11-14): сумын төв рүү хийсвэр аялал хасагдсан. Тоглогч тэрэг/машинаа
 * өөрөө жолоодож газрын зургаар явна (systems/travel.ts). Энд үнэ, тээврийн багтаамж, захиалга хүргэх.
 */
import type { GameConfig } from '../config';
import { gerUpgradePrice } from './gerLayout';
import type { Rng } from '../rng';
import { newAnimal, type BuyOrder, type GameState, type ProductId, type VehicleId } from '../state';
import { buyPrice } from './animals';
import { newDog } from './dogs';
import { addVehicle } from './travel';
import { addDwelling } from './helpers';

export type VehicleSpec = GameConfig['vehicles']['porter'];

export function vehicleCfg(cfg: GameConfig, v: VehicleId): VehicleSpec {
  return cfg.vehicles[v];
}

/** Эзэмшиж буй хамгийн их даацтай ачааны машин (нүүх, сумын төвд анхдагч) */
export function bestTruck(cfg: GameConfig, state: GameState): VehicleId | null {
  let best: VehicleId | null = null;
  for (const v of state.vehicles) {
    const c = vehicleCfg(cfg, v);
    if (c.truck && (!best || c.capacity > vehicleCfg(cfg, best).capacity)) best = v;
  }
  return best;
}

/** Тээврийн зогсоол (майхны дэргэд) */
export function parkingSpot(cfg: GameConfig, v: VehicleId): { x: number; z: number; heading: number } {
  return (cfg.vehicles.road.parking as Record<string, { x: number; z: number; heading: number }>)[v] ?? { x: 0, z: -12, heading: 0 };
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
      return gerUpgradePrice(cfg.ger, state.home === 'ger' ? state.homeSize : null, o.size);
    case 'vehicle':
      return cfg.vehicles[o.id].price;
    case 'dog':
      return cfg.dogs.price;
    case 'helperTent':
      return cfg.helpers.housing.helperTent.price;
    case 'helperGer':
      return cfg.helpers.housing.helperGer.price;
    case 'otorTent':
      return cfg.helpers.otor.tentPrice;
    case 'hay':
      return o.n * cfg.seasons.hay.price;
  }
}

/** Мал тэргэнд эзлэх байр (хонины тоогоор) */
export function animalSlots(cfg: GameConfig, v: VehicleId, species: string): number {
  const vc = cfg.vehicles[v];
  return species === 'cow' || species === 'horse' ? vc.sheepSlots / vc.cowSlots : 1;
}

/** Захиалгыг хотод хүргэнэ (ачаа буулгахад) */
export function deliver(cfg: GameConfig, state: GameState, rng: Rng, orders: BuyOrder[]): void {
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
        state.homeSize = o.size;
        break;
      case 'vehicle':
        addVehicle(cfg, state, o.id);
        break;
      case 'helperTent':
      case 'helperGer':
        addDwelling(state, o.kind);
        break;
      case 'otorTent':
        state.helpers.otorTents = (state.helpers.otorTents ?? 0) + 1;
        break;
      case 'hay': {
        const c = state.camps[state.campId];
        if (c) c.hay = (c.hay ?? 0) + o.n;
        break;
      }
      case 'dog':
        if (state.dogs.length < cfg.dogs.maxDogs) state.dogs.push(newDog(cfg, state, home.x + 3 + rng.range(-1, 1), home.z - 3));
        break;
    }
  }
}
