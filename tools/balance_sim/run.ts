/**
 * Тэнцвэрийн симулятор: game/src/sim-ийг 3D-гүйгээр олон seed × стратегиар тоглуулна.
 *
 *   cd game && npx tsx ../tools/balance_sim/run.ts --seeds 30 --days 150
 *
 * Анхааруулга: стратегиуд бүтээгдэхүүн түүхэд алхах хугацааг тооцохгүй (proximity=false).
 * Тиймээс энэ нь гараар тоглолтын ДЭЭД хязгаар.
 * M5: «Менежер» — тоглогч бараг юу ч хийхгүй, туслах айл хөлсөлж (малчин + хүүхэд цуглуулагч), жолоочоор зарна.
 *
 * M4: чоно дайрна (`--wolves.attack.enabled 0` — унтраах). Стратегиуд малчныг сүргийнхээ дэргэд
 * байлгах (escort) хувиар ялгаатай, нохой авна. «Үлддэг» = Дунд, гэхдээ бууцаа хэзээ ч сэлгэхгүй
 * (M4-ийн гарах шалгуур: нэг бууцанд удахад өвс сулрах нь мэдрэгдэх эсэх).
 *   --only Дунд,Үлддэг — зөвхөн эдгээр стратеги
 */
import { loadConfig, type GameConfig, type Species } from '../../game/src/sim/config';
import { createInitialState, type BuyOrder, type ProductId } from '../../game/src/sim/state';
import { Sim, type DayReport } from '../../game/src/sim/sim';
import { herdSheepUnits } from '../../game/src/sim/systems/animals';
import { absBiomass, typeIdOf, typeQualities } from '../../game/src/sim/systems/pasture';
import * as storage from '../../game/src/sim/systems/storage';
import { bestTruck, orderPrice } from '../../game/src/sim/systems/trip';
import { AutoTrip } from '../../game/src/sim/autotrip';
import { realSecondsPerDay } from '../../game/src/sim/clock';
import { findHerds } from '../../game/src/sim/systems/herds';
import { gerLadder, goalGerReached } from '../../game/src/sim/systems/gerLayout';
import { bedsTotal, bedsUsed } from '../../game/src/sim/systems/helpers';
import { campAccess, seasonOf, seasonProgress } from '../../game/src/sim/systems/seasons';
import type { Season } from '../../game/src/sim/config';

/** Гэр худалдаж авсны дараа үлдээх мөнгө (тоглогч бүх мөнгөө үргүй зарахгүй; «тэг орчим» гацалт бот л биш) */
const GER_RESERVE = 150_000;

/** Зорилгын гэр (5+ ханат) хүртэл дараагийн хэмжээг шатаар худалдан авна; захиалга замд яваа бол дахиж авахгүй */
function nextGerOrder(sim: Sim): BuyOrder | null {
  const st = sim.state;
  if (goalGerReached(sim.cfg, st)) return null;
  const pending = [...st.player.orders, ...st.fleet.flatMap((f) => f.orders)].some((o) => o.kind === 'ger');
  if (pending) return null;
  const ladder = gerLadder(sim.cfg.ger);
  const next = ladder[st.home === 'ger' ? ladder.indexOf(st.homeSize) + 1 : 0];
  return next ? { kind: 'ger', size: next } : null;
}
/** Хонин толгой бүрт бэлтгэх боодол өвс (--hay 0 — өвс авахгүй) */
const hayPerSU = Number(process.argv.includes('--hay') ? process.argv[process.argv.indexOf('--hay') + 1] : 0.5);

const args = Object.fromEntries(
  process.argv.slice(2).reduce<[string, string][]>((acc, v, i, arr) => {
    if (v.startsWith('--')) acc.push([v.slice(2), arr[i + 1] ?? '']);
    return acc;
  }, []),
);
const SEEDS = Number(args.seeds ?? 30);
const DAYS = Number(args.days ?? 150);

