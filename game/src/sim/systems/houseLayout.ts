/**
 * V3.5/V6.2 хашаа байшингийн дотор талын зохион байгуулалт (Three.js-гүй): алхах талбай (гол өрөө + амбаар + хаалганы завсар),
 * тавилгын саад, орох/гарах цэг, лангуу. Тоо нь `data/buildings.json` `house`, `interior` (лабораторийн makeInterior-той ижил томьёо —
 * render/building/interior.ts). Координат: байшингийн локал (төв 0,0, нүүр +Z), өрөөний координатад шууд ашиглана. gerLayout.ts-тэй ижил арга.
 */
import buildings from '../../../../data/buildings.json';
import houseData from '../../../../data/house-interiors.json';
import { pushOutOfBox, type LayoutBox } from './gerLayout';

type Obj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const B = buildings as unknown as Obj;

/** [x0, z0, x1, z1] — биеийн төв явж болох талбай (bodyR хассан) */
export type WalkRect = [number, number, number, number];
export interface HouseRoom {
  /** interior.main — өрөөний хэмжээ */
  w: number; d: number; h: number;
  entry: [number, number]; exit: [number, number]; counter: [number, number];
  walk: WalkRect[];
  blockers: LayoutBox[];
  empty: boolean;
  /** Гарах хаалганы гадна чиглэл (байшингийн локал) */
  out: { x: number; z: number };
  /** Байшингийн төрөл (house.*) */
  base: string;
}

export const houseInteriorKeys = (): string[] => Object.keys(B.interior).filter((k) => /^house/.test(k));

function resolve(key: string): { K: Obj; T: Obj; mirror: boolean; base: string } {
  const V = B.interior[key];
  if (!V || typeof V !== 'object') throw new Error(`houseLayout: "${key}" дотор тал алга`);
  const base: string = V.base ?? key, K0 = B.house[base], T = V.layout ? B.interior[V.layout] : V, mirror = !!V.mirror;
  const K = mirror ? { ...K0, window: { ...K0.window, front: K0.window.front.map((x: number) => -x) }, porch: { ...K0.porch, x: K0.porch.x != null ? -K0.porch.x : K0.porch.x } } : K0;
  return { K, T, mirror, base };
}

const cache = new Map<string, HouseRoom>();

