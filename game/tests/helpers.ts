import { loadConfig, type GameConfig } from '../src/sim/config';
import { createInitialState, type GameState } from '../src/sim/state';
import { Sim } from '../src/sim/sim';

export const cfg: GameConfig = loadConfig();

export function newSim(seed = 1, mutate?: (s: GameState) => void): Sim {
  const st = createInitialState(cfg, seed);
  mutate?.(st);
  return new Sim(cfg, st);
}

/** Нэг тоглоомын бүтэн өдөр (06:00 → дараа өглөөний 06:00, шөнөтэй — M4.5) */
export const DAY = cfg.time.nightEndMinute - cfg.time.dayStartMinute;
/** 06:00-аас 20:00 (өдрийн тайлан) хүртэлх минут */
export const ACTIVE_DAY = cfg.time.dayEndMinute - cfg.time.dayStartMinute;

export function steps(sim: Sim, n: number): void {
  for (let i = 0; i < n; i++) sim.step();
}
