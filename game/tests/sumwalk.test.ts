import { describe, expect, it } from 'vitest';
import { chaseVia, nearestFreeSpot, pushOut, stuckStep, wallRing, yardWaypoint, type WalkBox, type WalkSolids, type WalkYard } from '../src/sim/systems/sumwalk';

const solids = (boxes: WalkBox[], cyls: WalkSolids['cyls'] = []): WalkSolids => ({ boxes, cyls });

describe('sumwalk: алхалтын мөргөлдөөн', () => {
  it('барилгын дотор орсон цэгийг хамгийн ойрын талаар гаргана', () => {
    const q = pushOut(solids([{ x: 0, z: 0, hw: 5, hd: 4 }]), 4, 0, 0.35);
    expect(q.hit).toBe(true);
    expect(q.x).toBeCloseTo(5.35, 5);
  });
  it('саадаас холуур өнгөрвөл өөрчлөхгүй', () => {
    const q = pushOut(solids([{ x: 0, z: 0, hw: 5, hd: 4 }]), 10, 10, 0.35);
    expect(q).toEqual({ x: 10, z: 10, hit: false });
  });
  it('ханын дагуу гулсана (шүргэх хөдөлгөөн хадгалагдана)', () => {
    const s = solids([{ x: 0, z: 0, hw: 5, hd: 4 }]);
    const q = pushOut(s, 2, 4.2, 0.35);   // хойд талын хана руу шахсан
    expect(q.z).toBeCloseTo(4.35, 5);
    expect(q.x).toBeCloseTo(2, 5);
  });
  it('гэрийн тойргоос гаргана', () => {
    const q = pushOut(solids([], [{ x: 0, z: 0, r: 3 }]), 1, 0, 0.35);
    expect(Math.hypot(q.x, q.z)).toBeCloseTo(3.35, 5);
  });
  it('хашааны хаалганы нүх нээлттэй, бусад тал хаалттай', () => {
    const w: WalkBox[] = [];
    wallRing(w, 0, 0, 20, 20, 's', 6, 0, 0.3);
    const s = solids(w);
    expect(pushOut(s, 0, 10, 0.35).hit).toBe(false);     // урд талын хаалга
    expect(pushOut(s, 6, 10, 0.35).hit).toBe(true);      // урд талын хана
    expect(pushOut(s, 0, -10, 0.35).hit).toBe(true);     // хойд хана
    expect(pushOut(s, 10, 0, 0.35).hit).toBe(true);      // баруун хана
  });
  it('гацалт: оролттой мөртлөө нүүхгүй байвал stuckSec-ийн дараа л true', () => {
    const st = { t: 0 }, cfg = { stuckSec: 1, stuckSpeed: 0.3 };
    let hits = 0;
    for (let i = 0; i < 30; i++) if (stuckStep(st, true, 0, 0.125, cfg)) hits++;
    expect(hits).toBe(3);
    expect(stuckStep(st, true, 2, 0.125, cfg)).toBe(false);
    expect(st.t).toBe(0);
  });
  it('nearestFreeSpot чөлөөт цэг олно', () => {
    const s = solids([{ x: 0, z: 0, hw: 2, hd: 2 }]);
    const f = nearestFreeSpot(s, 0, 0, 0.35, 0.8);
    expect(pushOut(s, f.x, f.z, 0.35).hit).toBe(false);
  });
});

describe('sumwalk: сумын төвийн бодит байршил', () => {
  it('хаалга, орох цэг, цайны газар саадгүй; барилга, хашаа бодитоор саадтай', async () => {
    const { cfg } = await import('./helpers');
    const { buildSumCenter } = await import('../src/render/sumlayout');
    const { sumDoors } = await import('../src/sim/systems/sumtown');
    const W = cfg.worldmap.sum3d.walk, b = buildSumCenter(cfg.sumcenter, { seed: 7, walk: W });
    expect(b.walk.boxes.length).toBeGreaterThan(50);
    const bad = sumDoors(cfg).filter((d) => pushOut(b.walk, d.x, d.z, W.mountedR).hit).map((d) => d.id);
    expect(bad).toEqual([]);
    const e = cfg.sumcenter.entry;
    expect(pushOut(b.walk, e.x, e.z, W.mountedR).hit).toBe(false);
    for (const bd of cfg.sumcenter.buildings.slice(0, 5)) expect(pushOut(b.walk, bd.x, bd.z, W.bodyR).hit).toBe(true);
  });
});

