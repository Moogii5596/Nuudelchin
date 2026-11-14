/**
 * Бэлчээрийн тор: ургалт, доройтол, чанар.
 * grazing-livestock.md §3–5, mvp-spec.md §7.
 *
 * Нүд бүр: бэлчээрийн төрөл + biomass (0–1, тухайн төрлийн дээд хэмжээтэй харьцуулсан).
 * Бууцны доройтол (0–1) нь бууц бүрт нэг тоо бөгөөд ургалт, чанарыг бууруулна.
 */
import type { CampConfig, GameConfig, Season, WaterShape } from '../config';
import type { Rng } from '../rng';
import { riverZ } from '../terrain';

export interface GrassGrid {
  n: number;           // нэг талын нүдний тоо
  cell: number;        // нүдний хэмжээ (м)
  half: number;        // газрын хагас өргөн (м)
  typeIds: string[];   // төрлийн нэрс (type[] эндээс индексээр заана)
  type: number[];      // нүд бүрийн төрлийн индекс
  biomass: number[];   // нүд бүрийн өвс 0–1
  access?: number[];   // төрөл бүрийн цасан доорх өвсийг идэх боломж 0–1 (M5.5; байхгүй бол 1)
}

/** Байрлалаас үл хамаарах тогтмол «санамсаргүй» шуугиан (-1..1). rng зарцуулахгүй. */
function hashNoise(ix: number, iz: number, salt: number): number {
  let h = (ix * 374761393 + iz * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return ((h >>> 0) / 4294967296) * 2 - 1;
}

export function buildGrid(cfg: GameConfig, campId: string, degrade: number, rng: Rng, level = 0.85): GrassGrid {
  const camp = cfg.camps.camps[campId] as CampConfig;
  const n = cfg.pasture.grid.cells;
  const cell = cfg.pasture.grid.cellSize;
  const half = (n * cell) / 2;
  const typeIds = Object.keys(cfg.pasture.types);
  const salt = rng.int(1, 1_000_000);
  const type = new Array<number>(n * n);
  const biomass = new Array<number>(n * n);
  for (let iz = 0; iz < n; iz++) {
    for (let ix = 0; ix < n; ix++) {
      const x = -half + (ix + 0.5) * cell;
      const z = -half + (iz + 0.5) * cell;
      // Бүсийн хил тэгш дугуй биш байхаар шуугиан нэмнэ
      const r = Math.hypot(x, z) + hashNoise(ix >> 3, iz >> 3, salt) * 8;
      let tId = camp.rings[camp.rings.length - 1]![1];
      for (const [outer, id] of camp.rings) {
        if (r < outer) {
          tId = id;
          break;
        }
      }
      const i = iz * n + ix;
      type[i] = typeIds.indexOf(tId);
      biomass[i] = Math.min(1, Math.max(0.05, (level + 0.15 * (level / 0.85) * hashNoise(ix, iz, salt + 1)) * grassCapacity(cfg, degrade)));
    }
  }
  return { n, cell, half, typeIds, type, biomass };
}

export function cellIndex(g: GrassGrid, x: number, z: number): number {
  const ix = Math.floor((x + g.half) / g.cell);
  const iz = Math.floor((z + g.half) / g.cell);
  if (ix < 0 || iz < 0 || ix >= g.n || iz >= g.n) return -1;
  return iz * g.n + ix;
}

export function typeIdOf(g: GrassGrid, i: number): string {
  return g.typeIds[g.type[i] ?? 0] ?? 'steppe';
}

/** Төрөл бүрийн тухайн улирлын чанар (ургамлын хольцын жигнэсэн дундаж) × (1 − доройтлын торгууль) */
export function typeQualities(cfg: GameConfig, degrade: number, season: Season = 'summer'): Record<string, number> {
  const out: Record<string, number> = {};
  const pen = 1 - cfg.pasture.degradation.qualityPenalty * degrade;
  for (const [id, t] of Object.entries(cfg.pasture.types)) {
    let q = 0;
    for (const [sp, share] of Object.entries(t.mix)) q += share * (cfg.pasture.species[sp]?.quality[season] ?? 0);
    out[id] = q * pen;
  }
  return out;
}

/** Нүдний бодит идэж болох өвс (дээд хэмжээгээр, цасан доорх бол access-ээр үржүүлсэн) */
export function absBiomass(cfg: GameConfig, g: GrassGrid, i: number): number {
  const ti = g.type[i] ?? 0;
  const t = cfg.pasture.types[g.typeIds[ti] ?? 'steppe'];
  return (g.biomass[i] ?? 0) * (t?.maxBiomass ?? 0) * (g.access ? g.access[ti] ?? 1 : 1);
}

export function grassHeightCm(cfg: GameConfig, g: GrassGrid, i: number): number {
  const t = cfg.pasture.types[typeIdOf(g, i)];
  return (g.biomass[i] ?? 0) * (t?.heightCm ?? 0);
}

/** Доройтсон бууцны өвсний дээд хэмжээ (даац), 0–1 */
export function grassCapacity(cfg: GameConfig, degrade: number): number {
  return 1 - cfg.pasture.degradation.capacityPenalty * degrade;
}

/**
 * Өдрийн ургалт: Δb = r × b × (1 − b / K) (mvp-spec.md §7.2–7.3).
 * Доройтол ургах хурд r-ийг ба дээд хэмжээ K-г бууруулна: доройтсон бууцанд өвс сийрэгжиж намсна (M4).
 */
export function dailyRegrowth(cfg: GameConfig, g: GrassGrid, degrade: number): void {
  const r = cfg.pasture.regrowthR * (1 - cfg.pasture.degradation.growthPenalty * degrade);
  const K = grassCapacity(cfg, degrade);
  for (let i = 0; i < g.biomass.length; i++) {
    const b = Math.max(g.biomass[i] ?? 0, 0.02); // үндэс үлддэг тул бүрэн тэглэхгүй
    g.biomass[i] = Math.min(1, Math.max(0.02, b + r * b * (1 - b / K)));
  }
}

/**
 * Бууцны доройтол: одоогийн бууцанд ачааллаар нэмэгдэж, бусад бууцанд сэргэнэ.
 * load = сүргийн хонин толгой / бууцны даац.
 */
export function dailyCampDegrade(cfg: GameConfig, camps: Record<string, { degrade: number; daysSpent: number }>, currentId: string, sheepUnits: number): void {
  const d = cfg.pasture.degradation;
  for (const [id, c] of Object.entries(camps)) {
    if (id === currentId) {
      c.degrade = Math.min(1, c.degrade + d.gainPerDayAtCapacity * (sheepUnits / d.campCapacitySheepUnits));
      c.daysSpent += 1;
    } else {
      c.degrade = Math.max(0, c.degrade - d.recoverPerDayWhenAway);
    }
  }
}

/** Хамгийн ойрын усны цэг */
export function nearestWater(shape: WaterShape, x: number, z: number): { x: number; z: number } {
  if (shape.kind === 'lineZ') return { x, z: riverZ(shape, x) };
  const dx = x - shape.x, dz = z - shape.z;
  const d = Math.hypot(dx, dz) || 1;
  const r = Math.min(shape.r, d);
  return { x: shape.x + (dx / d) * r, z: shape.z + (dz / d) * r };
}

/** Бууцны дундаж өвс (тайланд) */
export function averageBiomass(g: GrassGrid, radius: number): number {
  let sum = 0, n = 0;
  for (let iz = 0; iz < g.n; iz++) {
    for (let ix = 0; ix < g.n; ix++) {
      const x = -g.half + (ix + 0.5) * g.cell, z = -g.half + (iz + 0.5) * g.cell;
      if (x * x + z * z > radius * radius) continue;
      sum += g.biomass[iz * g.n + ix] ?? 0;
      n++;
    }
  }
  return n ? sum / n : 0;
}
