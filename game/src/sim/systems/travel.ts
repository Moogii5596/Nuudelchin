/**
 * Газрын зураг ба тээвэр (M4.6, хэрэглэгчийн шийдвэр 2026-11-14 — Mount & Blade маяг).
 *
 * - Тоглогч морьтой эсвэл тэрэг/машиндаа сууж (V) өөрөө жолоодно. 3D-ийн хязгаарт хүрэхэд газрын зураг руу шилжинэ.
 *   Эхлэлд тээвэргүй (хэрэглэгчийн шийдвэр 2026-11-14): морьтойгоо явж, гартаа барьсан зүйлээ (10 нэгж) зарна.
 *   Морьтой үед авсан малаа араасаа тууж ирнэ (газрын зураг дээр удаан), бараа нь гэртээ ирэхэд хүргэгдэнэ.
 * - Газрын зураг дээр хулганаар очих газраа сонгоно, явж байхдаа өөрчилж болно. Цаг явна, сүрэг гэртээ.
 * - Сумын төвд хүрвэл сумын төвийн 3D (Худалдаачин), гэрийн бууцанд хүрвэл бууцны 3D-д замын төгсгөлөөс орно.
 *   Өөр бууцанд хүрвэл тэр бууцны мэдээлэл гарч, тэнд нүүж болно (migrateHere).
 * - Зарах бүтээгдэхүүн, малаа хотондоо тэрэг/машиндаа ачна (loadCargo). Худалдаачинд зарж, авсан бараагаа
 *   ачаад гэртээ буулгана (unloadCargo). Авсан машиныг худалдаачин гэрт хүргэнэ 🙋.
 */
import type { GameConfig } from '../config';
import type { Rng } from '../rng';
import { newAnimal, type Animal, type BuyOrder, type FleetVehicle, type GameState, type ProductId, type VehicleId } from '../state';
import { salePrice } from './animals';
import * as storage from './storage';
import { animalSlots, deliver, orderPrice, parkingSpot, productPrice, vehicleCfg } from './trip';
import { startMove } from './camps';

export type TravelEvent =
  | { type: 'leftToMap' }
  | { type: 'arrived'; place: 'camp' | 'sum' }
  | { type: 'arriveCamp'; campId: string };   // өөр бууцанд ирлээ

export function fleetOf(state: GameState, id: VehicleId): FleetVehicle | undefined {
  return state.fleet.find((f) => f.id === id);
}

/** Шинэ тээвэр гэрийн бууцны зогсоолд */
export function initFleetVehicle(cfg: GameConfig, state: GameState, id: VehicleId): FleetVehicle {
  const p = parkingSpot(cfg, id);
  let f = fleetOf(state, id);
  if (!f) {
    f = { id, place: 'camp', x: p.x, z: p.z, heading: p.heading, cargo: {}, animals: [], orders: [] };
    state.fleet.push(f);
  }
  return f;
}

/** Тээвэр нэмэх (худалдаж авсан машиныг гэрт хүргэнэ) */
export function addVehicle(cfg: GameConfig, state: GameState, id: VehicleId): void {
  if (!state.vehicles.includes(id)) state.vehicles.push(id);
  initFleetVehicle(cfg, state, id);
}

/** Гэрийн бууцнаас гадуур эсвэл нүүж байгаа эсэхийг шинэчилнэ */
export function syncAway(state: GameState): void {
  state.player.away = state.player.place !== 'camp' || state.move !== null;
}

/** Ачааны хэмжээ (нэгж) ба малын байр (хонины тоогоор) */
export function cargoUnits(f: FleetVehicle): number {
  return Object.values(f.cargo).reduce((s, n) => s + (n ?? 0), 0);
}
export function cargoSlots(cfg: GameConfig, f: FleetVehicle): number {
  return f.animals.reduce((s, a) => s + animalSlots(cfg, f.id, a.species), 0);
}

/** Тоглогчийн ойрын (суух боломжтой) тээвэр */
export function nearestVehicle(_cfg: GameConfig, state: GameState, maxD: number): FleetVehicle | null {
  const p = state.player;
  let best: FleetVehicle | null = null, bd = maxD;
  for (const f of state.fleet) {
    if (f.place !== p.place) continue;
    const d = Math.hypot(f.x - p.x, f.z - p.z);
    if (d <= bd) {
      bd = d;
      best = f;
    }
  }
  return best;
}

