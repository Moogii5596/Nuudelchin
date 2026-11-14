/**
 * Туслах малчид (M5, хэрэглэгчийн шийдвэр 2026-11-14).
 *
 * - Сумын төвийн ЦАЙНЫ ГАЗРААС хөлслөнө: ганц бие малчин (тоглогч байр авч өгнө) эсвэл айл (малчин + хүүхэд,
 *   өөрийн гэртэй, малгүй ирнэ).
 * - Насанд хүрсэн туслах = МАЛЧИН. Үүрэг: сүрэг хариулах (сайн бэлчээрт бэлчээх, чонын бүсээс эргүүлэх,
 *   тасарсан малыг хотлуулах), ЖОЛООЧ (тэрэг/машинаар сумын төв явж зарах), ОТОР (тасалсан малтай өөр бууцанд).
 * - Хүүхэд = ЦУГЛУУЛАГЧ: сүү, ноосыг түүж агуулахад хийнэ.
 * - Цалин сар бүр. Малаар урьдчилж төлж болно — тэр мал туслахынх болж (ownerId) өөр өнгөтэй, тоглогчийн
 *   зорилгын тоонд орохгүй, сүү ноос нь туслахынх. Мөнгө хүрэхгүй бол айлаараа, малтайгаа явна.
 */
import type { GameConfig, Species } from '../config';
import { Rng } from '../rng';
import type { Animal, GameState, ProductId, VehicleId } from '../state';
import { isNight } from '../clock';
import { salePrice, dailyConditionDelta, sheepUnits } from './animals';
import * as storage from './storage';
import { parkingSpot, productPrice, vehicleCfg } from './trip';
import { mapSpeedKmPerMin, sumId } from './travel';
import { scareWolf } from './wolves';
import { flockKey } from './herds';
import { homeSpot } from './night';
import { absBiomass, cellIndex, typeIdOf } from './pasture';

export type HelperKind = 'adult' | 'child';
export type HelperTask = 'herd' | 'drive' | 'otor' | 'collect';
export type HerdGroup = 'sheep' | 'cow' | 'horse';

export interface HelperTrip {
  vehicle: VehicleId;
  remaining: number;     // минут
  total: number;
  cargo: Partial<Record<ProductId, number>>;
}

export interface Helper {
  id: number;
  name: string;
  kind: HelperKind;
  sex: 'm' | 'f';
  familyId: number;      // айлын тэргүүний id (ганц бие бол өөрийн id)
  family: boolean;       // айлаар хөлсөлсөн (өөрийн гэртэй)
  task: HelperTask;
  herd: HerdGroup;
  wage: number;          // өдрийн цалин
  prepaid: number;       // малаар урьдчилж төлсөн (₮)
  x: number;
  z: number;
  heading: number;
  tx: number;
  tz: number;
  mode: 'work' | 'sleep' | 'away';
  carry: { product: ProductId; amount: number; age: number }[];
  trip: HelperTrip | null;
  lastPasture: number;   // сүүлд бэлчээр сольсон алхам
  homeDriven: number;    // орой сүргээ хот руу тууж эхэлсэн өдөр
}

export interface CandidateMember {
  name: string;
  kind: HelperKind;
  sex: 'm' | 'f';
}

export interface Candidate {
  id: number;
  family: boolean;
  members: CandidateMember[];
  wage: number;          // айлын нийт өдрийн цалин
}

export interface OtorGroup {
  helperId: number;
  campId: string;
  animals: Animal[];
  days: number;
}

/** Туслахын байр (майхан/гэр) ба айлын гэр — хотын ойролцоо */
export interface Dwelling {
  kind: 'familyGer' | 'helperTent' | 'helperGer';
  x: number;
  z: number;
  familyId?: number;
}

export interface HelpersState {
  list: Helper[];
  nextId: number;
  candidates: Candidate[];
  candidatesDay: number;
  otor: OtorGroup[];
  dwellings: Dwelling[];
  /** Худалдаачнаас авсан отрын майхан */
  otorTents: number;
}

export type HelperEvent =
  | { type: 'helperQuit'; names: string[]; reason: 'wage' | 'fired' }
  | { type: 'helperTrip'; name: string; income: number }
  | { type: 'otorLoss'; campId: string; species: Species };

