/**
 * Сүргийн шийдвэр (M4, хэрэглэгчийн дүрэм 2026-11-13).
 *
 * - Ойрхон (linkRadius) байгаа нэг төрлийн мал нэг сүрэг (хонь ямаа хамт). Сүрэг хоёр хуваагдвал хоёр сүрэг болно.
 * - Ус: шийдвэрийг сүргийн ДУНДАЖ цангалтаар гаргана. Нэг хонь цангахад сүрэг хөдлөхгүй.
 *     · Сүрэг уснаас ойр (nearWaterDistance) бол мал нэг нэгээрээ очиж ууна (grazing.ts → decide).
 *     · Хол бол дундаж цангалт босгод хүрэхэд сүрэг бүхэлдээ бөөгнөрч ус руу явна.
 * - Өлсгөлөн: сүргийн дундаж идэш өдрийн явцаас хоцорч, ойр орчмын өвс муудвал (poorScore)
 *   сүрэг бүхэлдээ илүү сайн бэлчээр рүү нүүнэ (нэг мал ганцаараа хол явахгүй).
 *   Малчин тууж авчирсан бол settleMinutes хугацаанд тэндээ үлдэнэ.
 * - Малчин тууж байгаа ('driven'), эсвэл чоноос айж зугтаж байгаа ('flee') малтай сүрэг өөрөө шийдэхгүй.
 */
import type { GameConfig, Species, WaterShape } from '../config';
import type { Rng } from '../rng';
import type { Animal, GameState } from '../state';
import { riverZ, waterDistance } from '../terrain';
import { absBiomass, cellIndex, grassHeightCm, nearestWater, typeIdOf } from './pasture';

export interface Herd {
  key: Species;          // хонь ямаа = 'sheep'
  members: Animal[];
  x: number;             // төв
  z: number;
  thirst: number;        // дундаж цангалт 0–100
  gut: number;           // дундаж идэш 0–1
}

export const flockKey = (sp: Species): Species => (sp === 'goat' ? 'sheep' : sp);

/**
 * Сүргүүдийг олох: ойрхон нэг төрлийн мал нэг сүрэгт (холбоост бүрэлдэхүүн).
 * Газрыг linkRadius/2 хэмжээтэй нүдэнд хувааж, малтай хөрш нүднүүдийг холбоно — O(n).
 * (Хөрш нүдний мал хоорондоо ~linkRadius орчим зайтай тул ойролцоо хуваалт.)
 */
export function findHerds(state: GameState, linkRadius: number): Herd[] {
  const cell = linkRadius / 2;
  const KEYS: Species[] = ['sheep', 'cow', 'horse'];
  const cellKey = (k: number, ix: number, iz: number): number => (k * 4096 + (ix + 2048)) * 4096 + (iz + 2048);
  const cells = new Map<number, number>();      // нүдний түлхүүр → нүдний дугаар
  const members: Animal[][] = [];
  const coords: [number, number, number][] = [];
  for (const a of state.animals) {
    if (a.riding) continue;
    const k = KEYS.indexOf(flockKey(a.species));
    const ix = Math.floor(a.x / cell), iz = Math.floor(a.z / cell);
    const key = cellKey(k, ix, iz);
    let ci = cells.get(key);
    if (ci === undefined) {
      ci = members.length;
      cells.set(key, ci);
      members.push([]);
      coords.push([k, ix, iz]);
    }
    members[ci]!.push(a);
  }
  const n = members.length;
  const parent = new Int32Array(n);
  for (let i = 0; i < n; i++) parent[i] = i;
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]!]!;
      i = parent[i]!;
    }
    return i;
  };
  for (let i = 0; i < n; i++) {
    const [k, ix, iz] = coords[i]!;
    for (const [dx, dz] of [[1, 0], [0, 1], [1, 1], [1, -1]] as const) {
      const j = cells.get(cellKey(k, ix + dx, iz + dz));
      if (j === undefined) continue;
      const ri = find(i), rj = find(j);
      if (ri !== rj) parent[rj] = ri;
    }
  }
  const groups = new Map<number, Herd>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    let h = groups.get(r);
    if (!h) {
      h = { key: KEYS[coords[i]![0]]!, members: [], x: 0, z: 0, thirst: 0, gut: 0 };
      groups.set(r, h);
    }
    for (const a of members[i]!) {
      h.members.push(a);
      h.x += a.x;
      h.z += a.z;
      h.thirst += a.thirst;
      h.gut += a.gutFill;
    }
  }
  const out = [...groups.values()];
  for (const h of out) {
    const k = h.members.length;
    h.x /= k;
    h.z /= k;
    h.thirst /= k;
    h.gut /= k;
  }
  return out;
}

