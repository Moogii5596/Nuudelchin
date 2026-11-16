/** makeInterior-ийн тоглоомын өгөгдлийг (саад, E цэг, NPC-ийн байр, хаалганы завсар) энгийн JSON болгоно (tools/genHouseInteriors.ts, тест) */
import { BUILDING_CONFIG } from './config';
import { makeInterior } from './interior';

const r3 = (n: number): number => Math.round(n * 1000) / 1000;
export interface HouseInteriorData {
  floorY: number; ceilY: number; empty: boolean;
  /** Тавилга: box {x0,z0,x1,z1} | circle {x,z,r} (байшингийн локал). wall: true гадна хана */
  colliders: ({ type: 'box'; x0: number; z0: number; x1: number; z1: number; wall?: boolean } | { type: 'circle'; x: number; z: number; r: number })[];
  interact: { action: string; name: string; x: number; z: number; r: number }[];
  npcSpots: { role: string; name: string; x: number; z: number; fx: number; fz: number }[];
  doorGap: { x: number; z: number; w: number; nx: number; nz: number };
}

export function houseInteriorData(): Record<string, HouseInteriorData> {
  const out: Record<string, HouseInteriorData> = {};
  for (const key of Object.keys(BUILDING_CONFIG.interior).filter((k) => /^house/.test(k))) {
    const r = makeInterior(key);
    if (!r) continue;
    out[key] = {
      floorY: r3(r.floorY), ceilY: r3(r.ceilY), empty: r.empty,
      colliders: (r.colliders as Record<string, number | string | boolean>[]).map((c) => c.type === 'circle'
        ? { type: 'circle' as const, x: r3(c.x as number), z: r3(c.z as number), r: r3(c.r as number) }
        : { type: 'box' as const, x0: r3(c.x0 as number), z0: r3(c.z0 as number), x1: r3(c.x1 as number), z1: r3(c.z1 as number), ...(c.wall ? { wall: true } : {}) }),
      interact: r.interact.map((a: { action: string; name: string; position: { x: number; z: number }; radius: number }) => ({ action: a.action, name: a.name, x: r3(a.position.x), z: r3(a.position.z), r: r3(a.radius) })),
      npcSpots: r.npcSpots.map((s: { role: string; name: string; position: { x: number; z: number }; facing: { x: number; z: number } }) => ({ role: s.role, name: s.name, x: r3(s.position.x), z: r3(s.position.z), fx: r3(s.facing.x), fz: r3(s.facing.z) })),
      doorGap: { x: r3(r.doorGap.x), z: r3(r.doorGap.z), w: r3(r.doorGap.w), nx: r3(r.doorGap.n.x), nz: r3(r.doorGap.n.z) },
    };
  }
  return out;
}