export function newHelpersState(): HelpersState {
  return { list: [], nextId: 1, candidates: [], candidatesDay: -999, otor: [], dwellings: [], otorTents: 0 };
}

/** Байршлын цэгүүд (хотын төвөөс, м): айлын гэр, туслахын майхан/гэр */
const DWELLING_SLOTS: [number, number][] = [[-16, 12], [-18, -8], [-6, 22], [14, -30], [-28, 2], [4, 30]];

function freeSlot(state: GameState): { x: number; z: number } {
  const used = state.helpers.dwellings;
  for (const [x, z] of DWELLING_SLOTS) if (!used.some((d) => Math.hypot(d.x - x, d.z - z) < 1)) return { x, z };
  const k = used.length;
  return { x: -30 + k * 6, z: 30 };
}

/** Ганц бие туслахад авсан орны тоо ба эзэлсэн */
export function bedsTotal(cfg: GameConfig, state: GameState): number {
  const h = cfg.helpers.housing;
  return state.helpers.dwellings.reduce((s, d) => s + (d.kind === 'helperTent' ? h.helperTent.beds : d.kind === 'helperGer' ? h.helperGer.beds : 0), 0);
}
export function bedsUsed(state: GameState): number {
  return state.helpers.list.filter((x) => !x.family).length;
}

/** Туслахын байр нэмэх (Худалдаачнаас авсан) */
export function addDwelling(state: GameState, kind: 'helperTent' | 'helperGer'): void {
  const s = freeSlot(state);
  state.helpers.dwellings.push({ kind, x: s.x, z: s.z });
}

/** Отор явуулах боломжтой илүү майхан: гэртэй бол хуучин майхан + авсан отрын майхнууд − одоо отор дээр байгаа */
export function spareTents(state: GameState): number {
  const total = (state.home === 'ger' ? 1 : 0) + (state.helpers.otorTents ?? 0);
  return total - state.helpers.otor.length;
}

/** Туслахын гэр/байр (унтах газар) */
function homeOf(state: GameState, h: Helper): { x: number; z: number } {
  const d = state.helpers.dwellings.find((x) => (h.family ? x.familyId === h.familyId : x.kind !== 'familyGer'));
  return d ? { x: d.x + 3, z: d.z + 2 } : { x: 4, z: 6 };
}

// ======================= Цайны газар =======================

/** Цайны газрын нэр дэвшигчдийг шинэчлэх (refreshDays тутам, өөрийн seed-тэй — тэнцвэрийн RNG-д нөлөөлөхгүй) */
export function refreshCandidates(cfg: GameConfig, state: GameState): void {
  const t = cfg.helpers.teahouse;
  const hs = state.helpers;
  const day = state.time.day;
  if (hs.candidates.length && day - hs.candidatesDay < t.refreshDays) return;
  const rng = new Rng((state.seed ^ Math.imul(day + 17, 2654435761)) >>> 0);
  const n = rng.int(t.min, t.max);
  const W = cfg.helpers.wage;
  // Нэр давхардахгүй: ажиллаж буй туслахууд болон бусад нэр дэвшигчдийн нэрийг алгасна
  const used = new Set(hs.list.map((h) => h.name));
  const pick = (arr: string[]) => {
    const free = arr.filter((x) => !used.has(x));
    const from = free.length ? free : arr;
    const name = from[Math.floor(rng.next() * from.length)]!;
    used.add(name);
    return name;
  };
  hs.candidates = [];
  for (let i = 0; i < n; i++) {
    const family = rng.chance(t.familyShare);
    const members: CandidateMember[] = [];
    if (family) {
      const sex = rng.chance(0.75) ? 'm' : 'f';
      members.push({ name: pick(cfg.helpers.names[sex]), kind: 'adult', sex });
      if (rng.chance(0.35)) members.push({ name: pick(cfg.helpers.names[sex === 'm' ? 'f' : 'm']), kind: 'adult', sex: sex === 'm' ? 'f' : 'm' });
      members.push({ name: pick(cfg.helpers.names.child), kind: 'child', sex: rng.chance(0.5) ? 'm' : 'f' });
    } else {
      const sex = rng.chance(0.8) ? 'm' : 'f';
      members.push({ name: pick(cfg.helpers.names[sex]), kind: 'adult', sex });
    }
    const sum = members.reduce((s, m) => s + W[m.kind], 0);
    hs.candidates.push({ id: day * 10 + i, family, members, wage: Math.round((family ? sum * cfg.helpers.familyWageMult : sum) / 100) * 100 });
  }
  hs.candidatesDay = day;
}

