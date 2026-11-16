/**
 * data/*.json тохиргоог ачаалж, шалгана. Кодонд тоо шууд бичихгүй (architecture.md §3.4).
 * Тэнцвэр тааруулахдаа зөвхөн JSON-ийг засна.
 */
import timeJson from '../../../data/time.json';
import animalsJson from '../../../data/animals.json';
import productsJson from '../../../data/products.json';
import processingJson from '../../../data/processing.json';
import storageJson from '../../../data/storage.json';
import vehiclesJson from '../../../data/vehicles.json';
import helpersJson from '../../../data/helpers.json';
import economyJson from '../../../data/economy.json';
import wolvesJson from '../../../data/wolves.json';
import pastureJson from '../../../data/pasture.json';
import campsJson from '../../../data/camps.json';
import startJson from '../../../data/start.json';
import playerJson from '../../../data/player.json';
import dogsJson from '../../../data/dogs.json';
import worldmapJson from '../../../data/worldmap.json';
import seasonsJson from '../../../data/seasons.json';
import sumcenterJson from '../../../data/sumcenter.json';
import townJson from '../../../data/town.json';
import sleepJson from '../../../data/sleep.json';
import interiorsJson from '../../../data/interiors.json';
import npcsJson from '../../../data/npcs.json';
import { npcConfigErrors, type NpcsConfig } from './systems/npc';
import gerJson from '../../../data/ger.json';
import difficultyJson from '../../../data/difficulty.json';
import milestonesJson from '../../../data/milestones.json';
import traderJson from '../../../data/trader.json';
import { validateTrader, type TraderConfig } from './systems/trader';
import { validateMilestones, type MilestonesConfig } from './systems/milestones';
import type { StuckConfig } from './systems/safety';
import { validateDifficultyConfig, type DifficultyConfig } from './systems/difficulty';
import { validateInteriors, type InteriorsConfig } from './systems/interior';
import type { GerSimConfig } from './systems/gerLayout';
import type { WalkConfig } from './systems/sumwalk';
import { lotSlots, sumDoors, allBuildings, TRADE_ROLES, type SumLayout } from './systems/sumtown';

export type Species = 'sheep' | 'goat' | 'cow' | 'horse';
export type Sex = 'm' | 'f';
export type Season = 'summer' | 'autumn' | 'winter' | 'spring';

/** Улирал, цас, өвс тэжээл (data/seasons.json, M5.5) */
export interface SeasonsConfig {
  order: Season[];
  days: Record<Season, number>;
  growth: Record<Season, number>;
  exposedDecayPerDay: Record<Season, number>;
  snow: {
    fallCmPerDay: Record<Season, number>;
    meltCmPerDay: Record<Season, number>;
    blockCm: number;
    growthSnowCm: number;
    forestTypeMult: Record<string, number>;
    camps: Record<string, { fall: number; melt: Partial<Record<Season, number>> }>;
  };
  cold: { conditionLossPerNight: Record<Season, number>; shedMult: number; penMult: number };
  hay: { price: number; sheepDaysPerBale: number; quality: number; feedSeasons: Season[]; fillTo: number; horseBales: number };
  breeding: { springShare: number; noBirth: Season[] };
  otorWolfMult: Record<Season, number>;
}
export const SPECIES: readonly Species[] = ['sheep', 'goat', 'cow', 'horse'];

export interface TimeConfig {
  dayStartMinute: number;
  dayEndMinute: number;          // 20:00 — өдрийн тайлан
  homeMinute: Record<string, number>;   // мал хотондоо харьж эхлэх цаг (төрлөөр; адуу харихгүй)
  sleepMinute: number;           // 21:00 — шөнө: хүрээгүй мал хүрсэн газраа хоноглоно
  nightEndMinute: number;        // дараа өглөөний 06:00 (= 1800)
  realSecondsPerGameHour: number;
  nightRealSecondsPerGameHour: number;
  mapFastForward: number;        // газрын зураг дээр Shift — цаг хурдасгах
  speeds: number[];
  monthDays: number;
  animalYearDays: number;
}