export function enterVehicle(cfg: GameConfig, state: GameState): string | null {
  const p = state.player;
  if (p.driving) return 'Аль хэдийн жолоодож байна';
  if (p.place === 'map') return 'Газрын зураг дээр байна';
  if (p.mounted) return 'Эхлээд мориноосоо буу (F)';
  const f = nearestVehicle(cfg, state, cfg.vehicles.road.enterRange);
  if (!f) return 'Ойрхон тэрэг, машин алга';
  p.driving = f.id;
  p.x = f.x;
  p.z = f.z;
  p.heading = f.heading;
  return null;
}

export function exitVehicle(_cfg: GameConfig, state: GameState): string | null {
  const p = state.player;
  if (!p.driving) return 'Жолоодоогүй байна';
  if (p.place === 'map') return 'Газрын зураг дээр буух боломжгүй';
  const f = fleetOf(state, p.driving);
  p.driving = null;
  if (f) {
    // Тээврийн зүүн талд буух
    p.x = f.x + Math.cos(f.heading) * 2.2;
    p.z = f.z - Math.sin(f.heading) * 2.2;
  }
  return null;
}

/**
 * Тэнцвэрийн бот, туслахад: хамгийн их даацтай тээврийг сонгож суулгана (ойр байх шаардлагагүй).
 * Тээвэргүй бол унаа мориндоо мордоно. Амжилттай бол true.
 */
export function boardBest(cfg: GameConfig, state: GameState): boolean {
  const p = state.player;
  const here = state.fleet.filter((f) => f.place === p.place);
  if (!here.length) {
    if (p.driving) return true;
    const horse = state.animals.find((a) => a.riding);
    if (!horse) return false;
    p.mounted = true;
    p.horseCalled = false;
    return true;
  }
  here.sort((a, b) => vehicleCfg(cfg, b.id).capacity - vehicleCfg(cfg, a.id).capacity);
  p.mounted = false;
  p.driving = here[0]!.id;
  p.x = here[0]!.x;
  p.z = here[0]!.z;
  return true;
}

/** Агуулахаас гартаа авах (сумын төвд зарахаар) — гарт carryUnits хүртэл */
export function takeFromStorage(cfg: GameConfig, state: GameState, products: Partial<Record<ProductId, number>>, proximity: boolean): string | null {
  const p = state.player;
  const h = cfg.camps.home;
  if (proximity && Math.hypot(p.x - h.x, p.z - h.z) > h.storageRadius * 2) return 'Агуулахаас хол байна';
  let carried = p.carry.reduce((s, c) => s + c.amount, 0);
  let took = 0;
  for (const [k, n] of Object.entries(products)) {
    const room = cfg.products.carryUnits - carried;
    if (room <= 1e-9) break;
    const got = storage.take(state, k as ProductId, Math.min(n ?? 0, room));
    if (got <= 0) continue;
    p.carry.push({ product: k as ProductId, amount: got, age: 0 });
    carried += got;
    took += got;
  }
  return took > 0 ? null : 'Авах зүйл алга эсвэл гар дүүрсэн';
}

/** Морьтой үед сүргээс мал авч араасаа тууж явах (сумын төвд зарахаар) — газрын зураг дээр удаашруулна */
export function droveAnimals(state: GameState, animalIds: number[]): string | null {
  const p = state.player;
  if (!p.mounted || p.driving) return 'Морьтой үед л мал тууж явна';
  const list = state.animals.filter((a) => animalIds.includes(a.id) && !a.riding && a.ownerId === undefined);
  if (!list.length) return 'Мал сонгоогүй';
  state.animals = state.animals.filter((a) => !list.includes(a));
  p.drove.push(...list);
  return null;
}

/** Морьтой эсвэл тээвэртэй аялж байгаа эсэх (газрын зураг руу гарч болох) */
export function canTravel(state: GameState): boolean {
  return Boolean(state.player.driving || state.player.mounted);
}

/** Хаана байгаа байрлалын газрын зураг дээрх цэг */
function originKm(cfg: GameConfig, state: GameState): { x: number; z: number } {
  const id = state.player.place === 'sum' ? sumId(cfg) : state.campId;
  const l = cfg.worldmap.locations[id] ?? { x: 0, z: 0 };
  return { x: l.x, z: l.z };
}

