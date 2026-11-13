/**
 * Тэнцвэрийн симулятор: game/src/sim-ийг 3D-гүйгээр олон seed × стратегиар тоглуулна.
 *
 *   cd game && npx tsx ../tools/balance_sim/run.ts --seeds 30 --days 150
 *
 * Анхааруулга: стратегиуд бүтээгдэхүүн түүхэд алхах хугацааг тооцохгүй (proximity=false).
 * Тиймээс энэ нь гараар тоглолтын ДЭЭД хязгаар. Чоно, туслах (M4, M5) одоогоор ороогүй.
 */
import { loadConfig, type GameConfig, type Species } from '../../game/src/sim/config';
import { createInitialState, type BuyOrder, type ProductId } from '../../game/src/sim/state';
import { Sim, type DayReport } from '../../game/src/sim/sim';
import { herdSheepUnits } from '../../game/src/sim/systems/animals';
import { absBiomass, typeIdOf, typeQualities } from '../../game/src/sim/systems/pasture';
import * as storage from '../../game/src/sim/systems/storage';
import { orderPrice } from '../../game/src/sim/systems/trip';

const args = Object.fromEntries(
  process.argv.slice(2).reduce<[string, string][]>((acc, v, i, arr) => {
    if (v.startsWith('--')) acc.push([v.slice(2), arr[i + 1] ?? '']);
    return acc;
  }, []),
);
const SEEDS = Number(args.seeds ?? 30);
const DAYS = Number(args.days ?? 150);

type Strategy = {
  name: string;
  onHour: (sim: Sim, hour: number) => void;
};

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
    if (p.remaining === 0) sim.command({ type: 'process', kind: p.kind });
  }
}

/** Илүүдэл эр мал (үржлийн 1 эрээс бусад, 0.75+ настай) — тэргэнд багтах хэмжээгээр */
function surplusMales(sim: Sim): number[] {
  const { cfg, state } = sim;
  const v = state.vehicles.includes('truck') ? 'truck' : 'horseCart';
  const slots = cfg.vehicles[v].sheepSlots;
  const rams = state.animals
    .filter((a) => a.species === 'sheep' && a.sex === 'm' && !a.riding)
    .sort((a, b) => b.age - a.age);
  const keep = rams.find((a) => a.age >= 1 && a.age < cfg.animals.species.sheep.oldAge);
  return rams.filter((a) => a !== keep && a.age >= 0.75).slice(0, slots).map((a) => a.id);
}

function tripIfUseful(sim: Sim, buy: BuyOrder[], minUnits: number, sellAnimalIds: number[] = []): void {
  const { cfg, state } = sim;
  if (state.trip || state.player.away) return;
  const v = state.vehicles.includes('truck') ? 'truck' : 'horseCart';
  const cap = cfg.vehicles[v].capacity;
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
  if (units < minUnits && buy.length === 0 && sellAnimalIds.length === 0) return;
  sim.command({ type: 'trip', plan: { vehicle: v, sell, buy, sellAnimalIds } });
}