/** Цайны газар (сумын төвийн 3D) */
export function nearTeahouse(cfg: GameConfig, state: GameState): boolean {
  const t = cfg.worldmap.sum3d.teahouse;
  return state.player.place === 'sum' && Math.hypot(state.player.x - t.x, state.player.z - t.z) <= t.r;
}

/** Хөлслөх. Алдаа бол тайлбар */
export function hire(cfg: GameConfig, state: GameState, candidateId: number, proximity: boolean): string | null {
  const hs = state.helpers;
  if (proximity && !nearTeahouse(cfg, state)) return 'Цайны газарт оч';
  const c = hs.candidates.find((x) => x.id === candidateId);
  if (!c) return 'Ийм хүн алга';
  if (!c.family && bedsUsed(state) + 1 > bedsTotal(cfg, state)) return 'Ганц бие туслахад байр хэрэгтэй — Худалдаачнаас туслахын майхан/гэр ав';
  const W = cfg.helpers.wage;
  const sum = c.members.reduce((s, m) => s + W[m.kind], 0);
  const familyId = hs.nextId;
  if (c.family) {
    const s = freeSlot(state);
    hs.dwellings.push({ kind: 'familyGer', x: s.x, z: s.z, familyId });
  }
  for (const m of c.members) {
    const id = hs.nextId++;
    const herdTaken = (g: HerdGroup) => hs.list.some((x) => x.task === 'herd' && x.herd === g);
    const h: Helper = {
      id,
      name: m.name,
      kind: m.kind,
      sex: m.sex,
      familyId,
      family: c.family,
      task: m.kind === 'child' ? 'collect' : 'herd',
      herd: !herdTaken('sheep') ? 'sheep' : !herdTaken('cow') ? 'cow' : 'horse',
      wage: Math.round((W[m.kind] / sum) * c.wage),
      prepaid: 0,
      x: 0,
      z: 0,
      heading: 0,
      tx: 0,
      tz: 0,
      mode: 'work',
      carry: [],
      trip: null,
      lastPasture: -1e9,
      homeDriven: 0,
    };
    hs.list.push(h);
    const home = homeOf(state, h);
    h.x = h.tx = home.x + (hs.list.length % 3);
    h.z = h.tz = home.z;
  }
  hs.candidates = hs.candidates.filter((x) => x !== c);
  return null;
}

/** Айлынх нь бүх гишүүн */
export function familyOf(state: GameState, h: Helper): Helper[] {
  return state.helpers.list.filter((x) => x.familyId === h.familyId);
}

/** Туслахыг (айлаар нь) гаргах: малаа авч явна */
function leave(state: GameState, familyId: number): string[] {
  const hs = state.helpers;
  const members = hs.list.filter((x) => x.familyId === familyId);
  const ids = new Set(members.map((m) => m.id));
  state.animals = state.animals.filter((a) => !(a.ownerId !== undefined && ids.has(a.ownerId)));
  hs.list = hs.list.filter((x) => x.familyId !== familyId);
  hs.dwellings = hs.dwellings.filter((d) => d.familyId !== familyId);
  return members.map((m) => m.name);
}

export function fire(state: GameState, helperId: number): string | null {
  const h = state.helpers.list.find((x) => x.id === helperId);
  if (!h) return 'Туслах алга';
  const fam = familyOf(state, h);
  if (fam.some((x) => x.trip)) return 'Жолооч сумын төвөөс ирээгүй байна';
  if (fam.some((x) => x.task === 'otor')) return 'Эхлээд отроос буцаа';
  leave(state, h.familyId);
  return null;
}