export interface SpeciesConfig {
  matureKg: Record<Sex, number>;
  birthKg: number;
  adultAge: number;
  oldAge: number;
  deathAge: number;
  birthChance: number;
  breedAge: number;
  pricePerKg: number;
  sheepUnits: number;
  thirstDaysToFull: number;
  minGrassCm: number;
  femalesPerMale: number;
}

export interface AnimalsConfig {
  species: Record<Species, SpeciesConfig>;
  growthCurve: number[];
  oldSizeFactor: number;
  youngSheepUnitFactor: number;
  condition: {
    weightBase: number;
    weightRange: number;
    maintenanceThreshold: number;
    gainK: number;
    maxGainPerDay: number;
    maxLossPerDay: number;
    lactationNeedMult: number;
    zeroConditionHealthLossPerDay: number;
  };
  thirst: Record<string, number>;
  price: { oldPerKgMult: number; breedingMaleMult: number; buyMarkup: number };
}

export interface PastureTypeConfig {
  maxBiomass: number;
  heightCm: number;
  wolfRisk: number;
  mix: Record<string, number>;
}

export interface GrazingConfig {
  /** M6.8: гацалт илрүүлэгч, аюулгүй зугтах — systems/safety.ts */
  stuck: StuckConfig;
  imaxPerMinute: number;
  biomassPerGut: number;
  /** Сүргийн мал бүрт ногдох бэлчээрийн талбай м² (B11): сүргийн өргөн малын тоогоор */
  areaPerAnimal?: Record<string, number>;
  /** Бэлчээрийн цэг сонголтын санамсаргүй хэлбэлзэл (B11) */
  choiceNoise?: number;
  decisionEverySteps: number;
  samples: number;
  sampleRadius: Record<Species, number>;
  grazeSpeed: number;
  travelSpeed: number;
  cohesion: Record<Species, number>;
  maxFlockSpread: Record<Species, number>;
  qualityExponent: number;
  drinkRadius: number;
  roamFactor: number;      // өлссөн мал хайх радиус × энэ
  roamSpeed: number;       // хол зорилт руу алхах хурд (м/мин)
  hungryPace: number;      // идэш нь өдрийн явцын энэ хувиас хоцорвол «өлссөн»
  herd: HerdConfig;
}

/** Сүргийн шийдвэр (systems/herds.ts) */
export interface HerdConfig {
  linkRadius: number;          // энэ зайнаас ойр нэг төрлийн мал нэг сүрэг
  decideEverySteps: number;
  nearWaterDistance: number;   // сүрэг уснаас ийм ойр бол нэг нэгээрээ ууна
  waterBunch: number;          // сүргээрээ ус руу явахад бөөгнөрөх хувь
  drinkBankOffset: number;     // голын төв шугамаас эрэг хүртэл (м)
  trekSpeed: number;           // сүргээрээ шинэ бэлчээр рүү нүүх хурд (м/мин)
  trekMinDistance: number;
  trekMaxDistance: number;
  trekSamples: number;
  trekGain: number;            // шинэ газар одоогийнхоос ийм дахин сайн бол нүүнэ
  trekSpread: number;
  localRadius: number;
  rejoinDistance: number;      // тасарсан цөөн мал энэ зайд байгаа том сүрэг рүүгээ нийлнэ
  poorScore: number;           // ойр орчмын бэлчээрийн оноо үүнээс бага бол л шинэ газар хайна
  settleMinutes: number;       // туугдсанаас хойш энэ хугацаанд өөрөө нүүхгүй
  maxHomeDistance: Record<Species, number>;   // өөрөө нүүхдээ хотоос холдох дээд зай
}

