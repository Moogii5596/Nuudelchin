/**
 * V3.5 сумын төвийн барилгын хэмжээ, хаалга (Three.js-гүй). `data/buildings.json` `town`-ийн лабораторийн барилгын
 * хэмжээ, үүдний байрлалыг sim (doorPoint, мөргөлдөөн) ба render хуваалцана — render/building/*-ийн геометртэй тестээр тэнцүү.
 * Координат: барилгын локал (нүүр +Z, төв 0,0) → rot градусаар эргүүлж (нүүр rot=90 → баруун, 180 → хойд) дэлхийд зөөнө.
 */
import buildings from '../../../../data/buildings.json';

type Obj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const B = buildings as unknown as Obj;

export interface TownEntry { type: string; kind?: string; /** public: тоглоомын гол үүд — entrances-ийн индекс (анхдагч 0) */ entrance?: number; rot?: number; dx?: number; dz?: number; roofColor?: string }
export interface LabFootprint {
  /** Лабораторийн (эргүүлээгүй) хэмжээ */
  w: number; d: number;
  /** Үүдний цэг (барилгын локал) — тоглогч зогсох, гаднах */
  door: { x: number; z: number };
}

export function townEntry(id: string): TownEntry | null { return (B.town.byId as Record<string, TownEntry>)[id] ?? null; }

/** Барилгын локал хэмжээ, хаалга (rot хүртэлх). Нийлмэл талбайн хувьд — талбайн хэмжээ */
export function entryFootprint(e: TownEntry): LabFootprint {
  const stand: number = B.doorStandOff;
  switch (e.type) {
    case 'public': {
      const K = B.public.kinds[e.kind!], E = K.entrances[e.entrance ?? 0];
      return { w: K.w, d: K.d, door: { x: E.x, z: K.d / 2 + 1.6 + 0.64 + stand + (E.portico ? 2 : 0) } };
    }
    case 'shop': {
      const S = B.shop, T = S.types[e.kind!], Q = S.porch;
      const w = T.w ?? S.w, d = T.d ?? S.d;
      return { w, d, door: { x: 0, z: d / 2 + Q.d + Q.steps * Q.stepD + stand } };
    }
    case 'woolStore': { const S = B.milkWool.store; return { w: S.w, d: S.d, door: { x: 0, z: S.d / 2 + 1.6 } }; }
    case 'temple': { const T = B.temple; return { w: T.hall.w, d: T.hall.d, door: { x: 0, z: T.hallZ + T.porch.d / 2 + T.plat.d / 2 + 0.8 + stand } }; }
    default: throw new Error(`entryFootprint: ${e.type} талбайн хаалга зөвхөн render-д`);
  }
}

/** Эргүүлэлт: Geo.append(phi = −rot·π/180) ба Object3D.rotation.y-тэй ижил томьёо */
export function rotLocal(x: number, z: number, rotDeg: number): { x: number; z: number } {
  const phi = (-rotDeg * Math.PI) / 180, c = Math.cos(phi), s = Math.sin(phi);
  return { x: x * c + z * s, z: -x * s + z * c };
}

/** Барилгын лабораторийн хэмжээ дэлхийн тэнхлэгт: rot = ±90 бол w, d солигдоно */
export function worldSize(e: TownEntry, f: LabFootprint): { w: number; d: number } {
  const q = Math.abs(((e.rot ?? 0) % 180 + 180) % 180);
  return q === 90 ? { w: f.d, d: f.w } : { w: f.w, d: f.d };
}

/** Барилгын (x, z)-ээр лабораторийн загварын эхлэл цэг (нийлмэл талбайн голыг тааруулахад dx, dz) */
export function labOrigin(e: TownEntry, b: { x: number; z: number }): { x: number; z: number } {
  const o = rotLocal(e.dx ?? 0, e.dz ?? 0, e.rot ?? 0);
  return { x: b.x + o.x, z: b.z + o.z };
}

