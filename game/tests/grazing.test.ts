import { describe, expect, it } from 'vitest';
import { ACTIVE_DAY, newSim, steps } from './helpers';

describe('Бэлчээрлэлт', () => {
  it('сайн бэлчээрт мал өдрийн таазандаа хүрнэ', () => {
    const sim = newSim(5);
    steps(sim, ACTIVE_DAY - 1);   // 19:59 — орой хотондоо харихаас өмнө цадсан байна
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

describe('Доройтсон бууц (хэрэглэгчийн дүрэм D30)', () => {
  it('доройтсон бэлчээрт мал турж, тарга дуусахад эрүүл мэнд буурч, эцэст нь үхнэ', () => {
    const fresh = newSim(21, (s) => {
      s.camps.river!.degrade = 1;
      for (const a of s.animals) a.condition = 0.15;
    });
    const sheep0 = fresh.state.animals.filter((a) => a.species === 'sheep').length;
    fresh.runDays(3);
    const thin = fresh.state.animals.filter((a) => a.species === 'sheep');
    expect(thin.every((a) => a.condition < 0.15)).toBe(true);      // турна
    fresh.runDays(8);
    expect(fresh.state.animals.filter((a) => a.species === 'sheep').every((a) => a.health < 100)).toBe(true); // амин үзүүлэлт буурна
    fresh.runDays(15);
    expect(fresh.state.animals.filter((a) => a.species === 'sheep').length).toBeLessThan(sheep0); // үхнэ
  });
});
