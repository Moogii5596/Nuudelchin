/**
 * V6.2 нийтийн барилгын дотор талын тавилгын саад (Three.js-гүй): сургуулийн анги, дуган. Тоо нь `data/buildings.json` `interior.public`
 * (лабораторийн PUBLIC_INTERIOR), байрлал нь өрөөний `spots` (data/interiors.json) — render/building/publicInterior.ts-ийн тавилгатай ижил.
 * gerLayout.ts, houseLayout.ts-тэй ижил арга: өрөөний координатад LayoutBox[].
 */
import buildings from '../../../../data/buildings.json';
import type { LayoutBox } from './gerLayout';

type Obj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const PUB = (buildings as unknown as Obj).interior.public as Obj;

interface Spot { id: string; kind: string; x: number; z: number }
interface RoomLike { w?: number; d?: number; spots: Spot[] }

export const publicInteriorKinds = (): string[] => Object.keys(PUB).filter((k) => k !== 'style');

/** Тавилгын саад: [x0, z0, x1, z1] */
export function publicBlockers(kind: string, room: RoomLike): LayoutBox[] {
  const T = PUB[kind];
  if (!T) throw new Error(`publicLayout: "${kind}" дотор тал алга`);
  const boxes: LayoutBox[] = [];
  const box = (x0: number, z0: number, x1: number, z1: number): void => { boxes.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, hw: Math.abs(x1 - x0) / 2, hd: Math.abs(z1 - z0) / 2, phi: 0 }); };
  const hd = (room.d ?? 0) / 2;
  const spot = (id: string): Spot => { const s = room.spots.find((p) => p.id === id); if (!s) throw new Error(`publicLayout: ${kind} spot "${id}" алга`); return s; };
  if (kind === 'school') {
    const K = T.teacherDesk, s = spot('teacher_desk');
    box(s.x - K.w / 2, s.z - K.d / 2, s.x + K.w / 2, s.z + K.d / 2);                       // багшийн ширээ
    box(s.x - 0.2, s.z - 0.75, s.x + 0.2, s.z - 0.35);                                      // багшийн сандал
    const D = T.desks;
    for (const z of D.rows) for (const x of D.cols) box(x - D.w / 2, z - D.d / 2, x + D.w / 2, z + 0.42 + 0.19);   // хоёр хүний ширээ + сандал
    const b = T.bookcase; box(b.x - 0.2, b.z - b.w / 2, b.x + 0.2, b.z + b.w / 2);          // номын шүүгээ
  } else if (kind === 'temple') {
    const A = T.altar, a = spot('altar');
    box(a.x - A.w / 2, -hd, a.x + A.w / 2, -hd + A.d);                                      // тахил
    const c = spot('donation'); box(c.x - 0.3, c.z - 0.22, c.x + 0.3, c.z + 0.22);          // хандивын хайрцаг
    const R = T.rows;
    for (const s of room.spots.filter((p) => p.kind === 'seat')) {                          // олбог суудал, ширээ
      const f = s.x < 0 ? 1 : -1, x1 = s.x + f * (R.tableOff + 0.2);
      box(Math.min(s.x - 0.38, x1), s.z - R.len / 2, Math.max(s.x + 0.38, x1), s.z + R.len / 2);
    }
    const h = spot('lama_head'); box(h.x - 0.5, h.z - 0.48, h.x + 1.0, h.z + 0.48);        // ширээт ламын суудал
    const dr = spot('drum'); box(dr.x - 0.36, dr.z - 0.46, dr.x + 0.36, dr.z + 0.46);      // хэнгэрэг
    const P = T.pillars, s2 = P.size / 2 + 0.05;
    for (const sx of [-1, 1]) for (const z of P.z) box(sx * P.x - s2, z - s2, sx * P.x + s2, z + s2);   // багана
    const w = spot('prayer_wheel'); box(w.x - 0.5, w.z - 0.5, w.x + 0.5, w.z + 0.5);       // хүрд
  }
  return boxes;
}