export interface PastureConfig {
  grid: { cellSize: number; cells: number };
  grazing: GrazingConfig;
  regrowthR: number;
  intakeHalfBiomass: number;
  degradation: {
    campCapacitySheepUnits: number;
    /** Ачааллын зэрэг: доройтол ∝ (ачаалал/даац)^loadExponent (B1). Байхгүй бол 1 */
    loadExponent?: number;
    gainPerDayAtCapacity: number;
    recoverPerDayWhenAway: number;
    growthPenalty: number;
    capacityPenalty: number;   // өвсний дээд хэмжээ K = 1 − capacityPenalty × доройтол
    qualityPenalty: number;
    overgrazeThreshold: number;
  };
  species: Record<string, { latin: string; quality: Record<'spring' | 'summer' | 'autumn' | 'winter', number> }>;
  degradedSuccession: string[];
  types: Record<string, PastureTypeConfig>;
}

/** lineZ: голын төв шугам z (+ долгион [далайц, давтамж][]); point: булаг, горхины цэг */
export type WaterShape =
  | { kind: 'lineZ'; z: number; waves?: [number, number][]; width?: number }
  | { kind: 'point'; x: number; z: number; r: number };

/** Газрын хэлбэр (sim/terrain.ts → heightAt). Прототип v1.2-ын heightAt-аас гаргасан. */
export interface TerrainConfig {
  noiseAmp: number;                          // долгионт гадаргуугийн хүч
  rim: [number, number, number];             // [эхлэх r, бүрэн r, налуу] — бууцыг тойрсон дов толгод
  riverDepth?: number;                       // голын гольдролын гүн (lineZ)
  riverBank?: number;                        // гольдролын хагас өргөн
  tilt?: { dirX: number; dirZ: number; start: number; slope: number; start2?: number; slope2?: number };   // нэг зүг өгсөх (уулын ар)
  open?: { dirX: number; dirZ: number; width: number };   // хөндийн задгай ам
  pondDepth?: number;                        // булаг/горхины хонхор
  forest?: boolean;                          // налуу өгсөх зүгт ой (уулын ар)
}

export interface CampConfig {
  water: string;
  wolfLevel: string;
  rings: [number, string][];
  waterShape: WaterShape;
  road: [number, number][];   // сумын төв рүү гарах зам (M4.6)
  shed?: boolean;             // саравчтай дулаан бууц (M5.5)
  terrain: TerrainConfig;
}

export interface HomeConfig {
  x: number;
  z: number;
  storageRadius: number;
  pen: { x: number; z: number; r: number };   // хаалга нь майхны эсрэг талд
  post: { x: number; z: number };
  cowYard: { x: number; z: number; r: number };   // үхэр шөнө хэвтэх газар (M4.5)
  tentRadius: number;
  gerRadius: number;
}

/** Газрын зураг (data/worldmap.json, км) — M4.6 */
export interface WorldLocation {
  kind: 'camp' | 'sum';
  x: number;
  z: number;
}
export interface WorldMapConfig {
  locations: Record<string, WorldLocation>;
  arriveRadiusKm: number;
  exitOffsetKm: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  river: [number, number][];
  mountains: [number, number, number][];
  forests: [number, number, number][];
  /** V3.3: сумын төвийн 3D-ийн тохиргоо; байршил нь data/sumcenter.json (GameConfig.sumcenter) */
  sum3d: {
    /** 3D-ийн хязгаар (м) — хүрвэл газрын зураг руу */
    radius: number;
    /** Дэлгүүр, цайны газрын хаалганаас E дарах зай (м) */
    shopR: number;
    /** Машин худалдааны талбайд машин руу ойртох зай (м) */
    lotR: number;
    /** Явган/NPC-ийн мөргөлдөөн (sim/systems/sumwalk.ts) */
    walk: WalkConfig;
  };
}


export interface StartAnimal {
  species: Species;
  sex: Sex;
  age: number;
  riding?: boolean;
  lactating?: boolean;
}