/** Үүрэг өгөх (насанд хүрсэн малчинд) */
export function setTask(state: GameState, helperId: number, task: HelperTask, herd?: HerdGroup): string | null {
  const h = state.helpers.list.find((x) => x.id === helperId);
  if (!h) return 'Туслах алга';
  if (h.kind === 'child') return 'Хүүхэд цуглуулагч л байна';
  if (h.trip) return 'Сумын төвөөс ирээгүй байна';
  if (h.task === 'otor') return 'Отор дээр байна — эхлээд буцаа';
  if (task === 'otor' || task === 'collect') return 'Энэ үүргийг ингэж өгөхгүй';
  if (task === 'drive' && !state.fleet.length) return 'Тэрэг, машин алга';
  h.task = task;
  if (herd) h.herd = herd;
  return null;
}

/** Цалинг малаар урьдчилж төлөх: мал туслахынх болно */
export function payWithAnimal(cfg: GameConfig, state: GameState, helperId: number, animalId: number): string | null {
  const h = state.helpers.list.find((x) => x.id === helperId);
  if (!h) return 'Туслах алга';
  const a = state.animals.find((x) => x.id === animalId);
  if (!a || a.riding || a.ownerId !== undefined) return 'Ийм мал алга';
  a.ownerId = h.id;
  const v = salePrice(a, cfg.animals);
  h.prepaid += v;
  return null;
}

/** Тоглогчийн өөрийн мал (туслахынх биш) */
export function playerOwned(a: Animal): boolean {
  return a.ownerId === undefined;
}

/** Сар бүрийн цалин: эхлээд урьдчилж төлснөөс, дараа нь мөнгөөр. Хүрэхгүй бол айлаараа явна */
export function payWages(cfg: GameConfig, state: GameState): HelperEvent[] {
  const ev: HelperEvent[] = [];
  const fams = [...new Set(state.helpers.list.map((h) => h.familyId))];
  for (const fid of fams) {
    const members = state.helpers.list.filter((h) => h.familyId === fid);
    let due = members.reduce((s, m) => s + m.wage, 0) * cfg.helpers.payEveryDays;
    for (const m of members) {
      const use = Math.min(m.prepaid, due);
      m.prepaid -= use;
      due -= use;
    }
    if (due <= 0) continue;
    if (state.money >= due) {
      state.money -= due;
      state.today.expenses.wages = (state.today.expenses.wages ?? 0) + due;
    } else if (members.some((m) => m.trip || m.task === 'otor')) {
      // Аялал/отор дээр байгаа бол өрөнд үлдээнэ (дараа сар)
      members[0]!.prepaid -= due;
    } else ev.push({ type: 'helperQuit', names: leave(state, fid), reason: 'wage' });
  }
  return ev;
}

// ======================= Өдөр бүрийн ажил =======================

function moveToward(h: { x: number; z: number; tx: number; tz: number; heading: number }, speed: number): boolean {
  const dx = h.tx - h.x, dz = h.tz - h.z;
  const d = Math.hypot(dx, dz);
  if (d <= speed) {
    h.x = h.tx;
    h.z = h.tz;
    return true;
  }
  h.x += (dx / d) * speed;
  h.z += (dz / d) * speed;
  h.heading = Math.atan2(dx, dz);
  return false;
}

function groupOf(a: Animal): HerdGroup {
  const k = flockKey(a.species);
  return k === 'cow' ? 'cow' : k === 'horse' ? 'horse' : 'sheep';
}

/** Сүргийн дундаж цэг (унтаж, хотондоо харьж буй малыг оруулахгүй) */
function flock(state: GameState, g: HerdGroup): { list: Animal[]; x: number; z: number } {
  const list = state.animals.filter((a) => !a.riding && groupOf(a) === g);
  let x = 0, z = 0;
  for (const a of list) {
    x += a.x;
    z += a.z;
  }
  return { list, x: list.length ? x / list.length : 0, z: list.length ? z / list.length : 0 };
}

function driveAnimal(a: Animal, x: number, z: number, rng: Rng, step: number): void {
  a.mode = 'driven';
  a.tx = x + rng.range(-3, 3);
  a.tz = z + rng.range(-3, 3);
  a.drivenAt = step;
}