/** `--time.animalYearDays 30` хэлбэрийн аргументаар тохиргоог түр өөрчилнө */
function applyOverrides(cfg: GameConfig): string[] {
  const applied: string[] = [];
  for (const [k, v] of Object.entries(args)) {
    if (!k.includes('.')) continue;
    const path = k.split('.');
    let o: Record<string, unknown> = cfg as unknown as Record<string, unknown>;
    for (const p of path.slice(0, -1)) o = o[p] as Record<string, unknown>;
    o[path[path.length - 1]!] = Number(v);
    applied.push(`${k}=${v}`);
  }
  return applied;
}

type Strategy = {
  name: string;
  onHour: (sim: Sim, hour: number) => void;
  /** Малчин хонин сүргийн дэргэд байх цагууд (чоноос хамгаална) */
  escortHours?: [number, number];
};

/** Малчныг хамгийн том хонин сүргийн төвд байлгана (10 минут тутам) */
function escort(sim: Sim): void {
  const herds = findHerds(sim.state, sim.cfg.pasture.grazing.herd.linkRadius).filter((h) => h.key === 'sheep');
  const h = herds.sort((a, b) => b.members.length - a.members.length)[0];
  if (h) sim.command({ type: 'movePlayer', x: h.x, z: h.z }, false);
}

/** Нохой хонин сүргийг хамгаална */
function dogsGuard(sim: Sim): void {
  if (sim.state.dogs.some((d) => d.order !== 'guardHerd')) sim.command({ type: 'dogOrder', dog: 'all', order: 'guardHerd', herd: 'sheep' }, false);
}

const SELL_ORDER: ProductId[] = ['cashmere', 'urum', 'aaruul', 'felt', 'wool', 'tarag', 'milk'];

function collectAll(sim: Sim): void {
  // Эхлээд гартаа байгаагаа хадгална (агуулах дүүрсэн бол гарт үлдэнэ)
  if (sim.state.player.carry.length && !sim.command({ type: 'deposit' }, false).ok) return;
  for (let k = 0; k < 50 && sim.state.items.length; k++) {
    const r = sim.command({ type: 'pickup', ids: sim.state.items.map((i) => i.id) }, false);
    if (!r.ok) break;
    if (!sim.command({ type: 'deposit' }, false).ok) break;
  }
}

function processAll(sim: Sim): void {
  for (const p of sim.state.processors) {
    if (p.remaining === 0) sim.command({ type: 'process', kind: p.kind }, false);
  }
}

/** Илүүдэл эр мал (үржлийн 1 эрээс бусад, 0.75+ настай) — тэргэнд багтах хэмжээгээр */
function surplusMales(sim: Sim): number[] {
  const { cfg, state } = sim;
  // Тээвэргүй бол морьтой тууж очно (удаан) — 3-аас илүүг авч явахгүй
  const v = bestTruck(cfg, state) ?? (state.vehicles.includes('horseCart') ? 'horseCart' : null);
  const slots = v ? cfg.vehicles[v].sheepSlots : 3;
  const rams = state.animals
    .filter((a) => a.species === 'sheep' && a.sex === 'm' && !a.riding)
    .sort((a, b) => b.age - a.age);
  const keep = rams.find((a) => a.age >= 1 && a.age < cfg.animals.species.sheep.oldAge);
  return rams.filter((a) => a !== keep && a.age >= 0.75).slice(0, slots).map((a) => a.id);
}

/** Явж буй автомат аялал (M4.6: газрын зургаар сумын төвийн Худалдаачин руу). run() алхам бүрийн дараа tick хийнэ */
let pendingTrip: AutoTrip | null = null;

function tripIfUseful(sim: Sim, buy: BuyOrder[], minUnits: number, sellAnimalIds: number[] = []): void {
  const { cfg, state } = sim;
  if (pendingTrip || state.player.away) return;
  // Тээвэргүй бол морьтой — гартаа carryUnits хүртэл
  const v = bestTruck(cfg, state) ?? (state.vehicles.includes('horseCart') ? 'horseCart' : null);
  const cap = v ? cfg.vehicles[v].capacity : cfg.products.carryUnits;
  const sell: Partial<Record<ProductId, number>> = {};
  let units = 0;
  for (const p of SELL_ORDER) {
    // Тогоотой бол шинэ сүүг боловсруулахад үлдээнэ
    if (p === 'milk' && state.processors.length) continue;
    const n = Math.min(storage.count(state, p), cap - units);
    if (n > 0) {
      sell[p] = n;
      units += n;
    }
  }
  if (units < Math.min(minUnits, cap) && buy.length === 0 && sellAnimalIds.length === 0) return;
  pendingTrip = new AutoTrip({ sell, sellAnimalIds, buy });
}

