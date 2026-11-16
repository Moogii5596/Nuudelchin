/**
 * Туслах малчид (M5, хэрэглэгчийн шийдвэр 2026-11-14).
 *
 * - Сумын төвийн ЦАЙНЫ ГАЗРААС хөлслөнө: ганц бие малчин (тоглогч байр авч өгнө) эсвэл айл (малчин + хүүхэд,
 *   өөрийн гэртэй, малгүй ирнэ).
 * - Насанд хүрсэн туслах = МАЛЧИН. Үүрэг: сүрэг хариулах (сайн бэлчээрт бэлчээх, чонын бүсээс эргүүлэх,
 *   тасарсан малыг хотлуулах), ЖОЛООЧ (тэрэг/машинаар сумын төв явж зарах), ОТОР (тасалсан малтай өөр бууцанд).
 * - B2 (хэрэглэгчийн дүрэм 2026-11-14): малчин өдөржин мал дээрээ байхгүй — өглөө сүргээ бэлчээрт тууж гаргаад
 *   гэртээ ирнэ, өдөр 1–2 удаа (visitHours) сүрэг рүүгээ очиж шалгана, орой бэлчээрээс тууж ирнэ.
 *   Мал чонын нутагт ойртвол (wolfAvoid) өөр тийш тууна. Сүрэг рүү дайрч буй чоныг noticeRadius-д л анзаарна.
 * - B3: АДУУЧИН майхнаа аваад уулын ойролцоо (адууны сайн бэлчээр, чонын үүрээс зайдуу) бууна, орой адуугаа
 *   майхан руугаа дөхүүлж манаж хононо (шөнийн бүс nightGuardRadius).
 * - Хүүхэд = ЦУГЛУУЛАГЧ: сүү, ноосыг түүж агуулахад хийнэ.
 * - Цалин сар бүр. Малаар урьдчилж төлж болно — тэр мал туслахынх болж (ownerId) өөр өнгөтэй, тоглогчийн
 *   зорилгын тоонд орохгүй, сүү ноос нь туслахынх. Мөнгө хүрэхгүй бол айлаараа, малтайгаа явна.
 */
import { m, type Msg } from '../msg';
import { freeDwellingSlot, gerCount } from './ownGers';
import type { GameConfig, Species } from '../config';
import { Rng } from '../rng';
import type { Animal, GameState, ProductId, VehicleId } from '../state';
import { isNight } from '../clock';
import { salePrice, dailyConditionDelta, sheepUnits } from './animals';
import * as storage from './storage';
import { parkingSpot, productPrice, vehicleCfg } from './trip';
import { teahouseDoor } from './sumtown';
import { closedMsg, isOpen } from './shops';
import { mapSpeedKmPerMin, sumId } from './travel';
import { waterDistance } from '../terrain';
import { scareWolf } from './wolves';
import { flockKey } from './herds';
import { dailyMilkLiters, homeSpot, intakeFactor } from './night';
import { seasonOf, snowAccess } from './seasons';
import { absBiomass, cellIndex, degradeGain, typeIdOf, typeQualities } from './pasture';

export type HelperKind = 'adult' | 'child';
export type HelperTask = 'herd' | 'drive' | 'otor' | 'collect';
export type HerdGroup = 'sheep' | 'cow' | 'horse';

export interface HelperTrip {
  vehicle: VehicleId;
  remaining: number;     // минут
  total: number;
  cargo: Partial<Record<ProductId, number>>;
  /** Сумын төвд зарсан орлого (бүтээгдэхүүнээр, ₮) — зарах хүртэл байхгүй */
  sale?: Partial<Record<ProductId, number>>;
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
  wage: number;          // өдрийн цалин (₮, бүхэл) = сарын цалин / wageMonthDays
  prepaid: number;       // малаар урьдчилж төлсөн (₮)
  /** Төлөгдөөгүй цалингийн өр (₮) — дараагийн өдрийн цалинтай хамт нэхэгдэнэ (v22) */
  owed?: number;
  /** Цалин бүрэн төлөгдөөгүй дараалсан өдөр (v22) */
  unpaidDays?: number;
  x: number;
  z: number;
  heading: number;
  tx: number;
  tz: number;
  mode: 'work' | 'sleep' | 'away';
  /** Автомат аялалд сүүлд гарсан өдөр (өдөрт нэг удаа) */
  autoTripDay?: number;
  carry: { product: ProductId; amount: number; age: number }[];
  trip: HelperTrip | null;
  lastPasture: number;   // сүүлд бэлчээр сольсон алхам
  homeDriven: number;    // орой сүргээ хот руу тууж эхэлсэн өдөр
  outDay?: number;       // өглөө сүргээ бэлчээрт тууж гаргасан өдөр (B2)
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
  /** Отор дээр гарсан сүү, ноос (M5.5): тоглогч өөрөө очиж авч зарна */
  items?: { product: ProductId; amount: number; age: number }[];
  /** Отор дээрх хүүхэд цуглуулагч (байхгүй бол сүү тэр өдөртөө муудаж, ноос 2 хоногт хийснэ) */
  collectorId?: number;
}

/** Туслахын байр (майхан/гэр) ба айлын гэр — хотын ойролцоо */
export interface Dwelling {
  kind: 'familyGer' | 'helperTent' | 'helperGer' | 'horseCamp';
  x: number;
  z: number;
  familyId?: number;
  helperId?: number;     // horseCamp: адуучин (B3)
  campId?: string;       // horseCamp: аль бууцанд
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
  /** Жолоочийн departHour-ийн автомат аялал (анхдагч: асаалттай; false бол унтраасан) */
  autoTrip?: boolean;
}

