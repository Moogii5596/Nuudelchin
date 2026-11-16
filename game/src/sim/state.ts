/**
 * GameState: тоглоомын бүх өгөгдөл. Хадгалж, ачаалж болох энгийн JSON бүтэц.
 * Render зөвхөн уншина; өөрчлөх эрх зөвхөн sim/-д бий (architecture.md §3.1).
 */
import type { GameConfig, Sex, Species } from './config';
import { newTime, type TimeState } from './clock';
import { Rng } from './rng';
import type { FlockCenter } from './systems/herds';
import { defaultDifficulty, type Difficulty } from './systems/difficulty';
import type { ExtraGer } from './systems/ownGers';
import { newTraderState, type TraderState } from './systems/trader';
import { newMilestones, newStats, type MilestoneState, type Stats } from './systems/milestones';
import { buildGrid, type GrassGrid } from './systems/pasture';
import { spawnWolves, type WolfState } from './systems/wolves';
import type { Dog } from './systems/dogs';
import { initFleetVehicle } from './systems/travel';
import { newHelpersState, type HelpersState } from './systems/helpers';
import { newTownState, type TownState } from './systems/town';
import { newJournal, type JournalState } from './systems/journal';

export const SAVE_VERSION = 22;   // 4: малчин унах/чиглэл, чоно (M2) · 5: шилбүүр/уурга барих · 6: нохой, чонын дайралт, сүргийн нүүдэл (M4) · 7: шөнө, хотлох, өглөөний бүтээгдэхүүн, Портер/Амжиргаа, шөнийн чоно (M4.5) · 8: газрын зураг, тээвэр жолоодох, ачаа, Худалдаачин (M4.6) · 9: туслах малчид, цайны газар, отор, туслахын мал (M5) · 10: улирал, цас, боодол өвс, 4 бууц, отрын бүтээгдэхүүн (M5.5) · 11: сумын төвийн амьдрал — байшин, нэр хүнд, зээл, хамаатан (V3.4) · 12: орж болдог барилга — player.interior (V6.1) · 13: Sim-ийн нуугдмал төлөв state-д — dayStartMoney, flockCenters (M6.1) · 14: settings.difficulty — тайван тохиргооны гулсуурууд (M6.10) · 15: homeSize — гэрийн хэмжээ, BuyOrder ger.size (M6.13) · 16: stats, milestones, settings.showMilestones (M6.5) · 20: trader — явуулын худалдаачин (M6.12) · 19: leaders — сүргийн удирдагч (M6.9) · 18: stuckEvents, Animal.sn/sx/sz (M6.8) · 17: extraGers (олон гэр), BuyOrder gerAdd; helperGer/helperTent байр → гэр (M6.13)

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
  /** M6.9: уяагүй унаа морины бэлчээрийн төв (буусан газар) */
  hx?: number;
  hz?: number;
  /** M6.8 гацалт илрүүлэгч: хөдлөөгүй дараалсан алхам, суурь байрлал (systems/safety.ts) */
  sn?: number;
  sx?: number;
  sz?: number;
  drivenAt: number;      // сүүлд туугдсан (айсан) алхам — herds.ts: туугдсан газраа тодорхой хугацаа үлдэнэ
  x: number;
  z: number;
  tx: number;            // зорилтот цэг
  tz: number;
  heading: number;
  motherId?: number;
  ownerId?: number;      // туслахынх (цалинг малаар өгсөн) — M5. undefined = тоглогчийнх
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
  | { kind: 'ger'; size: string }   // M6.13: гэр (data/ger.json sizes-ийн түлхүүр) — томсгох/анхны гэр
  | { kind: 'vehicle'; id: VehicleId }
  | { kind: 'dog' }
  | { kind: 'gerAdd'; size: string }   // M6.13: нэмэлт гэр (хэмжээг сонгоно; ганц бие туслахын 1 ор)
  | { kind: 'otorTent' }     // отрын илүү майхан (M5)
  | { kind: 'hay'; n: number }   // боодол өвс (M5.5) — гэрийн бууцны овоонд
  ;

