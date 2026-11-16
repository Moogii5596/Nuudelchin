import { describe, expect, it } from 'vitest';
import { findLeg, fillet, nearestFreeSpot, NavMap, planLegPath, polyAt, pushOut, stuckStep, wallRing, type Anchor, type RouteCfg, type WalkBox, type WalkSolids, type WalkYard } from "../src/sim/systems/sumwalk";

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


describe('sumwalk: NPC-ийн гудамжны зам (хаалга, булан, үүд)', () => {
  const RC: RouteCfg = { cell: 0.5, clearances: [1.1, 0.75, 0.5], turnR: 2.2, doorReach: 1.8, sampleMin: 1.5, catchUp: 1.6, doorTol: 1.3 };
  // 20×20 хашаа, хаалга урд (s, z=+10) талд, төвд (4.4 м нүх); хашааны дотор байшин
  const boxes: WalkBox[] = [{ x: -5, z: -4, hw: 3, hd: 3 }];
  wallRing(boxes, 0, 0, 20, 20, 's', 4.4, 0, 0.3);
  const s = solids(boxes);
  const nav = new NavMap(s, RC.cell);
  const leg = (a: { x: number; z: number }, b: { x: number; z: number }) => ({ t0: 0, t1: 10, pts: Array.from({ length: 21 }, (_, i) => ({ x: a.x + ((b.x - a.x) * i) / 20, z: a.z + ((b.z - a.z) * i) / 20 })), simLen: Math.hypot(b.x - a.x, b.z - a.z) });
  const maxTurn = (pts: { x: number; z: number }[]): number => {
    let m = 0;
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i]!, b = pts[i - 1]!, c = pts[i + 1]!, u = Math.atan2(a.x - b.x, a.z - b.z), v = Math.atan2(c.x - a.x, c.z - a.z);
      if (Math.hypot(a.x - b.x, a.z - b.z) < 1e-6 || Math.hypot(c.x - a.x, c.z - a.z) < 1e-6) continue;
      m = Math.max(m, Math.abs(Math.atan2(Math.sin(v - u), Math.cos(v - u))));
    }
    return m;
  };
  it('хашааны дотроос гадагш: хаалганы нүхээр гарна, ханыг нэвтлэхгүй', () => {
    const p = planLegPath(nav, s, leg({ x: -7, z: 4 }, { x: -7, z: 18 }), { anchors: [] }, RC, 0.35);
    for (const q of p.pts) expect(pushOut(s, q.x, q.z, 0.3).hit, `${q.x.toFixed(1)},${q.z.toFixed(1)}`).toBe(false);
    const cross = p.pts.find((q, i) => i > 0 && p.pts[i - 1]!.z < 10 && q.z >= 10)!;
    expect(Math.abs(cross.x)).toBeLessThan(2.2);
    expect(p.len).toBeGreaterThan(18);
  });
  it('гэрийн үүднээс хаалга хүртэл зөөлөн муруй: огцом эргэлт (> 60°), буцалт үгүй; үүднээс шулуун гарна', () => {
    const door: Anchor = { x: -5, z: 0.4, dx: 0, dz: 1 };           // байшингийн урд (+z) талын үүд
    const p = planLegPath(nav, s, leg({ x: -5, z: 0.4 }, { x: 0, z: 20 }), { anchors: [door] }, RC, 0.35);
    expect(maxTurn(p.pts)).toBeLessThan(Math.PI / 3);
    const a = polyAt(p, 1.0);
    expect(Math.abs(a.x - -5)).toBeLessThan(0.05);                   // эхний ~1.8 м үүдээс шулуун
    expect(a.z).toBeGreaterThan(1.2);
    for (const q of p.pts) expect(pushOut(s, q.x, q.z, 0.3).hit && Math.hypot(q.x - door.x, q.z - door.z) > 1.3).toBe(false);
  });
  it('гаднаас хашаанд орж, үүдэнд шулуун хүрнэ (ирмэгц л үүдэнд)', () => {
    const door: Anchor = { x: -5, z: 0.4, dx: 0, dz: 1 };
    const p = planLegPath(nav, s, leg({ x: 14, z: 18 }, { x: -5, z: 0.4 }), { anchors: [door] }, RC, 0.35);
    const end = p.pts[p.pts.length - 1]!, pre = polyAt(p, p.len - 1.0);
    expect(Math.hypot(end.x - door.x, end.z - door.z)).toBeLessThan(1e-6);
    expect(Math.abs(pre.x - -5)).toBeLessThan(0.05);
    const cross = p.pts.find((q, i) => i > 0 && p.pts[i - 1]!.z >= 10 && q.z < 10)!;
    expect(Math.abs(cross.x)).toBeLessThan(2.2);
  });
  it('fillet: 90° булан дугуйрна, төгсгөл хадгалагдана', () => {
    const r = fillet([{ x: 0, z: 0 }, { x: 0, z: 10 }, { x: 10, z: 10 }], 2);
    expect(r.length).toBeGreaterThan(3);
    expect(r[0]).toEqual({ x: 0, z: 0 });
    expect(r[r.length - 1]).toEqual({ x: 10, z: 10 });
    expect(maxTurn(r)).toBeLessThan(Math.PI / 4);
  });
  it('findLeg: хөдөлж буй хугацааны хил, дээжлэсэн цэг', () => {
    const probe = (m: number) => { const w = m >= 10 && m < 40; return { moving: w, out: true, x: w ? m - 10 : m < 10 ? 0 : 30, z: 0 }; };
    const L = findLeg(probe, 20, 1.5)!;
    expect(L.t0).toBeCloseTo(10, 2);
    expect(L.t1).toBeCloseTo(40, 2);
    expect(L.simLen).toBeGreaterThan(28);
    expect(findLeg(probe, 5, 1.5)).toBeNull();
  });
});

