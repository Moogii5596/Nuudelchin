/**
 * GameState: тоглоомын бүх өгөгдөл. Хадгалж, ачаалж болох энгийн JSON бүтэц.
 * Render зөвхөн уншина; өөрчлөх эрх зөвхөн sim/-д бий (architecture.md §3.1).
 */
import type { GameConfig, Sex, Species } from './config';
import { newTime, type TimeState } from './clock';
import { Rng } from './rng';
import { buildGrid, type GrassGrid } from './systems/pasture';
import { spawnWolves, type WolfState } from './systems/wolves';
import type { Dog } from './systems/dogs';

export const SAVE_VERSION = 7;   // 4: малчин унах/чиглэл, чоно (M2) · 5: шилбүүр/уурга барих · 6: нохой, чонын дайралт, сүргийн нүүдэл (M4) · 7: шөнө, хотлох, өглөөний бүтээгдэхүүн, Портер/Амжиргаа, шөнийн чоно (M4.5)

export type ProductId = 'milk' | 'tarag' | 'aaruul' | 'urum' | 'wool' | 'felt' | 'cashmere';
export const PRODUCTS: readonly ProductId[] = ['milk', 'tarag', 'aaruul', 'urum', 'wool', 'felt', 'cashmere'];

/** trek = сүргээрээ шинэ бэлчээр рүү нүүж байна (systems/herds.ts) · flee = чоноос айж зугтаж байна (systems/wolves.ts)
 *  home = орой хотондоо харьж байна · sleep = хэвтэж унтаж байна (systems/night.ts, M4.5) */
export type AnimalMode = 'graze' | 'drink' | 'rest' | 'driven' | 'trek' | 'flee' | 'home' | 'sleep';

export interface Animal {
  id: number;
  species: Species;
  sex: Sex;
  age: number;           // хийсвэр нас (бутархай). 1 = animalYearDays өдөр
  condition: number;     // тарга 0–1
  health: number;        // 0–100
  gutFill: number;       // өнөөдрийн идэш 0–1 (өдрийн тааз = 1)
  lastGut: number;       // өчигдрийн идэш — өглөөний сүү, ноосны хэмжээ (M4.5)
  dietSum: number;       // Σ(идсэн хэмжээ × чанар) — dietQuality = dietSum / gutFill
  thirst: number;        // 0–100
  thirstMaxedToday: boolean;
  lactating: boolean;
  riding: boolean;
  cycleOffset: number;   // төллөлтийн мөчлөгийн өдөр (бүх мал нэг өдөр төллөхгүй)
  milkTimer: number;     // хуримтлагдсан сүүний бутархай литр (өглөө бүхэл литрээр унана)
  fiberDays: number;     // ноос/ноолуурын ахиц (өдөр); everyDays хүрэхэд өглөө унана
  mode: AnimalMode;
  drivenAt: number;      // сүүлд туугдсан (айсан) алхам — herds.ts: туугдсан газраа тодорхой хугацаа үлдэнэ
  x: number;
  z: number;
  tx: number;            // зорилтот цэг
  tz: number;
  heading: number;
  motherId?: number;
}

export interface GroundItem {
  id: number;
  product: ProductId;
  amount: number;
  x: number;
  z: number;
  age: number;           // газарт байсан тоглоомын минут
}

export interface Batch {
  product: ProductId;
  amount: number;
  ageDays: number;
}

export type ProcessorKind = 'pot' | 'separator' | 'feltKit';

export interface ProcessorState {
  kind: ProcessorKind;
  remaining: number;     // үлдсэн минут (0 = сул)
  pending: Partial<Record<ProductId, number>>;   // дууссан ч агуулахад багтаагүй гаралт
}

export type VehicleId = 'horseCart' | 'porter' | 'amjirgaa';
export const VEHICLES: readonly VehicleId[] = ['horseCart', 'porter', 'amjirgaa'];

export type BuyOrder =
  | { kind: 'animal'; species: Species; sex: Sex; age: number }
  | { kind: 'processor'; id: ProcessorKind }
  | { kind: 'storage' }
  | { kind: 'ger' }
  | { kind: 'vehicle'; id: VehicleId }
  | { kind: 'dog' };

export interface TripState {
  vehicle: VehicleId;
  elapsed: number;       // минут
  total: number;
  arrived: boolean;      // сумын төвд хүрсэн эсэх
  cargo: Partial<Record<ProductId, number>>;
  buy: BuyOrder[];
  income: number;
  bought: BuyOrder[];    // амжилттай худалдан авсан, буцахад хүргэгдэнэ
}

export interface CampState {
  degrade: number;       // 0–1
  daysSpent: number;
}

