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
  } else if (kind === 'admin') {
    const hw = (room.w ?? 0) / 2;
    const g = spot('desk_w'), K = T.govDesk;
    box(g.x - K.w / 2, g.z - K.d / 2 - 0.8, g.x + K.w / 2, g.z + K.d / 2);                  // засаг даргын ширээ + сандал
    box(g.x - 1.55, -hd + 0.25, g.x - 1.15, -hd + 0.65);                                     // төрийн далбаа
    const c = spot('counter'), C = T.counter;
    box(c.x - C.w / 2 - 0.03, -hd, c.x + C.w / 2 + 0.03, c.z + C.d / 2 + 0.06);             // зээлийн лангуу + ажилтны тал (шүүгээ, сандал)
    const e = spot('desk_e'), P = T.policeDesk;
    box(e.x - P.w / 2, e.z - P.d / 2 - 0.75, e.x + P.w / 2, e.z + P.d / 2);                 // цагдаагийн ширээ + сандал
    for (const id of ['bench_w', 'bench_e']) { const b = spot(id); box(b.x - 1.04, b.z - 0.3, b.x + 1.04, b.z + 0.3); }   // хүлээлгийн сандал (4)
    for (const sx of [-1, 1]) box(sx * hw - (sx > 0 ? 0.6 : -0.6) , hd - 0.7, sx * hw - (sx > 0 ? 0.2 : -0.2), hd - 0.1);   // булангийн мод
  } else if (kind === 'bank') {
    const hw = (room.w ?? 0) / 2;
    const c = spot('counter'), C = T.counter;
    box(c.x - C.w / 2 - 0.03, -hd, c.x + C.w / 2 + 0.03, c.z + C.d / 2 + 0.06);             // шилэн кассын лангуу + ажилтны тал
    const s = spot('safe'), S = T.safe, sx = Math.min(s.x, hw - S.w / 2 - 0.05);
    box(sx - S.w / 2, -hd, sx + S.w / 2, -hd + S.d + 0.05);                                  // сейф
    for (const id of ['bench_w', 'bench_e']) { const b = spot(id); box(b.x - 0.78, b.z - 0.3, b.x + 0.78, b.z + 0.3); }   // хүлээлгийн сандал (3)
    for (const [x, z] of [[-0.9, -1.0], [-0.9, 0.2], [0.9, 0.2], [0.9, -1.0]] as [number, number][]) box(x - 0.14, z - 0.14, x + 0.14, z + 0.14);   // дарааллын шон
    const f = spot('form_desk'); box(f.x - 0.3, f.z - 0.6, f.x + 0.3, f.z + 0.6);           // маягт бөглөх ширээ
    for (const sgn of [-1, 1]) box(sgn * hw - (sgn > 0 ? 0.6 : -0.6), hd - 0.7, sgn * hw - (sgn > 0 ? 0.2 : -0.2), hd - 0.1);   // булангийн мод
  } else if (kind === 'milk') {
    const K = T.counter;
    box(K.x - K.w / 2 - 0.03, -hd, K.x + K.w / 2 + 0.03, K.z + K.d / 2 + 0.03);             // хүлээн авагчийн лангуу + ажилтны тал
    const V = T.vat; box(V.x - V.r - 0.03, V.z - V.r - 0.03, V.x + V.r + 0.03, V.z + V.r + 0.2);   // сүүний сав
    const F = T.floorScale; box(F.x - F.w / 2, F.z - F.d / 2 - 0.1, F.x + F.w / 2, F.z + F.d / 2);   // ноосны шалны жин
    for (const [x = 0, z = 0] of T.sacks as number[][]) box(x - 0.4, z - 0.4, x + 0.4, z + 0.4);    // ноосны шуудай
    box(T.cans.x - 0.2, T.cans.z[0] - 0.2, T.cans.x + 0.2, T.cans.z[T.cans.z.length - 1] + 0.2);   // бидон
    const st = T.strainer; box(st.x - 0.4, st.z - 0.35, st.x + 0.4, st.z + 0.35);           // сүү шүүх ширээ
    const b = spot('bench'); box(b.x - 0.55, b.z - 0.28, b.x + 0.55, b.z + 0.28);           // хүлээлгийн сандал (2)
  }
  return boxes;
}
