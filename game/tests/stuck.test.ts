/**
 * M6.8 Мал гацахгүй: 220 өдөр × 4 seed-д гацсан мал 0; гацалт илрүүлэгч зорилготой хөдөлгөөнгүй малыг ойрын чөлөөтэй цэгт шилжүүлнэ;
 * мал гүн ус, хилээс гадуур орохгүй.
 */
import { describe, expect, it } from 'vitest';
import { cfg, newSim, steps } from './helpers';
import { detectStuck, isWalkable, nearestWalkable, waterDepthAt } from '../src/sim/systems/safety';
import type { Sim } from '../src/sim/sim';

/** Одоогийн бууцны голын гүн цэг (гүн > deepWater) */
function deepPoint(sim: Sim): { x: number; z: number } {
  const st = sim.state;
  for (let x = -60; x <= 60; x += 2) for (let z = -90; z <= -30; z += 0.5) if (waterDepthAt(cfg, st.campId, x, z) > cfg.pasture.grazing.stuck.deepWater + 0.2) return { x, z };
  throw new Error('гүн ус олдсонгүй');
}

describe('Гацалт илрүүлэгч', () => {
  for (const seed of [1, 2, 3, 4]) {
    it(`220 өдөр, seed ${seed}: гацсан мал 0, мал гүн усанд орсонгүй`, () => {
      const sim = newSim(seed);
      let deep = 0;
      for (let d = 0; d < 220; d++) {
        sim.runDays(1);
        for (const a of sim.state.animals) if (!a.riding && !isWalkable(cfg, sim.state, a.x, a.z) && Math.hypot(a.x, a.z) < cfg.player.worldRadius - 4) deep++;
      }
      expect(sim.state.stuckEvents).toBe(0);
      expect(deep).toBe(0);
    }, 120_000);
  }

  it('зорилготой хөдөлгөөнгүй мал N алхамын дараа ойрын чөлөөтэй цэгт шилжинэ (дэлхийн хилээс гадуур)', () => {
    const sim = newSim(5);
    const st = sim.state;
    const a = st.animals.find((x) => !x.riding)!;
    const R = cfg.player.worldRadius;
    a.x = R - 2; a.z = 0; a.tx = R + 20; a.tz = 0; a.mode = 'driven';
    expect(isWalkable(cfg, st, a.x, a.z)).toBe(false);
    const n = cfg.pasture.grazing.stuck.steps;
    for (let i = 0; i < n; i++) { detectStuck(cfg, st); a.x = R - 2; }   // хөдлөхгүй (1-р дуудалт суурь тэмдэглэнэ)
    expect(st.stuckEvents).toBe(0);
    detectStuck(cfg, st);
    expect(st.stuckEvents).toBe(1);
    expect(isWalkable(cfg, st, a.x, a.z)).toBe(true);
    expect(a.mode).toBe('graze');
    expect(Math.hypot(a.tx - a.x, a.tz - a.z)).toBeLessThan(1e-9);
  });

  it('гүн усанд зугтаж буй мал эрэгт гарна; ердийн (туугдсан) мал голыг гатлана', () => {
    const sim = newSim(6);
    const st = sim.state;
    const p = deepPoint(sim);
    const a = st.animals.find((x) => !x.riding)!;
    a.x = p.x; a.z = p.z; a.mode = 'flee'; a.tx = p.x + 40; a.tz = p.z + 40;   // айсан мал гүн усанд: гүн усыг тойрох учир хөдлөхгүй → шилжинэ
    expect(isWalkable(cfg, st, a.x, a.z)).toBe(false);
    for (let i = 0; i < 60 && a.mode === 'flee'; i++) sim.step();   // зугтах дуустал (эрэгт гарсан эсвэл зам хаагдсан)
    expect(a.mode).not.toBe('flee');
    expect(isWalkable(cfg, st, a.x, a.z), `a: ${a.x.toFixed(1)},${a.z.toFixed(1)} ${a.mode} depth ${waterDepthAt(cfg, st.campId, a.x, a.z).toFixed(2)} p ${p.x},${p.z}`).toBe(true);   // тойруулж гарсан эсвэл гацалт илрүүлэгч эрэгт гаргасан
    const near = nearestWalkable(cfg, st, p.x, p.z);
    expect(isWalkable(cfg, st, near.x, near.z)).toBe(true);
    // ердийн туугдсан мал голыг гатлан хөдөлнө (гацахгүй)
    const b = st.animals.filter((x) => !x.riding)[1]!;
    b.x = p.x; b.z = p.z; b.mode = 'driven'; b.tx = p.x; b.tz = p.z + 30;
    const e0 = st.stuckEvents;
    steps(sim, 40);
    expect(Math.abs(b.z - p.z)).toBeGreaterThan(10);
    expect(st.stuckEvents).toBe(e0);
  });

  it('бэлчиж буй (зорилго ойр) ба унтаж буй мал гацсан гэж тооцогдохгүй', () => {
    const sim = newSim(7);
    const st = sim.state;
    for (const a of st.animals) { a.tx = a.x + 0.5; a.tz = a.z; a.mode = 'graze'; }
    for (let i = 0; i < 100; i++) detectStuck(cfg, st);
    expect(st.stuckEvents).toBe(0);
    const b = st.animals.find((x) => !x.riding)!;
    b.mode = 'sleep'; b.tx = b.x + 50; b.tz = b.z;
    for (let i = 0; i < 100; i++) detectStuck(cfg, st);
    expect(st.stuckEvents).toBe(0);
  });
});
