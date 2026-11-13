/**
 * Малын тооцоо: биеийн хэмжээ, амьдын жин, үнэ, хонин толгой.
 * grazing-livestock.md §1–2, mvp-spec.md §5.1.
 */
import type { AnimalsConfig, Sex, Species } from '../config';

export interface AnimalBody {
  species: Species;
  sex: Sex;
  age: number;        // хийсвэр нас (1 = 20 тоглоомын өдөр)
  condition: number;  // тарга 0–1
  stallion?: boolean;
  breeding?: boolean; // үржлийн зориулалтаар зарах эсэх
}

/** Биеийн хэмжээ F (кг): нас гүйцсэн жин × насны муруй */
export function frameKg(a: AnimalBody, cfg: AnimalsConfig): number {
  const s = cfg.species[a.species];
  const mature = s.matureKg[a.sex];
  if (a.age >= s.oldAge) return mature * cfg.oldSizeFactor;
  const idx = Math.min(Math.max(Math.floor(a.age), 0), cfg.growthCurve.length - 1);
  return mature * (cfg.growthCurve[idx] ?? 1);
}

/** Амьдын жин W = F × (0.75 + 0.4 × тарга) */
export function liveWeightKg(a: AnimalBody, cfg: AnimalsConfig): number {
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

/** Хонин толгой (төл тал хувь) */
export function sheepUnits(a: Pick<AnimalBody, 'species' | 'age'>, cfg: AnimalsConfig): number {
  const u = cfg.species[a.species].sheepUnits;
  return a.age < 1 ? u * cfg.youngSheepUnitFactor : u;
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