describe('sumwalk: хаалганаас гарах зам хашаагаар хаагдаагүй', () => {
  it('сумын төвийн хаалга, зарагдаж буй/хамаатны айлын үүднээс явган гарч (40 м) болно', async () => {
    const { cfg } = await import('./helpers');
    const { buildSumCenter } = await import('../src/render/sumlayout');
    const { sumDoors } = await import('../src/sim/systems/sumtown');
    const W = cfg.worldmap.sum3d.walk, b = buildSumCenter(cfg.sumcenter, { seed: 7, walk: W });
    const starts = [...sumDoors(cfg).map((d) => ({ id: d.id, x: d.x, z: d.z })), ...b.plots.map((p) => ({ id: p.id, x: p.door.x, z: p.door.z }))];
    const trapped: string[] = [];
    for (const s of starts) {
      const step = 0.5, seen = new Set<string>(), q: [number, number][] = [[s.x, s.z]];
      const key = (x: number, z: number): string => Math.round(x / step) + ',' + Math.round(z / step);
      seen.add(key(s.x, s.z));
      let out = false;
      while (q.length && !out) {
        const [x, z] = q.shift()!;
        if (Math.hypot(x - s.x, z - s.z) > 40) { out = true; break; }
        for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]] as const) {
          const nx = x + dx, nz = z + dz, k = key(nx, nz);
          if (seen.has(k) || pushOut(b.walk, nx, nz, W.bodyR).hit) continue;
          seen.add(k); q.push([nx, nz]);
        }
      }
      if (!out) trapped.push(s.id);
    }
    expect(trapped).toEqual([]);
  });
});

describe('sumwalk: хашааны хаалгаар дамжуулах (render NPC)', () => {
  // 20×20 хашаа, хаалга урд (s, z=+10) талд, төвд (4.4 м нүх)
  const y: WalkYard = { x: 0, z: 0, w: 20, d: 20, gate: 's', off: 0, gw: 4.4 };
  const boxes: WalkBox[] = [];
  wallRing(boxes, 0, 0, 20, 20, 's', 4.4, 0, 0.3);
  const s = solids(boxes);
  it('хашааны дотроос гадагш хана гатлах бол эхлээд хаалганы дотор цэг', () => {
    const wp = yardWaypoint([y], { x: -6, z: 0 }, { x: -6, z: 14 });
    expect(wp).not.toBeNull();
    expect(Math.abs(wp!.x)).toBeLessThan(0.01);
    expect(wp!.z).toBeLessThan(10);
  });
  it('хаалганы ойр байвал шууд гаднах цэг рүү; хоёулаа нэг талд бол null', () => {
    const wp = yardWaypoint([y], { x: 0.5, z: 8.9 }, { x: 0, z: 16 });
    expect(wp!.z).toBeGreaterThan(10);
    expect(yardWaypoint([y], { x: -6, z: 0 }, { x: 5, z: 3 })).toBeNull();
  });
  it('chaseVia: хана хөндлөн гарсан зорилт руу хаалгаар явж, ханын нүхээр л орно', () => {
    let p = { x: -6, z: 0 };
    const to = { x: -6, z: 14 };
    let crossedAtGap = false;
    for (let i = 0; i < 400; i++) {
      const q = chaseVia([y], p, to, 0.2, 40);
      if (p.z < 10 && q.z >= 10) crossedAtGap = Math.abs(q.x) < 2.2;
      p = q;
      if (Math.hypot(p.x - to.x, p.z - to.z) < 1e-6) break;
    }
    expect(crossedAtGap).toBe(true);
    expect(Math.hypot(p.x - to.x, p.z - to.z)).toBeLessThan(1e-6);
    expect(pushOut(s, 0, 10, 0.35).hit).toBe(false);
  });
  it('хэт хол зөрвөл шууд очно (снап)', () => {
    expect(chaseVia([y], { x: -6, z: 0 }, { x: 30, z: 30 }, 0.2)).toEqual({ x: 30, z: 30 });
  });
});