/** Хотын ойролцоох хамгийн сайн бэлчээрийн цэг (чонын нутгаас зайдуу) */
function bestPasture(cfg: GameConfig, state: GameState, quality: Record<string, number>, R: number): { x: number; z: number; score: number } {
  const g = state.grass;
  const dens = state.wolves.dens;
  let best = { x: 30, z: 0, score: -1 };
  for (let iz = 0; iz < g.n; iz += 5) {
    for (let ix = 0; ix < g.n; ix += 5) {
      const x = -g.half + (ix + 0.5) * g.cell, z = -g.half + (iz + 0.5) * g.cell;
      const r = Math.hypot(x, z);
      if (r > R || r < 25) continue;
      if (dens.some((d) => Math.hypot(x - d.x, z - d.z) < d.r + 18)) continue;
      const i = iz * g.n + ix;
      const s = Math.pow(quality[typeIdOf(g, i)] ?? 0, 1.5) * absBiomass(cfg, g, i) - r * 0.0008;
      if (s > best.score) best = { x, z, score: s };
    }
  }
  return best;
}

function areaScore(cfg: GameConfig, state: GameState, quality: Record<string, number>, x: number, z: number): number {
  const i = cellIndex(state.grass, x, z);
  if (i < 0) return 0;
  return Math.pow(quality[typeIdOf(state.grass, i)] ?? 0, 1.5) * absBiomass(cfg, state.grass, i);
}

/** Малчны нэг минут */
function herderStep(cfg: GameConfig, state: GameState, rng: Rng, h: Helper, quality: Record<string, number>): void {
  const H = cfg.helpers.herder;
  const t = state.time;
  if (isNight(t, cfg.time)) {
    const home = homeOf(state, h);
    h.tx = home.x;
    h.tz = home.z;
    if (moveToward(h, H.speed)) h.mode = 'sleep';
    return;
  }
  h.mode = 'work';
  const f = flock(state, h.herd);
  if (!f.list.length) {
    const home = homeOf(state, h);
    h.tx = home.x;
    h.tz = home.z;
    moveToward(h, H.speed);
    return;
  }
  if ((state.step + h.id) % H.decideEverySteps === 0) {
    let target: { x: number; z: number } | null = null;
    // 1) Чоно сүрэг рүү дайрч байна — тийш давхиж үргээнэ
    const ids = new Set(f.list.map((a) => a.id));
    const hunter = state.wolves.list.find((o) => o.mode === 'hunt' && ids.has(o.targetId));
    if (hunter) {
      target = { x: hunter.x, z: hunter.z };
      if (Math.hypot(hunter.x - h.x, hunter.z - h.z) <= H.scareRadius) scareWolf(cfg, hunter);
    }
    const homeEvening = t.minute >= H.homeHour * 60 && t.minute < cfg.time.sleepMinute;
    // 2) Чонын нутагт орсон эсвэл сүргээс тасарсан мал — эргүүлнэ
    if (!target) {
      let worst: Animal | null = null, wd = 0;
      for (const a of f.list) {
        if (a.mode === 'home' || a.mode === 'sleep' || a.mode === 'driven' || a.mode === 'drink') continue;
        const inWolf = state.wolves.dens.some((d) => Math.hypot(a.x - d.x, a.z - d.z) < d.r + H.wolfWatch);
        const stray = Math.hypot(a.x - f.x, a.z - f.z);
        const score = inWolf ? 1000 + stray : stray > H.strayDistance ? stray : 0;
        if (score > wd) {
          wd = score;
          worst = a;
        }
      }
      if (worst) {
        target = { x: worst.x, z: worst.z };
        if (Math.hypot(worst.x - h.x, worst.z - h.z) < 12) {
          const goal = homeEvening ? homeSpot(cfg, rng, worst.species) : { x: f.x, z: f.z };
          driveAnimal(worst, goal.x, goal.z, rng, state.step);
        }
      }
    }
    // 3) Орой сүргээ хот руу тууна (тасарсан мал хотлоно)
    if (!target && homeEvening && h.homeDriven !== t.day) {
      h.homeDriven = t.day;
      const far = f.list.filter((a) => Math.hypot(a.x - cfg.camps.home.x, a.z - cfg.camps.home.z) > 60 && a.mode !== 'home' && a.mode !== 'sleep');
      for (const a of far) {
        const p = homeSpot(cfg, rng, a.species);
        driveAnimal(a, (a.x + p.x) / 2, (a.z + p.z) / 2, rng, state.step);
      }
    }
    // 4) Сайн бэлчээр рүү хөтлөх
    if (!target && !homeEvening && state.step - h.lastPasture >= H.pastureEveryMinutes) {
      h.lastPasture = state.step;
      const b = bestPasture(cfg, state, quality, H.pastureSearchRadius);
      if (b.score > areaScore(cfg, state, quality, f.x, f.z) * 1.25) {
        for (const a of f.list) if (a.mode !== 'home' && a.mode !== 'sleep' && a.mode !== 'drink') driveAnimal(a, b.x + (a.x - f.x) * 0.3, b.z + (a.z - f.z) * 0.3, rng, state.step);
        target = b;
      }
    }
    if (!target) target = { x: f.x + 6, z: f.z + 4 };   // сүргээ дагана
    h.tx = target.x;
    h.tz = target.z;
  }
  moveToward(h, H.speed);
}

