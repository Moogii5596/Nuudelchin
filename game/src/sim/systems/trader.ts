/**
 * Явуулын худалдаачин — ченж (M6.12, A7). Three.js-гүй. `data/trader.json`.
 * 4–8 хоног тутам машинтай сумын төвд ирж хэдэн цаг зогсоно (3 төрөл: жижиг, дунд, том). Бүтээгдэхүүнийг дэлгүүрийн үнээс ХЯМД авч,
 * боодол өвс зарна. Тоглогч сумын төвд түүний цэгийн дэргэд E дарж арилжаа хийнэ (`traderTrade`).
 * Санамсаргүй тоо — үндсэн RNG-д хүрэхгүй (seed+өдрөөс гарсан тусдаа Rng): тэнцвэр, хадгалалтын үргэлжлэл өөрчлөгдөхгүй.
 */
import type { GameConfig } from '../config';
import { Rng } from '../rng';
import type { GameState, ProductId } from '../state';
import { m, type Msg } from '../msg';
import { fleetOf, hayRoom } from './travel';
import { productPrice } from './trip';

export interface TraderKindCfg {
  weight: number;
  stayHours: [number, number];
  buyMult: number;
  products: ProductId[];
  hayMax: number;
  hayMult: number;
}
export interface TraderConfig {
  intervalDays: [number, number];
  arriveHours: [number, number];
  stand: { x: number; z: number; r: number };
  kinds: Record<string, TraderKindCfg>;
}

export interface TraderVisit {
  kind: string;
  /** Ирсэн өдөр */
  day: number;
  /** Ирэх/явах цаг (өдрийн минут, 06:00 = 360) */
  from: number;
  to: number;
  /** Зарах боодол өвсний үлдэгдэл */
  hay: number;
}
export interface TraderState {
  nextDay: number;
  visit: TraderVisit | null;
  /** Нийт ирсэн удаа (статистик, тест) */
  visits: number;
}

export type TraderEvent = { type: 'traderArrive'; kind: string; until: number } | { type: 'traderLeave' };

export function newTraderState(cfg: GameConfig, seed: number): TraderState {
  const [a, b] = cfg.trader.intervalDays;
  return { nextDay: 1 + a + (seed >>> 0) % (b - a + 1), visit: null, visits: 0 };
}

export function validateTrader(cfg: GameConfig): string[] {
  const e: string[] = [];
  const t = cfg.trader;
  if (!t || !t.kinds || !Object.keys(t.kinds).length) return ['trader.kinds хоосон'];
  if (!(t.intervalDays[0] >= 1 && t.intervalDays[1] >= t.intervalDays[0])) e.push('trader.intervalDays: [min ≥ 1, max ≥ min]');
  if (!(t.arriveHours[0] >= 6 && t.arriveHours[1] >= t.arriveHours[0] && t.arriveHours[1] < 20)) e.push('trader.arriveHours: өдрийн цаг 6–20');
  for (const [k, K] of Object.entries(t.kinds)) {
    if (!(K.weight > 0 && K.buyMult > 0 && K.buyMult <= 1 && K.hayMax >= 0 && K.hayMult > 0 && K.stayHours[0] > 0 && K.stayHours[1] >= K.stayHours[0] && K.products.length)) e.push(`trader.kinds.${k}: weight>0, 0<buyMult≤1, hayMax≥0, hayMult>0, stayHours, products`);
  }
  return e;
}

/** Өдрийн 06:00-д: өмнөх өдрийн айлчлалыг цэвэрлэж, цаг нь болсон бол шинэ айлчлал төлөвлөнө. Үйл явдал гаргахгүй (ирэх/явах — traderHour) */
export function traderDaily(cfg: GameConfig, state: GameState): void {
  const T = state.trader, day = state.time.day;
  if (T.visit && T.visit.day < day) T.visit = null;
  if (T.visit || day < T.nextDay) return;
  const rng = new Rng((state.seed ^ Math.imul(day + 31, 2246822519)) >>> 0);
  const kinds = Object.entries(cfg.trader.kinds);
  let r = rng.next() * kinds.reduce((s, [, k]) => s + k.weight, 0), pick = kinds[0]!;
  for (const e of kinds) { r -= e[1].weight; if (r <= 0) { pick = e; break; } }
  const [kind, K] = pick;
  const hour = rng.range(cfg.trader.arriveHours[0], cfg.trader.arriveHours[1]);
  const stay = rng.range(K.stayHours[0], K.stayHours[1]);
  const from = Math.round(hour * 60), to = Math.round(from + stay * 60);
  T.visit = { kind, day, from, to, hay: K.hayMax };
  T.nextDay = day + rng.int(cfg.trader.intervalDays[0], cfg.trader.intervalDays[1]);
  T.visits++;
}