/** Тоглогч хаана байна: camp = гэрийн бууцны 3D, sum = сумын төвийн 3D, map = газрын зураг (M4.6) */
export type Place = 'camp' | 'sum' | 'map';

/**
 * V6.1: барилгын дотор. `player.interior` байвал тоглогч барилга дотор — `player.x/z/place` хаалганы гадна цэгт
 * хөдөлгөөнгүй хэвээр (худалдаа, цонхны ойролцоо шалгалт дотроос ч ажиллана), дотор байрлал энд.
 */
export interface InteriorState {
  /** Хаалганы id: барилгын id, 'home' (өөрийн гэр), `<kind>|<x>|<z>` (айл, туслахын гэр), хашааны id (байшин, хамаатан) */
  door: string;
  /** data/interiors.json-ийн өрөөний төрөл */
  room: string;
  /** Өрөөний координат (м): төв 0,0, хаалга z+ талд */
  x: number;
  z: number;
  heading: number;
}

/** Тээвэр бүрийн байрлал ба ачаа (M4.6) */
export interface FleetVehicle {
  id: VehicleId;
  place: Place;
  x: number;             // 3D байрлал (place-ийн координатаар, м)
  z: number;
  heading: number;
  cargo: Partial<Record<ProductId, number>>;   // ачсан бүтээгдэхүүн
  animals: Animal[];     // ачсан мал (зарах эсвэл худалдаж авсан)
  orders: BuyOrder[];    // худалдаж авсан бараа — хотод буулгахад хүргэгдэнэ
}

/** Газрын зураг дээрх тоглогчийн байрлал (км) ба очих газар */
export interface MapState {
  x: number;
  z: number;
  tx: number;
  tz: number;
  dest: string | null;   // worldmap.locations-ийн түлхүүр, эсвэл null (зураг дээрх цэг)
}

export interface CampState {
  degrade: number;       // 0–1
  daysSpent: number;
  snow: number;          // цасны зузаан, см (M5.5)
  grass: number;         // эзгүй үеийн дундаж өвс 0–1 (одоогийн бууцных торонд)
  hay: number;           // бууцанд овоолсон боодол өвс
}

export interface DayStats {
  income: Partial<Record<ProductId | 'animals' | 'rent' | 'loan', number>>;
  expenses: Record<string, number>;
  dropped: Partial<Record<ProductId, number>>;
  collected: Partial<Record<ProductId, number>>;
  spoiled: Partial<Record<ProductId, number>>;
  births: number;
  deaths: number;
  wolfKills: Partial<Record<Species, number>>;   // чонод барьдсан (deaths-д ороогүй)
  hayFed: number;    // өгсөн боодол өвс (M5.5)
  coldHit: number;   // гадуур хүйтэнд хоносон мал (M5.5)
  // --- Өдрийн тайлангийн дэлгэрэнгүй (1f; хуучин хадгалалтад байхгүй байж болно) ---
  /** Өглөө сүү/ноос үлдээсэн байдал, төрлөөр (night.ts morning) */
  yield?: Partial<Record<YieldSpecies, YieldNote>>;
  /** Чоно мал хөөж эхэлсэн удаа */
  wolfAttacks?: number;
  /** Чонод алдсан мал хаана барьдсан: хотон / бэлчээр / чонын нутаг */
  wolfWhere?: Partial<Record<WolfWhere, number>>;
  /** Үхлийн шалтгаан (deaths-ийн задаргаа) */
  deathCauses?: Partial<Record<DeathCause, number>>;
  /** Зарсан, худалдаж авсан малын тоо */
  sold?: number;
  bought?: number;
  /** Өдрийн эхэнд (өмнөх тайлангийн дараа) байсан малын тоо — нийт өөрчлөлт */
  animalsStart?: number;
}

