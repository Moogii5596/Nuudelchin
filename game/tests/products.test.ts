import { describe, expect, it } from 'vitest';
import { cfg, DAY, newSim, steps } from './helpers';
import * as storage from '../src/sim/systems/storage';

describe('Бүтээгдэхүүн, агуулах, боловсруулалт (mvp-spec.md §4)', () => {
  it('сүүтэй үнээ өглөө хотонд (хоносон газраа) ~5 сав сүү үлдээнэ (M4.5)', () => {
    const sim = newSim(2);
    steps(sim, DAY - 2);
    expect(sim.state.items.filter((i) => i.product === 'milk').length).toBe(0);   // өдөр сүү унахгүй
    steps(sim, 2);   // 06:00 өглөө
    const milk = sim.state.items.filter((i) => i.product === 'milk');
    expect(milk.length).toBeGreaterThanOrEqual(6);  // 2 үнээ
    expect(milk.length).toBeLessThanOrEqual(14);
    const yard = cfg.camps.home.cowYard;
    for (const m of milk) expect(Math.hypot(m.x - yard.x, m.z - yard.z)).toBeLessThan(yard.r + 4);
  });
  it('газарт удсан сүү тараг болж, дараа нь муудна', () => {
    const sim = newSim(2);
    sim.state.items.push({ id: 999, product: 'milk', amount: 1, x: 0, z: 0, age: 0 });
    steps(sim, cfg.products.ground.milkSourHours * 60 + 1);
    expect(sim.state.items.find((i) => i.id === 999)?.product).toBe('tarag');
    steps(sim, cfg.products.ground.taragSpoilHours * 60);
    expect(sim.state.items.find((i) => i.id === 999)).toBeUndefined();
  });
  it('түүж агуулахад хийнэ, гар 10 нэгжээс илүү барихгүй, агуулах дүүрнэ', () => {
    const sim = newSim(2);
    for (let k = 0; k < 25; k++) sim.state.items.push({ id: 1000 + k, product: 'milk', amount: 1, x: 0, z: 0, age: 0 });
    const ids = sim.state.items.map((i) => i.id);
    expect(sim.command({ type: 'pickup', ids }, false).ok).toBe(true);
    expect(sim.state.player.carry.length).toBe(10);
    sim.command({ type: 'deposit' }, false);
    sim.command({ type: 'pickup', ids }, false);
    sim.command({ type: 'deposit' }, false);
    sim.command({ type: 'pickup', ids }, false);
    const r = sim.command({ type: 'deposit' }, false);
    expect(r.ok).toBe(false); // 20 нэгжийн агуулах дүүрсэн
    expect(storage.used(sim.state)).toBe(20);
  });
  it('агуулах дахь сүү 1 өдрийн дараа тараг, 2 өдрийн дараа муудна', () => {
    const sim = newSim(2);
    storage.add(cfg, sim.state, 'milk', 5);
    storage.dailyStorageAging(cfg, sim.state);
    expect(storage.count(sim.state, 'tarag')).toBe(5);
    const spoiled = storage.dailyStorageAging(cfg, sim.state);
    expect(spoiled.tarag).toBe(5);
  });
  it('тогоо: 4 л сүү → 2 цагийн дараа 1 кг ааруул', () => {
    const sim = newSim(2);
    sim.state.processors.push({ kind: 'pot', remaining: 0, pending: {} });
    storage.add(cfg, sim.state, 'milk', 8);
    expect(sim.command({ type: 'process', kind: 'pot' }).ok).toBe(true);
    expect(storage.count(sim.state, 'milk')).toBe(4);
    steps(sim, 120);
    expect(storage.count(sim.state, 'aaruul')).toBe(1);
  });
});
