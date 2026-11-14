/**
 * Сумын төвийн аялал: тэрэг/машинд ачаа ачиж зарах, бараа, мал авах (mvp-spec.md §5).
 * Хагас замд (сумын төвд) зарж, авна. Буцаж ирэхэд авсан зүйл хүргэгдэнэ.
 * M4.5 (хэрэглэгчийн дүрэм 2026-11-14): тэрэг, машин зогсоолоосоо замаар явж бууцны захын толгод
 * давж алга болно, буцахдаа мөн замаар ирнэ (tripPose). Малчин тэрэг/машин дээрээ сууж явна.
 */
import type { GameConfig } from '../config';
import type { Rng } from '../rng';
import { newAnimal, type BuyOrder, type GameState, type ProductId, type TripState, type VehicleId } from '../state';
import { buyPrice, salePrice } from './animals';
import * as storage from './storage';
import { newDog } from './dogs';

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

/** Замын харагдах хэсгийг туулах хугацаа (минут) — нэг тийш */
export function visibleLegMinutes(cfg: GameConfig, v: VehicleId, total: number): number {
  const c = vehicleCfg(cfg, v);
  return Math.min(cfg.vehicles.road.length / c.visibleSpeed, (total / 2) * 0.9);
}

/**
 * Харагдах хэсгийн явц (0–1 цаг → 0–1 зай). Эхэндээ аажим хурдалж (accel хувь), дараа нь тогтмол хурдтай.
 * Буцахдаа эсрэгээр: тогтмол хурдтай ирж, зогсоол руу аажим удааширч зогсоно.
 */
function legDistance(u: number, accel = 0.25): number {
  const x = Math.min(1, Math.max(0, u));
  const v = 1 / (1 - accel / 2);
  return x < accel ? (v * x * x) / (2 * accel) : v * (accel / 2 + (x - accel));
}

/**
 * Аялж буй тээврийн байрлал. Зогсоолоос замын эхлэл рүү, тэндээс dir зүг рүү length м.
 * elapsed бутархай байж болно (дүрслэл алхам хооронд зөөлрүүлнэ).
 * visible = false бол газрын зургаас гадуур (сумын төв рүү замдаа).
 */
export function tripPose(cfg: GameConfig, t: Pick<TripState, 'vehicle' | 'elapsed' | 'total'>): { x: number; z: number; heading: number; visible: boolean } {
  const r = cfg.vehicles.road;
  const leg = visibleLegMinutes(cfg, t.vehicle, t.total);
  const p = parkingSpot(cfg, t.vehicle);
  const lead = Math.hypot(r.start.x - p.x, r.start.z - p.z);
  const total = lead + r.length;
  let d: number, back = false;
  if (t.elapsed <= leg) d = legDistance(t.elapsed / leg) * total;
  else if (t.elapsed >= t.total - leg) {
    d = legDistance((t.total - t.elapsed) / leg) * total;
    back = true;
  } else return { x: r.start.x + r.dir.x * r.length, z: r.start.z + r.dir.z * r.length, heading: Math.atan2(r.dir.x, r.dir.z), visible: false };
  let x: number, z: number, hx: number, hz: number;
  if (d <= lead && lead > 0) {
    const k = d / lead;
    x = p.x + (r.start.x - p.x) * k;
    z = p.z + (r.start.z - p.z) * k;
    hx = r.start.x - p.x;
    hz = r.start.z - p.z;
  } else {
    const k = d - lead;
    x = r.start.x + r.dir.x * k;
    z = r.start.z + r.dir.z * k;
    hx = r.dir.x;
    hz = r.dir.z;
  }
  if (back) {
    hx = -hx;
    hz = -hz;
  }
  return { x, z, heading: Math.atan2(hx, hz), visible: true };
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
    case 'dog':
      return cfg.dogs.price;
  }
}

/** Мал тэргэнд эзлэх байр (хонины тоогоор) */
export function animalSlots(cfg: GameConfig, v: VehicleId, species: string): number {
  const vc = cfg.vehicles[v];
  return species === 'cow' || species === 'horse' ? vc.sheepSlots / vc.cowSlots : 1;
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
  if (slots > v.sheepSlots + 1e-9) return `Зарах мал тэргэнд багтахгүй (${v.sheepSlots} хонь эсвэл ${v.cowSlots} үхэр)`;
  const buySlots = plan.buy.reduce((s, o) => s + (o.kind !== 'animal' ? 0 : o.species === 'cow' || o.species === 'horse' ? v.sheepSlots / v.cowSlots : 1), 0);
  if (buySlots > v.sheepSlots + 1e-9) return `Авах мал тэргэнд багтахгүй (${v.sheepSlots} хонь эсвэл ${v.cowSlots} үхэр)`;
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
  state.player.mounted = false;
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
    const p = parkingSpot(cfg, t.vehicle);
    state.player.x = p.x + 2;
    state.player.z = p.z + 2.5;
  } else {
    // Малчин тэрэг/машин дээрээ сууж явна
    const pose = tripPose(cfg, t);
    state.player.x = pose.x;
    state.player.z = pose.z;
    state.player.heading = pose.heading;
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
      case 'dog':
        if (state.dogs.length < cfg.dogs.maxDogs) state.dogs.push(newDog(cfg, state, home.x + 3 + rng.range(-1, 1), home.z - 3));
        break;
    }
  }
}