export type YieldSpecies = 'cow' | 'sheep' | 'goat';
export type WolfWhere = 'pen' | 'pasture' | 'den';
export type DeathCause = 'old' | 'starve' | 'thirst' | 'weak';
/** Өглөөний бүтээгдэхүүн: хэдэн мал үлдээсэн, үлдээгээгүй нь яагаад (симуляцийн бодит нөхцөлөөр) */
export interface YieldNote {
  gave: number;      // сүү/ноос үлдээсэн
  outside: number;   // үүнээс хотноос гадуур хоносон (бүтээгдэхүүн тэнд үлдсэн)
  lowGut: number;    // өчигдөр өвс бараг идээгүй (идшийн хүчин зүйл 0) — юу ч гараагүй
  lowCond: number;   // тарга муу (ноос/ноолуур ургахгүй)
  partial: number;   // сүү: нэг сав хүрээгүй, хуримтлагдаж байна
  dry: number;       // үнээ: тугаллаагүй, сүүгүй
}

export interface PlayerState {
  x: number;
  z: number;
  heading: number;       // харж буй чиглэл (рад, +z = 0)
  mounted: boolean;      // морь унасан
  horseCalled: boolean;  // морь дуудсан (давхиж ирж байна)
  /** M6.9: өмнөх алхамын байрлал (татах: малчин хөдөлсөн эсэх) */
  px?: number;
  pz?: number;
  holdingUurga: boolean; // шилбүүр/богино уурга барьсан — зөвхөн энэ үед мал малчнаас айна (prototype-rules.md §4)
  carry: { product: ProductId; amount: number; age: number }[];
  away: boolean;         // гэрийн бууцнаас гадуур (сумын төв, газрын зураг) эсвэл нүүж байна — sim тооцно
  place: Place;          // M4.6
  driving: VehicleId | null;   // жолоодож буй тээвэр
  drove: Animal[];       // морьтой үед Худалдаачнаас авч араасаа тууж яваа мал (M4.6)
  orders: BuyOrder[];    // морьтой үед авсан бараа — гэртээ ирэхэд хүргэгдэнэ
  interior: InteriorState | null;   // V6.1: барилга дотор байгаа эсэх
}

export interface GameState {
  version: number;
  seed: number;
  rngState: number;
  step: number;          // нийт алхам (минут)
  time: TimeState;
  money: number;
  home: 'tent' | 'ger';
  /** M6.13: өөрийн гэрийн хэмжээ (data/ger.json sizes-ийн түлхүүр); home='tent' үед ч хадгалагдана (дараагийн гэрийн суурь) */
  homeSize: string;
  /** M6.13: нэмэлт гэрүүд (хотын сул цэгт); гэр бүр 1 ганц бие туслахын ор */
  extraGers: ExtraGer[];
  /** M6.8: гацалт илрүүлэгчээр шилжүүлсэн малын нийт тоо (тест: 0 байх ёстой) */
  stuckEvents: number;
  /** M6.9: сүргийн удирдагч (ахмад эм мал): flock (sheep|cow|horse) → малын id */
  leaders: Record<string, number>;
  /** M6.12: явуулын худалдаачин (ченж): дараагийн ирэх өдөр, одоогийн айлчлал */
  trader: TraderState;
  /** 📜 Тэмдэглэл: сүүлийн мэдэгдэл, өдрийн тайлангууд (v21) */
  journal: JournalState;
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
  fleet: FleetVehicle[];
  map: MapState;
  move: { to: string; remaining: number } | null;   // бууц сэлгэж байгаа
  neighborBull: boolean;
  player: PlayerState;
  wolves: WolfState;
  dogs: Dog[];
  helpers: HelpersState;
  today: DayStats;
  goalReachedDay: number | null;
  /** V3.4: сумын төвийн амьдрал (байшин, нэр хүнд, зээл, хамаатан) */
  town: TownState;
  /** M6.1: өдрийн эхэн дэх мөнгө (өдрийн тайлан). null = Sim-ийг үүсгэхэд `money`-оор тохируулна */
  dayStartMoney: number | null;
  /** M6.1: малын нэгдэх төв (systems/herds.ts cohesionCenters): [малын id, төв]. Сүүлийн шийдвэрийн алхмын үр дүн — ачаалсны дараа ч үргэлжилнэ */
  flockCenters: [number, FlockCenter][];
  /** M6.10: тоглогчийн тохиргоо. Тоглолтын дундаас `setDifficulty` командаар солино */
  settings: { difficulty: Difficulty; /** HUD-ийн замын тэмдгийн самбар (тоглогч нууж болно) */ showMilestones: boolean };
  /** M6.5: статистик (замын тэмдэг, ёслолын график) */
  stats: Stats;
  /** M6.5: хүрсэн замын тэмдгүүд, хүлээгдэж буй баярын мөч */
  milestones: MilestoneState;
}