/** Хүүхэд цуглуулагчийн нэг минут */
function childStep(cfg: GameConfig, state: GameState, h: Helper): void {
  const C = cfg.helpers.child;
  const home = cfg.camps.home;
  if (isNight(state.time, cfg.time)) {
    const p = homeOf(state, h);
    h.tx = p.x;
    h.tz = p.z;
    if (moveToward(h, C.speed)) h.mode = 'sleep';
    return;
  }
  h.mode = 'work';
  const carried = h.carry.reduce((s, c) => s + c.amount, 0);
  const room = C.carry - carried;
  let target: { x: number; z: number; id?: number } | null = null;
  if (room > 1e-9) {
    let bd = Infinity;
    for (const it of state.items) {
      if (it.amount > room + 1e-9) continue;
      if (Math.hypot(it.x - home.x, it.z - home.z) > C.searchRadius) continue;
      const d = Math.hypot(it.x - h.x, it.z - h.z);
      if (d < bd) {
        bd = d;
        target = { x: it.x, z: it.z, id: it.id };
      }
    }
  }
  if (!target && carried > 0) target = { x: home.x + 2, z: home.z + 2 };
  if (!target) {
    const p = homeOf(state, h);
    target = { x: p.x, z: p.z };
  }
  h.tx = target.x;
  h.tz = target.z;
  const arrived = moveToward(h, C.speed);
  if (target.id !== undefined && Math.hypot(h.x - target.x, h.z - target.z) <= 1.5) {
    const it = state.items.find((x) => x.id === target!.id);
    if (it) {
      h.carry.push({ product: it.product, amount: it.amount, age: it.age });
      state.items = state.items.filter((x) => x !== it);
    }
  } else if (arrived && target.id === undefined && carried > 0 && Math.hypot(h.x - home.x, h.z - home.z) <= home.storageRadius) {
    const left: typeof h.carry = [];
    for (const c of h.carry) {
      const added = storage.add(cfg, state, c.product, c.amount, 0);
      if (added > 0) state.today.collected[c.product] = (state.today.collected[c.product] ?? 0) + added;
      if (c.amount - added > 1e-9) left.push({ ...c, amount: c.amount - added });
    }
    h.carry = left;
  }
}