/** Ус уух цэг: голын эрэг (гольдрол руу орохгүй), булаг/горхины зах */
export function drinkPoint(cfg: GameConfig, shape: WaterShape, x: number, z: number): { x: number; z: number } {
  if (shape.kind === 'lineZ') {
    const rz = riverZ(shape, x);
    const off = cfg.pasture.grazing.herd.drinkBankOffset;
    return { x, z: rz + (z >= rz ? off : -off) };
  }
  return nearestWater(shape, x, z);
}

/** Нэг нүдний бэлчээрийн оноо: чанар^k × идэж болох өвс (тухайн төрлийн малд хэт намхан өвсийг тоолохгүй) */
export function cellScore(cfg: GameConfig, state: GameState, quality: Record<string, number>, species: Species, x: number, z: number): number {
  const g = state.grass;
  const i = cellIndex(g, x, z);
  if (i < 0) return 0;
  if (grassHeightCm(cfg, g, i) < cfg.animals.species[species].minGrassCm) return 0;
  return Math.pow(quality[typeIdOf(g, i)] ?? 0, cfg.pasture.grazing.qualityExponent) * absBiomass(cfg, g, i);
}

/** Цэгийн эргэн тойрны (5 цэг) дундаж оноо */
export function areaScore(cfg: GameConfig, state: GameState, quality: Record<string, number>, species: Species, x: number, z: number, r: number): number {
  return (
    (cellScore(cfg, state, quality, species, x, z) +
      cellScore(cfg, state, quality, species, x + r, z) +
      cellScore(cfg, state, quality, species, x - r, z) +
      cellScore(cfg, state, quality, species, x, z + r) +
      cellScore(cfg, state, quality, species, x, z - r)) /
    5
  );
}

/** Сүргийн хамгийн шаардлагатай төрөл (үхэр өндөр өвс хэрэгтэй) */
function pickySpecies(h: Herd): Species {
  return h.members.some((a) => a.species === 'goat') && !h.members.some((a) => a.species === 'sheep') ? 'goat' : h.key;
}

export interface FlockCenter {
  x: number;
  z: number;
  n: number;
}

/**
 * Мал бүрийн нэгдэх төв (grazing.ts-ийн cohesion): мал өөрийн сүргийн төв рүү татагдана.
 * Цөөн малтай (тасарсан) сүрэг rejoinDistance дотор байгаа илүү том сүрэг рүүгээ нийлнэ.
 */
export function cohesionCenters(herds: Herd[], rejoinDistance: number): Map<number, FlockCenter> {
  const totals = new Map<Species, number>();
  for (const h of herds) totals.set(h.key, (totals.get(h.key) ?? 0) + h.members.length);
  const out = new Map<number, FlockCenter>();
  for (const h of herds) {
    const n = h.members.length;
    let c: FlockCenter = { x: h.x, z: h.z, n };
    if (n < Math.max(3, 0.15 * (totals.get(h.key) ?? 0))) {
      let bestD = rejoinDistance;
      for (const o of herds) {
        if (o === h || o.key !== h.key || o.members.length < n) continue;
        const d = Math.hypot(o.x - h.x, o.z - h.z);
        if (d < bestD) {
          bestD = d;
          c = { x: o.x, z: o.z, n: o.members.length + n };
        }
      }
    }
    for (const a of h.members) out.set(a.id, c);
  }
  return out;
}