export function emptyDayStats(): DayStats {
  return { income: {}, expenses: {}, dropped: {}, collected: {}, spoiled: {}, births: 0, deaths: 0, wolfKills: {}, hayFed: 0, coldHit: 0 };
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
  for (const id of Object.keys(cfg.camps.camps)) camps[id] = { degrade: 0, daysSpent: 0, snow: 0, grass: 0.85, hay: 0 };
  const grass = buildGrid(cfg, cfg.start.camp, 0, rng);
  const st: GameState = {
    version: SAVE_VERSION,
    seed,
    rngState: rng.state,
    step: 0,
    time: newTime(cfg.time),
    money: cfg.economy.startMoney,
    home: cfg.start.home === 'ger' ? 'ger' : 'tent',
    homeSize: cfg.ger.home.size,
    extraGers: [],
    stuckEvents: 0,
    leaders: {},
    trader: newTraderState(cfg, seed),
    journal: newJournal(),
    campId: cfg.start.camp,
    camps,
    grass,
    nextId: animals.length + 1,
    animals,
    items: [],
    storageLevel: cfg.start.storageLevel,
    storage: [],
    processors: [],
    vehicles: [...cfg.start.vehicles] as VehicleId[],
    fleet: [],
    map: { x: 0, z: 0, tx: 0, tz: 0, dest: null },
    move: null,
    neighborBull: false,
    player: { x: 2, z: 6, heading: 0, mounted: false, horseCalled: false, holdingUurga: false, carry: [], away: false, place: 'camp', driving: null, drove: [], orders: [], interior: null },
    wolves: spawnWolves(cfg, seed, cfg.start.camp),
    dogs: [],
    helpers: newHelpersState(),
    town: newTownState(cfg),
    today: emptyDayStats(),
    goalReachedDay: null,
    dayStartMoney: null,
    flockCenters: [],
    settings: { difficulty: defaultDifficulty(cfg), showMilestones: true },
    stats: newStats(),
    milestones: newMilestones(),
  };
  const loc = cfg.worldmap.locations[cfg.start.camp];
  if (loc) st.map = { x: loc.x, z: loc.z, tx: loc.x, tz: loc.z, dest: null };
  for (const v of st.vehicles) initFleetVehicle(cfg, st, v);
  return st;
}

/**
 * Нэг хувилбарын алхам: `raw`-г өөрчилнө (migrateState гинжээр дуудна).
 * 11 → 12: player.interior (хуучин хадгалалтад байхгүй → null) · 12 → 13: dayStartMoney, flockCenters.
 */
