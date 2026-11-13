/**
 * GameState: тоглоомын бүх өгөгдөл. Хадгалж, ачаалж болох энгийн JSON бүтэц.
 * Render зөвхөн уншина; өөрчлөх эрх зөвхөн sim/-д бий (architecture.md §3.1).
 */
import type { GameConfig, Sex, Species } from './config';
import { newTime, type TimeState } from './clock';
import { Rng } from './rng';

export const SAVE_VERSION = 1;

export interface Animal {
  id: number;
  species: Species;
  sex: Sex;
  age: number;           // хийсвэр нас
  condition: number;     // тарга 0–1
  health: number;        // 0–100
  gutFill: number;       // өнөөдрийн идэш 0–1
  dietQuality: number;   // өнөөдрийн идсэн өвсний дундаж чанар
  thirst: number;        // 0–100
  lactating: boolean;
  riding: boolean;
  x: number;
  z: number;
  heading: number;
}

export interface GameState {
  version: number;
  seed: number;
  rngState: number;
  time: TimeState;
  money: number;
  campId: string;
  storageLevel: number;
  nextId: number;
  animals: Animal[];
}

export function createInitialState(cfg: GameConfig, seed: number): GameState {
  const rng = new Rng(seed);
  const animals: Animal[] = cfg.start.animals.map((a, i) => {
    const r = rng.range(4, 18);
    const ang = rng.range(0, Math.PI * 2);
    return {
      id: i + 1,
      species: a.species,
      sex: a.sex,
      age: a.age,
      condition: 0.6,
      health: 100,
      gutFill: 0,
      dietQuality: 0,
      thirst: rng.range(0, 30),
      lactating: Boolean(a.lactating),
      riding: Boolean(a.riding),
      x: a.riding ? -7 : Math.cos(ang) * r + 20,
      z: a.riding ? 6 : Math.sin(ang) * r,
      heading: rng.range(0, Math.PI * 2),
    };
  });
  return {
    version: SAVE_VERSION,
    seed,
    rngState: rng.state,
    time: newTime(cfg.time),
    money: cfg.economy.startMoney,
    campId: cfg.start.camp,
    storageLevel: cfg.start.storageLevel,
    nextId: animals.length + 1,
    animals,
  };
}
