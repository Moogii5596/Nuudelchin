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