/** Бууцны төвөөс 150 м дотор хамгийн сайн бэлчээрийн цэг (чанар^1.5 × өвс) */
function bestSpot(cfg: GameConfig, sim: Sim, minCm: number): { x: number; z: number } {
  const g = sim.state.grass;
  const q = typeQualities(cfg, sim.state.camps[sim.state.campId]?.degrade ?? 0);
  let best = -1, bx = 30, bz = 0;
  for (let iz = 0; iz < g.n; iz += 4) {
    for (let ix = 0; ix < g.n; ix += 4) {
      const x = -g.half + (ix + 0.5) * g.cell, z = -g.half + (iz + 0.5) * g.cell;
      const r = Math.hypot(x, z);
      if (r > 150 || r < 25) continue;
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

function buyPlan(sim: Sim, reserve: number, maxSU: number): BuyOrder[] {
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
  if (!state.processors.some((p) => p.kind === 'pot')) tryBuy({ kind: 'processor', id: 'pot' }, reserve);
  if (state.storageLevel === 0 && storage.used(state) > 14) tryBuy({ kind: 'storage' }, reserve);
  // Сүрэг өсгөх: хязаалан эм хонь (тэргэнд 3). Зорилгод хүрэх хонин толгой хүрсний дараа гэрт хуримтлуулна
  if (su < maxSU) for (let k = 0; k < 3; k++) if (!tryBuy({ kind: 'animal', species: 'sheep', sex: 'f', age: 3 }, reserve * 2)) break;
  return orders;
}

const active: Strategy = {
  name: 'Идэвхтэй',
  onHour(sim, hour) {
    const { cfg, state } = sim;
    if (hour === 7) {
      state.neighborBull = true;
      for (const sp of ['sheep', 'cow'] as Species[]) {
        const spot = bestSpot(cfg, sim, cfg.animals.species[sp].minGrassCm + 1);
        sim.command({ type: 'drive', species: sp, x: spot.x, z: spot.z });
      }
    }
    collectAll(sim);
    processAll(sim);
    if (hour === 9 || hour === 16)
      tripIfUseful(sim, hour === 9 ? buyPlan(sim, 400_000, cfg.economy.goalSheepUnits + 5) : [], 12, hour === 9 ? surplusMales(sim) : []);
  },
};

const medium: Strategy = {
  name: 'Дунд',
  onHour(sim, hour) {
    const { cfg, state } = sim;
    state.neighborBull = true;
    if (hour === 8 && state.time.day % 2 === 0) {
      const spot = bestSpot(cfg, sim, 2);
      sim.command({ type: 'drive', species: 'sheep', x: spot.x, z: spot.z });
    }
    if (hour === 9 || hour === 13 || hour === 18) collectAll(sim);
    processAll(sim);
    if (hour === 10 && state.time.day % 2 === 0) tripIfUseful(sim, buyPlan(sim, 300_000, cfg.economy.goalSheepUnits), 6, surplusMales(sim));
  },
};

const lazy: Strategy = {
  name: 'Залхуу',
  onHour(sim, hour) {
    sim.state.neighborBull = true;
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
}

function run(cfg: GameConfig, strat: Strategy, seed: number): RunResult {
  const sim = new Sim(cfg, createInitialState(cfg, seed));
  const reports: DayReport[] = [];
  sim.on((e) => {
    if (e.type === 'hour') strat.onHour(sim, e.hour);
    if (e.type === 'dayReport') reports.push(e.report);
  });
  sim.runDays(DAYS);
  return { goalDay: sim.state.goalReachedDay, reports };
}

const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
};
const fmt = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString('en-US').replace(/,/g, ' ') : '—');

const cfg = loadConfig();
const dayHours = ((cfg.time.dayEndMinute - cfg.time.dayStartMinute) / 60) * cfg.time.realSecondsPerGameHour / 3600;
console.log(`# Тэнцвэрийн тайлан — ${SEEDS} seed × ${DAYS} өдөр (1 өдөр = 1× хурдаар ${(dayHours * 60).toFixed(1)} мин)\n`);

for (const strat of [active, medium, lazy]) {
  const t0 = performance.now();
  const results = Array.from({ length: SEEDS }, (_, i) => run(cfg, strat, 1000 + i));
  const goalDays = results.map((r) => r.goalDay).filter((d): d is number => d !== null);
  console.log(`## ${strat.name}  (${((performance.now() - t0) / 1000).toFixed(1)} сек)`);
  console.log(`Зорилгод хүрсэн: ${goalDays.length}/${SEEDS}` + (goalDays.length ? ` · медиан ${median(goalDays)}-р өдөр (1× хурдаар ~${(median(goalDays) * dayHours).toFixed(1)} цаг)` : ''));
  console.log('| Өдөр | Мөнгө | Хонин толгой | Эм хонины жин | Идэш | Бууцны доройтол | Өдрийн орлого | Муудсан (нэгж/өдөр) |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const d of [10, 30, 60, 100, 150].filter((d) => d <= DAYS)) {
    const rs = results.map((r) => r.reports[d - 1]!).filter(Boolean);
    const win = results.map((r) => r.reports.slice(Math.max(0, d - 10), d));
    const inc = win.map((w) => w.reduce((s, x) => s + Object.values(x.income).reduce((a, b) => a + (b ?? 0), 0), 0) / w.length);
    const spoil = win.map((w) => w.reduce((s, x) => s + Object.values(x.spoiled).reduce((a, b) => a + (b ?? 0), 0), 0) / w.length);
    console.log(
      `| ${d} | ${fmt(median(rs.map((r) => r.moneyEnd)))}₮ | ${median(rs.map((r) => r.sheepUnits)).toFixed(0)} | ${median(rs.map((r) => r.avgEweKg)).toFixed(1)} кг | ${(median(rs.map((r) => r.avgGutFill)) * 100).toFixed(0)}% | ${median(rs.map((r) => r.campDegrade)).toFixed(2)} | ${fmt(median(inc))}₮ | ${median(spoil).toFixed(1)} |`,
    );
  }
  console.log('');
}