export type HelperEvent =
  | { type: 'helperQuit'; names: string[]; reason: 'wage' | 'fired' }
  | { type: 'helperWarn'; names: string[] }   // цалингүй warnDays өдөр — явах гэж байна
  | { type: 'helperTrip'; name: string; income: number }
  | { type: 'otorLoss'; campId: string; species: Species };

export function newHelpersState(): HelpersState {
  return { list: [], nextId: 1, candidates: [], candidatesDay: -999, otor: [], dwellings: [], otorTents: 0 };
}

const freeSlot = freeDwellingSlot;   // айлын гэр, нэмэлт гэр нэг сул цэгийн жагсаалтыг хуваалцана

/** Ганц бие туслахад авсан орны тоо ба эзэлсэн */
export function bedsTotal(cfg: GameConfig, state: GameState): number {
  // M6.13: гэр бүр (гол гэр ч) 1 ганц бие туслахын ор — хэмжээ нөлөөлөхгүй; айлын гэр тоонд ордоггүй
  return gerCount(cfg, state);
}
export function bedsUsed(state: GameState): number {
  return state.helpers.list.filter((x) => !x.family).length;
}

/** Хуучин (M6.13-аас өмнөх) туслахын байр — тест, хуучин хадгалалтын шилжүүлэлт. Шинэ тоглоомд нэмэлт гэр (ownGers.ts) */
export function addDwelling(state: GameState, kind: 'helperTent' | 'helperGer'): void {
  const s = freeSlot(state);
  state.helpers.dwellings.push({ kind, x: s.x, z: s.z });
}

/** Отор явуулах боломжтой илүү майхан: гэртэй бол хуучин майхан + авсан отрын майхнууд − одоо отор дээр байгаа */
export function spareTents(state: GameState): number {
  const total = (state.home === 'ger' ? 1 : 0) + (state.helpers.otorTents ?? 0);
  return total - state.helpers.otor.length;
}

/** Туслахын гэр/байр (унтах газар). Адуучин уулын ойролцоох майхандаа (B3) */
function homeOf(state: GameState, h: Helper): { x: number; z: number } {
  const hc = h.task === 'herd' && h.herd === 'horse' ? state.helpers.dwellings.find((x) => x.kind === 'horseCamp' && x.helperId === h.id && x.campId === state.campId) : undefined;
  if (hc) return { x: hc.x + 2.5, z: hc.z + 1.5 };
  const d = state.helpers.dwellings.find((x) => (h.family ? x.familyId === h.familyId : x.kind !== 'familyGer' && x.kind !== 'horseCamp'));
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
  const W = cfg.helpers.wageMonthly;
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
    hs.candidates.push({ id: day * 10 + i, family, members, wage: dailyWage(cfg, family ? sum * cfg.helpers.familyWageMult : sum) });
  }
  hs.candidatesDay = day;
}

/** Цайны газар (сумын төвийн 3D) */
export function nearTeahouse(cfg: GameConfig, state: GameState): boolean {
  const t = teahouseDoor(cfg);
  return state.player.place === 'sum' && Math.hypot(state.player.x - t.x, state.player.z - t.z) <= cfg.worldmap.sum3d.shopR;
}

