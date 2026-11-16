/**
 * Хийсвэр төллөлт: эм мал бүр жилд нэг удаа (mvp-spec.md §9).
 * M5.5: төллөх өдөр нь улирлаар — өвөл төллөхгүй, дийлэн нь хавар (seasons.ts → birthYearDay).
 * Үржлийн эр мал хэрэгтэй. Бухгүй бол хөршийн бух тавиулж болно (төлбөртэй). Отор дээрх мал ч төллөнө.
 */
import { SPECIES, type GameConfig, type Species } from '../config';
import type { Rng } from '../rng';
import { newAnimal, type Animal, type GameState } from '../state';
import { birthYearDay, yearDay } from './seasons';

export interface BreedingResult {
  births: number;
  bullFees: number;
}

export function dailyBreeding(cfg: GameConfig, state: GameState, rng: Rng): BreedingResult {
  const res: BreedingResult = { births: 0, bullFees: 0 };
  breedGroup(cfg, state, rng, state.animals, res, true);
  for (const g of state.helpers.otor) breedGroup(cfg, state, rng, g.animals, res, false);
  return res;
}

function breedGroup(cfg: GameConfig, state: GameState, rng: Rng, animals: Animal[], res: BreedingResult, home: boolean): void {
  const yd = yearDay(cfg, state.time.day);
  const males: Record<Species, number> = { sheep: 0, goat: 0, cow: 0, horse: 0 };
  const females: Record<Species, number> = { sheep: 0, goat: 0, cow: 0, horse: 0 };
  for (const a of animals) {
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
  for (const a of animals) {
    if (a.sex !== 'f' || a.riding) continue;
    const s = cfg.animals.species[a.species];
    if (a.age < s.breedAge) continue;
    if (birthYearDay(cfg, a.cycleOffset) !== yd) continue;

    let r = ratio[a.species];
    if (a.species === 'cow' && r === 0 && state.neighborBull && home) {
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
      if (a.ownerId !== undefined) born[born.length - 1]!.ownerId = a.ownerId;   // туслахын малын төл туслахынх
      res.births++;
    }
  }
  animals.push(...born);
}

export interface BirthForecast {
  species: Species;
  /** Хамгийн ойрын төллөх өдөр хүртэл (хоног) ба тэр өдрийн дугаар */
  inDays: number;
  day: number;
  /** Тэр өдрөөс эхлэн forecastWindowDays хоногт төллөх ээлжтэй, үржилд орох насны эм мал (төллөх магадлал birthChance-аас хамаарна) */
  females: number;
}

/** Ирэх төллөлт: эм мал бүрийн мөчлөгөөс (cycleOffset → birthYearDay) хамгийн ойрын өдөр ба тэр үеийн эм малын тоо */
export function birthForecast(cfg: GameConfig, state: GameState): BirthForecast[] {
  const Y = cfg.time.animalYearDays, yd = yearDay(cfg, state.time.day), win = cfg.time.journal.forecastWindowDays;
  const out: BirthForecast[] = [];
  for (const sp of SPECIES) {
    const breedAge = cfg.animals.species[sp].breedAge;
    const due = state.animals
      .filter((a) => a.species === sp && a.sex === 'f' && !a.riding && a.age >= breedAge)
      .map((a) => ((birthYearDay(cfg, a.cycleOffset) - yd - 1 + Y) % Y) + 1);   // өнөөдрийн төллөлт өнгөрсөн → 1..Y хоногийн дараа
    if (!due.length) continue;
    const inDays = Math.min(...due);
    out.push({ species: sp, inDays, day: state.time.day + inDays, females: due.filter((d) => d < inDays + win).length });
  }
  return out;
}
