/**
 * Улирал, цас, өвс тэжээл, хүйтэн (M5.5 — seasons-camps.md, data/seasons.json).
 *
 * 1 жил = time.animalYearDays өдөр (зун → намар → өвөл → хавар). Тоглоом зунаас эхэлнэ.
 * Бууц бүр өөрийн цасны зузаантай: өвөрт цас хурдан хайлж өвөл бэлчинэ, арт цас удаан тогтож
 * доор нь өвс хадгалагдана (хавар гарч ирнэ), энгэр өвөл цасанд дарагдана.
 * Цас өвсийг дарж идэх боломжийг (access) бууруулна. Ойтой бэлчээрт (уулын ар) модны доор цас нимгэн.
 * Одоо байгаа бууцны өвсийг тор (state.grass), бусад бууцных нь нэг дундаж тоо (camps[id].grass).
 */
import type { GameConfig, Season } from '../config';
import type { Animal, GameState } from '../state';
import type { GrassGrid } from './pasture';
import { grassCapacity } from './pasture';
import { sheepUnits } from './animals';

/** Жилийн доторх өдөр (0 … animalYearDays−1). 1-р өдөр = зуны эхэн */
export function yearDay(cfg: GameConfig, day: number): number {
  return (((day - 1) % cfg.time.animalYearDays) + cfg.time.animalYearDays) % cfg.time.animalYearDays;
}

/** Улирлын эхлэх жилийн өдөр */
export function seasonStart(cfg: GameConfig, s: Season): number {
  let d = 0;
  for (const k of cfg.seasons.order) {
    if (k === s) return d;
    d += cfg.seasons.days[k];
  }
  return 0;
}

export function seasonOf(cfg: GameConfig, day: number): Season {
  let yd = yearDay(cfg, day);
  for (const k of cfg.seasons.order) {
    if (yd < cfg.seasons.days[k]) return k;
    yd -= cfg.seasons.days[k];
  }
  return cfg.seasons.order[0]!;
}

/** Улирлын хэд дэх өдөр (1-ээс) ба нийт өдөр */
export function seasonProgress(cfg: GameConfig, day: number): { season: Season; dayOf: number; days: number } {
  const season = seasonOf(cfg, day);
  return { season, dayOf: yearDay(cfg, day) - seasonStart(cfg, season) + 1, days: cfg.seasons.days[season] };
}

/** Тоглоомын жил (1-ээс) */
export function yearOf(cfg: GameConfig, day: number): number {
  return Math.floor((day - 1) / cfg.time.animalYearDays) + 1;
}

/** Байрлалаас үл хамаарах тогтмол «санамсаргүй» тоо 0..1 (өдөр бүрийн цасны хэмжээнд; тэнцвэрийн rng-д нөлөөлөхгүй) */
function dayNoise(seed: number, day: number): number {
  let h = (seed ^ Math.imul(day + 101, 2654435761)) | 0;
  h = Math.imul(h ^ (h >>> 15), 2246822519);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}

/** Цасан доорх өвсийг идэх боломж 0–1 (бэлчээрийн төрлөөр: ойд цас нимгэн) */
export function snowAccess(cfg: GameConfig, snowCm: number, typeId: string): number {
  const s = cfg.seasons.snow;
  const eff = snowCm * (s.forestTypeMult[typeId] ?? 1);
  return Math.max(0, Math.min(1, 1 - eff / s.blockCm));
}

/** Одоогийн бууцны торонд төрөл бүрийн access-ийг тохируулна */
export function applyAccess(cfg: GameConfig, g: GrassGrid, snowCm: number): void {
  g.access = g.typeIds.map((id) => snowAccess(cfg, snowCm, id));
}

/** Бууц бүрийн дундаж access (тайлан, UI) — ойгүй задгай бэлчээрээр */
export function campAccess(cfg: GameConfig, snowCm: number): number {
  return snowAccess(cfg, snowCm, 'steppe');
}