/** Бууцны төвөөс 150 м дотор хамгийн сайн бэлчээрийн цэг (чанар^1.5 × өвс). Чонын нутгаас (улаан тойрог) зайдуу */
function bestSpot(cfg: GameConfig, sim: Sim, minCm: number): { x: number; z: number } {
  const dens = sim.state.wolves.dens;
  const g = sim.state.grass;
  const q = typeQualities(cfg, sim.state.camps[sim.state.campId]?.degrade ?? 0, seasonOf(cfg, sim.state.time.day));
  let best = -1, bx = 30, bz = 0;
  for (let iz = 0; iz < g.n; iz += 4) {
    for (let ix = 0; ix < g.n; ix += 4) {
      const x = -g.half + (ix + 0.5) * g.cell, z = -g.half + (iz + 0.5) * g.cell;
      const r = Math.hypot(x, z);
      if (r > 150 || r < 25) continue;
      if (dens.some((d) => Math.hypot(x - d.x, z - d.z) < d.r + 15)) continue;
      const i = iz * g.n + ix;
      const t = cfg.pasture.types[typeIdOf(g, i)];
      if ((g.biomass[i] ?? 0) * (t?.heightCm ?? 0) < minCm) continue;
      const s = Math.pow(q[typeIdOf(g, i)] ?? 0, 1.5) * absBiomass(cfg, g, i) - r * 0.001;
      if (s > best) {
        best = s;
        bx = x;
        bz = z;
      }
    }
  }
  return { x: bx, z: bz };
}

/** M5.5: улирал бүрт тохирох бууцнууд (хэрэглэгчийн дүрэм: өвөл өвөр, хавар ар, зун голын бэл/энгэр, намар энгэр) */
const SEASON_CAMPS: Record<Season, string[]> = {
  summer: ['river', 'valley'],
  autumn: ['valley', 'river'],
  winter: ['southSlope'],
  spring: ['northSlope', 'southSlope'],
};

/**
 * Улиралд тохирохгүй бууцанд байвал тохирох бууц руу; тохирох бууцанд байгаа ч threshold-оос их доройтсон бол
 * тохирох бусад бууцнаас хамгийн бага доройтолтой руу нүүнэ (seasonal = false бол хуучин дүрэм).
 */
function rotateCamp(sim: Sim, threshold: number, seasonal = true): boolean {
  const { cfg, state } = sim;
  if (pendingTrip || state.move || state.player.away) return false;
  const deg = state.camps[state.campId]?.degrade ?? 0;
  const ok = seasonal ? SEASON_CAMPS[seasonOf(cfg, state.time.day)] : Object.keys(state.camps);
  const fits = ok.includes(state.campId);
  if (fits && deg < threshold) return false;
  let cands = (fits ? ok.filter((id) => id !== state.campId) : ok).filter((id) => state.camps[id]);
  if (!cands.length && deg >= threshold) cands = Object.keys(state.camps).filter((id) => id !== state.campId && id !== 'valley');
  const best = cands.map((id) => [id, state.camps[id]!] as const).sort((a, b) => a[1].degrade - b[1].degrade)[0];
  if (!best || (fits && best[1].degrade >= deg)) return false;
  if (!best) return false;
  collectAll(sim);
  return sim.command({ type: 'moveCamp', to: best[0] }, false).ok;
}