export interface DayStats {
  income: Partial<Record<ProductId | 'animals', number>>;
  expenses: Record<string, number>;
  dropped: Partial<Record<ProductId, number>>;
  collected: Partial<Record<ProductId, number>>;
  spoiled: Partial<Record<ProductId, number>>;
  births: number;
  deaths: number;
  wolfKills: Partial<Record<Species, number>>;   // чонод барьдсан (deaths-д ороогүй)
}

export interface PlayerState {
  x: number;
  z: number;
  heading: number;       // харж буй чиглэл (рад, +z = 0)
  mounted: boolean;      // морь унасан
  horseCalled: boolean;  // морь дуудсан (давхиж ирж байна)
  holdingUurga: boolean; // шилбүүр/богино уурга барьсан — зөвхөн энэ үед мал малчнаас айна (prototype-rules.md §4)
  carry: { product: ProductId; amount: number; age: number }[];
  away: boolean;         // сумын төв рүү явсан
}

export interface GameState {
  version: number;
  seed: number;
  rngState: number;
  step: number;          // нийт алхам (минут)
  time: TimeState;
  money: number;
  home: 'tent' | 'ger';
  campId: string;
  camps: Record<string, CampState>;
  grass: GrassGrid;
  nextId: number;
  animals: Animal[];
  items: GroundItem[];
  storageLevel: number;
  storage: Batch[];
  processors: ProcessorState[];
  vehicles: VehicleId[];
  trip: TripState | null;
  move: { to: string; remaining: number } | null;   // бууц сэлгэж байгаа
  neighborBull: boolean;
  player: PlayerState;
  wolves: WolfState;
  dogs: Dog[];
  today: DayStats;
  goalReachedDay: number | null;
}

export function emptyDayStats(): DayStats {
  return { income: {}, expenses: {}, dropped: {}, collected: {}, spoiled: {}, births: 0, deaths: 0, wolfKills: {} };
}

export function newAnimal(
  cfg: GameConfig,
  rng: Rng,
  id: number,
  o: { species: Species; sex: Sex; age: number; x: number; z: number; condition?: number; lactating?: boolean; riding?: boolean },
): Animal {
  return {
    id,
    species: o.species,
    sex: o.sex,
    age: o.age,
    condition: o.condition ?? 0.6,
    health: 100,
    gutFill: 0,
    lastGut: 0.8,
    dietSum: 0,
    thirst: rng.range(0, 30),
    thirstMaxedToday: false,
    lactating: Boolean(o.lactating),
    riding: Boolean(o.riding),
    cycleOffset: rng.int(0, cfg.time.animalYearDays - 1),
    milkTimer: rng.range(0, 1),
    fiberDays: rng.range(0, 3),
    mode: 'graze',
    drivenAt: -1e9,
    x: o.x,
    z: o.z,
    tx: o.x,
    tz: o.z,
    heading: rng.range(0, Math.PI * 2),
  };
}

export function createInitialState(cfg: GameConfig, seed: number): GameState {
  const rng = new Rng(seed);
  const animals: Animal[] = cfg.start.animals.map((a, i) => {
    const r = rng.range(8, 22);
    const ang = rng.range(0, Math.PI * 2);
    return newAnimal(cfg, rng, i + 1, {
      species: a.species,
      sex: a.sex,
      age: a.age,
      lactating: a.lactating,
      riding: a.riding,
      x: a.riding ? cfg.camps.home.post.x : Math.cos(ang) * r + 25,
      z: a.riding ? cfg.camps.home.post.z : Math.sin(ang) * r,
    });
  });
  const camps: Record<string, CampState> = {};
  for (const id of Object.keys(cfg.camps.camps)) camps[id] = { degrade: 0, daysSpent: 0 };
  const grass = buildGrid(cfg, cfg.start.camp, 0, rng);
  return {
    version: SAVE_VERSION,
    seed,
    rngState: rng.state,
    step: 0,
    time: newTime(cfg.time),
    money: cfg.economy.startMoney,
    home: cfg.start.home === 'ger' ? 'ger' : 'tent',
    campId: cfg.start.camp,
    camps,
    grass,
    nextId: animals.length + 1,
    animals,
    items: [],
    storageLevel: cfg.start.storageLevel,
    storage: [],
    processors: [],
    vehicles: cfg.start.vehicles as VehicleId[],
    trip: null,
    move: null,
    neighborBull: false,
    player: { x: 2, z: 6, heading: 0, mounted: false, horseCalled: false, holdingUurga: false, carry: [], away: false },
    wolves: spawnWolves(cfg, seed, cfg.start.camp),
    dogs: [],
    today: emptyDayStats(),
    goalReachedDay: null,
  };
}