/** Хаалганы гаднах цэг дэлхийд (лабораторийн үүд). Лабораторийн барилгагүй бол null */
export function labDoorPoint(b: { id?: string; x: number; z: number }): { x: number; z: number } | null {
  const e = b.id ? townEntry(b.id) : null;
  if (!e || e.type === 'public' && !B.public.kinds[e.kind!]) return null;
  const f = entryFootprint(e), o = labOrigin(e, b), r = rotLocal(f.door.x, f.door.z, e.rot ?? 0);
  return { x: o.x + r.x, z: o.z + r.z };
}

// ---------- Хашаа байшин (lab: buildHouse + khashaa.houseSlot) ----------
/** Байшингийн хаалганы цэг байшингийн локал координатад (үүдний амбаарын гадна), хэмжээ w × d */
export function houseFootprint(kind: string): { w: number; d: number; door: { x: number; z: number } } {
  const K = B.house[kind], Q = K.porch, St = K.step, stand: number = B.doorStandOff, hw = K.w / 2, hd = K.d / 2;
  const phi: number = { front: 0, east: Math.PI / 2, west: -Math.PI / 2 }[Q.side as 'front' | 'east' | 'west'];
  const [tx, tz] = { front: [Q.x, hd], east: [hw, Q.z], west: [-hw, Q.z] }[Q.side as 'front' | 'east' | 'west'];
  let lx: number, lz: number;
  if (Q.doorFace === 'out') { lx = 0; lz = Q.d + St.d + stand; }
  else { const sx = Q.doorFace === 'right' ? 1 : -1; lx = sx * (Q.w / 2 + St.d + stand); lz = Q.d / 2; }
  const c = Math.cos(phi), s = Math.sin(phi);
  return { w: K.w, d: K.d, door: { x: lx * c + lz * s + tx, z: -lx * s + lz * c + tz } };
}

/** Хашааны локал: байшин хойд (−z) буланд — khashaa.houseSlot */
export function houseSlot(plotW: number, plotD: number, houseW: number, houseD: number): { x: number; z: number } {
  const K = B.khashaa;
  return { x: -(plotW / 2 - houseW / 2 - K.houseSide), z: -plotD / 2 + houseD / 2 + K.houseGap };
}

export interface PlotLab { house: string; roofColor?: string }
export const townPlots = (): Record<string, PlotLab> => B.town.plots as Record<string, PlotLab>;

/** Хашааны хаалганы чиглэл → render-ийн эргэлт (Geo.append phi): s 0, n π, e π/2, w −π/2. Нүүр нь +Z (локал) */
export const GATE_PHI: Record<'n' | 's' | 'e' | 'w', number> = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 };

/** Тусгай хашааны гол байшин: хашааны төв, хаалганы чиглэл → дэлхийн төв, хэмжээ (тэнхлэгт зэрэгцсэн), хаалганы цэг */
export function plotHouseLab(plot: { id: string; x: number; z: number; w: number; d: number }, gate: 'n' | 's' | 'e' | 'w'):
  { house: { x: number; z: number; w: number; d: number }; door: { x: number; z: number }; kind: string } | null {
  const lab = townPlots()[plot.id];
  if (!lab) return null;
  const vertical = gate === 'e' || gate === 'w';
  const pw = vertical ? plot.d : plot.w, pd = vertical ? plot.w : plot.d;   // хашааны локал w, d
  const hf = houseFootprint(lab.house), s = houseSlot(pw, pd, hf.w, hf.d);
  const phi = GATE_PHI[gate], c = Math.cos(phi), sn = Math.sin(phi);
  const toWorld = (x: number, z: number): { x: number; z: number } => ({ x: plot.x + x * c + z * sn, z: plot.z - x * sn + z * c });
  const ctr = toWorld(s.x, s.z), door = toWorld(s.x + hf.door.x, s.z + hf.door.z);
  return { house: { ...ctr, w: vertical ? hf.d : hf.w, d: vertical ? hf.w : hf.d }, door, kind: lab.house };
}
