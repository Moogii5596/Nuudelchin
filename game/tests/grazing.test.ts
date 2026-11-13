import { describe, expect, it } from 'vitest';
import { DAY, newSim, steps } from './helpers';

describe('Бэлчээрлэлт', () => {
  it('сайн бэлчээрт мал өдрийн таазандаа хүрнэ', () => {
    const sim = newSim(5);
    steps(sim, DAY - 1);
    const grazers = sim.state.animals.filter((a) => !a.riding);
    const avg = grazers.reduce((s, a) => s + a.gutFill, 0) / grazers.length;
    expect(avg).toBeGreaterThan(0.85);
  });
  it('цангасан мал ус руу явж уугаад цангалт тэглэгдэнэ', () => {
    const sim = newSim(5, (s) => {
      for (const a of s.animals) a.thirst = 60;
    });
    steps(sim, 240);
    const drank = sim.state.animals.filter((a) => !a.riding && a.thirst < 40);
    expect(drank.length).toBeGreaterThan(0);
  });
  it('«Хөөе» — хонийг заасан газар руу тууна', () => {
    const sim = newSim(5);
    const r = sim.command({ type: 'drive', species: 'sheep', x: 100, z: 50 });
    expect(r.ok).toBe(true);
    steps(sim, 200);
    const sheep = sim.state.animals.filter((a) => a.species === 'sheep');
    const avgDist = sheep.reduce((s, a) => s + Math.hypot(a.x - 100, a.z - 50), 0) / sheep.length;
    expect(avgDist).toBeLessThan(25);
  });
});
