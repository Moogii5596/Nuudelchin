import { describe, expect, it } from 'vitest';
import { cfg, newSim, steps } from './helpers';
import { findHerds, drinkPoint } from '../src/sim/systems/herds';
import { waterDistance } from '../src/sim/terrain';
import { cellIndex } from '../src/sim/systems/pasture';
import type { GameState } from '../src/sim/state';

const H = cfg.pasture.grazing.herd;
const river = cfg.camps.camps.river!;

/** Хонийг (x, z) орчим бөөгнүүлж, үхрийг хол тавина. Чоно дайрахгүй */
function placeSheep(s: GameState, x: number, z: number): void {
  s.wolves.peaceful = true;
  let k = 0;
  for (const a of s.animals) {
    if (a.riding) continue;
    if (a.species === 'sheep') {
      a.x = a.tx = x + (k % 4) * 1.5;
      a.z = a.tz = z + Math.floor(k / 4) * 1.5;
      k++;
    } else {
      a.x = a.tx = -60;
      a.z = a.tz = 40;
    }
    a.thirst = 10;
    a.mode = 'graze';
  }
}
const sheepOf = (s: GameState) => s.animals.filter((a) => a.species === 'sheep');
const spread = (xs: { x: number; z: number }[]) => {
  const cx = xs.reduce((t, a) => t + a.x, 0) / xs.length, cz = xs.reduce((t, a) => t + a.z, 0) / xs.length;
  return Math.max(...xs.map((a) => Math.hypot(a.x - cx, a.z - cz)));
};

describe('Сүрэг (M4, хэрэглэгчийн дүрэм)', () => {
  it('ойрхон нэг төрлийн мал нэг сүрэг, хол тасарсан хэсэг тусдаа сүрэг', () => {
    const sim = newSim(21, (s) => placeSheep(s, 40, 20));
    const sheep = sheepOf(sim.state);
    for (const a of sheep.slice(0, 3)) {
      a.x += 60;
      a.z += 30;
    }
    const herds = findHerds(sim.state, H.linkRadius).filter((h) => h.key === 'sheep');
    expect(herds.map((h) => h.members.length).sort()).toEqual([3, sheep.length - 3].sort());
  });

  it('уснаас хол: нэг хонь цангахад сүрэг хөдлөхгүй, тэр хонь ч ганцаараа явахгүй', () => {
    const sim = newSim(22, (s) => placeSheep(s, 40, 50));
    const one = sheepOf(sim.state)[0]!;
    one.thirst = 95;
    expect(waterDistance(river.waterShape, 40, 50)).toBeGreaterThan(H.nearWaterDistance);
    steps(sim, 40);
    expect(sheepOf(sim.state).some((a) => a.mode === 'drink')).toBe(false);
    expect(waterDistance(river.waterShape, one.x, one.z)).toBeGreaterThan(H.nearWaterDistance);
  });

  it('уснаас хол: сүргийн дундаж цангалт босгод хүрэхэд сүрэг бүхэлдээ бөөгнөрч ус руу явна', () => {
    const sim = newSim(23, (s) => placeSheep(s, 40, 50));
    for (const a of sheepOf(sim.state)) a.thirst = 55;
    steps(sim, H.decideEverySteps + 1);
    const sheep = sheepOf(sim.state);
    expect(sheep.every((a) => a.mode === 'drink')).toBe(true);
    // Замдаа хамт явна
    steps(sim, 50);
    expect(spread(sheepOf(sim.state))).toBeLessThan(15);
    steps(sim, 150);
    expect(sheepOf(sim.state).every((a) => a.thirst < 20)).toBe(true);
    // Голын эрэг дээр (гольдрол руу ороогүй)
    for (const a of sheepOf(sim.state)) expect(waterDistance(river.waterShape, a.x, a.z)).toBeGreaterThan(1.5);
  });

  it('уснаас ойр: мал нэг нэгээрээ очиж ууна, бусад нь бэлчсээр', () => {
    const w = drinkPoint(cfg, river.waterShape, 30, 0);
    const sim = newSim(24, (s) => placeSheep(s, 30, w.z + 20));
    const sheep = sheepOf(sim.state);
    sheep[0]!.thirst = 70;
    steps(sim, 60);
    expect(sheep[0]!.thirst).toBeLessThan(20);
    expect(sheep.slice(1).every((a) => a.thirst < 50 && a.thirst > 5)).toBe(true);
  });

  it('өлссөн сүрэг муу бэлчээрээс бүхэлдээ шинэ газар руу нүүнэ', () => {
    const sim = newSim(25, (s) => {
      placeSheep(s, 40, 20);
      s.time.minute = 12 * 60;
      for (const a of s.animals) a.gutFill = 0.05;
      // (40, 20)-ийн орчмын өвсийг идэгдсэн болгоно
      for (let x = 0; x < 80; x += 2) for (let z = -20; z < 60; z += 2) {
        const i = cellIndex(s.grass, x, z);
        if (i >= 0) s.grass.biomass[i] = 0.02;
      }
    });
    steps(sim, H.decideEverySteps + 1);
    expect(sim.herdDecisions.some((d) => d.kind === 'trek' && d.key === 'sheep')).toBe(true);
    expect(sheepOf(sim.state).every((a) => a.mode === 'trek')).toBe(true);
    steps(sim, 120);
    const sheep = sheepOf(sim.state);
    const cx = sheep.reduce((t, a) => t + a.x, 0) / sheep.length, cz = sheep.reduce((t, a) => t + a.z, 0) / sheep.length;
    expect(Math.hypot(cx - 40, cz - 20)).toBeGreaterThan(15);
    expect(spread(sheep)).toBeLessThan(20);
  });

  it('малчин тууж авчирсан сүрэг тэндээ үлдэнэ (өөрөө нүүхгүй)', () => {
    const sim = newSim(26, (s) => placeSheep(s, 40, 20));
    sim.command({ type: 'drive', species: 'sheep', x: 100, z: 50 });
    steps(sim, 200);
    const sheep = sheepOf(sim.state);
    expect(sheep.every((a) => a.mode !== 'trek')).toBe(true);
    const avg = sheep.reduce((t, a) => t + Math.hypot(a.x - 100, a.z - 50), 0) / sheep.length;
    expect(avg).toBeLessThan(25);
  });
});