export function sumId(cfg: GameConfig): string {
  return Object.entries(cfg.worldmap.locations).find(([, l]) => l.kind === 'sum')?.[0] ?? 'sum';
}

/** Жолоодож буй тээврийг хөдөлгөнө (input бодит цагаар). 3D-ийн хязгаарт хүрвэл газрын зураг руу гарна */
export function driveVehicle(cfg: GameConfig, state: GameState, x: number, z: number, heading: number): TravelEvent | null {
  const p = state.player;
  if (!p.driving || p.place === 'map') return null;
  const f = fleetOf(state, p.driving);
  if (!f) return null;
  const R = Math.hypot(x, z);
  const lim = cfg.player.worldRadius;
  if (R >= lim) {
    leaveToMap(cfg, state, x / R, z / R);
    return { type: 'leftToMap' };
  }
  f.x = p.x = x;
  f.z = p.z = z;
  f.heading = p.heading = heading;
  return null;
}

/** 3D-ээс газрын зураг руу (dirX, dirZ — гарсан зүг) */
export function leaveToMap(cfg: GameConfig, state: GameState, dirX: number, dirZ: number): string | null {
  const p = state.player;
  if (!canTravel(state)) return 'Морь унаж эсвэл тэрэг, машинтай газрын зураг руу гарна';
  const f = p.driving ? fleetOf(state, p.driving) : undefined;
  const o = originKm(cfg, state);
  const l = Math.hypot(dirX, dirZ) || 1;
  const off = cfg.worldmap.exitOffsetKm;
  state.map = { x: o.x + (dirX / l) * off, z: o.z + (dirZ / l) * off, tx: o.x + (dirX / l) * off, tz: o.z + (dirZ / l) * off, dest: null };
  p.place = 'map';
  if (f) f.place = 'map';
  syncAway(state);
  return null;
}

/** Газрын зураг дээр очих газар (dest — байршлын түлхүүр, эсвэл зураг дээрх цэг) */
export function mapGo(cfg: GameConfig, state: GameState, x: number, z: number, dest: string | null): string | null {
  if (state.player.place !== 'map') return 'Газрын зураг дээр биш байна';
  if (state.move) return 'Нүүж байна';
  const b = cfg.worldmap.bounds;
  const l = dest ? cfg.worldmap.locations[dest] : null;
  if (dest && !l) return 'Ийм газар алга';
  state.map.tx = l ? l.x : Math.min(b.maxX, Math.max(b.minX, x));
  state.map.tz = l ? l.z : Math.min(b.maxZ, Math.max(b.minZ, z));
  state.map.dest = dest;
  return null;
}

/** Газрын зураг дээрх хурд (км/тоглоомын минут). v = null бол морьтой (мал тууж явбал удаан) */
export function mapSpeedKmPerMin(cfg: GameConfig, v: VehicleId | null, droving = false): number {
  if (!v) return (droving ? cfg.vehicles.riding.droveKmh : cfg.vehicles.riding.mapKmh) / 60;
  const c = vehicleCfg(cfg, v);
  return cfg.vehicles.sumCenterKm / c.oneWayHours / 60;
}

/**
 * Тууж яваа мал аяллыг удаашруулах эсэх (хэрэглэгчийн дүрэм 2026-11-14):
 * 2+ хонь ямаа, эсвэл ганц ч гэсэн үхэр/адуу бол удаан; ганц хонь/ямаа бол хурд хэвээр.
 */
export function droveSlows(drove: Pick<Animal, 'species'>[]): boolean {
  if (drove.some((a) => a.species === 'cow' || a.species === 'horse')) return true;
  return drove.length > 1;
}

/** Одоогийн аяллын хурд */
export function partySpeedKmPerMin(cfg: GameConfig, state: GameState): number {
  const p = state.player;
  return mapSpeedKmPerMin(cfg, p.driving, !p.driving && droveSlows(p.drove));
}