export interface GameConfig {
  time: TimeConfig;
  animals: AnimalsConfig;
  products: typeof productsJson;
  processing: typeof processingJson;
  storage: typeof storageJson;
  vehicles: typeof vehiclesJson;
  helpers: typeof helpersJson;
  economy: typeof economyJson;
  wolves: typeof wolvesJson;
  pasture: PastureConfig;
  camps: { camps: Record<string, CampConfig>; move: Record<string, number | string>; home: HomeConfig };
  player: typeof playerJson;
  dogs: typeof dogsJson;
  worldmap: WorldMapConfig;
  seasons: SeasonsConfig;
  sumcenter: SumLayout;
  /** V3.4: сумын төвийн амьдрал (байшин, хандив, зээл, хамаатан) — data/town.json */
  town: typeof townJson;
  /** Хамаатны айлд унтах (2026-11-16) — data/sleep.json */
  sleep: typeof sleepJson;
  /** V6.1: орж болдог барилгын дотор тал — data/interiors.json */
  interiors: InteriorsConfig;
  /** V6.3: сумын төвийн NPC (хуваарь, байрлал) — data/npcs.json */
  npcs: NpcsConfig;
  /** M6.10: тайван тохиргооны гулсуурын хүрээ, анхдагч — data/difficulty.json */
  difficulty: DifficultyConfig;
  /** M6.5: замын тэмдэг — data/milestones.json */
  milestones: MilestonesConfig;
  /** M6.12: явуулын худалдаачин — data/trader.json */
  trader: TraderConfig;
  /** Гэрийн загварын хэмжээс, тавилгын байрлал (data/ger.json — render/ger-тэй хуваалцана; хаалганы цэг, дотор саад) */
  ger: GerSimConfig;
  start: { camp: string; home: string; vehicles: string[]; storageLevel: number; animals: StartAnimal[] };
}

export function loadConfig(): GameConfig {
  const cfg: GameConfig = {
    time: timeJson as unknown as TimeConfig,
    animals: animalsJson as unknown as AnimalsConfig,
    products: productsJson,
    processing: processingJson,
    storage: storageJson,
    vehicles: vehiclesJson,
    helpers: helpersJson,
    economy: economyJson,
    wolves: wolvesJson,
    pasture: pastureJson as unknown as PastureConfig,
    camps: campsJson as unknown as GameConfig['camps'],
    start: startJson as unknown as GameConfig['start'],
    player: playerJson,
    dogs: dogsJson,
    worldmap: worldmapJson as unknown as WorldMapConfig,
    seasons: seasonsJson as unknown as SeasonsConfig,
    sumcenter: sumcenterJson as unknown as SumLayout,
    town: townJson,
    sleep: sleepJson,
    interiors: interiorsJson as unknown as InteriorsConfig,
    npcs: npcsJson as unknown as NpcsConfig,
    ger: gerJson.ger as unknown as GerSimConfig,
    difficulty: difficultyJson as unknown as DifficultyConfig,
    milestones: milestonesJson as unknown as MilestonesConfig,
    trader: traderJson as unknown as TraderConfig,
  };
  const errors = validateConfig(cfg);
  if (errors.length) {
    throw new Error('Тохиргооны алдаа (data/*.json):\n- ' + errors.join('\n- '));
  }
  return cfg;
}

