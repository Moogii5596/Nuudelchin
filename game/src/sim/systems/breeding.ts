/**
 * Хийсвэр төллөлт: эм мал бүр өөрийн 20 өдрийн мөчлөгтэй (mvp-spec.md §9).
 * Үржлийн эр мал хэрэгтэй. Бухгүй бол хөршийн бух тавиулж болно (төлбөртэй).
 */
import { SPECIES, type GameConfig, type Species } from '../config';
import type { Rng } from '../rng';
import { newAnimal, type GameState } from '../state';

export interface BreedingResult {
  births: number;
  bullFees: number;
}

export function dailyBreeding(cfg: GameConfig, state: GameState, rng: Rng): BreedingResult {
  const year = cfg.time.animalYearDays;
  const res: BreedingResult = { births: 0, bullFees: 0 };
  const males: Record<Species, number> = { sheep: 0, goat: 0, cow: 0, horse: 0 };
  const females: Record<Species, number> = { sheep: 0, goat: 0, cow: 0, horse: 0 };
  for (const a of state.animals) {
    const s = cfg.animals.species[a.species];
    if (a.riding || a.age < s.breedAge) continue;
    if (a.sex === 'm') males[a.species]++;
    else females[a.species]++;
  }
  const ratio: Record<Species, number> = { sheep: 0, goat: 0, cow: 0, horse: 0 };
  for (const sp of SPECIES) {
    const s = cfg.animals.species[sp];
    ratio[sp] = females[sp] ? Math.min(1, (males[sp] * s.femalesPerMale) / females[sp]) : 0;
  }
  // Хонь, ямаа хамт бэлчдэг ч эрэг хонь ямааг хээлтүүлэхгүй
  const born = [];
  for (const a of state.animals) {
    if (a.sex !== 'f' || a.riding) continue;
    const s = cfg.animals.species[a.species];
    if (a.age < s.breedAge) continue;
    if ((state.time.day + a.cycleOffset) % year !== 0) continue;

    let r = ratio[a.species];
    if (a.species === 'cow' && r === 0 && state.neighborBull) {
      r = 1;
      res.bullFees += cfg.economy.neighborBullFee;
    }
    let p = s.birthChance * r;
    if (a.condition < 0.3) p *= 0.5;
    else if (a.condition > 0.7) p *= 1.1;
    const success = rng.chance(Math.min(p, 0.98));
    if (a.species === 'cow') a.lactating = success; // зөвхөн тугалласан үнээ сүүтэй
    if (!success) continue;
    const twins = (a.species === 'sheep' || a.species === 'goat') && a.condition > 0.85 && rng.chance(0.1) ? 2 : 1;
    for (let k = 0; k < twins; k++) {
      born.push(
        newAnimal(cfg, rng, state.nextId++, {
          species: a.species,
          sex: rng.chance(0.5) ? 'm' : 'f',
          age: 0,
          condition: a.condition,
          x: a.x + rng.range(-1, 1),
          z: a.z + rng.range(-1, 1),
        }),
      );
      born[born.length - 1]!.motherId = a.id;
      res.births++;
    }
  }
  state.animals.push(...born);
  return res;
}