/** Жолоочийн аялал: departHour-д ачаад сумын төв явна (газрын зургаар хийсвэр) */
function driverStep(cfg: GameConfig, state: GameState, h: Helper): HelperEvent[] {
  const D = cfg.helpers.driver;
  if (h.trip) {
    h.trip.remaining -= 1;
    if (h.trip.remaining > 0) return [];
    // Буцаж ирлээ — зарсан мөнгө
    let income = 0;
    for (const [p, n] of Object.entries(h.trip.cargo)) {
      const inc = (n ?? 0) * productPrice(cfg, p as ProductId);
      income += inc;
      state.today.income[p as ProductId] = (state.today.income[p as ProductId] ?? 0) + inc;
    }
    state.money += income;
    const f = state.fleet.find((x) => x.id === h.trip!.vehicle);
    if (f) {
      const pk = parkingSpot(cfg, f.id);
      f.place = 'camp';
      f.x = pk.x;
      f.z = pk.z;
      f.heading = pk.heading;
    }
    const home = homeOf(state, h);
    h.x = h.tx = home.x;
    h.z = h.tz = home.z;
    h.mode = 'work';
    h.trip = null;
    return [{ type: 'helperTrip', name: h.name, income }];
  }
  if (state.time.minute !== D.departHour * 60) {
    // Хотод хүлээнэ
    const p = homeOf(state, h);
    h.tx = p.x;
    h.tz = p.z;
    moveToward(h, cfg.helpers.child.speed);
    h.mode = isNight(state.time, cfg.time) ? 'sleep' : 'work';
    return [];
  }
  const free = state.fleet.filter((f) => f.place === 'camp' && f.id !== state.player.driving && !Object.keys(f.cargo).length && !f.animals.length);
  if (!free.length) return [];
  free.sort((a, b) => vehicleCfg(cfg, b.id).capacity - vehicleCfg(cfg, a.id).capacity);
  const f = free[0]!;
  const cap = vehicleCfg(cfg, f.id).capacity;
  const keepMilk = state.processors.some((p) => p.kind === 'pot' || p.kind === 'separator');
  const cargo: Partial<Record<ProductId, number>> = {};
  let units = 0;
  for (const p of ['cashmere', 'urum', 'aaruul', 'felt', 'wool', 'tarag', 'milk'] as ProductId[]) {
    if (p === 'milk' && keepMilk) continue;
    const n = Math.min(storage.count(state, p), cap - units);
    if (n <= 0) continue;
    cargo[p] = storage.take(state, p, n);
    units += cargo[p]!;
  }
  if (units < Math.min(D.minUnits, cap)) {
    for (const [p, n] of Object.entries(cargo)) storage.add(cfg, state, p as ProductId, n ?? 0, 0);
    return [];
  }
  const camp = cfg.worldmap.locations[state.campId]!, sum = cfg.worldmap.locations[sumId(cfg)]!;
  const km = Math.hypot(sum.x - camp.x, sum.z - camp.z);
  const total = Math.round((2 * km) / mapSpeedKmPerMin(cfg, f.id));
  const fuel = (2 * km * vehicleCfg(cfg, f.id).fuelPer100km) / 100;
  if (fuel > 0) {
    state.money -= fuel * cfg.vehicles.fuelPricePerL;
    state.today.expenses.fuel = (state.today.expenses.fuel ?? 0) + fuel * cfg.vehicles.fuelPricePerL;
  }
  f.place = 'map';
  h.trip = { vehicle: f.id, remaining: total, total, cargo };
  h.mode = 'away';
  return [];
}

/** Минут бүр: бүх туслах ажиллана */
export function helpersStep(cfg: GameConfig, state: GameState, rng: Rng, quality: Record<string, number>): HelperEvent[] {
  const ev: HelperEvent[] = [];
  for (const h of state.helpers.list) {
    if (h.task === 'otor') {
      h.mode = 'away';
      continue;
    }
    if (h.task === 'drive' || h.trip) ev.push(...driverStep(cfg, state, h));
    else if (state.move) continue;
    else if (h.kind === 'child') childStep(cfg, state, h);
    else herderStep(cfg, state, rng, h, quality);
  }
  return ev;
}

/** Хамгаалалтын бүс өгөх туслахууд (сүрэг хариулж буй малчин) */
export function guardingHelpers(state: GameState): Helper[] {
  return state.helpers.list.filter((h) => h.kind === 'adult' && h.task === 'herd' && h.mode !== 'away');
}

// ======================= Отор =======================