/** Тохиргооны логик алдааг шалгана. Алдааны жагсаалт буцаана (хоосон бол зөв). */
export function validateConfig(cfg: GameConfig): string[] {
  const e: string[] = [];
  const t = cfg.time;
  if (!(t.dayEndMinute > t.dayStartMinute)) e.push('time: dayEndMinute > dayStartMinute байх ёстой');
  if (!(t.sleepMinute > t.dayEndMinute && t.nightEndMinute > t.sleepMinute)) e.push('time: dayEndMinute < sleepMinute < nightEndMinute');
  if (t.nightEndMinute - t.dayStartMinute !== 1440) e.push('time: nightEndMinute − dayStartMinute = 1440 (24 цаг)');
  for (const [sp, m] of Object.entries(t.homeMinute ?? {})) if (!(m > t.dayStartMinute && m < t.sleepMinute)) e.push(`time.homeMinute.${sp}: өглөө ба sleepMinute хооронд`);
  if (t.monthDays < 1 || t.animalYearDays < 1) e.push('time: monthDays, animalYearDays ≥ 1');
  const se = cfg.seasons;
  if (se.order.reduce((a, k) => a + (se.days[k] ?? 0), 0) !== t.animalYearDays) e.push('seasons.days: нийлбэр = time.animalYearDays');
  for (const id of Object.keys(cfg.camps.camps)) if (!se.snow.camps[id]) e.push(`seasons.snow.camps.${id}: бууцны цасны тохиргоо алга`);

  for (const sp of SPECIES) {
    const s = cfg.animals.species[sp];
    if (!s) { e.push(`animals: "${sp}" алга`); continue; }
    if (!(s.adultAge < s.oldAge && s.oldAge < s.deathAge)) e.push(`animals.${sp}: adultAge < oldAge < deathAge`);
    if (s.birthChance < 0 || s.birthChance > 1) e.push(`animals.${sp}: birthChance 0–1`);
    if (s.pricePerKg <= 0) e.push(`animals.${sp}: pricePerKg > 0`);
  }
  if (cfg.animals.growthCurve.length !== 5) e.push('animals.growthCurve: 5 утгатай (0–4 нас)');
  const g = cfg.pasture.grazing;
  if (!(g.imaxPerMinute > 0 && g.biomassPerGut > 0 && g.decisionEverySteps >= 1)) e.push('pasture.grazing: эерэг утга');
  for (const sp of SPECIES) if (!(g.sampleRadius[sp] > 0)) e.push(`pasture.grazing.sampleRadius.${sp} алга`);
  const sk = g.stuck;
  if (!sk || !(sk.steps >= 1 && sk.minMove > 0 && sk.minGoal > 0 && sk.deepWater >= 0 && sk.drinkDepth > 0 && sk.searchStep > 0 && sk.searchMax >= sk.searchStep && sk.denMargin >= 0 && Array.isArray(sk.fleeTurns) && sk.fleeTurns.length > 0)) e.push('pasture.grazing.stuck: steps, minMove, minGoal, deepWater, searchStep, searchMax, fleeTurns[], denMargin');

  const p = cfg.pasture;
  for (const [id, type] of Object.entries(p.types)) {
    const sum = Object.values(type.mix).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 0.01) e.push(`pasture.types.${id}: mix-ийн нийлбэр 1 байх ёстой (${sum.toFixed(2)})`);
    for (const sp of Object.keys(type.mix)) if (!p.species[sp]) e.push(`pasture.types.${id}: "${sp}" ургамал алга`);
  }
  for (const [id, camp] of Object.entries(cfg.camps.camps)) {
    for (const [, typeId] of camp.rings) if (!p.types[typeId]) e.push(`camps.${id}: "${typeId}" бэлчээрийн төрөл алга`);
    if (!camp.terrain || !Array.isArray(camp.terrain.rim) || camp.terrain.rim.length !== 3) e.push(`camps.${id}.terrain: rim [эхлэх, бүрэн, налуу] хэрэгтэй`);
  }
  const pl = cfg.player;
  if (!(pl.walkSpeed > 0 && pl.runSpeed >= pl.walkSpeed && pl.mountedSpeed > 0 && pl.mountedRunSpeed >= pl.mountedSpeed)) e.push('player: хурд эерэг, гүйх ≥ алхах');
  if (!(pl.shout.radius > 0 && pl.shout.push > 0)) e.push('player.shout: radius, push > 0');
  if (!(cfg.wolves.speed.roam > 0 && cfg.wolves.speed.flee > 0 && cfg.wolves.speed.hunt > 0)) e.push('wolves.speed: эерэг');
  for (const lvl of new Set(Object.values(cfg.camps.camps).map((c) => c.wolfLevel))) {
    if (!(((cfg.wolves.attack.noticeChance as Record<string, number>)[lvl] ?? -1) >= 0)) e.push(`wolves.attack.noticeChance.${lvl} алга`);
  }
  const h = cfg.pasture.grazing.herd;
  if (!h || !(h.linkRadius > 0 && h.decideEverySteps >= 1 && h.trekMaxDistance > h.trekMinDistance)) e.push('pasture.grazing.herd: linkRadius > 0, trekMaxDistance > trekMinDistance');
  if (!(cfg.dogs.speed.run > cfg.wolves.speed.flee)) e.push('dogs.speed.run > wolves.speed.flee байх ёстой (нохой чоныг гүйцнэ)');
  if (!(cfg.dogs.names.length >= cfg.dogs.maxDogs)) e.push('dogs.names: maxDogs-оос цөөнгүй нэр');
  if (!cfg.camps.camps[cfg.start.camp]) e.push(`start.camp: "${cfg.start.camp}" бууц алга`);
  for (const [id, c] of Object.entries(cfg.camps.camps)) {
    if (!cfg.worldmap.locations[id]) e.push(`worldmap.locations.${id}: бууцны байрлал алга`);
    if (!Array.isArray(c.road) || c.road.length < 2) e.push(`camps.${id}.road: 2+ цэг хэрэгтэй`);
  }
  if (!Object.values(cfg.worldmap.locations).some((l) => l.kind === 'sum')) e.push('worldmap: сумын төв алга');
  e.push(...validateSumLayout(cfg));
  e.push(...npcConfigErrors(cfg));
  e.push(...validateInteriors(cfg));
  e.push(...validateDifficultyConfig(cfg));
  e.push(...validateMilestones(cfg));
  e.push(...validateTrader(cfg));
  if (!cfg.storage.levels[cfg.start.storageLevel]) e.push('start.storageLevel: агуулахын түвшин алга');
  for (const a of cfg.start.animals) if (!cfg.animals.species[a.species]) e.push(`start.animals: "${a.species}" алга`);
  return e;
}