export interface HerdDecision {
  kind: 'water' | 'trek';
  key: Species;
  n: number;
  x: number;
  z: number;
}

/**
 * Сүрэг бүрт ус/бэлчээрийн шийдвэр (Sim нь decideEverySteps алхам тутам дуудна).
 * Гаргасан шийдвэрүүдийг буцаана (тест, дүрслэлд).
 */
export function herdDecide(cfg: GameConfig, state: GameState, rng: Rng, quality: Record<string, number>, herds: Herd[]): HerdDecision[] {
  const h = cfg.pasture.grazing.herd;
  const camp = cfg.camps.camps[state.campId];
  if (!camp) return [];
  const out: HerdDecision[] = [];
  const seek = cfg.animals.thirst.seekWaterAt ?? 50;
  const dayLen = cfg.time.dayEndMinute - cfg.time.dayStartMinute;
  const progress = Math.max(0, (state.time.minute - cfg.time.dayStartMinute) / dayLen);
  const worldR = cfg.player.worldRadius - 6;

  for (const hd of herds) {
    const m = hd.members;
    if (m.some((a) => a.mode === 'driven' || a.mode === 'flee')) continue;

    // 1) Ус — сүргийн дундаж цангалтаар
    const dW = waterDistance(camp.waterShape, hd.x, hd.z);
    if (hd.thirst >= seek && dW > h.nearWaterDistance) {
      if (!m.every((a) => a.mode === 'drink')) {
        const w = drinkPoint(cfg, camp.waterShape, hd.x, hd.z);
        for (const a of m) {
          const p = drinkPoint(cfg, camp.waterShape, w.x + (a.x - hd.x) * h.waterBunch, w.z + (a.z - hd.z) * h.waterBunch);
          a.mode = 'drink';
          a.tx = p.x;
          a.tz = p.z;
        }
        out.push({ kind: 'water', key: hd.key, n: m.length, x: w.x, z: w.z });
      }
      continue;
    }
    if (m.some((a) => a.mode === 'drink' || a.mode === 'trek')) continue;

    // 2) Өлсгөлөн — сүргийн дундаж идэш өдрийн явцаас хоцорсон бол
    if (hd.gut >= cfg.pasture.grazing.hungryPace * progress) continue;
    if (m.some((a) => state.step - a.drivenAt < h.settleMinutes)) continue;   // малчин тууж авчирсан газраа үлдэнэ
    const sp = pickySpecies(hd);
    const here = areaScore(cfg, state, quality, sp, hd.x, hd.z, h.localRadius);
    if (here >= h.poorScore) continue;
    let best = here * h.trekGain, bx = NaN, bz = NaN;
    for (let k = 0; k < h.trekSamples; k++) {
      const ang = rng.range(0, Math.PI * 2);
      const r = rng.range(h.trekMinDistance, h.trekMaxDistance);
      const x = hd.x + Math.cos(ang) * r, z = hd.z + Math.sin(ang) * r;
      if (Math.hypot(x, z) > Math.min(worldR, h.maxHomeDistance[sp] ?? worldR)) continue;
      if (waterDistance(camp.waterShape, x, z) < h.drinkBankOffset + 4) continue;
      // Хол газар бага зэрэг торгуультай (замд цаг зарцуулна)
      const s = areaScore(cfg, state, quality, sp, x, z, h.localRadius) * (1 - (r / h.trekMaxDistance) * 0.25);
      if (s > best) {
        best = s;
        bx = x;
        bz = z;
      }
    }
    if (Number.isNaN(bx)) continue;
    for (const a of m) {
      a.mode = 'trek';
      a.tx = bx + (a.x - hd.x) * h.trekSpread + rng.range(-1.5, 1.5);
      a.tz = bz + (a.z - hd.z) * h.trekSpread + rng.range(-1.5, 1.5);
    }
    out.push({ kind: 'trek', key: hd.key, n: m.length, x: bx, z: bz });
  }
  return out;
}