/** Отор: малчинтай хамт сонгосон малыг өөр бууц руу явуулна (тоглогч гэртэй байх ёстой) */
export function sendOtor(cfg: GameConfig, state: GameState, helperId: number, animalIds: number[], campId: string): string | null {
  const h = state.helpers.list.find((x) => x.id === helperId);
  if (!h || h.kind !== 'adult') return 'Малчин алга';
  if (h.trip || h.task === 'otor') return 'Малчин завгүй';
  if (spareTents(state) <= 0) return 'Отор явуулахад илүү майхан хэрэгтэй (гэртэй болох эсвэл Худалдаачнаас отрын майхан авах)';
  if (!cfg.camps.camps[campId] || campId === state.campId) return 'Өөр бууц сонго';
  const animals = state.animals.filter((a) => animalIds.includes(a.id) && !a.riding);
  if (!animals.length) return 'Мал сонгоогүй';
  state.animals = state.animals.filter((a) => !animals.includes(a));
  for (const a of animals) a.mode = 'graze';
  state.helpers.otor.push({ helperId, campId, animals, days: 0 });
  h.task = 'otor';
  h.mode = 'away';
  return null;
}

/** Отроос буцаах: мал хотын ойролцоо ирнэ */
export function recallOtor(cfg: GameConfig, state: GameState, helperId: number, rng: Rng): string | null {
  const g = state.helpers.otor.find((x) => x.helperId === helperId);
  const h = state.helpers.list.find((x) => x.id === helperId);
  if (!g || !h) return 'Отор алга';
  const home = cfg.camps.home;
  for (const a of g.animals) {
    a.x = a.tx = home.x + 30 + rng.range(-8, 8);
    a.z = a.tz = home.z + rng.range(-8, 8);
    a.mode = 'graze';
    state.animals.push(a);
  }
  state.helpers.otor = state.helpers.otor.filter((x) => x !== g);
  h.task = 'herd';
  h.mode = 'work';
  const p = homeOf(state, h);
  h.x = h.tx = p.x;
  h.z = h.tz = p.z;
  return null;
}

/** Өдрийн эцэс: отор дээрх мал тэр бууцны бэлчээрээр таргалж/турна, бууц доройтоно, бага зэрэг чонын эрсдэл */
export function dailyOtor(cfg: GameConfig, state: GameState, rng: Rng): HelperEvent[] {
  const ev: HelperEvent[] = [];
  const deg = cfg.pasture.degradation;
  for (const g of state.helpers.otor) {
    g.days += 1;
    const camp = state.camps[g.campId]!;
    const d = camp.degrade;
    const gut = Math.max(0.2, 1 - 0.75 * d);
    const dq = 0.72 * (1 - deg.qualityPenalty * d);
    for (const a of g.animals) {
      const dc = dailyConditionDelta(gut, dq, false, cfg.animals);
      a.condition = Math.min(1, Math.max(0, a.condition + dc));
      if (a.condition <= 0) a.health -= cfg.animals.condition.zeroConditionHealthLossPerDay;
      else a.health = Math.min(100, a.health + 2);
      a.age += 1 / cfg.time.animalYearDays;
      a.lastGut = gut;
    }
    g.animals = g.animals.filter((a) => a.health > 0);
    // Тэр бууцны доройтол (dailyCampDegrade нь эзгүй бууцыг сэргээсний дараа)
    const su = g.animals.reduce((s, a) => s + sheepUnits(a, cfg.animals), 0);
    camp.degrade = Math.min(1, camp.degrade + deg.recoverPerDayWhenAway + deg.gainPerDayAtCapacity * (su / deg.campCapacitySheepUnits));
    // Чоно
    const lvl = cfg.camps.camps[g.campId]?.wolfLevel ?? 'medium';
    const p = (cfg.helpers.otor.wolfLossPerDay as Record<string, number>)[lvl] ?? 0.02;
    const prey = g.animals.filter((a) => a.species === 'sheep' || a.species === 'goat');
    if (prey.length && rng.chance(p)) {
      const v = prey[Math.floor(rng.next() * prey.length)]!;
      g.animals = g.animals.filter((a) => a !== v);
      state.today.wolfKills[v.species] = (state.today.wolfKills[v.species] ?? 0) + 1;
      ev.push({ type: 'otorLoss', campId: g.campId, species: v.species });
    }
  }
  return ev;
}

/** Бууц нүүхэд туслахууд хамт (айлын гэр, байрны байрлал хэвээр) */
export function relocateHelpers(state: GameState): void {
  for (const h of state.helpers.list) {
    if (h.task === 'otor' || h.trip) continue;
    const p = homeOf(state, h);
    h.x = h.tx = p.x;
    h.z = h.tz = p.z;
  }
}