describe('sumwalk: бүх NPC-ийн бодит зам (72 хашаа, барилга)', () => {
  it('хашаа бүртгэгдсэн (72), үүдтэй; NPC-ийн гэр хашааны дотор → үүдэнтэй', async () => {
    const { cfg } = await import('./helpers');
    const { buildSumCenter } = await import('../src/render/sumlayout');
    const W = cfg.worldmap.sum3d.walk, b = buildSumCenter(cfg.sumcenter, { seed: 7, walk: W });
    expect(b.walk.yards!.length).toBe(72);
    const noGate = b.walk.yards!.filter((y) => !['n', 's', 'e', 'w'].includes(y.gate) || y.gw < 2);
    expect(noGate).toEqual([]);
    // хашаа бүрийн хаалганы нүх бодитоор чөлөөтэй (хоёр талаас)
    const bad = b.walk.yards!.filter((y) => {
      const n = { n: [0, -1], s: [0, 1], w: [-1, 0], e: [1, 0] }[y.gate]!, horiz = y.gate === 'n' || y.gate === 's';
      const cx = y.x + (horiz ? y.off : 0) + n[0]! * (horiz ? y.d / 2 : y.w / 2), cz = y.z + (horiz ? 0 : y.off) + n[1]! * (horiz ? y.d / 2 : y.w / 2);
      return pushOut(b.walk, cx, cz, W.npcR).hit;
    });
    expect(bad.map((y) => `${y.x.toFixed(0)},${y.z.toFixed(0)}`)).toEqual([]);
    const inY = (y: WalkYard, x: number, z: number): boolean => Math.abs(x - y.x) < y.w / 2 && Math.abs(z - y.z) < y.d / 2;
    for (const n of cfg.npcs.npcs) {
      if (typeof n.home !== 'object') continue;
      const y = b.walk.yards!.find((q) => inY(q, (n.home as { x: number }).x, (n.home as { z: number }).z));
      if (y || !['lkhagvasuren', 'munkhbat'].includes(n.id)) expect(y?.door, `${n.id}: хашааны үүд`).toBeDefined();   // шатахууны түшмэл, малчин: сумын төвд өөр айлгүй (нүүдэлчин, гадаа)
    }
  });

  it('NPC бүрийн бүх алхалт (хичээлийн өдөр, амралт): ханыг нэвтлэхгүй, огцом эргэлтгүй, үүдэнд шулуун орно', async () => {
    const { cfg } = await import('./helpers');
    const { buildSumCenter } = await import('../src/render/sumlayout');
    const { npcAt } = await import('../src/sim/systems/npc');
    const { allBuildings, doorPoint, facingOf } = await import('../src/sim/systems/sumtown');
    const { seasonOf } = await import('../src/sim/systems/seasons');
    const W = cfg.worldmap.sum3d.walk, b = buildSumCenter(cfg.sumcenter, { seed: 7, walk: W });
    const RCfg = (cfg.npcs as unknown as { render: { route: RouteCfg } }).render.route;
    const nav = new NavMap(b.walk, RCfg.cell);
    const vec = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] } as const;
    const anchors: Anchor[] = [
      ...allBuildings(cfg.sumcenter).map((bd) => { const d = doorPoint(bd), v = vec[facingOf(bd)]; return { x: d.x, z: d.z, dx: v[0], dz: v[1] }; }),
      ...b.walk.yards!.filter((y) => y.door).map((y) => y.door!),
    ];
    const dayOf = (season: string): number => { for (let d = 1; d < 800; d++) if (seasonOf(cfg, d) === season) return d; throw new Error(season); };
    const inY = (y: WalkYard, x: number, z: number): boolean => Math.abs(x - y.x) < y.w / 2 && Math.abs(z - y.z) < y.d / 2;
    const bad: string[] = [];
    let legs = 0, longest = 0;
    for (const day of [dayOf('winter'), dayOf('summer')]) for (const n of cfg.npcs.npcs) {
      const probe = (m: number) => { const r = npcAt(cfg, n, day, m); return { moving: r.moving, out: r.mode === 'out', x: r.x, z: r.z }; };
      const seen = new Set<string>();
      let home: { pt: { x: number; z: number }; door: Anchor } | null = null;
      if (typeof n.home === 'object') { const y = b.walk.yards!.find((q) => inY(q, (n.home as { x: number }).x, (n.home as { z: number }).z)); if (y?.door) home = { pt: n.home, door: y.door }; }
      for (let m = 330; m < 1300; m += 4) {
        const L = findLeg(probe, m, RCfg.sampleMin);
        if (!L) continue;
        const key = L.t0.toFixed(1);
        if (seen.has(key)) continue;
        seen.add(key); legs++;
        const p = planLegPath(nav, b.walk, L, { anchors, home }, RCfg, W.npcR);
        longest = Math.max(longest, p.len / Math.max(1, L.simLen));
        const s0 = p.pts[0]!, s1 = p.pts[p.pts.length - 1]!;
        for (const q of p.pts) {
          if (Math.hypot(q.x - s0.x, q.z - s0.z) < RCfg.doorTol || Math.hypot(q.x - s1.x, q.z - s1.z) < RCfg.doorTol) continue;
          if (pushOut(b.walk, q.x, q.z, W.npcR - 0.06).hit) { bad.push(`${n.id} d${day} ${L.t0.toFixed(0)}: хана/барилга ${q.x.toFixed(1)},${q.z.toFixed(1)}`); break; }
        }
        // дээжлэж (0.25 м) алхахад ч нэвтрэхгүй
        let prevHit = false;
        for (let s = 0; s <= p.len && !prevHit; s += 0.25) {
          const q = polyAt(p, s);
          if (Math.hypot(q.x - s0.x, q.z - s0.z) < RCfg.doorTol || Math.hypot(q.x - s1.x, q.z - s1.z) < RCfg.doorTol) continue;
          if (pushOut(b.walk, q.x, q.z, W.npcR - 0.06).hit) { bad.push(`${n.id} d${day} ${L.t0.toFixed(0)}: алхмын цэг ${q.x.toFixed(1)},${q.z.toFixed(1)}`); prevHit = true; }
        }
        // огцом эргэлт: 1 м-ийн цонхонд чиглэл ≤ 120° (үүдэнд хажуугаас орох 90° эргэлт хүртэл, буцалт үгүй)
        let worst = 0;
        for (let s = 0.5; s + 0.5 <= p.len; s += 0.5) {
          const a = polyAt(p, s - 0.5), c = polyAt(p, s), d = polyAt(p, s + 0.5);
          const u = Math.atan2(c.x - a.x, c.z - a.z), v = Math.atan2(d.x - c.x, d.z - c.z);
          worst = Math.max(worst, Math.abs(Math.atan2(Math.sin(v - u), Math.cos(v - u))));
        }
        if (worst > (120 * Math.PI) / 180) bad.push(`${n.id} d${day} ${L.t0.toFixed(0)}: огцом эргэлт ${((worst * 180) / Math.PI).toFixed(0)}°`);
      }
    }
    expect(legs).toBeGreaterThan(40);
    expect(bad).toEqual([]);
    expect(longest).toBeLessThan(6);   // замын уртрал sim-ийнхээс хэт том биш
  });
});