export const MIGRATIONS: Record<number, (s: GameState) => void> = {
  // 21 → 22: цалин өдөр бүр. Хуучин wage нь 5 хоногийн «сар»-д ×5-аар төлөгддөг байсан → сарын дүн / 30. Сөрөг урьдчилгаа (өр) → owed
  21: (s) => {
    const day = (w: number): number => Math.round((w * 5) / 30);
    for (const h of s.helpers?.list ?? []) {
      h.wage = day(h.wage);
      h.owed = h.prepaid < 0 ? -h.prepaid : 0;
      if (h.prepaid < 0) h.prepaid = 0;
      h.unpaidDays = 0;
    }
    for (const c of s.helpers?.candidates ?? []) c.wage = day(c.wage);
  },
  20: (s) => { s.journal ??= newJournal(); },
  11: (s) => { if (!s.player.interior) s.player.interior = null; },
  12: (s) => { s.dayStartMoney ??= null; s.flockCenters ??= []; },
  // 13 → 14: гулсуур байгаагүй үеийн тоглолт = бүгд ×1 (data/difficulty.json-ийн анхдагчтай тест тулгана)
  13: (s) => { s.settings ??= { difficulty: { wolves: 1, animalsDie: true, products: 1, timeSpeed: 1 }, showMilestones: true }; },
  // 14 → 15: homeSize (хуучин гэр = бага 4 ханат, ger.home.size), хүлээгдэж буй ger захиалгад size
  // 15 → 16: статистик, замын тэмдэг (хуучин хадгалалтад хоосон; нөхцөл биелсэн бол дараагийн 20:00-д тэмдэглэгдэнэ)
  // 16 → 17: олон гэр. Хуучин туслахын гэр/майхан (helperGer, helperTent) → бага 4 ханат гэр (байрлал хэвээр), хүлээгдэж буй захиалга → gerAdd
  19: (s) => { s.trader ??= { nextDay: s.time.day + 5, visit: null, visits: 0 }; },
  18: (s) => { s.leaders ??= {}; },
  17: (s) => { s.stuckEvents ??= 0; },
  16: (s) => {
    s.extraGers ??= [];
    const old = s.helpers.dwellings.filter((d) => (d.kind as string) === 'helperGer' || (d.kind as string) === 'helperTent');
    for (const d of old) s.extraGers.push({ size: 'small4', x: d.x, z: d.z });
    s.helpers.dwellings = s.helpers.dwellings.filter((d) => !old.includes(d));
    const fix = (os: { kind: string; size?: string }[] | undefined): void => { for (const o of os ?? []) if (o.kind === 'helperGer' || o.kind === 'helperTent') { o.kind = 'gerAdd'; o.size = 'small4'; } };
    fix(s.player.orders);
    for (const f of s.fleet ?? []) fix(f.orders);
  },
  15: (s) => {
    s.stats ??= { salesIncome: 0, income: 0, expenses: 0, births: 0, deaths: 0, wolfLost: 0, moves: 0, daily: [] };
    s.milestones ??= { reached: {}, ceremony: null };
    s.settings.showMilestones ??= true;
  },
  14: (s) => {
    s.homeSize ??= 'small4';
    const fix = (os: { kind: string; size?: string }[] | undefined): void => { for (const o of os ?? []) if (o.kind === 'ger') o.size ??= 'small4'; };
    fix(s.player.orders);
    for (const f of s.fleet ?? []) fix(f.orders);
  },
};
/** Хамгийн эртний дэмжих хувилбар (түүнээс өмнөх нь прототип — шилжүүлэхгүй) */
export const MIN_SAVE_VERSION = 11;

/** Хадгалсан төлөвийг одоогийн хувилбар руу шилжүүлнэ. Дэлгэрэнгүй шалгалт: sim/save.ts */
export function migrateState(raw: unknown): GameState {
  const s = raw as GameState;
  for (let v = s.version; v < SAVE_VERSION; v++) {
    const m = MIGRATIONS[v];
    if (!m) throw new Error(`хадгалалтын хувилбар ${s.version}-ийг шилжүүлэх алхам ${v} алга`);
    m(s);
  }
  s.version = SAVE_VERSION;
  return s;
}