/** Өдрийн цас: бүх бууцанд орж, хайлна (өглөө 06:00) */
export function dailySnow(cfg: GameConfig, state: GameState): void {
  const season = seasonOf(cfg, state.time.day);
  const s = cfg.seasons.snow;
  const k = 0.3 + 1.4 * dayNoise(state.seed, state.time.day);   // өдөр бүр өөр (дунджаар 1)
  for (const [id, c] of Object.entries(state.camps)) {
    const cc = s.camps[id] ?? { fall: 1, melt: {} };
    const fall = s.fallCmPerDay[season] * cc.fall * k;
    const melt = s.meltCmPerDay[season] * (cc.melt[season] ?? 1);
    c.snow = Math.max(0, (c.snow ?? 0) + fall - melt);
  }
  applyAccess(cfg, state.grass, state.camps[state.campId]?.snow ?? 0);
}

/**
 * Одоогийн бууцны өвс улирлаар ургах/хатах (dailyRegrowth-ийн оронд):
 * зун хурдан, намар удаан, өвөл ургахгүй, хавар цас хайлсны дараа ургана.
 * Цасгүй задгай өвс өвөл хатаж багасна; цасан доорх өвс хадгалагдана.
 */
export function dailyGrass(cfg: GameConfig, state: GameState): void {
  const season = seasonOf(cfg, state.time.day);
  const g = state.grass;
  const camp = state.camps[state.campId]!;
  const degrade = camp.degrade;
  const se = cfg.seasons;
  const snow = camp.snow ?? 0;
  const growOk = snow < se.snow.growthSnowCm;
  const r = cfg.pasture.regrowthR * (1 - cfg.pasture.degradation.growthPenalty * degrade) * se.growth[season] * (growOk ? 1 : 0);
  const K = grassCapacity(cfg, degrade);
  const decay = se.exposedDecayPerDay[season];
  const acc = g.access ?? [];
  for (let i = 0; i < g.biomass.length; i++) {
    let b = Math.max(g.biomass[i] ?? 0, 0.02);
    if (r > 0) b = b + r * b * (1 - b / K);
    if (decay > 0) b -= b * decay * (acc[g.type[i] ?? 0] ?? 1);
    g.biomass[i] = Math.min(1, Math.max(0.02, b));
  }
}

/** Эзгүй бууцны дундаж өвс (тор байхгүй үед): ургах, хатах */
export function dailyAwayGrass(cfg: GameConfig, state: GameState): void {
  const season = seasonOf(cfg, state.time.day);
  const se = cfg.seasons;
  for (const [id, c] of Object.entries(state.camps)) {
    if (id === state.campId) continue;
    const snow = c.snow ?? 0;
    const K = grassCapacity(cfg, c.degrade);
    const r = cfg.pasture.regrowthR * (1 - cfg.pasture.degradation.growthPenalty * c.degrade) * se.growth[season] * (snow < se.snow.growthSnowCm ? 1 : 0);
    let b = Math.max(c.grass ?? 0.85, 0.02);
    if (r > 0) b = b + r * b * (1 - b / K);
    b -= b * se.exposedDecayPerDay[season] * campAccess(cfg, snow);
    c.grass = Math.min(1, Math.max(0.02, b));
  }
}

/** Мал саравчинд/хашаанд хоносон эсэх (night.ts → atHome-ийг дуудна) */
export type ShelterFn = (a: Animal) => boolean;

/**
 * Шөнийн хүйтэн (21:00): гадуур хоносон мал тарга алдана. Саравчтай бууцны хашаанд хоносон мал алдахгүй,
 * энгийн хашаанд хагас дутуу. Үхэр хэвтэр, адуу гадаа — үхэр, адуу хүйтэнд тэсвэртэй (×0.5).
 */
export function coldNight(cfg: GameConfig, state: GameState, sheltered: ShelterFn): number {
  const season = seasonOf(cfg, state.time.day);
  const base = cfg.seasons.cold.conditionLossPerNight[season];
  if (!base) return 0;
  const shed = Boolean(cfg.camps.camps[state.campId]?.shed);
  let hit = 0;
  for (const a of state.animals) {
    if (a.riding) continue;
    let k = 1;
    if (sheltered(a)) k = shed ? cfg.seasons.cold.shedMult : cfg.seasons.cold.penMult;
    if (a.species === 'cow' || a.species === 'horse') k *= 0.5;
    if (k <= 0) continue;
    a.condition = Math.max(0, a.condition - base * k);
    hit++;
  }
  return hit;
}

/**
 * Боодол өвс (20:00, өдрийн тооцооноос өмнө): өвөл, хавар идэш дутсан малд бууцны овоонооос өгнө.
 * 1 боодол = sheepDaysPerBale хонин толгой·өдөр. Буцаах: өгсөн боодлын тоо.
 */