function buyPlan(sim: Sim, reserve: number, maxSU: number, dogs = 0): BuyOrder[] {
  const { cfg, state } = sim;
  const orders: BuyOrder[] = [];
  let money = state.money;
  const su = herdSheepUnits(state, cfg.animals);
  const tryBuy = (o: BuyOrder, keep: number) => {
    const p = orderPrice(cfg, state, o);
    if (money - p >= keep) {
      orders.push(o);
      money -= p;
      return true;
    }
    return false;
  };
  if (su >= cfg.economy.goalSheepUnits) { const g = nextGerOrder(sim); if (g) tryBuy(g, GER_RESERVE); }   // зорилго: том гэр (5+ ханат) + 40 хонин толгой — шатаар томсгоно
  // M4.6: эхлэлд тээвэргүй — морин тэрэг эхэнд авна (их ачаа, мал зөөнө)
  if (!state.vehicles.length) tryBuy({ kind: 'vehicle', id: 'horseCart' }, reserve / 2);
  if (!state.processors.some((p) => p.kind === 'pot')) tryBuy({ kind: 'processor', id: 'pot' }, reserve);
  if (state.storageLevel === 0 && storage.used(state) > 14) tryBuy({ kind: 'storage' }, reserve);
  if (state.dogs.length < dogs && state.processors.length) tryBuy({ kind: 'dog' }, reserve);
  // Сүрэг өсгөх: хязаалан эм хонь (тэргэнд 3). Зорилгод хүрэх хонин толгой хүрсний дараа гэрт хуримтлуулна
  // M5.5: өвөл, хавар (намрын сүүлээр) бууцандаа боодол өвс бэлтгэнэ
  const sp = seasonProgress(cfg, state.time.day);
  const acc = campAccess(cfg, state.camps[state.campId]?.snow ?? 0);
  // Цас их эсвэл саравчгүй бууцанд л, тэргэтэй үед (морьтой 2 боодол авах нь ашиггүй)
  if (state.vehicles.length && (sp.season === 'winter' || sp.season === 'spring') && (acc < 0.7 || !cfg.camps.camps[state.campId]?.shed)) {
    const want = Math.ceil(su * hayPerSU) - Math.floor(state.camps[state.campId]?.hay ?? 0);
    if (want > 0) tryBuy({ kind: 'hay', n: Math.min(want, 30) }, reserve / 3);
  }
  if (su < maxSU) for (let k = 0; k < 3; k++) if (!tryBuy({ kind: 'animal', species: 'sheep', sex: 'f', age: 3 }, reserve * 2)) break;
  return orders;
}

const active: Strategy = {
  name: 'Идэвхтэй',
  escortHours: [7, 20],
  onHour(sim, hour) {
    const { cfg, state } = sim;
    if (hour === 7 && rotateCamp(sim, 0.25)) return;
    if (hour === 7) {
      dogsGuard(sim);
      state.neighborBull = true;
      for (const sp of ['sheep', 'cow'] as Species[]) {
        const spot = bestSpot(cfg, sim, cfg.animals.species[sp].minGrassCm + 1);
        sim.command({ type: 'drive', species: sp, x: spot.x, z: spot.z });
      }
    }
    collectAll(sim);
    processAll(sim);
    if (hour === 9 || hour === 16)
      tripIfUseful(sim, hour === 9 ? buyPlan(sim, 400_000, cfg.economy.goalSheepUnits + 5, 1) : [], 12, hour === 9 ? surplusMales(sim) : []);
  },
};

function mediumStrategy(name: string, rotate: boolean): Strategy {
  return {
    name,
    escortHours: [7, 12],
    onHour(sim, hour) {
      const { cfg, state } = sim;
      state.neighborBull = true;
      if (rotate && hour === 7 && rotateCamp(sim, 0.35)) return;
      if (hour === 7) dogsGuard(sim);
      if (hour === 8 && state.time.day % 2 === 0) {
        const spot = bestSpot(cfg, sim, 2);
        sim.command({ type: 'drive', species: 'sheep', x: spot.x, z: spot.z });
      }
      if (hour === 9 || hour === 13 || hour === 18) collectAll(sim);
      processAll(sim);
      if (hour === 10 && state.time.day % 2 === 0) tripIfUseful(sim, buyPlan(sim, 300_000, cfg.economy.goalSheepUnits, 1), 6, surplusMales(sim));
    },
  };
}
const medium = mediumStrategy('Дунд', true);
const stayer = mediumStrategy('Үлддэг', false);

