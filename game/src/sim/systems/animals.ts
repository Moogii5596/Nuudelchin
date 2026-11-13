/**
 * Малын тооцоо: биеийн хэмжээ, амьдын жин, үнэ, хонин толгой, өдрийн тарга/эрүүл мэнд.
 * grazing-livestock.md §1–2, mvp-spec.md §5.1, §9.
 */
import type { AnimalsConfig, GameConfig, Sex, Species } from '../config';
import type { Animal, GameState } from '../state';

export interface AnimalBody {
  species: Species;
  sex: Sex;
  age: number;        // хийсвэр нас (бутархай, 1 = 20 тоглоомын өдөр)
  condition: number;  // тарга 0–1
  stallion?: boolean;
  breeding?: boolean; // үржлийн зориулалтаар зарах эсэх
}

/**
 * Биеийн хэмжээ F (кг). Насны муруйгаар шугаман завсарлана:
 * 0 нас = төрөх жин, 0.5 = нас гүйцсэн × curve[0], 1 = × curve[1], … 4 = × curve[4].
 */
export function frameKg(a: Pick<AnimalBody, 'species' | 'sex' | 'age'>, cfg: AnimalsConfig): number {
  const s = cfg.species[a.species];
  const mature = s.matureKg[a.sex];
  if (a.age >= s.oldAge) return mature * cfg.oldSizeFactor;
  const c = cfg.growthCurve;
  const pts: [number, number][] = [
    [0, s.birthKg],
    [0.5, mature * (c[0] ?? 0.5)],
    [1, mature * (c[1] ?? 0.72)],
    [2, mature * (c[2] ?? 0.86)],
    [3, mature * (c[3] ?? 0.95)],
    [4, mature * (c[4] ?? 1)],
  ];
  if (a.age <= 0) return s.birthKg;
  for (let k = 1; k < pts.length; k++) {
    const [x1, y1] = pts[k]!;
    const [x0, y0] = pts[k - 1]!;
    if (a.age <= x1) return y0 + ((y1 - y0) * (a.age - x0)) / (x1 - x0);
  }
  return mature;
}

/** Амьдын жин W = F × (0.75 + 0.4 × тарга) */
export function liveWeightKg(a: Pick<AnimalBody, 'species' | 'sex' | 'age' | 'condition'>, cfg: AnimalsConfig): number {
  const c = Math.min(Math.max(a.condition, 0), 1);
  return frameKg(a, cfg) * (cfg.condition.weightBase + cfg.condition.weightRange * c);
}

/** Зарах үнэ = амьдын жин × кг-ын үнэ (хөгшин ×0.7, үржлийн эр ×1.2) */
export function salePrice(a: AnimalBody, cfg: AnimalsConfig): number {
  const s = cfg.species[a.species];
  let perKg = s.pricePerKg;
  if (a.age >= s.oldAge) perKg *= cfg.price.oldPerKgMult;
  const breedingMale = a.sex === 'm' && a.age >= s.adultAge && a.age < s.oldAge && (a.breeding || a.stallion);
  if (breedingMale) perKg *= cfg.price.breedingMaleMult;
  return Math.round((liveWeightKg(a, cfg) * perKg) / 1000) * 1000;
}

export function buyPrice(a: AnimalBody, cfg: AnimalsConfig): number {
  return Math.round((salePrice(a, cfg) * cfg.price.buyMarkup) / 1000) * 1000;
}

/** Хонин толгой (1 наснаас доош төл тал хувь) */
export function sheepUnits(a: Pick<AnimalBody, 'species' | 'age'>, cfg: AnimalsConfig): number {
  const u = cfg.species[a.species].sheepUnits;
  return a.age < 1 ? u * cfg.youngSheepUnitFactor : u;
}

/** Сүргийн нийт хонин толгой (унаа морийг тооцохгүй — mvp-spec.md §10) */
export function herdSheepUnits(state: GameState, cfg: AnimalsConfig): number {
  let u = 0;
  for (const a of state.animals) if (!a.riding) u += sheepUnits(a, cfg);
  return u;
}

/**
 * Өдрийн эцсийн тарганы өөрчлөлт (grazing-livestock.md §1.2).
 * gutFill: 0–1 (өдрийн тааз = 1), dietQuality: 0–1.
 */
export function dailyConditionDelta(gutFill: number, dietQuality: number, lactating: boolean, cfg: AnimalsConfig): number {
  const k = cfg.condition;
  const need = lactating ? k.maintenanceThreshold * k.lactationNeedMult : k.maintenanceThreshold;
  const feed = dietQuality * Math.min(Math.max(gutFill, 0), 1);
  const d = k.gainK * (feed - need);
  return Math.min(Math.max(d, -k.maxLossPerDay), k.maxGainPerDay);
}

/**
 * Өдрийн эцэс: тарга, эрүүл мэнд, нас. Үхсэн малыг буцаана.
 */
export function dailyAnimals(cfg: GameConfig, state: GameState): Animal[] {
  const ac = cfg.animals;
  const dead: Animal[] = [];
  for (const a of state.animals) {
    if (a.riding) {
      a.age += 1 / cfg.time.animalYearDays;
      continue;
    }
    const dq = a.gutFill > 0 ? a.dietSum / a.gutFill : 0;
    let dc = dailyConditionDelta(a.gutFill, dq, a.lactating && a.species === 'cow', ac);
    if (a.thirstMaxedToday) {
      dc -= ac.thirst.fullConditionLossPerDay ?? 0.03;
      a.health -= ac.thirst.fullHealthLossPerDay ?? 5;
    }
    a.condition = Math.min(1, Math.max(0, a.condition + dc));
    if (a.condition <= 0) a.health -= ac.condition.zeroConditionHealthLossPerDay;
    else a.health = Math.min(100, a.health + 2);
    a.gutFill = 0;
    a.dietSum = 0;
    a.thirstMaxedToday = false;
    a.age += 1 / cfg.time.animalYearDays;
    if (a.health <= 0 || a.age >= ac.species[a.species].deathAge) dead.push(a);
  }
  if (dead.length) state.animals = state.animals.filter((a) => !dead.includes(a));
  return dead;
}
