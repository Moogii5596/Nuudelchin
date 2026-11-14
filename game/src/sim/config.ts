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

export type Species = 'sheep' | 'goat' | 'cow' | 'horse';
export type Sex = 'm' | 'f';
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
  season: 'spring' | 'summer' | 'autumn' | 'winter';
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
  imaxPerMinute: number;
  biomassPerGut: number;
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
}

export interface CampConfig {
  water: string;
  wolfLevel: string;
  rings: [number, string][];
  waterShape: WaterShape;
  road: [number, number][];   // сумын төв рүү гарах зам (M4.6)
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
  sum3d: { shop: { x: number; z: number; r: number }; entry: { x: number; z: number }; parking: { x: number; z: number } };
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
  if (!cfg.storage.levels[cfg.start.storageLevel]) e.push('start.storageLevel: агуулахын түвшин алга');
  for (const a of cfg.start.animals) if (!cfg.animals.species[a.species]) e.push(`start.animals: "${a.species}" алга`);
  return e;
}