const lazy: Strategy = {
  name: 'Залхуу',
  onHour(sim, hour) {
    sim.state.neighborBull = true;
    if (hour === 7 && rotateCamp(sim, 0.5)) return;
    if (hour === 10 || hour === 17) collectAll(sim);
    if (hour === 11 && sim.state.time.day % 3 === 0) {
      const orders: BuyOrder[] = [];
      if (herdSheepUnits(sim.state, sim.cfg.animals) >= sim.cfg.economy.goalSheepUnits) { const g = nextGerOrder(sim); if (g && sim.state.money >= orderPrice(sim.cfg, sim.state, g) + GER_RESERVE) orders.push(g); }
      tripIfUseful(sim, orders, 1, surplusMales(sim));
    }
  },
};


/** M5 Менежер: тоглогч өөрөө түүхгүй, хариулахгүй. Туслах айл хөлслөөд, 2 дахь малчныг жолооч болгоно */
const manager: Strategy = {
  name: 'Менежер',
  onHour(sim, hour) {
    const { cfg, state } = sim;
    state.neighborBull = true;
    const hs = state.helpers;
    if (hour === 7 && rotateCamp(sim, 0.4)) return;
    if (hour === 8) {
      sim.command({ type: 'teahouse' }, false);
      const adults = hs.list.filter((h) => h.kind === 'adult').length;
      const wantAdults = state.fleet.length ? 2 : 1;
      const monthly = (hs.list.reduce((a, h) => a + h.wage, 0) + 40_000) * cfg.helpers.payEveryDays;
      if (adults < wantAdults && state.money > monthly * 2) {
        const fam = hs.candidates.find((c) => c.family) ?? (bedsUsed(state) < bedsTotal(cfg, state) && state.money > monthly * 6 ? hs.candidates[0] : undefined);   // M6.13: гол гэр 1 ор өгдөг — ганц бие туслахыг мөнгөний нөөцтэй үед л
        if (fam) sim.command({ type: 'hire', candidate: fam.id }, false);
      }
      // Сүрэг тус бүрд малчин, үлдсэнийг жолооч
      const ad = hs.list.filter((h) => h.kind === 'adult' && h.task !== 'otor' && !h.trip);
      const groups: ('sheep' | 'cow')[] = ['sheep'];
      ad.forEach((h, i) => {
        if (i < groups.length) sim.command({ type: 'helperTask', helper: h.id, task: 'herd', herd: groups[i] }, false);
        else if (state.fleet.length) sim.command({ type: 'helperTask', helper: h.id, task: 'drive' }, false);
      });
    }
    // Цуглуулагч хүүхэдгүй бол тоглогч өөрөө түүнэ (Залхуу шиг)
    if (!hs.list.some((h) => h.kind === 'child') && (hour === 10 || hour === 17)) collectAll(sim);
    processAll(sim);
    // Тоглогч 3 хоногт нэг удаа худалдан авалтаар сумын төв явна (тэрэг, гэр, тогоо, байр)
    if (hour === 10 && state.time.day % 3 === 0) {
      const orders = buyPlan(sim, 500_000, cfg.economy.goalSheepUnits, 1);
      if (!hs.list.some((h) => h.family) && bedsTotal(cfg, state) <= bedsUsed(state) && state.money > 6_500_000) orders.push({ kind: 'gerAdd', size: cfg.ger.home.size });
      tripIfUseful(sim, orders, 1, surplusMales(sim));
    }
  },
};

interface RunResult {
  goalDay: number | null;
  reports: DayReport[];
  wolfKills: number;
  killsBySp: Record<string, number>;
  helpers: number;
  wages: number;
  bySeason: Record<string, { inc: number; days: number; cond: number; hay: number; births: number }>;
  driverIncome: number;
  /** M6.6: тогтвортой амьдрах — 10-р өдрөөс хойших хонин толгойн доод цэг, мөнгө «тэг орчим» (< LOW_MONEY) дараалсан хамгийн урт өдөр, сүйрсэн эсэх */
  minSU: number;
  longestLow: number;
  collapsed: boolean;
}