/** Хөлслөх. Алдаа бол тайлбар */
export function hire(cfg: GameConfig, state: GameState, candidateId: number, proximity: boolean): Msg | null {
  const hs = state.helpers;
  if (proximity && !nearTeahouse(cfg, state)) return m('sim.go_to_the_teahouse');
  if (proximity && !isOpen(cfg, 'teahouse', state.time.minute)) return closedMsg(cfg, 'teahouse');
  const c = hs.candidates.find((x) => x.id === candidateId);
  if (!c) return m('sim.no_such_person');
  if (!c.family && bedsUsed(state) + 1 > bedsTotal(cfg, state)) return m('sim.a_single_helper_needs');
  const W = cfg.helpers.wageMonthly;
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
      owed: 0,
      unpaidDays: 0,
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

export function fire(state: GameState, helperId: number): Msg | null {
  const h = state.helpers.list.find((x) => x.id === helperId);
  if (!h) return m('sim.no_helper');
  const fam = familyOf(state, h);
  if (fam.some((x) => x.trip)) return m('sim.the_driver_has_not');
  if (fam.some((x) => x.task === 'otor')) return m('sim.recall_from_the_otor');
  leave(state, h.familyId);
  return null;
}

/** Үүрэг өгөх (насанд хүрсэн малчинд) */
export function setTask(state: GameState, helperId: number, task: HelperTask, herd?: HerdGroup): Msg | null {
  const h = state.helpers.list.find((x) => x.id === helperId);
  if (!h) return m('sim.no_helper');
  if (h.kind === 'child') return m('sim.only_a_child_can');
  if (h.trip) return m('sim.has_not_come_back');
  if (h.task === 'otor') return m('sim.at_the_otor_recall');
  if (task === 'otor' || task === 'collect') return m('sim.this_task_cannot_be');
  if (task === 'drive' && !state.fleet.length) return m('sim.no_cart_or_vehicle');
  h.task = task;
  if (herd) h.herd = herd;
  return null;
}

/** Цалинг малаар урьдчилж төлөх: мал туслахынх болно */
export function payWithAnimal(cfg: GameConfig, state: GameState, helperId: number, animalId: number): Msg | null {
  const h = state.helpers.list.find((x) => x.id === helperId);
  if (!h) return m('sim.no_helper');
  const a = state.animals.find((x) => x.id === animalId);
  if (!a || a.riding || a.ownerId !== undefined) return m('sim.no_such_animal');
  a.ownerId = h.id;
  const v = salePrice(a, cfg.animals);
  h.prepaid += v;
  return null;
}

/** Тоглогчийн өөрийн мал (туслахынх биш) */
export function playerOwned(a: Animal): boolean {
  return a.ownerId === undefined;
}

/** Өдрийн цалин (₮, бүхэл): сарын цалин / wageMonthDays */
export function dailyWage(cfg: GameConfig, monthly: number): number {
  return Math.round(monthly / cfg.helpers.wageMonthDays);
}

/**
 * Өдөр бүрийн цалин (өдрийн төгсгөлд, бусад зардалтай хамт): туслах бүрд өдрийн цалин + өмнөх өр.
 * Эхлээд малаар өгсөн урьдчилгаанаас, дараа нь мөнгөөр. Мөнгө хүрэхгүй бол байгааг нь өгөх ёстой дүнгийн харьцаагаар
 * хувааж төлөөд үлдэгдлийг өр (owed) болгоно. Айл бүрэн цалингүй warnDays дахь өдөр «явах гэж байна» мэдэгдэл,
 * quitDays дахь өдөр айлаараа явна (аялал/отор дээр бол буцаж иртэл хүлээнэ).
 * Тайланд туслах бүр тусдаа мөр: today.expenses['wage:<нэр>'].
 */
export function payWages(cfg: GameConfig, state: GameState): HelperEvent[] {
  const ev: HelperEvent[] = [];
  const U = cfg.helpers.unpaid;
  const list = state.helpers.list;
  const due = new Map<Helper, number>();
  for (const h of list) due.set(h, h.wage + (h.owed ?? 0));
  // Малаар өгсөн урьдчилгаа айлын дундынх: айлын гишүүдийн цалинг эхлээд түүнээс хасна
  for (const giver of list) {
    for (const h of list) {
      if (giver.prepaid <= 0) break;
      if (h.familyId !== giver.familyId) continue;
      const use = Math.min(giver.prepaid, due.get(h)!);
      giver.prepaid -= use;
      due.set(h, due.get(h)! - use);
    }
  }
  const total = [...due.values()].reduce((a, n) => a + n, 0);
  const avail = Math.max(0, Math.floor(state.money));
  const share = total > avail ? avail / total : 1;
  let paidAll = 0;
  for (const h of list) {
    const d = due.get(h)!;
    const paid = share >= 1 ? d : Math.floor(d * share);
    h.owed = d - paid;
    paidAll += paid;
    if (paid > 0) {
      const key = 'wage:' + h.name;
      state.today.expenses[key] = (state.today.expenses[key] ?? 0) + paid;
    }
  }
  state.money -= paidAll;
  for (const fid of [...new Set(list.map((h) => h.familyId))]) {
    const members = state.helpers.list.filter((h) => h.familyId === fid);
    const unpaid = members.some((m) => (m.owed ?? 0) > 0);
    const days = unpaid ? Math.max(...members.map((m) => m.unpaidDays ?? 0)) + 1 : 0;
    for (const m of members) m.unpaidDays = days;
    if (days >= U.quitDays && !members.some((m) => m.trip || m.task === 'otor')) ev.push({ type: 'helperQuit', names: leave(state, fid), reason: 'wage' });
    else if (days === U.warnDays) ev.push({ type: 'helperWarn', names: members.map((m) => m.name) });
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

/** (cx, cz)-аас R радиус дотор хамгийн сайн бэлчээрийн цэг, чонын нутгаас (d.r + margin) зайдуу */
function bestPasture(cfg: GameConfig, state: GameState, quality: Record<string, number>, R: number, cx = 0, cz = 0, minR = 25): { x: number; z: number; score: number } {
  const g = state.grass;
  const dens = state.wolves.dens;
  const margin = cfg.helpers.herder.wolfAvoid + 12;
  let best = { x: cx + 30, z: cz, score: -1 };
  for (let iz = 0; iz < g.n; iz += 5) {
    for (let ix = 0; ix < g.n; ix += 5) {
      const x = -g.half + (ix + 0.5) * g.cell, z = -g.half + (iz + 0.5) * g.cell;
      const r = Math.hypot(x - cx, z - cz);
      if (r > R || Math.hypot(x, z) < minR) continue;
      if (dens.some((d) => Math.hypot(x - d.x, z - d.z) < d.r + margin)) continue;
      const i = iz * g.n + ix;
      const s = Math.pow(quality[typeIdOf(g, i)] ?? 0, 1.5) * absBiomass(cfg, g, i) - r * 0.0008;
      if (s > best.score) best = { x, z, score: s };
    }
  }
  return best;
}

/**
 * Адуучны майхны газар (B3): хотоос horseCamp.minR–maxR зайд, уулын (foothill, ар, өвөр) бэлчээрт,
 * чонын үүрээс denMargin-аас хол, уснаас зайтай. Бууц бүрт нэг удаа тооцно.
 */
function ensureHorseCamp(cfg: GameConfig, state: GameState, h: Helper, quality: Record<string, number>): void {
  const hs = state.helpers;
  if (hs.dwellings.some((d) => d.kind === 'horseCamp' && d.helperId === h.id && d.campId === state.campId)) return;
  hs.dwellings = hs.dwellings.filter((d) => !(d.kind === 'horseCamp' && d.helperId === h.id));
  const C = cfg.helpers.herder.horseCamp;
  const g = state.grass;
  const camp = cfg.camps.camps[state.campId];
  const home = cfg.camps.home;
  let best = { x: home.x + C.minR, z: home.z, s: -1 };
  for (let iz = 0; iz < g.n; iz += 4) {
    for (let ix = 0; ix < g.n; ix += 4) {
      const x = -g.half + (ix + 0.5) * g.cell, z = -g.half + (iz + 0.5) * g.cell;
      const r = Math.hypot(x - home.x, z - home.z);
      if (r < C.minR || r > C.maxR) continue;
      if (state.wolves.dens.some((d) => Math.hypot(x - d.x, z - d.z) < d.r + C.denMargin)) continue;
      if (camp && waterDistance(camp.waterShape, x, z) < 12) continue;
      const i = iz * g.n + ix;
      const t = typeIdOf(g, i);
      const mountain = (C.mountainTypes as string[]).includes(t) ? C.mountainBonus : 1;
      const s = Math.pow(quality[t] ?? 0, 1.5) * absBiomass(cfg, g, i) * mountain;
      if (s > best.s) best = { x, z, s };
    }
  }
  hs.dwellings.push({ kind: 'horseCamp', x: Math.round(best.x), z: Math.round(best.z), helperId: h.id, campId: state.campId });
}

/** Туслахын хамгаалалтын бүсийн радиус: адуучин шөнө майхны дэргэд адуугаа манана (B3) */
export function helperGuardRadius(cfg: GameConfig, h: Helper): number {
  const H = cfg.helpers.herder;
  return h.herd === 'horse' && h.mode === 'sleep' ? H.horseCamp.nightGuardRadius : H.protectRadius;
}

function areaScore(cfg: GameConfig, state: GameState, quality: Record<string, number>, x: number, z: number): number {
  const i = cellIndex(state.grass, x, z);
  if (i < 0) return 0;
  return Math.pow(quality[typeIdOf(state.grass, i)] ?? 0, 1.5) * absBiomass(cfg, state.grass, i);
}

/** Малчны өдрийн үе (B2): out — өглөө тууж гаргах, visit — өдөр шалгах, evening — орой тууж ирэх, idle — гэртээ */
export function herderPhase(cfg: GameConfig, h: Helper, minute: number, day: number): 'out' | 'visit' | 'evening' | 'idle' {
  const S = cfg.helpers.herder.schedule;
  if (minute >= cfg.helpers.herder.homeHour * 60) return 'evening';
  if (minute < cfg.time.dayStartMinute + S.outMinutes && h.outDay !== day) return 'out';
  for (const vh of S.visitHours) if (minute >= vh * 60 && minute < vh * 60 + S.visitMinutes) return 'visit';
  return 'idle';
}

/** Малчны нэг минут (B2, B3) */
function herderStep(cfg: GameConfig, state: GameState, rng: Rng, h: Helper, quality: Record<string, number>): void {
  const H = cfg.helpers.herder;
  const t = state.time;
  const horse = h.herd === 'horse';
  if (horse) ensureHorseCamp(cfg, state, h, quality);
  const home = homeOf(state, h);
  if (isNight(t, cfg.time)) {
    h.tx = home.x;
    h.tz = home.z;
    if (moveToward(h, H.speed)) h.mode = 'sleep';
    return;
  }
  h.mode = 'work';
  const f = flock(state, h.herd);
  if (!f.list.length) {
    h.tx = home.x;
    h.tz = home.z;
    moveToward(h, H.speed);
    return;
  }
  if ((state.step + h.id) % H.decideEverySteps === 0) {
    const phase = herderPhase(cfg, h, t.minute, t.day);
    let target: { x: number; z: number } | null = null;
    // 1) Чоно сүрэг рүү дайрч байна — анзаарвал (noticeRadius) тийш давхиж үргээнэ
    const ids = new Set(f.list.map((a) => a.id));
    const hunter = state.wolves.list.find((o) => o.mode === 'hunt' && ids.has(o.targetId) && Math.hypot(o.x - h.x, o.z - h.z) <= H.noticeRadius);
    if (hunter) {
      target = { x: hunter.x, z: hunter.z };
      if (Math.hypot(hunter.x - h.x, hunter.z - h.z) <= H.scareRadius) scareWolf(cfg, hunter);
    }
    if (!target && phase === 'idle') target = home;   // өдөр гэртээ (сүрэг дээрээ өдөржин байхгүй)
    if (!target) {
      const atFlock = Math.hypot(h.x - f.x, h.z - f.z) < H.atFlockDistance;
      // Сүрэгтэйгээ байхдаа: чонын нутагт ойртсон, тасарсан малыг эргүүлнэ
      let worst: Animal | null = null, wd = 0, wolfDen: { x: number; z: number; r: number } | null = null;
      for (const a of f.list) {
        if (a.mode === 'home' || a.mode === 'sleep' || a.mode === 'driven' || a.mode === 'drink') continue;
        const den = state.wolves.dens.find((d) => Math.hypot(a.x - d.x, a.z - d.z) < d.r + H.wolfAvoid);
        const stray = Math.hypot(a.x - f.x, a.z - f.z);
        const score = den ? 1000 + stray : stray > H.strayDistance ? stray : 0;
        if (score > wd) {
          wd = score;
          worst = a;
          wolfDen = den ?? null;
        }
      }
      if (worst && (atFlock || wolfDen)) {
        target = { x: worst.x, z: worst.z };
        if (Math.hypot(worst.x - h.x, worst.z - h.z) < 12) {
          if (wolfDen) {
            // Чонын нутгаас эсрэг тийш тууна: ойролцоох сүргийн малыг хамт
            const ux = worst.x - wolfDen.x, uz = worst.z - wolfDen.z, l = Math.hypot(ux, uz) || 1;
            const R = wolfDen.r + H.wolfAvoid + 15;
            const gx = wolfDen.x + (ux / l) * R, gz = wolfDen.z + (uz / l) * R;
            for (const a of f.list) if (Math.hypot(a.x - worst.x, a.z - worst.z) < 20 && a.mode !== 'home' && a.mode !== 'sleep') driveAnimal(a, gx + (a.x - worst.x) * 0.3, gz + (a.z - worst.z) * 0.3, rng, state.step);
          } else {
            const goal = phase === 'evening' ? eveningSpot(cfg, rng, h, home, worst.species) : { x: f.x, z: f.z };
            driveAnimal(worst, goal.x, goal.z, rng, state.step);
          }
        }
      }
      if (!target && !atFlock) target = { x: f.x, z: f.z };   // сүрэг рүүгээ явна
      if (!target && phase === 'out') {
        // 2) Өглөө: сүргээ сайн бэлчээрт тууж гаргаад гэртээ буцна
        h.outDay = t.day;
        h.lastPasture = state.step;
        const b = horse ? bestPasture(cfg, state, quality, H.horseCamp.pastureRadius, home.x, home.z, 25) : bestPasture(cfg, state, quality, H.pastureSearchRadius);
        for (const a of f.list) if (a.mode !== 'home' && a.mode !== 'drink') driveAnimal(a, b.x + (a.x - f.x) * 0.3, b.z + (a.z - f.z) * 0.3, rng, state.step);
        target = home;
      }
      if (!target && phase === 'visit' && state.step - h.lastPasture >= H.pastureEveryMinutes) {
        // 3) Өдөр очиход: бэлчээр муудсан бол илүү сайн газар руу шилжүүлнэ
        h.lastPasture = state.step;
        const b = horse ? bestPasture(cfg, state, quality, H.horseCamp.pastureRadius, home.x, home.z, 25) : bestPasture(cfg, state, quality, H.pastureSearchRadius);
        if (b.score > areaScore(cfg, state, quality, f.x, f.z) * 1.25) {
          for (const a of f.list) if (a.mode !== 'home' && a.mode !== 'sleep' && a.mode !== 'drink') driveAnimal(a, b.x + (a.x - f.x) * 0.3, b.z + (a.z - f.z) * 0.3, rng, state.step);
          target = b;
        }
      }
      if (!target && phase === 'evening' && h.homeDriven !== t.day) {
        // 4) Орой: сүргээ хот руу (адуучин — майхан руугаа) тууж ирнэ
        h.homeDriven = t.day;
        for (const a of f.list) {
          if (a.mode === 'home' || a.mode === 'sleep') continue;
          const p = eveningSpot(cfg, rng, h, home, a.species);
          if (Math.hypot(a.x - p.x, a.z - p.z) > (horse ? H.horseCamp.nightRadius : 30)) driveAnimal(a, p.x, p.z, rng, state.step);
        }
      }
      if (!target) target = phase === 'evening' ? { x: (f.x + home.x) / 2, z: (f.z + home.z) / 2 } : { x: f.x + 6, z: f.z + 4 };
    }
    h.tx = target.x;
    h.tz = target.z;
  }
  moveToward(h, H.speed);
}

/** Орой туух газар: хонь, үхэр хотондоо; адуу адуучны майхны дэргэд (B3) */
function eveningSpot(cfg: GameConfig, rng: Rng, h: Helper, home: { x: number; z: number }, sp: Species): { x: number; z: number } {
  if (h.herd !== 'horse') return homeSpot(cfg, rng, sp);
  const r = Math.sqrt(rng.next()) * cfg.helpers.herder.horseCamp.nightRadius * 0.8, a = rng.range(0, Math.PI * 2);
  return { x: home.x + Math.cos(a) * r, z: home.z + Math.sin(a) * r };
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

/** Тээврийн хоёр талын аялал: хугацаа (минут), түлшний зардал (₮) */
function tripCost(cfg: GameConfig, state: GameState, id: VehicleId): { total: number; fuelCost: number } {
  const camp = cfg.worldmap.locations[state.campId]!, sum = cfg.worldmap.locations[sumId(cfg)]!;
  const km = Math.hypot(sum.x - camp.x, sum.z - camp.z);
  const total = Math.round((2 * km) / mapSpeedKmPerMin(cfg, id));
  return { total, fuelCost: ((2 * km * vehicleCfg(cfg, id).fuelPer100km) / 100) * cfg.vehicles.fuelPricePerL };
}

/** Жолооч ачаатай тээврээр хөдөлнө (автомат ба гараар явуулах хоёрт нийтлэг) */
function startTrip(cfg: GameConfig, state: GameState, h: Helper, f: GameState['fleet'][number], cargo: Partial<Record<ProductId, number>>): void {
  const { total, fuelCost } = tripCost(cfg, state, f.id);
  if (fuelCost > 0) {
    state.money -= fuelCost;
    state.today.expenses.fuel = (state.today.expenses.fuel ?? 0) + fuelCost;
  }
  f.place = 'map';
  f.cargo = {};
  h.trip = { vehicle: f.id, remaining: total, total, cargo };
  h.mode = 'away';
}

/** Сул (аялалд яваагүй) жолооч */
export function idleDriver(state: GameState): Helper | undefined {
  return state.helpers.list.find((h) => h.task === 'drive' && !h.trip);
}
export function hasDriver(state: GameState): boolean {
  return state.helpers.list.some((h) => h.task === 'drive');
}

/** Тоглогч ачсан тээврээ жолоочоор сумын төв рүү шууд явуулна. Болохгүй бол шалтгааныг буцаана */
export function sendDriver(cfg: GameConfig, state: GameState, vehicle: VehicleId): Msg | null {
  const f = state.fleet.find((x) => x.id === vehicle);
  if (!f || f.place !== 'camp' || state.player.driving === f.id) return m('sim.the_vehicle_must_be');
  if (!hasDriver(state)) return m('sim.no_driver');
  const h = idleDriver(state);
  if (!h) return m('sim.driver_is_busy');
  if (f.animals.length || f.orders.length) return m('sim.driver_goods_only');
  if (!Object.values(f.cargo).some((n) => (n ?? 0) > 1e-9)) return m('sim.driver_no_cargo');
  if (tripCost(cfg, state, f.id).fuelCost > state.money + 1e-9) return m('sim.driver_no_fuel');
  startTrip(cfg, state, h, f, { ...f.cargo });
  return null;
}

/** 9 цагийн автомат аяллыг асаах/унтраах */
export function setAutoTrip(state: GameState, on: boolean): void {
  state.helpers.autoTrip = on;
}

/** Жолоочийн аялал: departHour-д ачаад сумын төв явна (газрын зургаар хийсвэр) */
function driverStep(cfg: GameConfig, state: GameState, h: Helper): HelperEvent[] {
  const D = cfg.helpers.driver;
  if (h.trip) {
    const tr = h.trip;
    tr.remaining -= 1;
    // Сумын төвд (аяллын дунд) хүрэхэд Худалдаачин хаалттай бол нээгдэхийг хүлээнэ; нээлттэй бол тэр үеийн үнээр зарна.
    // Зарсны дараа буцах замд дэлгүүр хаагдсан ч буцааж татахгүй (өмнө нь татаад маргаашийн аялал алгасдаг байв).
    const atSum = Math.ceil(tr.total / 2);
    if (!tr.sale && tr.remaining < atSum) {
      if (!isOpen(cfg, 'buyer', state.time.minute)) tr.remaining = atSum;
      else {
        tr.sale = {};
        for (const [p, n] of Object.entries(tr.cargo)) tr.sale[p as ProductId] = (n ?? 0) * productPrice(cfg, p as ProductId);
      }
    }
    if (tr.remaining > 0) return [];
    // Буцаж ирлээ — зарсан мөнгө
    let income = 0;
    for (const [p, inc] of Object.entries(tr.sale ?? {})) {
      income += inc ?? 0;
      state.today.income[p as ProductId] = (state.today.income[p as ProductId] ?? 0) + (inc ?? 0);
    }
    state.money += income;
    const f = state.fleet.find((x) => x.id === tr.vehicle);
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
  // Хотод хүлээнэ
  const hp = homeOf(state, h);
  h.tx = hp.x;
  h.tz = hp.z;
  moveToward(h, cfg.helpers.child.speed);
  h.mode = isNight(state.time, cfg.time) ? 'sleep' : 'work';
  // Автомат аялал: departHour–departUntilHour цонхонд өдөрт нэг удаа. Яг 9:00-д нөхцөл бүрдээгүй бол (тээвэр эзэнтэй,
  // ачаа дутуу) цонх дуустал дахин оролдоно — өмнө нь зөвхөн яг тэр минутад шалгаад өдрийг алгасдаг байв.
  const min = state.time.minute;
  if (state.helpers.autoTrip === false || h.autoTripDay === state.time.day) return [];
  if (min < D.departHour * 60 || min > D.departUntilHour * 60) return [];
  const free = state.fleet.filter((f) => f.place === 'camp' && f.id !== state.player.driving && !f.animals.length && !f.orders.length);
  if (!free.length) return [];
  free.sort((a, b) => vehicleCfg(cfg, b.id).capacity - vehicleCfg(cfg, a.id).capacity);
  const f = free[0]!;
  const cap = vehicleCfg(cfg, f.id).capacity;
  const keepMilk = state.processors.some((p) => p.kind === 'pot' || p.kind === 'separator');
  // Тоглогч урьдчилж ачсан ачаа хамт явна; үлдсэн зайг агуулахаас дүүргэнэ (эхлээд тоолно — авч буцааж хийвэл шинэлэг байдал эвдэрнэ)
  const plan: Partial<Record<ProductId, number>> = {};
  let units = Object.values(f.cargo).reduce((s, n) => s + (n ?? 0), 0);
  for (const p of ['cashmere', 'urum', 'aaruul', 'felt', 'wool', 'tarag', 'milk'] as ProductId[]) {
    if (p === 'milk' && keepMilk) continue;
    const n = Math.min(storage.count(state, p), cap - units);
    if (n <= 1e-9) continue;
    plan[p] = n;
    units += n;
  }
  if (units < Math.min(D.minUnits, cap)) return [];
  const cargo: Partial<Record<ProductId, number>> = { ...f.cargo };
  for (const [p, n] of Object.entries(plan)) cargo[p as ProductId] = (cargo[p as ProductId] ?? 0) + storage.take(state, p as ProductId, n ?? 0);
  h.autoTripDay = state.time.day;
  startTrip(cfg, state, h, f, cargo);
  return [];
}

/** Минут бүр: бүх туслах ажиллана */
export function helpersStep(cfg: GameConfig, state: GameState, rng: Rng, quality: Record<string, number>): HelperEvent[] {
  const ev: HelperEvent[] = [];
  // Адуучин биш болсон (халагдсан, үүрэг сольсон) туслахын майхныг авна
  const hs = state.helpers;
  if (hs.dwellings.some((d) => d.kind === 'horseCamp')) {
    hs.dwellings = hs.dwellings.filter((d) => d.kind !== 'horseCamp' || hs.list.some((h) => h.id === d.helperId && h.task === 'herd' && h.herd === 'horse'));
  }
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
export function sendOtor(cfg: GameConfig, state: GameState, helperId: number, animalIds: number[], campId: string): Msg | null {
  const h = state.helpers.list.find((x) => x.id === helperId);
  if (!h || h.kind !== 'adult') return m('sim.no_herder');
  if (h.trip || h.task === 'otor') return m('sim.the_herder_is_busy_59');
  if (spareTents(state) <= 0) return m('sim.sending_an_otor_needs');
  if (!cfg.camps.camps[campId] || campId === state.campId) return m('sim.choose_another_camp');
  const animals = state.animals.filter((a) => animalIds.includes(a.id) && !a.riding);
  if (!animals.length) return m('sim.no_animals_selected');
  state.animals = state.animals.filter((a) => !animals.includes(a));
  for (const a of animals) a.mode = 'graze';
  state.helpers.otor.push({ helperId, campId, animals, days: 0 });
  h.task = 'otor';
  h.mode = 'away';
  return null;
}

/** Отроос буцаах: мал хотын ойролцоо ирнэ */
export function recallOtor(cfg: GameConfig, state: GameState, helperId: number, rng: Rng): Msg | null {
  const g = state.helpers.otor.find((x) => x.helperId === helperId);
  const h = state.helpers.list.find((x) => x.id === helperId);
  if (!g || !h) return m('sim.no_otor');
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
  // Цуглуулагч хүүхэд хамт буцна; отор дээр үлдсэн бүтээгдэхүүн хаягдана
  if (g.collectorId !== undefined) setOtorCollector(state, g.collectorId, null);
  return null;
}

/** Хүүхдийг отор руу цуглуулагчаар явуулах (campId) эсвэл гэрт буцаах (null) */
export function setOtorCollector(state: GameState, childId: number, campId: string | null): Msg | null {
  const c = state.helpers.list.find((x) => x.id === childId);
  if (!c || c.kind !== 'child') return m('sim.no_child');
  for (const g of state.helpers.otor) if (g.collectorId === childId) g.collectorId = undefined;
  if (campId === null) {
    c.task = 'collect';
    c.mode = 'work';
    const p = homeOf(state, c);
    c.x = c.tx = p.x;
    c.z = c.tz = p.z;
    return null;
  }
  const g = state.helpers.otor.find((x) => x.campId === campId);
  if (!g) return m('sim.no_otor_at_that');
  if (g.collectorId !== undefined) return m('sim.that_otor_already_has');
  g.collectorId = childId;
  c.task = 'otor';
  c.mode = 'away';
  c.carry = [];
  return null;
}

/** Отор дээрх бүтээгдэхүүнийг авах (тоглогч газрын зураг дээр тэр бууцанд ирсэн байх): тээвэрт эсвэл гартаа */
export function takeFromOtor(cfg: GameConfig, state: GameState, campId: string): { took: number; err: Msg | null } {
  const p = state.player;
  const g = state.helpers.otor.find((x) => x.campId === campId);
  if (!g) return { took: 0, err: m('sim.no_otor_at_that') };
  const loc = cfg.worldmap.locations[campId];
  if (p.place !== 'map' || !loc || Math.hypot(state.map.x - loc.x, state.map.z - loc.z) > cfg.worldmap.arriveRadiusKm + 1e-6) return { took: 0, err: m('sim.go_to_the_otor') };
  const f = p.driving ? state.fleet.find((x) => x.id === p.driving) : undefined;
  let room = f
    ? cfg.vehicles[f.id].capacity - Object.values(f.cargo).reduce((s, n) => s + (n ?? 0), 0) - f.orders.reduce((s, o) => s + (o.kind === 'hay' ? o.n : 0), 0)
    : cfg.products.carryUnits - p.carry.reduce((s, c) => s + c.amount, 0);
  let took = 0;
  for (const it of g.items ?? []) {
    if (room <= 1e-9) break;
    const n = Math.min(it.amount, room);
    if (n <= 1e-9) continue;
    if (f) f.cargo[it.product] = (f.cargo[it.product] ?? 0) + n;
    else {
      const c = p.carry.find((x) => x.product === it.product);
      if (c) c.amount += n;
      else p.carry.push({ product: it.product, amount: n, age: 0 });
    }
    it.amount -= n;
    room -= n;
    took += n;
  }
  g.items = (g.items ?? []).filter((it) => it.amount > 1e-9);
  if (!took) return { took, err: (g.items.length ? m('sim.no_space_to_load') : m('sim.no_products_to_take')) };
  return { took, err: null };
}

/** Өдрийн эцэс: отор дээрх мал тэр бууцны бэлчээрээр таргалж/турна, бууц доройтоно, бага зэрэг чонын эрсдэл */
export function dailyOtor(cfg: GameConfig, state: GameState, rng: Rng): HelperEvent[] {
  const ev: HelperEvent[] = [];
  const deg = cfg.pasture.degradation;
  for (const g of state.helpers.otor) {
    g.days += 1;
    const camp = state.camps[g.campId]!;
    const d = camp.degrade;
    // M5.5: улирал, цас, тэр бууцны өвс
    const season = seasonOf(cfg, state.time.day);
    const cc = cfg.camps.camps[g.campId]!;
    const mainType = cc.rings[1]?.[1] ?? 'steppe';
    const access = snowAccess(cfg, camp.snow ?? 0, mainType);
    const grassF = Math.min(1, (camp.grass ?? 0.85) / 0.5);
    let gut = Math.max(0.15, (1 - 0.75 * d) * access * grassF);
    const dq0 = typeQualities(cfg, d, season)[mainType] ?? 0.6;
    // Тэр бууцны боодол өвс (өвөл, хавар)
    const hc = cfg.seasons.hay;
    const su0 = g.animals.reduce((s, a) => s + sheepUnits(a, cfg.animals), 0);
    let dq = dq0;
    if (hc.feedSeasons.includes(season) && (camp.hay ?? 0) > 0 && gut < hc.fillTo && su0 > 0) {
      const need = ((hc.fillTo - gut) * su0) / hc.sheepDaysPerBale;
      const give = Math.min(need, camp.hay);
      const fill = (give / need) * (hc.fillTo - gut);
      dq = (gut * dq0 + fill * hc.quality) / (gut + fill);
      gut += fill;
      camp.hay -= give;
    }
    const cold = cfg.seasons.cold.conditionLossPerNight[season] * (cc.shed ? 0.3 : 1);
    const collector = g.collectorId !== undefined && state.helpers.list.some((x) => x.id === g.collectorId);
    g.items = g.items ?? [];
    // Хуучин бүтээгдэхүүн: сүү → тараг → муудна; цуглуулагчгүй бол ноос 2 хоногт хийснэ
    for (const it of g.items) {
      it.age += 1;
      if (it.product === 'milk' && it.age >= 1) it.product = 'tarag';
    }
    g.items = g.items.filter((it) => !(it.product === 'tarag' && it.age >= 2) && (collector || it.age < 2));
    const add = (product: ProductId, amount: number): void => {
      if (!collector && (product === 'milk' || product === 'tarag')) return;   // хүн алга — сүү тэр өдөртөө муудна
      const it = g.items!.find((x) => x.product === product && x.age === 0);
      if (it) it.amount += amount;
      else g.items!.push({ product, amount, age: 0 });
    };
    const drops = cfg.products.drops;
    for (const a of g.animals) {
      const dc = dailyConditionDelta(gut, dq, false, cfg.animals) - (a.species === 'cow' || a.species === 'horse' ? cold * 0.5 : cold);
      a.condition = Math.min(1, Math.max(0, a.condition + dc));
      // Сүү, ноос (night.ts → morning-тэй адил дүрэм)
      if (a.species === 'cow' && a.sex === 'f' && a.lactating) add('milk', dailyMilkLiters(cfg, { condition: a.condition, lastGut: gut }));
      const rule = a.species === 'sheep' ? drops.wool : a.species === 'goat' ? drops.cashmere : null;
      if (rule && a.age >= 1 && a.condition >= rule.minCondition) {
        a.fiberDays += intakeFactor(cfg, gut);
        if (a.fiberDays >= rule.everyDays) {
          a.fiberDays -= rule.everyDays;
          add(a.species === 'sheep' ? 'wool' : 'cashmere', rule.amount);
        }
      }
      if (a.condition <= 0) a.health -= cfg.animals.condition.zeroConditionHealthLossPerDay;
      else a.health = Math.min(100, a.health + 2);
      a.age += 1 / cfg.time.animalYearDays;
      a.lastGut = gut;
    }
    g.animals = g.animals.filter((a) => a.health > 0);
    // Тэр бууцны доройтол (dailyCampDegrade нь эзгүй бууцыг сэргээсний дараа)
    const su = g.animals.reduce((s, a) => s + sheepUnits(a, cfg.animals), 0);
    camp.degrade = Math.min(1, camp.degrade + deg.recoverPerDayWhenAway + degradeGain(cfg, su));
    camp.grass = Math.max(0.05, (camp.grass ?? 0.85) - 0.12 * (su / deg.campCapacitySheepUnits) * access);   // B1: торны идэлттэй ойролцоо
    // Чоно
    const lvl = cfg.camps.camps[g.campId]?.wolfLevel ?? 'medium';
    const p = ((cfg.helpers.otor.wolfLossPerDay as Record<string, number>)[lvl] ?? 0.02) * (cfg.seasons.otorWolfMult[season] ?? 1);
    const prey = g.animals.filter((a) => a.species === 'sheep' || a.species === 'goat');
    const dif = state.settings.difficulty;   // M6.10
    if (prey.length && rng.chance(p * dif.wolves) && dif.animalsDie) {
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