/** Нэг тоглоомын минут: газрын зураг дээр явна. Ирсэн бол 3D руу орно */
export function mapStep(cfg: GameConfig, state: GameState, rng: Rng): TravelEvent[] {
  const p = state.player;
  if (p.place !== 'map' || !canTravel(state) || state.move) return [];
  const m = state.map;
  const dx = m.tx - m.x, dz = m.tz - m.z;
  const d = Math.hypot(dx, dz);
  if (d < 1e-6 && !m.dest) return [];
  const v = partySpeedKmPerMin(cfg, state);
  const step = Math.min(d, v);
  if (step > 0) {
    m.x += (dx / d) * step;
    m.z += (dz / d) * step;
    const fuel = p.driving ? (step * vehicleCfg(cfg, p.driving).fuelPer100km) / 100 : 0;
    if (fuel > 0) spend(state, 'fuel', fuel * cfg.vehicles.fuelPricePerL);
  }
  if (d - step > 1e-6 || !m.dest) return [];
  return [arrive(cfg, state, m.dest, rng)];
}

function spend(state: GameState, key: string, amount: number): void {
  state.money -= amount;
  state.today.expenses[key] = (state.today.expenses[key] ?? 0) + amount;
}

/** Газрын зураг дээрх байршилд хүрлээ */
function arrive(cfg: GameConfig, state: GameState, dest: string, rng: Rng): TravelEvent {
  const p = state.player;
  const f = p.driving ? fleetOf(state, p.driving) : undefined;
  state.map.dest = null;
  const loc = cfg.worldmap.locations[dest]!;
  if (loc.kind === 'camp' && dest !== state.campId) return { type: 'arriveCamp', campId: dest };
  let x: number, z: number, hx: number, hz: number;
  if (loc.kind === 'sum') {
    const e = cfg.worldmap.sum3d.entry;
    x = e.x;
    z = e.z;
    hx = -e.x;
    hz = -e.z;
    p.place = 'sum';
  } else {
    const road = cfg.camps.camps[state.campId]!.road;
    const end = road[road.length - 1]!, prev = road[road.length - 2]!;
    // Хязгаараас бага зэрэг дотор, замын дагуу
    const R = cfg.player.worldRadius - 4;
    const L = Math.hypot(end[0], end[1]);
    const k = L > R ? R / L : 1;
    x = end[0] * k;
    z = end[1] * k;
    hx = prev[0] - end[0];
    hz = prev[1] - end[1];
    p.place = 'camp';
  }
  // Хязгаараас дотор
  const R = Math.hypot(x, z), lim = cfg.player.worldRadius - 4;
  if (R > lim) {
    x *= lim / R;
    z *= lim / R;
  }
  p.x = x;
  p.z = z;
  p.heading = Math.atan2(hx, hz);
  if (f) {
    f.place = p.place;
    f.x = x;
    f.z = z;
    f.heading = p.heading;
  }
  // Морьтой бол унаа морь хамт
  const horse = p.mounted ? state.animals.find((a) => a.riding) : undefined;
  if (horse) {
    horse.x = horse.tx = x;
    horse.z = horse.tz = z;
  }
  // Гэртээ ирэхэд: тууж ирсэн мал сүрэгт нийлж, морьтой авсан бараа хүргэгдэнэ
  if (p.place === 'camp') {
    for (const a of p.drove) {
      a.x = a.tx = x + rng.range(-5, 5);
      a.z = a.tz = z + rng.range(-5, 5);
      a.mode = 'graze';
      state.animals.push(a);
    }
    p.drove = [];
    deliver(cfg, state, rng, p.orders);
    p.orders = [];
  }
  syncAway(state);
  return { type: 'arrived', place: p.place as 'camp' | 'sum' };
}

/** Өөр бууцанд ирээд тэнд нүүх (гэр бүл, сүрэг нүүж ирнэ) */
export function migrateHere(cfg: GameConfig, state: GameState): string | null {
  const p = state.player;
  if (p.place !== 'map') return 'Газрын зураг дээр биш байна';
  const here = Object.entries(cfg.worldmap.locations).find(
    ([id, l]) => l.kind === 'camp' && id !== state.campId && Math.hypot(l.x - state.map.x, l.z - state.map.z) <= cfg.worldmap.arriveRadiusKm,
  );
  if (!here) return 'Бууцанд хүрээгүй байна';
  return startMove(cfg, state, here[0], true);
}