/** «Тэг орчим мөнгө» ба «сүрэг сүйрсэн» босго (mvp-spec §10.3, M6.6) */
const LOW_MONEY = 30_000;
const COLLAPSE_SU = 10;

function run(cfg: GameConfig, strat: Strategy, seed: number): RunResult {
  const sim = new Sim(cfg, createInitialState(cfg, seed));
  const reports: DayReport[] = [];
  let wolfKills = 0;
  const killsBySp: Record<string, number> = {};
  let driverIncome = 0;
  sim.on((e) => {
    if (e.type === 'helperTrip') driverIncome += e.income;
    if (e.type === 'hour') strat.onHour(sim, e.hour);
    if (e.type === 'dayReport') reports.push(e.report);
    if (process.env.DEBUG_RUN && seed === 1000 && e.type === 'dayReport' && e.report.day >= 14 && e.report.day <= 50) console.log('D', e.report.day, e.report.season, sim.state.campId, 'inc', JSON.stringify(e.report.income), 'exp', JSON.stringify(e.report.expenses), 'col', JSON.stringify(e.report.collected), 'sp', JSON.stringify(e.report.spoiled));
    if (process.env.DEBUG_RUN && e.type === 'dayReport' && e.report.day % 10 === 0) console.log('S', seed, e.report.day, 'proc', sim.state.processors.map((p) => p.kind).join(','), 'money', Math.round(sim.state.money), 'veh', sim.state.vehicles.join(','), 'store', JSON.stringify(sim.state.storage ?? {}));
    if (process.env.DEBUG_RUN && seed === 1000 && e.type === 'dayReport' && e.report.day % 6 === 0) console.log(e.report.day, sim.state.campId, 'cows', sim.state.animals.filter((x) => x.species === 'cow').map((c) => `${c.sex}${c.age.toFixed(1)}${c.lactating ? 'L' : ''}`).join(','), 'otor', sim.state.helpers.otor.length);
    if (e.type === 'wolfKill') {
      wolfKills++;
      killsBySp[e.species] = (killsBySp[e.species] ?? 0) + 1;
    }
  });
  const [h0, h1] = strat.escortHours ?? [99, 99];
  pendingTrip = null;
  while (sim.state.time.day <= DAYS) {
    const hour = sim.state.time.minute / 60;
    if (sim.state.step % 10 === 0 && hour >= h0 && hour < h1 && !sim.state.player.away) escort(sim);
    sim.step();
    if (pendingTrip && pendingTrip.tick(sim)) {
      if (process.env.DEBUG_RUN && pendingTrip.error) console.log('TRIP', seed, sim.state.time.day, pendingTrip.phase, pendingTrip.error);
      pendingTrip = null;
    }
  }
  const wages = reports.reduce((a, r) => a + (r.expenses.wages ?? 0), 0);
  const bySeason: RunResult['bySeason'] = {};
  for (const r of reports) {
    const b = (bySeason[r.season] ??= { inc: 0, days: 0, cond: 0, hay: 0, births: 0 });
    b.inc += Object.values(r.income).reduce((a2, n) => a2 + (n ?? 0), 0);
    b.days++;
    b.cond += r.avgCondition;
    b.hay += r.expenses.buy_hay ?? 0;
    b.births += r.births;
  }
  if (process.env.DEBUG_RUN && seed === 1000) for (const r of reports) if (r.day % 3 === 0) console.log(`${r.day} ${r.season} ${sim.state.campId.slice(0, 5)} milk ${(r.dropped.milk ?? 0).toFixed(0)} cond ${(r.avgCondition * 100).toFixed(0)} gut ${(r.avgGutFill * 100).toFixed(0)} su ${r.sheepUnits.toFixed(0)} snow ${r.snow.toFixed(0)} hay ${r.hay.toFixed(0)} fed ${r.hayFed.toFixed(1)} cold ${r.coldHit} inc ${Object.values(r.income).reduce((a2, n) => a2 + (n ?? 0), 0)}`);
  const late = reports.filter((r) => r.day >= 10);
  const minSU = late.length ? Math.min(...late.map((r) => r.sheepUnits)) : 0;
  let longestLow = 0, cur = 0;
  for (const r of reports) { cur = r.moneyEnd < LOW_MONEY ? cur + 1 : 0; longestLow = Math.max(longestLow, cur); }
  const collapsed = minSU < COLLAPSE_SU || (reports[reports.length - 1]?.sheepUnits ?? 0) < COLLAPSE_SU;
  return { goalDay: sim.state.goalReachedDay, reports, wolfKills, killsBySp, helpers: sim.state.helpers.list.length, wages, driverIncome, bySeason, minSU, longestLow, collapsed };
}

