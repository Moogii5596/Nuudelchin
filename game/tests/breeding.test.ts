import { describe, expect, it } from 'vitest';
import { cfg, newSim } from './helpers';
import { dailyBreeding } from '../src/sim/systems/breeding';

describe('Хийсвэр төллөлт (mvp-spec.md §9)', () => {
  it('эрэг хоньтой бол хонь төллөнө, мөчлөг тархсан (нэг өдөр бүгд төллөхгүй)', () => {
    const sim = newSim(8);
    let births = 0, daysWithBirth = 0;
    for (let d = 1; d <= cfg.time.animalYearDays; d++) {
      sim.state.time.day = d;
      const r = dailyBreeding(cfg, sim.state, sim.random);
      births += r.births;
      if (r.births) daysWithBirth++;
    }
    expect(births).toBeGreaterThanOrEqual(4);
    expect(daysWithBirth).toBeGreaterThan(1);
  });
  it('бухгүй үнээ тугаллахгүй, сүүгүй болно; хөршийн бух тавиулбал төлбөртэй тугална', () => {
    const sim = newSim(8);
    for (let d = 1; d <= cfg.time.animalYearDays; d++) {
      sim.state.time.day = d;
      dailyBreeding(cfg, sim.state, sim.random);
    }
    expect(sim.state.animals.filter((a) => a.species === 'cow' && a.lactating)).toHaveLength(0);
    sim.state.neighborBull = true;
    let fees = 0;
    for (let d = 1; d <= cfg.time.animalYearDays; d++) {
      sim.state.time.day = d;
      fees += dailyBreeding(cfg, sim.state, sim.random).bullFees;
    }
    expect(fees).toBe(2 * cfg.economy.neighborBullFee);
  });
});
