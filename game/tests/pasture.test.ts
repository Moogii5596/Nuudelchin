import { describe, expect, it } from 'vitest';
import { cfg } from './helpers';
import { Rng } from '../src/sim/rng';
import { buildGrid, cellIndex, dailyCampDegrade, dailyRegrowth, typeIdOf, typeQualities } from '../src/sim/systems/pasture';

describe('Бэлчээрийн тор (mvp-spec.md §7)', () => {
  const g = buildGrid(cfg, 'river', 0, new Rng(3));
  it('бууцны төвд талхлагдсан газар, холдох тусам бусад бүс', () => {
    expect(typeIdOf(g, cellIndex(g, 0, 0))).toBe('camp');
    expect(typeIdOf(g, cellIndex(g, 45, 0))).toBe('meadow');
    expect(typeIdOf(g, cellIndex(g, 170, 0))).toBe('foothill');
  });
  it('идэгдсэн өвс буцаж ургана, доройтол ургалтыг сулруулна', () => {
    const a = buildGrid(cfg, 'river', 0, new Rng(3));
    const b = buildGrid(cfg, 'river', 0, new Rng(3));
    const i = cellIndex(a, 45, 0);
    a.biomass[i] = 0.3;
    b.biomass[i] = 0.3;
    dailyRegrowth(cfg, a, 0);
    dailyRegrowth(cfg, b, 0.8);
    expect(a.biomass[i]!).toBeGreaterThan(0.3);
    expect(a.biomass[i]!).toBeGreaterThan(b.biomass[i]!);
  });
  it('одоогийн бууц доройтож, бусад бууц сэргэнэ', () => {
    const camps = { river: { degrade: 0.1, daysSpent: 0 }, valley: { degrade: 0.2, daysSpent: 0 } };
    dailyCampDegrade(cfg, camps, 'river', 120);
    expect(camps.river.degrade).toBeCloseTo(0.12);
    expect(camps.valley.degrade).toBeCloseTo(0.17);
  });
  it('доройтол өвсний чанарыг бууруулна; уулын ар хамгийн сайн', () => {
    const q0 = typeQualities(cfg, 0), q1 = typeQualities(cfg, 1);
    expect(q1.meadow!).toBeLessThan(q0.meadow!);
    expect(q0.northSlope!).toBeGreaterThan(q0.steppe!);
    expect(q0.camp!).toBeLessThan(q0.steppe!);
  });
});

import { newSim, steps } from './helpers';

describe('Бууц сэлгэх (mvp-spec.md §7.3)', () => {
  it('майхантай тэргээр 8 цаг нүүж, шинэ бууцанд мал ирнэ; хуучин бууц сэргэнэ', () => {
    const sim = newSim(11);
    sim.state.camps.river!.degrade = 0.4;
    const r = sim.command({ type: 'moveCamp', to: 'valley' });
    expect(r.ok).toBe(true);
    expect(sim.command({ type: 'deposit' }).ok).toBe(false); // нүүж байх үед завгүй
    steps(sim, 8 * 60);
    expect(sim.state.campId).toBe('valley');
    expect(sim.state.player.away).toBe(false);
    const sheep = sim.state.animals.filter((a) => a.species === 'sheep');
    expect(sheep.every((a) => Math.hypot(a.x, a.z) < 60)).toBe(true);
    sim.runDays(1);
    expect(sim.state.camps.river!.degrade).toBeLessThan(0.4);
  });
});