export function feedHay(cfg: GameConfig, state: GameState): number {
  const h = cfg.seasons.hay;
  const season = seasonOf(cfg, state.time.day);
  if (!h.feedSeasons.includes(season)) return 0;
  const camp = state.camps[state.campId]!;
  let hay = camp.hay ?? 0;
  if (hay <= 1e-9) return 0;
  let used = 0;
  // Хамгийн их дутсанаас нь эхэлж өгнө
  const hungry = state.animals.filter((a) => !a.riding && a.gutFill < h.fillTo).sort((a, b) => a.gutFill - b.gutFill);
  for (const a of hungry) {
    const need = h.fillTo - a.gutFill;
    const bales = (need * sheepUnits(a, cfg.animals)) / h.sheepDaysPerBale;
    const give = Math.min(bales, hay);
    if (give <= 1e-9) break;
    const fill = (give / bales) * need;
    a.gutFill += fill;
    a.dietSum += fill * h.quality;
    hay -= give;
    used += give;
  }
  camp.hay = hay;
  return used;
}

/**
 * Эм мал аль жилийн өдөр төллөх вэ (cycleOffset-оос тогтмол):
 * springShare нь хавар, бусад нь өвлөөс бусад улиралд (хэрэглэгчийн шийдвэр: «дийлэн нь хавар»).
 */
export function birthYearDay(cfg: GameConfig, cycleOffset: number): number {
  const Y = cfg.time.animalYearDays;
  const se = cfg.seasons;
  const u = (((cycleOffset % Y) + Y) % Y) / Y;
  if (u < se.breeding.springShare) {
    const s0 = seasonStart(cfg, 'spring');
    return s0 + Math.floor((u / se.breeding.springShare) * se.days.spring);
  }
  // Бусад: хавар, өвлөөс бусад улирлын өдрүүд
  const days: number[] = [];
  for (const s of se.order) {
    if (s === 'spring' || se.breeding.noBirth.includes(s)) continue;
    const s0 = seasonStart(cfg, s);
    for (let d = 0; d < se.days[s]; d++) days.push(s0 + d);
  }
  if (!days.length) return seasonStart(cfg, 'spring');
  const v = (u - se.breeding.springShare) / (1 - se.breeding.springShare);
  return days[Math.min(days.length - 1, Math.floor(v * days.length))]!;
}

/** Өнөөдрийн цас орох хэмжээ (см) — тухайн бууцанд (дүрслэлд: цас орж байна уу) */
export function snowfallToday(cfg: GameConfig, state: GameState, campId = state.campId): number {
  const season = seasonOf(cfg, state.time.day);
  const s = cfg.seasons.snow;
  const k = 0.3 + 1.4 * dayNoise(state.seed, state.time.day);
  return s.fallCmPerDay[season] * (s.camps[campId]?.fall ?? 1) * k;
}

/**
 * Дүрслэлийн улирлын өнгө (render): straw — өвс шаргалтах 0–1 (намар → өвөл, хавар ногоорно),
 * snow — одоогийн бууцны цасан бүрхүүл 0–1, snowing — өнөөдөр цас орж байна, winter — өвлийн уур амьсгал 0–1.
 */
export function seasonLook(cfg: GameConfig, state: GameState): { season: Season; straw: number; snow: number; snowing: boolean; winter: number } {
  const { season, dayOf, days } = seasonProgress(cfg, state.time.day);
  const t = (dayOf - 1 + (state.time.minute - cfg.time.dayStartMinute) / 1440) / days;   // улирлын явц 0–1
  let straw = 0, winter = 0;
  if (season === 'summer') straw = Math.max(0, t - 0.75) * 0.6;
  else if (season === 'autumn') straw = 0.2 + 0.65 * t;
  else if (season === 'winter') { straw = 0.9; winter = Math.min(1, 0.4 + t); }
  else { straw = 0.9 - 0.85 * Math.min(1, t * 1.3); winter = Math.max(0, 0.8 - t * 1.6); }
  const snowCm = state.camps[state.campId]?.snow ?? 0;
  const snow = Math.min(1, snowCm / 10);
  return { season, straw, snow, snowing: snowfallToday(cfg, state) > 1.2, winter };
}