export function houseRoom(key: string, bodyR: number): HouseRoom {
  const ck = `${key}|${bodyR}`, hit = cache.get(ck);
  if (hit) return hit;
  const { K, T, mirror, base } = resolve(key), IN = B.interior, hw = K.w / 2, hd = K.d / 2, xi = hw - IN.inset, zi = hd - IN.inset;
  const Q = K.porch, D = K.door, qw = Q.w / 2 - 0.05, qd = Q.d - 0.05;
  const side = Q.side as 'front' | 'east' | 'west';
  const phi: number = { front: 0, east: Math.PI / 2, west: -Math.PI / 2 }[side];
  const [tx, tz] = { front: [Q.x, hd], east: [hw, Q.z], west: [-hw, Q.z] }[side] as [number, number];
  const cs0 = Math.cos(phi), sn0 = Math.sin(phi);
  const toHouse = (lx: number, lz: number): [number, number] => [lx * cs0 + lz * sn0 + tx, -lx * sn0 + lz * cs0 + tz];
  const rectOf = (x0: number, z0: number, x1: number, z1: number): WalkRect => {   // амбаарын локал тэгш өнцөгт → байшингийн локал
    const a = toHouse(x0, z0), b = toHouse(x1, z1);
    return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
  };
  const r = bodyR;
  const walk: WalkRect[] = [
    [-xi + r, -zi + r, xi - r, zi - r],
    rectOf(-qw + r, 0.02 + r, qw - r, qd - r),                       // үүдний амбаар
    rectOf(-(D.w / 2 - 0.15), -0.5, D.w / 2 - 0.15, 0.4),            // гол хаалганы завсар (хана нимгэн)
  ];
  // Саад, E цэг: лабораторийн makeInterior (data/house-interiors.json — npm run houses). Гадна хана алгасна (алхах талбай хязгаарлана)
  const D0 = (houseData as unknown as Record<string, { empty: boolean; colliders: ({ type: 'box'; x0: number; z0: number; x1: number; z1: number } | { type: 'circle'; x: number; z: number; r: number })[]; interact: { action: string; x: number; z: number }[] }>)[key];
  if (!D0) throw new Error(`houseLayout: data/house-interiors.json-д "${key}" алга (npm run houses)`);
  const walkAll = mirror ? walk.map(([x0, z0, x1, z1]): WalkRect => [-x1, z0, -x0, z1]) : walk;
  const boxes: LayoutBox[] = [];
  for (const c of D0.colliders) {
    if (c.type === 'circle') { boxes.push({ x: c.x, z: c.z, hw: c.r, hd: c.r, phi: 0 }); continue; }
    if (c.x0 >= xi - 1e-6 || c.x1 <= -xi + 1e-6 || c.z0 >= zi - 1e-6 || c.z1 <= -zi + 1e-6) continue;
    boxes.push({ x: (c.x0 + c.x1) / 2, z: (c.z0 + c.z1) / 2, hw: (c.x1 - c.x0) / 2, hd: (c.z1 - c.z0) / 2, phi: 0 });
  }
  const Pt = T.partition, px = Pt.x, cs = T.cookSide;
  const empty = !!T.empty, tableAct = D0.interact.find((a) => a.action === 'table');
  const want: [number, number] = tableAct ? [tableAct.x, tableAct.z] : [cs < 0 ? (-xi + px) / 2 : (px + xi) / 2, 0.3];   // лангуу: ширээний дэргэд, хоосон байшинд их өрөөний голд
  const freeAt = (x: number, z: number): boolean => {
    let p = clampToWalk(walkAll, x, z);
    for (const o of boxes) p = pushOutOfBox(o, p.x, p.z, bodyR);
    return Math.abs(p.x - x) < 1e-6 && Math.abs(p.z - z) < 1e-6;
  };
  // орох цэгээс хүрч болох хамгийн ойрын цэг (хаалттай завсар, сандлын завсарт орохгүй)
  const eL = Q.doorFace === 'out' ? [0, qd - bodyR - 0.55] : [(Q.doorFace === 'right' ? 1 : -1) * (qw - bodyR - 0.55), Q.d / 2];
  const e0 = toHouse(eL[0]!, eL[1]!), startX = mirror ? -e0[0] : e0[0], step = 0.1;
  const seen = new Set<string>(), cellKey = (x: number, z: number): string => Math.round(x * 1000) + ',' + Math.round(z * 1000), stack: [number, number][] = [[startX, e0[1]]];
  let counter: [number, number] = want, best = Infinity;
  seen.add(cellKey(startX, e0[1]));
  while (stack.length) {
    const [x, z] = stack.pop()!, d = (x - want[0]) ** 2 + (z - want[1]) ** 2;
    if (d < best) { best = d; counter = [Math.round(x * 100) / 100, Math.round(z * 100) / 100]; }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) { const nx = x + dx * step, nz = z + dz * step, k = cellKey(nx, nz); if (!seen.has(k) && freeAt(nx, nz)) { seen.add(k); stack.push([nx, nz]); } }
  }
  // орох/гарах: амбаарын гаднах хаалга
  const sx = Q.doorFace === 'right' ? 1 : -1, out = Q.doorFace === 'out';
  const dirLocal: [number, number] = out ? [0, 1] : [sx, 0];
  const exitL: [number, number] = out ? [0, qd - bodyR - 0.05] : [sx * (qw - bodyR - 0.05), Q.d / 2];
  const entryL: [number, number] = out ? [0, qd - bodyR - 0.55] : [sx * (qw - bodyR - 0.55), Q.d / 2];
  const entry = toHouse(entryL[0], entryL[1]), exit = toHouse(exitL[0], exitL[1]);
  const o: [number, number] = [dirLocal[0] * cs0 + dirLocal[1] * sn0, -dirLocal[0] * sn0 + dirLocal[1] * cs0];
  const room: HouseRoom = { w: K.w - K.wallT * 2, d: K.d - K.wallT * 2, h: +(K.wallH - K.plinthH - 0.06).toFixed(2), entry, exit, counter, walk, blockers: boxes, empty, out: { x: o[0], z: o[1] }, base };
  if (mirror) {   // data/house-interiors.json нь houseBf-ийг аль хэдийн толин тусгалаар агуулна; зөвхөн амбаар, алхах талбай, орох цэгийг эргүүлнэ
    room.entry = [-entry[0], entry[1]]; room.exit = [-exit[0], exit[1]];
    room.walk = walk.map(([x0, z0, x1, z1]): WalkRect => [-x1, z0, -x0, z1]);
    room.out = { x: -room.out.x, z: room.out.z };
  }
  cache.set(ck, room);
  return room;
}

/** (x, z) алхах талбайд хамгийн ойр цэг (олон тэгш өнцөгтийн нэгдэл) */
export function clampToWalk(walk: WalkRect[], x: number, z: number): { x: number; z: number } {
  let best = { x, z }, bd = Infinity;
  for (const [x0, z0, x1, z1] of walk) {
    const cx = Math.max(x0, Math.min(x1, x)), cz = Math.max(z0, Math.min(z1, z)), d = (cx - x) ** 2 + (cz - z) ** 2;
    if (d < bd) { bd = d; best = { x: cx, z: cz }; if (d === 0) break; }
  }
  return best;
}
