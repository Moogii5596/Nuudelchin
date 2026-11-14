/**
 * Тэнцвэрийн симулятор: game/src/sim-ийг 3D-гүйгээр олон seed × стратегиар тоглуулна.
 *
 *   cd game && npx tsx ../tools/balance_sim/run.ts --seeds 30 --days 150
 *
 * Анхааруулга: стратегиуд бүтээгдэхүүн түүхэд алхах хугацааг тооцохгүй (proximity=false).
 * Тиймээс энэ нь гараар тоглолтын ДЭЭД хязгаар. Туслах (M5) ороогүй.
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
  const q = typeQualities(cfg, sim.state.camps[sim.state.campId]?.degrade ?? 0);
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

/** Одоогийн бууц threshold-оос их доройтсон бол хамгийн бага доройтолтой бууц руу нүүнэ */
function rotateCamp(sim: Sim, threshold: number): boolean {
  const { state } = sim;
  if (pendingTrip || state.move || state.player.away) return false;
  if ((state.camps[state.campId]?.degrade ?? 0) < threshold) return false;
  const best = Object.entries(state.camps).filter(([id]) => id !== state.campId).sort((a, b) => a[1].degrade - b[1].degrade)[0];
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
  if (state.home !== 'ger' && su >= cfg.economy.goalSheepUnits) tryBuy({ kind: 'ger' }, 0);
  // M4.6: эхлэлд тээвэргүй — морин тэрэг эхэнд авна (их ачаа, мал зөөнө)
  if (!state.vehicles.length) tryBuy({ kind: 'vehicle', id: 'horseCart' }, reserve / 2);
  if (!state.processors.some((p) => p.kind === 'pot')) tryBuy({ kind: 'processor', id: 'pot' }, reserve);
  if (state.storageLevel === 0 && storage.used(state) > 14) tryBuy({ kind: 'storage' }, reserve);
  if (state.dogs.length < dogs && state.processors.length) tryBuy({ kind: 'dog' }, reserve);
  // Сүрэг өсгөх: хязаалан эм хонь (тэргэнд 3). Зорилгод хүрэх хонин толгой хүрсний дараа гэрт хуримтлуулна
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
      if (sim.state.home !== 'ger' && herdSheepUnits(sim.state, sim.cfg.animals) >= sim.cfg.economy.goalSheepUnits) orders.push({ kind: 'ger' });
      tripIfUseful(sim, orders, 1, surplusMales(sim));
    }
  },
};

interface RunResult {
  goalDay: number | null;
  reports: DayReport[];
  wolfKills: number;
  killsBySp: Record<string, number>;
}

function run(cfg: GameConfig, strat: Strategy, seed: number): RunResult {
  const sim = new Sim(cfg, createInitialState(cfg, seed));
  const reports: DayReport[] = [];
  let wolfKills = 0;
  const killsBySp: Record<string, number> = {};
  sim.on((e) => {
    if (e.type === 'hour') strat.onHour(sim, e.hour);
    if (e.type === 'dayReport') reports.push(e.report);
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
    if (pendingTrip && pendingTrip.tick(sim)) pendingTrip = null;
  }
  return { goalDay: sim.state.goalReachedDay, reports, wolfKills, killsBySp };
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
for (const strat of [active, medium, stayer, lazy].filter((s) => !only || only.includes(s.name))) {
  const t0 = performance.now();
  const results = Array.from({ length: SEEDS }, (_, i) => run(cfg, strat, 1000 + i));
  const goalDays = results.map((r) => r.goalDay).filter((d): d is number => d !== null);
  console.log(`## ${strat.name}  (${((performance.now() - t0) / 1000).toFixed(1)} сек)`);
  console.log(`Зорилгод хүрсэн: ${goalDays.length}/${SEEDS}` + (goalDays.length ? ` · медиан ${median(goalDays)}-р өдөр (1× хурдаар ~${(median(goalDays) * dayHours).toFixed(1)} цаг)` : '') + ` · чонод барьдсан (медиан) ${median(results.map((r) => r.wolfKills))} мал` + killsTxt(results));
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