/** Одоо сумын төвд зогсож буй худалдаачин (цагийн цонхонд) */
export function traderPresent(state: GameState): TraderVisit | null {
  const v = state.trader.visit;
  if (!v || v.day !== state.time.day) return null;
  const mi = state.time.minute;
  return mi >= v.from && mi < v.to ? v : null;
}

/** Цаг бүр (clock 'hour' үйл явдал): ирэх/явах мэдэгдэл */
export function traderHour(state: GameState): TraderEvent[] {
  const v = state.trader.visit;
  if (!v || v.day !== state.time.day) return [];
  const mi = state.time.minute;
  const ev: TraderEvent[] = [];
  if (mi >= v.from && mi < v.from + 60) ev.push({ type: 'traderArrive', kind: v.kind, until: v.to });
  if (mi >= v.to && mi < v.to + 60) ev.push({ type: 'traderLeave' });
  return ev;
}

export function nearTrader(cfg: GameConfig, state: GameState): boolean {
  const p = state.player, s = cfg.trader.stand;
  return p.place === 'sum' && !!traderPresent(state) && Math.hypot(p.x - s.x, p.z - s.z) <= s.r;
}

export interface TraderPlan {
  sell: Partial<Record<ProductId, number>>;
  buyHay: number;
}

/** Худалдаачны үнэ: бүтээгдэхүүнийг дэлгүүрийн үнийн buyMult хувиар авна */
export function traderBuyPrice(cfg: GameConfig, kind: string, p: ProductId): number {
  return productPrice(cfg, p) * (cfg.trader.kinds[kind]?.buyMult ?? 0);
}
export function traderHayPrice(cfg: GameConfig, kind: string): number {
  return cfg.seasons.hay.price * (cfg.trader.kinds[kind]?.hayMult ?? 1);
}

/** Арилжаа: зарах (тээврийн ачаа, гарт барьсан), боодол өвс авах (өвс хүргэлтэнд орно). Алдаа бол тайлбар */
export function traderTrade(cfg: GameConfig, state: GameState, plan: TraderPlan, proximity: boolean): Msg | null {
  const p = state.player, v = traderPresent(state);
  if (p.place !== 'sum') return m('sim.you_must_be_in');
  if (!v) return m('sim.the_trader_is_not_here');
  if (proximity && !nearTrader(cfg, state)) return m('sim.go_up_to_the_trader');
  const K = cfg.trader.kinds[v.kind]!;
  const f = p.driving ? fleetOf(state, p.driving) : undefined;
  let income = 0;
  for (const [k, n] of Object.entries(plan.sell)) {
    const pid = k as ProductId;
    if (!K.products.includes(pid)) continue;
    let want = n ?? 0, sold = 0;
    if (f) {
      const have = f.cargo[pid] ?? 0, s = Math.min(have, want);
      if (have - s > 1e-9) f.cargo[pid] = have - s; else delete f.cargo[pid];
      sold += s; want -= s;
    }
    for (const c of p.carry) {
      if (want <= 1e-9) break;
      if (c.product !== pid) continue;
      const s = Math.min(c.amount, want);
      c.amount -= s; sold += s; want -= s;
    }
    p.carry = p.carry.filter((c) => c.amount > 1e-9);
    if (sold <= 0) continue;
    const inc = sold * traderBuyPrice(cfg, v.kind, pid);
    income += inc;
    state.today.income[pid] = (state.today.income[pid] ?? 0) + inc;
  }
  state.money += income;
  let err: Msg | null = null;
  let n = Math.max(0, Math.floor(plan.buyHay));
  if (n > 0) {
    n = Math.min(n, v.hay, hayRoom(cfg, state));
    const cost = n * traderHayPrice(cfg, v.kind);
    if (n <= 0) err = m('sim.the_trader_has_no_hay');
    else if (state.money < cost) err = m('sim.not_enough_money');
    else {
      state.money -= cost;
      state.today.expenses.buy_hay = (state.today.expenses.buy_hay ?? 0) + cost;
      v.hay -= n;
      (f ? f.orders : p.orders).push({ kind: 'hay', n });
    }
  }
  return err;
}
