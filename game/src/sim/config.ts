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

export type Species = 'sheep' | 'goat' | 'cow' | 'horse';
export type Sex = 'm' | 'f';
export const SPECIES: readonly Species[] = ['sheep', 'goat', 'cow', 'horse'];

export interface TimeConfig {
  dayStartMinute: number;
  dayEndMinute: number;
  realSecondsPerGameHour: number;
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
    qualityPenalty: number;
    overgrazeThreshold: number;
  };
  species: Record<string, { latin: string; quality: Record<'spring' | 'summer' | 'autumn' | 'winter', number> }>;
  degradedSuccession: string[];
  types: Record<string, PastureTypeConfig>;
}

export type WaterShape = { kind: 'lineZ'; z: number } | { kind: 'point'; x: number; z: number; r: number };

export interface CampConfig {
  water: string;
  wolfLevel: string;
  rings: [number, string][];
  waterShape: WaterShape;
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
  camps: { camps: Record<string, CampConfig>; move: Record<string, number>; home: { x: number; z: number; storageRadius: number } };
  start: { camp: string; home: string; vehicles: string[]; storageLevel: number; animals: StartAnimal[] };
}

export function loadConfig(): GameConfig {
  const cfg: GameConfig = {
    time: timeJson,
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
  }
  if (!cfg.camps.camps[cfg.start.camp]) e.push(`start.camp: "${cfg.start.camp}" бууц алга`);
  if (!cfg.storage.levels[cfg.start.storageLevel]) e.push('start.storageLevel: агуулахын түвшин алга');
  for (const a of cfg.start.animals) if (!cfg.animals.species[a.species]) e.push(`start.animals: "${a.species}" алга`);
  return e;
}