/** V3.3: сумын төвийн байршил (data/sumcenter.json) ба worldmap.sum3d */
const SUM_ROLES = [...TRADE_ROLES, 'teahouse', 'grocery', 'clothing', 'fuel', 'bank', 'temple', 'zdtg'] as readonly string[];
export function validateSumLayout(cfg: GameConfig): string[] {
  const e: string[] = [];
  const S = cfg.worldmap.sum3d, L = cfg.sumcenter;
  if (!L || !S) return ['data/sumcenter.json, worldmap.sum3d хэрэгтэй'];
  if (!(S.radius > 50 && S.shopR > 0 && S.lotR > 0)) e.push('worldmap.sum3d: radius > 50, shopR > 0, lotR > 0');
  const W = S.walk;
  if (!W || !(W.bodyR > 0 && W.mountedR >= W.bodyR && W.vehicleR > 0 && W.npcR > 0 && W.plotGateW > 0 && W.fenceT > 0 && W.stuckSec > 0 && W.stuckSpeed >= 0 && W.unstickStep > 0)) e.push('worldmap.sum3d.walk: радиус, хаалга, зузаан, гацалтын утга эерэг');
  const [tw, td] = L.terrain.size;
  if (Math.min(tw, td) / 2 < S.radius) e.push('sumcenter.terrain.size: газар 3D-ийн хязгаарыг (radius) бүрхэх ёстой');
  if (Math.hypot(L.entry.x, L.entry.z) > S.radius - 6) e.push('sumcenter.entry: хязгаараас дотор байх ёстой');
  if (Math.hypot(L.entry.exit[0], L.entry.exit[1]) < S.radius) e.push('sumcenter.entry.exit: зам хязгаар хүртэл хүрэх ёстой');
  const hex = (c: string, where: string): void => {
    if (!/^#[0-9a-f]{6}$/i.test(c)) e.push(`sumcenter.${where}: өнгө "${c}" #rrggbb биш`);
  };
  const ids = new Set<string>();
  const uniq = (id: string): void => {
    if (ids.has(id)) e.push(`sumcenter: id "${id}" давхардсан`);
    ids.add(id);
  };
  for (const b of allBuildings(L)) {
    uniq(b.id);
    if (!(b.w > 0 && b.d > 0 && b.floors >= 1)) e.push(`sumcenter.${b.id}: w, d > 0, floors ≥ 1`);
    if (b.gameRole && !SUM_ROLES.includes(b.gameRole)) e.push(`sumcenter.${b.id}: gameRole "${b.gameRole}" тодорхойгүй`);
    hex(b.wall, b.id + '.wall');
    hex(b.roof.color, b.id + '.roof');
  }
  for (const c of L.compounds) {
    uniq(c.id);
    if (c.gameRole && !SUM_ROLES.includes(c.gameRole)) e.push(`sumcenter.${c.id}: gameRole "${c.gameRole}" тодорхойгүй`);
    for (const b of c.buildings ?? []) {
      if (Math.abs(b.x - c.x) + b.w / 2 > c.w / 2 || Math.abs(b.z - c.z) + b.d / 2 > c.d / 2) e.push(`sumcenter.${c.id}.${b.id}: хашаанаас гарсан`);
    }
  }
  for (const f of L.fields) uniq(f.id);
  for (const p of L.specialPlots ?? []) uniq(p.id);
  for (const r of L.roads) if (r.points.length < 2) e.push(`sumcenter.roads.${r.id}: 2+ цэг`);
  const doors = sumDoors(cfg);
  if (doors.filter((d) => d.role === 'teahouse').length !== 1) e.push('sumcenter: Цайны газар (gameRole teahouse) яг 1 байх ёстой');
  for (const r of TRADE_ROLES) if (!doors.some((d) => d.role === r)) e.push(`sumcenter: "${r}" үүрэгтэй дэлгүүр алга`);
  // data/sleep.json
  const Z = cfg.sleep;
  if (!(Z.wakeStep > 0 && Z.wakeMin <= Z.wakeDefault && Z.wakeDefault <= Z.wakeMax && Z.startMinute < Z.endMinute)) e.push('sleep: wakeStep > 0, wakeMin ≤ wakeDefault ≤ wakeMax, startMinute < endMinute');
  if (Z.endMinute >= cfg.time.nightEndMinute - 1 || (Z.wakeDefault - Z.wakeMin) % Z.wakeStep !== 0) e.push('sleep: endMinute нь шөнийн төгсгөлөөс өмнө, wakeDefault нь wakeStep-ийн алхамд таарах ёстой');
  // V3.4 data/town.json
  const forSale = new Set((L.specialPlots ?? []).filter((p) => p.role === 'forSale').map((p) => p.id));
  for (const [id, h] of Object.entries(cfg.town.houses)) {
    if (!forSale.has(id)) e.push(`town.houses.${id}: sumcenter.json-д зарах хашаа (forSale) алга`);
    if (!(h.price > 0 && h.rentPerDay >= 0)) e.push(`town.houses.${id}: price > 0, rentPerDay ≥ 0`);
  }
  for (const id of forSale) if (!(id in cfg.town.houses)) e.push(`town.houses: "${id}"-ийн үнэ алга`);
  for (const k of cfg.town.zdtgLoan.packages) if (!cfg.animals.species[k.species as Species] || !(k.n > 0)) e.push(`town.zdtgLoan.packages.${k.id}: төрөл, n буруу`);
  if (!cfg.town.temple.donations.every((x) => x > 0)) e.push('town.temple.donations: > 0');
  for (const r of ['temple', 'zdtg', 'bank']) if (!doors.some((d) => d.role === r)) e.push(`sumcenter: "${r}" үүрэгтэй барилга алга`);
  for (const s of lotSlots(cfg)) {
    uniq(s.id);
    const known = Object.prototype.hasOwnProperty.call(cfg.vehicles, s.vehicle) && typeof (cfg.vehicles as Record<string, unknown>)[s.vehicle] === 'object';
    if (!known && !s.display) e.push(`sumcenter.lot.${s.id}: "${s.vehicle}" vehicles.json-д алга (зөвхөн харуулах бол display: true)`);
  }
  return e;
}
