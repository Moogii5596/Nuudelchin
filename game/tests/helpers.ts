import { loadConfig, type GameConfig } from '../src/sim/config';
import { createInitialState, type GameState } from '../src/sim/state';
import { Sim } from '../src/sim/sim';

export const cfg: GameConfig = loadConfig();

export function newSim(seed = 1, mutate?: (s: GameState) => void): Sim {
  const st = createInitialState(cfg, seed);
  mutate?.(st);
  return new Sim(cfg, st);
}

/** Нэг тоглоомын өдрийн минут */
export const DAY = cfg.time.dayEndMinute - cfg.time.dayStartMinute;

export function steps(sim: Sim, n: number): void {
  for (let i = 0; i < n; i++) sim.step();
}