/** Тээвэр гэрийн ачих зайд байгаа эсэх */
export function atLoadingSpot(cfg: GameConfig, _state: GameState, f: FleetVehicle): boolean {
  const h = cfg.camps.home;
  return f.place === 'camp' && Math.hypot(f.x - h.x, f.z - h.z) <= cfg.vehicles.road.loadRange;
}

/** Агуулахаас бүтээгдэхүүн, сүргээс мал ачих (хотонд) */
export function loadCargo(
  cfg: GameConfig,
  state: GameState,
  id: VehicleId,
  products: Partial<Record<ProductId, number>>,
  animalIds: number[],
  proximity: boolean,
): string | null {
  const f = fleetOf(state, id);
  if (!f) return 'Тээвэр алга';
  if (f.place !== 'camp' || state.player.place !== 'camp') return 'Тээвэр хотонд байх ёстой';
  if (proximity && !atLoadingSpot(cfg, state, f)) return 'Тээврээ майхны дэргэд авчир';
  const v = vehicleCfg(cfg, id);
  const units = Object.values(products).reduce((s, n) => s + (n ?? 0), 0);
  if (cargoUnits(f) + units > v.capacity + 1e-9) return `Ачаа багтахгүй (${Math.round(cargoUnits(f) + units)}/${v.capacity})`;
  const animals = state.animals.filter((a) => animalIds.includes(a.id) && !a.riding && a.ownerId === undefined);
  const slots = animals.reduce((s, a) => s + animalSlots(cfg, id, a.species), 0);
  if (cargoSlots(cfg, f) + slots > v.sheepSlots + 1e-9) return `Мал багтахгүй (${v.sheepSlots} хонь эсвэл ${v.cowSlots} үхэр)`;
  for (const [p, n] of Object.entries(products)) {
    const got = storage.take(state, p as ProductId, n ?? 0);
    if (got > 0) f.cargo[p as ProductId] = (f.cargo[p as ProductId] ?? 0) + got;
  }
  state.animals = state.animals.filter((a) => !animals.includes(a));
  f.animals.push(...animals);
  return null;
}

/** Ачааг хотод буулгах: бүтээгдэхүүн агуулахад, мал тээврийн дэргэд, бараа хүргэгдэнэ */
export function unloadCargo(cfg: GameConfig, state: GameState, rng: Rng, id: VehicleId, proximity: boolean): string | null {
  const f = fleetOf(state, id);
  if (!f) return 'Тээвэр алга';
  if (f.place !== 'camp') return 'Тээвэр хотонд байх ёстой';
  if (proximity && !atLoadingSpot(cfg, state, f)) return 'Тээврээ майхны дэргэд авчир';
  for (const [p, n] of Object.entries(f.cargo)) {
    const added = storage.add(cfg, state, p as ProductId, n ?? 0, 0);
    const left = (n ?? 0) - added;
    if (left > 1e-9) f.cargo[p as ProductId] = left;
    else delete f.cargo[p as ProductId];
  }
  for (const a of f.animals) {
    a.x = f.x + rng.range(-4, 4);
    a.z = f.z + rng.range(-4, 4);
    a.tx = a.x;
    a.tz = a.z;
    a.mode = 'graze';
    state.animals.push(a);
  }
  f.animals = [];
  deliver(cfg, state, rng, f.orders);
  f.orders = [];
  return cargoUnits(f) > 1e-9 ? 'Агуулах дүүрсэн — зарим ачаа тэргэнд үлдлээ' : null;
}

export interface TradePlan {
  sell: Partial<Record<ProductId, number>>;
  sellAnimalIds: number[];
  buy: BuyOrder[];
}

/** Худалдаачинд зарж болох бүтээгдэхүүн: тээврийн ачаа + гарт барьсан */
export function sellableAtShop(state: GameState): Partial<Record<ProductId, number>> {
  const out: Partial<Record<ProductId, number>> = {};
  const f = state.player.driving ? fleetOf(state, state.player.driving) : undefined;
  if (f) for (const [k, n] of Object.entries(f.cargo)) out[k as ProductId] = (out[k as ProductId] ?? 0) + (n ?? 0);
  for (const c of state.player.carry) out[c.product] = (out[c.product] ?? 0) + c.amount;
  return out;
}