/** Бүх seed-ийн нийт: төрлөөр */
function killsTxt(results: RunResult[]): string {
  const tot: Record<string, number> = {};
  for (const r of results) for (const [k, n] of Object.entries(r.killsBySp)) tot[k] = (tot[k] ?? 0) + n;
  const parts = Object.entries(tot).map(([k, n]) => `${k} ${n}`);
  return parts.length ? ` (бүх seed: ${parts.join(', ')})` : '';
}

const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
};
const fmt = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString('en-US').replace(/,/g, ' ') : '—');

const cfg = loadConfig();
const overrides = applyOverrides(cfg);
const dayHours = realSecondsPerDay(cfg.time) / 3600;   // M4.5: шөнө хурдан өнгөрнө
console.log(`# Тэнцвэрийн тайлан — ${SEEDS} seed × ${DAYS} өдөр (1 өдөр = 1× хурдаар ${(dayHours * 60).toFixed(1)} мин)` + (overrides.length ? ` · ${overrides.join(', ')}` : '') + '\n');

const only = args.only ? String(args.only).split(',') : null;
for (const strat of [active, medium, stayer, lazy, manager].filter((s) => !only || only.includes(s.name))) {
  const t0 = performance.now();
  const results = Array.from({ length: SEEDS }, (_, i) => run(cfg, strat, 1000 + i));
  const goalDays = results.map((r) => r.goalDay).filter((d): d is number => d !== null);
  console.log(`## ${strat.name}  (${((performance.now() - t0) / 1000).toFixed(1)} сек)`);
  console.log(`Зорилгод хүрсэн: ${goalDays.length}/${SEEDS}` + (goalDays.length ? ` · медиан ${median(goalDays)}-р өдөр (1× хурдаар ~${(median(goalDays) * dayHours).toFixed(1)} цаг)` : '') + ` · чонод барьдсан (медиан) ${median(results.map((r) => r.wolfKills))} мал` + killsTxt(results));
  {
    const need = Math.ceil(SEEDS * 7 / 8), ok = results.filter((r) => !r.collapsed).length, worstLow = Math.max(...results.map((r) => r.longestLow));
    const pass = ok >= need && worstLow < 10;
    console.log(`Тогтвортой амьдрах: сүйрээгүй ${ok}/${SEEDS} (шаардлага ≥ ${need}) · хонин толгойн доод цэг (seed бүр) ${results.map((r) => r.minSU.toFixed(0)).join(', ')} · мөнгө < ${fmt(LOW_MONEY)}₮ байсан хамгийн урт ${results.map((r) => r.longestLow).join(', ')} өдөр (шаардлага < 10) · сүйрсэн seed ${SEEDS - ok} → ${pass ? '✅ ТЭНЦСЭН' : '❌ ТЭНЦЭЭГҮЙ'}`);
  }
  if (strat === manager)
    console.log(`Туслах (эцэст, медиан) ${median(results.map((r) => r.helpers))} · нийт цалин ${fmt(median(results.map((r) => r.wages)))}₮ · жолоочийн орлого ${fmt(median(results.map((r) => r.driverIncome)))}₮`);
  {
    const agg: Record<string, { inc: number; days: number; cond: number; hay: number; births: number }> = {};
    for (const r of results) for (const [k, v] of Object.entries(r.bySeason)) {
      const a = (agg[k] ??= { inc: 0, days: 0, cond: 0, hay: 0, births: 0 });
      a.inc += v.inc; a.days += v.days; a.cond += v.cond; a.hay += v.hay; a.births += v.births;
    }
    console.log('Улирлаар (бүх seed-ийн дундаж/өдөр): ' + Object.entries(agg).map(([k, a]) => `${k}: орлого ${fmt(a.inc / a.days)}₮, тарга ${Math.round((a.cond / a.days) * 100)}%, өвс тэжээл ${fmt(a.hay / a.days)}₮, төл ${(a.births / results.length).toFixed(1)}`).join(' · '));
  }
  if (process.env.INCOME_BREAKDOWN) {
    const agg: Record<string, number> = {};
    const exp: Record<string, number> = {};
    for (const r of results) for (const rep of r.reports.slice(0, 120)) {
      for (const [k, n] of Object.entries(rep.income)) agg[k] = (agg[k] ?? 0) + (n ?? 0) / results.length;
      for (const [k, n] of Object.entries(rep.expenses)) exp[k] = (exp[k] ?? 0) + (n ?? 0) / results.length;
    }
    const dr: Record<string, number> = {}, col: Record<string, number> = {}, sp: Record<string, number> = {};
    for (const r of results) for (const rep of r.reports.slice(0, 120)) {
      for (const [k, n] of Object.entries(rep.dropped)) dr[k] = (dr[k] ?? 0) + (n ?? 0) / results.length;
      for (const [k, n] of Object.entries(rep.collected)) col[k] = (col[k] ?? 0) + (n ?? 0) / results.length;
      for (const [k, n] of Object.entries(rep.spoiled)) sp[k] = (sp[k] ?? 0) + (n ?? 0) / results.length;
    }
    console.log('Унасан: ' + JSON.stringify(Object.fromEntries(Object.entries(dr).map(([k, n]) => [k, Math.round(n)]))) + ' түүсэн: ' + JSON.stringify(Object.fromEntries(Object.entries(col).map(([k, n]) => [k, Math.round(n)]))) + ' муудсан: ' + JSON.stringify(Object.fromEntries(Object.entries(sp).map(([k, n]) => [k, Math.round(n)]))));
    console.log('Орлого 1–120 өдөр: ' + Object.entries(agg).map(([k, n]) => `${k} ${fmt(n)}`).join(' · '));
    console.log('Зардал 1–120 өдөр: ' + Object.entries(exp).map(([k, n]) => `${k} ${fmt(n)}`).join(' · '));
  }
  console.log('| Өдөр | Мөнгө | Хонин толгой | Эм хонины жин | Тарга | Идэш | Өвс | Бууцны доройтол | Өдрийн орлого | Муудсан (нэгж/өдөр) |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');
  for (const d of [10, 30, 60, 100, 150, 200].filter((d) => d <= DAYS)) {
    const rs = results.map((r) => r.reports[d - 1]!).filter(Boolean);
    const win = results.map((r) => r.reports.slice(Math.max(0, d - 10), d));
    const inc = win.map((w) => w.reduce((s, x) => s + Object.values(x.income).reduce((a, b) => a + (b ?? 0), 0), 0) / w.length);
    const spoil = win.map((w) => w.reduce((s, x) => s + Object.values(x.spoiled).reduce((a, b) => a + (b ?? 0), 0), 0) / w.length);
    console.log(
      `| ${d} | ${fmt(median(rs.map((r) => r.moneyEnd)))}₮ | ${median(rs.map((r) => r.sheepUnits)).toFixed(0)} | ${median(rs.map((r) => r.avgEweKg)).toFixed(1)} кг | ${(median(rs.map((r) => r.avgCondition)) * 100).toFixed(0)}% | ${(median(rs.map((r) => r.avgGutFill)) * 100).toFixed(0)}% | ${(median(rs.map((r) => r.grass)) * 100).toFixed(0)}% | ${median(rs.map((r) => r.campDegrade)).toFixed(2)} | ${fmt(median(inc))}₮ | ${median(spoil).toFixed(1)} |`,
    );
  }
  console.log('');
}