/** Худалдаачинд зарж болох мал: тээврийн ачаа эсвэл тууж ирсэн */
export function sellableAnimals(state: GameState): Animal[] {
  const f = state.player.driving ? fleetOf(state, state.player.driving) : undefined;
  return [...(f?.animals ?? []), ...state.player.drove];
}

/** Авсан малын байр: тээвэртэй бол тэвшний байр, морьтой бол хязгааргүй (тууж ирнэ) */
export function animalRoom(cfg: GameConfig, state: GameState): number {
  const p = state.player;
  if (!p.driving) return Infinity;
  const f = fleetOf(state, p.driving)!;
  return vehicleCfg(cfg, f.id).sheepSlots - cargoSlots(cfg, f);
}

/**
 * Худалдаачинтай арилжаа хийх (сумын төвд). Тээвэртэй бол тээврийн ачаа, морьтой бол гарт барьсан, тууж ирсэн
 * малаас зарна. Авсан мал тээвэрт ачигдана (морьтой бол араасаа тууна), бараа гэртээ хүргэгдэнэ.
 * Буцаах: алдаа эсвэл null.
 */
export function trade(cfg: GameConfig, state: GameState, rng: Rng, plan: TradePlan, proximity: boolean): string | null {
  const p = state.player;
  if (p.place !== 'sum') return 'Сумын төвд байх ёстой';
  const shop = cfg.worldmap.sum3d.shop;
  if (proximity && Math.hypot(p.x - shop.x, p.z - shop.z) > shop.r) return 'Худалдаачны дэлгүүрт оч';
  const f = p.driving ? fleetOf(state, p.driving) : undefined;
  // Зарах: эхлээд тээврийн ачаанаас, дараа нь гарт барьснаас
  for (const [k, n] of Object.entries(plan.sell)) {
    const pid = k as ProductId;
    let want = n ?? 0;
    let sold = 0;
    if (f) {
      const have = f.cargo[pid] ?? 0;
      const s = Math.min(have, want);
      if (have - s > 1e-9) f.cargo[pid] = have - s;
      else delete f.cargo[pid];
      sold += s;
      want -= s;
    }
    for (const c of p.carry) {
      if (want <= 1e-9) break;
      if (c.product !== pid) continue;
      const s = Math.min(c.amount, want);
      c.amount -= s;
      sold += s;
      want -= s;
    }
    p.carry = p.carry.filter((c) => c.amount > 1e-9);
    if (sold <= 0) continue;
    const inc = sold * productPrice(cfg, pid);
    state.money += inc;
    state.today.income[pid] = (state.today.income[pid] ?? 0) + inc;
  }
  const sellA = sellableAnimals(state).filter((a) => plan.sellAnimalIds.includes(a.id));
  for (const a of sellA) {
    const inc = salePrice(a, cfg.animals);
    state.money += inc;
    state.today.income.animals = (state.today.income.animals ?? 0) + inc;
  }
  if (f) f.animals = f.animals.filter((a) => !sellA.includes(a));
  p.drove = p.drove.filter((a) => !sellA.includes(a));
  // Авах (мөнгө, байр хүрвэл)
  const failed: string[] = [];
  for (const o of plan.buy) {
    const price = orderPrice(cfg, state, o);
    if (state.money < price) {
      failed.push('мөнгө');
      continue;
    }
    if (o.kind === 'animal') {
      const need = f ? animalSlots(cfg, f.id, o.species) : 1;
      if (need > animalRoom(cfg, state) + 1e-9) {
        failed.push('тэвшний байр');
        continue;
      }
      const a: Animal = newAnimal(cfg, rng, state.nextId++, { species: o.species, sex: o.sex, age: o.age, x: p.x, z: p.z });
      if (f) f.animals.push(a);
      else p.drove.push(a);
    } else if (o.kind === 'vehicle') {
      addVehicle(cfg, state, o.id);   // худалдаачин гэрийн зогсоолд хүргэнэ 🙋
    } else if (f) f.orders.push(o);
    else p.orders.push(o);
    spend(state, 'buy_' + o.kind, price);
  }
  if (failed.length) return `${failed.length} зүйл авч чадсангүй (${[...new Set(failed)].join(', ')} хүрэлцээгүй)`;
  return null;
}
