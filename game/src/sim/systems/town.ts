/**
 * Сумын төвийн амьдрал (V3.4, хэрэглэгчийн шийдвэр 2026-11-15): хашаа байшин худалдаж авч түрээслэх,
 * дуганд хандив өгч нэр хүнд өсгөх, Засаг даргаас малаар зээл авах, банкнаас мал/үл хөдлөхөө барьцаалж
 * мөнгө зээлэх, хамаатан айлд бэлэг (сүү, цагаан идээ, мал) авч очих — хариуд нь хотонд зочлох, зун хүүхдүүд
 * нь ирж туслах, өвөл тэжээл авчрах. Three.js, DOM-гүй. Тоонууд data/town.json (🙋 түр утга).
 */
import { m, type Msg } from '../msg';
import type { GameConfig, Sex, Species } from '../config';
import type { Animal, GameState, ProductId } from '../state';
import { newAnimal } from '../state';
import type { Rng } from '../rng';
import { salePrice } from './animals';
import { productPrice } from './trip';
import { fleetOf } from './travel';
import { plotHouse, sumDoors, type SumDoor } from './sumtown';
import { seasonOf } from './seasons';
import { relativeAtBuilding } from './npc';
import type { Helper } from './helpers';

export type HouseMode = 'empty' | 'rent' | 'child';
export interface ZdtgLoan { pkg: string; species: Species; sex: Sex; n: number; value: number; dueDay: number; overdue: boolean }
export interface BankLoan { owed: number; principal: number; dueDay: number }
export interface RelativeState { relation: number; lastGiftDay: number; lastVisitDay: number }
export interface TownState {
  /** Нэр хүнд 0–100 (дуганд хандив, зээлээ хугацаандаа төлөх) */
  reputation: number;
  houses: Record<string, { mode: HouseMode }>;
  zdtgLoan: ZdtgLoan | null;
  bankLoan: BankLoan | null;
  relatives: Record<string, RelativeState>;
  /** Зун ирсэн хамаатны хүүхдүүдийн familyId (намар буцна) */
  summerKids: number[];
}

export type TownEvent = { type: 'town'; msg: Msg; good: boolean };

export function newTownState(cfg: GameConfig): TownState {
  const relatives: Record<string, RelativeState> = {};
  for (const p of cfg.sumcenter.specialPlots ?? []) if (p.role === 'relative') relatives[p.id] = { relation: cfg.town.relatives.startRelation, lastGiftDay: -999, lastVisitDay: -999 };
  return { reputation: cfg.town.reputation.start, houses: {}, zdtgLoan: null, bankLoan: null, relatives, summerKids: [] };
}

// ======================= Хаалганы цэг =======================

/** Тусгай хашааны (зарах байшин, хамаатны айл) хаалганы цэг ба үүрэг */
export function plotDoors(cfg: GameConfig): (SumDoor & { plot: string })[] {
  return (cfg.sumcenter.specialPlots ?? []).map((sp) => {
    const h = plotHouse(cfg.sumcenter, sp);
    return { id: sp.id, plot: sp.id, role: sp.role === 'forSale' ? 'house' : 'relative', kind: 'house', x: h.door.x, z: h.door.z, enterable: true };
  });
}

export type TownRole = 'temple' | 'zdtg' | 'bank' | 'house' | 'relative' | 'soon';
const SOON_ROLES = ['clothing', 'grocery', 'fuel'];

/** Тоглогчийн ойрын «сумын амьдрал»-ын хаалга (дуган, ЗДТГ, банк, байшин, хамаатан, удахгүй нээгдэх дэлгүүр) */
export function nearTownDoor(cfg: GameConfig, state: GameState): { id: string; role: TownRole } | null {
  const p = state.player;
  if (p.place !== 'sum') return null;
  let best: { id: string; role: TownRole } | null = null, bd = cfg.worldmap.sum3d.shopR;
  const consider = (id: string, role: TownRole, x: number, z: number): void => {
    const r = Math.hypot(p.x - x, p.z - z);
    if (r <= bd) {
      bd = r;
      best = { id, role };
    }
  };
  for (const d of sumDoors(cfg)) {
    if (d.role === 'temple' || d.role === 'zdtg' || d.role === 'bank') consider(d.id, d.role, d.x, d.z);
    else if (d.role === 'grocery' && relativeAtBuilding(cfg, state, d.id)) consider(relativeAtBuilding(cfg, state, d.id)!, 'relative', d.x, d.z);   // V6.3: хамаатан худалдагч (Сарангэрэл) дэлгүүрт ч бэлэг авна
    else if (SOON_ROLES.includes(d.role)) consider(d.id, 'soon', d.x, d.z);
  }
  for (const d of plotDoors(cfg)) consider(d.id, d.role as TownRole, d.x, d.z);
  return best;
}

function near(cfg: GameConfig, state: GameState, role: TownRole, id?: string): boolean {
  const d = nearTownDoor(cfg, state);
  return !!d && d.role === role && (id === undefined || d.id === id);
}

const spend = (state: GameState, key: string, n: number): void => {
  state.money -= n;
  state.today.expenses[key] = (state.today.expenses[key] ?? 0) + n;
};
const earn = (state: GameState, key: 'rent' | 'loan', n: number): void => {
  state.money += n;
  state.today.income[key] = (state.today.income[key] ?? 0) + n;
};
const repUp = (cfg: GameConfig, state: GameState, d: number): void => {
  state.town.reputation = Math.max(0, Math.min(cfg.town.reputation.max, state.town.reputation + d));
};

// ======================= Хашаа байшин =======================

export function housePrice(cfg: GameConfig, plotId: string): { price: number; rentPerDay: number } | null {
  return (cfg.town.houses as Record<string, { price: number; rentPerDay: number } | undefined>)[plotId] ?? null;
}

export function buyHouse(cfg: GameConfig, state: GameState, plotId: string, proximity: boolean): Msg | null {
  const h = housePrice(cfg, plotId);
  if (!h) return m('sim.this_house_is_not');
  if (proximity && !near(cfg, state, 'house', plotId)) return m('sim.go_to_the_house');
  if (state.town.houses[plotId]) return m('sim.you_already_have_it');
  if (state.money < h.price) return m('sim.not_enough_money');
  spend(state, 'buy_house', h.price);
  state.town.houses[plotId] = { mode: 'empty' };
  return null;
}

/** Түрээслүүлэх / хоосон / хүүхдээ байлгах (хүүхэд — үе удмын систем V1+ 🙋) */
export function setHouseMode(_cfg: GameConfig, state: GameState, plotId: string, mode: HouseMode): Msg | null {
  const h = state.town.houses[plotId];
  if (!h) return m('sim.not_your_house');
  if (mode === 'child') return m('sim.after_you_have_a');
  h.mode = mode;
  return null;
}

// ======================= Дуган: хандив, нэр хүнд =======================

export function donate(cfg: GameConfig, state: GameState, amount: number, proximity: boolean): Msg | null {
  if (!cfg.town.temple.donations.includes(amount)) return m('sim.this_amount_cannot_be');
  if (proximity && !near(cfg, state, 'temple')) return m('sim.go_to_the_temple');
  if (state.money < amount) return m('sim.not_enough_money');
  spend(state, 'donation', amount);
  repUp(cfg, state, (amount / 10000) * cfg.town.temple.reputationPer10k);
  return null;
}

// ======================= ЗДТГ: малаар зээл =======================

export function zdtgPackages(cfg: GameConfig): { id: string; species: Species; sex: Sex; age: number; n: number }[] {
  return cfg.town.zdtgLoan.packages as { id: string; species: Species; sex: Sex; age: number; n: number }[];
}

/** Малаар зээл авах: мал араасаа тууж/тээвэрт ачигдана; termDays дотор ижил тооны насанд хүрсэн эм малаар буцаана */
export function takeZdtgLoan(cfg: GameConfig, state: GameState, rng: Rng, pkgId: string, proximity: boolean): Msg | null {
  const Z = cfg.town.zdtgLoan;
  if (proximity && !near(cfg, state, 'zdtg')) return m('sim.go_to_the_administration');
  if (state.town.zdtgLoan) return m('sim.you_have_not_repaid');
  if (state.town.reputation < Z.minReputation) return m('sim.reputation_must_be_above', { minReputation: Z.minReputation });
  const pkg = zdtgPackages(cfg).find((x) => x.id === pkgId);
  if (!pkg) return m('sim.no_such_package');
  const p = state.player;
  const f = p.driving ? fleetOf(state, p.driving) : undefined;
  let value = 0;
  for (let i = 0; i < pkg.n; i++) {
    const a: Animal = newAnimal(cfg, rng, state.nextId++, { species: pkg.species, sex: pkg.sex, age: pkg.age, x: p.x, z: p.z });
    value += salePrice(a, cfg.animals);
    if (f) f.animals.push(a);
    else p.drove.push(a);
  }
  state.town.zdtgLoan = { pkg: pkg.id, species: pkg.species, sex: pkg.sex, n: pkg.n, value, dueDay: state.time.day + Z.termDays, overdue: false };
  return null;
}

/** Буцааж өгч болох мал: насанд хүрсэн, ижил төрөл, хүйс, тоглогчийн (унаа, туслахынх биш) */
export function zdtgRepayable(cfg: GameConfig, state: GameState): Animal[] {
  const L = state.town.zdtgLoan;
  if (!L) return [];
  const adult = cfg.animals.species[L.species].adultAge;
  return state.animals.filter((a) => a.species === L.species && a.sex === L.sex && a.age >= adult && !a.riding && a.ownerId === undefined).sort((a, b) => a.age - b.age);
}

export function repayZdtgLoan(cfg: GameConfig, state: GameState, mode: 'animals' | 'money', proximity: boolean): Msg | null {
  const L = state.town.zdtgLoan;
  if (!L) return m('sim.no_livestock_loan');
  if (proximity && !near(cfg, state, 'zdtg')) return m('sim.go_to_the_administration');
  if (mode === 'animals') {
    const list = zdtgRepayable(cfg, state).slice(0, L.n);
    if (list.length < L.n) return m('sim.you_need_adult_animals', { n: L.n, length: list.length });
    const ids = new Set(list.map((a) => a.id));
    state.animals = state.animals.filter((a) => !ids.has(a.id));
  } else {
    const cost = Math.round(L.value * cfg.town.zdtgLoan.moneyMult);
    if (state.money < cost) return m('sim.not_enough_money');
    spend(state, 'zdtgLoan', cost);
  }
  if (!L.overdue) repUp(cfg, state, cfg.town.zdtgLoan.onTimeReputation);
  state.town.zdtgLoan = null;
  return null;
}

// ======================= Банк: барьцаат зээл =======================

/** Барьцаанд тооцох байшингууд (тоглогчийнх) */
export function bankCollateralHouses(state: GameState): string[] {
  return Object.keys(state.town.houses);
}

/** Зээлийн дээд хэмжээ: малын үнэлгээ × animalLtv + байшингийн үнэ × houseLtv */
export function bankLimit(cfg: GameConfig, state: GameState): number {
  const B = cfg.town.bankLoan;
  const herd = state.animals.filter((a) => !a.riding && a.ownerId === undefined).reduce((s, a) => s + salePrice(a, cfg.animals), 0);
  const houses = bankCollateralHouses(state).reduce((s, id) => s + (housePrice(cfg, id)?.price ?? 0), 0);
  return Math.floor((herd * B.animalLtv + houses * B.houseLtv) / 10000) * 10000;
}

export function takeBankLoan(cfg: GameConfig, state: GameState, amount: number, proximity: boolean): Msg | null {
  const B = cfg.town.bankLoan;
  if (proximity && !near(cfg, state, 'bank')) return m('sim.go_to_the_bank');
  if (state.town.bankLoan) return m('sim.you_have_not_repaid_116');
  if (!(amount >= B.minAmount)) return m('sim.at_least', { minAmount: B.minAmount });
  if (amount > bankLimit(cfg, state)) return m('sim.not_enough_collateral');
  earn(state, 'loan', amount);
  state.town.bankLoan = { owed: amount, principal: amount, dueDay: state.time.day + B.termDays };
  return null;
}

export function repayBankLoan(cfg: GameConfig, state: GameState, amount: number, proximity: boolean): Msg | null {
  const L = state.town.bankLoan;
  if (!L) return m('sim.no_loan');
  if (proximity && !near(cfg, state, 'bank')) return m('sim.go_to_the_bank');
  const pay = Math.min(amount, L.owed);
  if (!(pay > 0)) return m('sim.amount_to_pay_is');
  if (state.money < pay) return m('sim.not_enough_money');
  spend(state, 'bankLoan', pay);
  L.owed -= pay;
  if (L.owed <= 0.5) {
    state.town.bankLoan = null;
    repUp(cfg, state, cfg.town.bankLoan.onTimeReputation);
  }
  return null;
}

// ======================= Хамаатан =======================

export interface GiftPlan { products: Partial<Record<ProductId, number>>; animalIds: number[] }

/** Бэлэг: гартаа/тээвэртээ барьсан сүү, цагаан идээ, тууж/ачиж ирсэн мал. Харилцаа үнэ цэнээр өснө */
export function giveGift(cfg: GameConfig, state: GameState, relId: string, plan: GiftPlan, proximity: boolean): Msg | null {
  const R = cfg.town.relatives;
  const rel = state.town.relatives[relId];
  if (!rel) return m('sim.no_such_relative');
  if (proximity && !near(cfg, state, 'relative', relId)) return m('sim.go_to_your_relatives');
  const p = state.player;
  const f = p.driving ? fleetOf(state, p.driving) : undefined;
  let value = 0;
  for (const [k, n0] of Object.entries(plan.products)) {
    const pid = k as ProductId;
    if (!R.giftProducts.includes(pid)) continue;
    let want = n0 ?? 0;
    if (f) {
      const s = Math.min(f.cargo[pid] ?? 0, want);
      if (s > 0) {
        f.cargo[pid] = (f.cargo[pid] ?? 0) - s;
        if ((f.cargo[pid] ?? 0) <= 1e-9) delete f.cargo[pid];
        want -= s;
        value += s * productPrice(cfg, pid);
      }
    }
    for (const c of p.carry) {
      if (want <= 1e-9) break;
      if (c.product !== pid) continue;
      const s = Math.min(c.amount, want);
      c.amount -= s;
      want -= s;
      value += s * productPrice(cfg, pid);
    }
    p.carry = p.carry.filter((c) => c.amount > 1e-9);
  }
  const pool = [...(f?.animals ?? []), ...p.drove];
  const give = pool.filter((a) => plan.animalIds.includes(a.id));
  for (const a of give) value += salePrice(a, cfg.animals);
  if (f) f.animals = f.animals.filter((a) => !give.includes(a));
  p.drove = p.drove.filter((a) => !give.includes(a));
  if (value <= 0) return m('sim.no_gift_hold_milk');
  rel.relation = Math.min(100, rel.relation + (value / 10000) * R.relationPer10k);
  rel.lastGiftDay = state.time.day;
  return null;
}

// ======================= Өдөр, сар, улирал =======================

/** Банкны зээлийн өдрийн төлбөр: үлдэгдэл / үлдсэн хоног (өнөөдрийг оруулаад), бүхэл ₮ дээш */
export function bankDailyPayment(state: GameState): number {
  const B = state.town.bankLoan;
  if (!B) return 0;
  return Math.min(B.owed, Math.ceil(B.owed / Math.max(1, B.dueDay - state.time.day + 1)));
}

/** 20:00 — түрээс, зээлийн өдрийн төлбөр ба хугацаа, харилцаа суларч, хамаатан айлчлах */
export function townDaily(cfg: GameConfig, state: GameState): { events: TownEvent[]; livingCovered: boolean } {
  const T = state.town, events: TownEvent[] = [];
  const day = state.time.day;
  for (const [id, h] of Object.entries(T.houses)) if (h.mode === 'rent') earn(state, 'rent', housePrice(cfg, id)?.rentPerDay ?? 0);
  // Малын зээл хугацаа хэтэрсэн
  const Z = T.zdtgLoan;
  if (Z && !Z.overdue && day > Z.dueDay) {
    Z.overdue = true;
    repUp(cfg, state, -cfg.town.zdtgLoan.lateReputation);
    events.push({ type: 'town', msg: m('sim.the_livestock_loan_is'), good: false });
  }
  // Банкны зээл: өдөр бүр үлдэгдлийг үлдсэн хоногт хуваасан дүнгээр төлнө (мөнгө дутвал байгаагаараа)
  if (T.bankLoan && day <= T.bankLoan.dueDay) {
    const pay = Math.min(bankDailyPayment(state), Math.max(0, Math.floor(state.money)));
    if (pay > 0) {
      spend(state, 'bankLoan', pay);
      T.bankLoan.owed -= pay;
    }
    if (T.bankLoan.owed <= 0.5) {
      T.bankLoan = null;
      repUp(cfg, state, cfg.town.bankLoan.onTimeReputation);
      events.push({ type: 'town', msg: m('sim.loan_repaid'), good: true });
    }
  }
  // Банкны зээл хугацаа хэтэрсэн → барьцаа хураана
  const B = T.bankLoan;
  if (B && day > B.dueDay) {
    let owed = B.owed;
    const seized: Msg[] = [];
    for (const id of bankCollateralHouses(state)) {
      if (owed <= 0) break;
      owed -= (housePrice(cfg, id)?.price ?? 0) * cfg.town.bankLoan.houseLtv;
      delete T.houses[id];
      seized.push(m('sim.house'));
    }
    if (owed > 0) {
      const herd = state.animals.filter((a) => !a.riding && a.ownerId === undefined).sort((a, b) => salePrice(b, cfg.animals) - salePrice(a, cfg.animals));
      const take = new Set<number>();
      for (const a of herd) {
        if (owed <= 0) break;
        owed -= salePrice(a, cfg.animals);
        take.add(a.id);
      }
      state.animals = state.animals.filter((a) => !take.has(a.id));
      if (take.size) seized.push(m('sim.animals', { size: take.size }));
    }
    T.bankLoan = null;
    repUp(cfg, state, -cfg.town.bankLoan.lateReputation);
    events.push({ type: 'town', msg: m('sim.the_bank_loan_is', { x: seized.length ? seized : m('sim.nothing') }), good: false });
  }
  // Хамаатан: харилцаа аажим суларна; ойр дотно бол хотонд айлчилж хоол авчирна
  const R = cfg.town.relatives;
  let livingCovered = false;
  for (const [id, r] of Object.entries(T.relatives)) {
    r.relation = Math.max(0, r.relation - R.dailyDecay);
    // Ойр дотно байх тусам ойр ойрхон ирнэ (RNG-гүй — тэнцвэрийн дүнд нөлөөлөхгүй)
    const gap = Math.round(R.visitGapMaxDays - (R.visitGapMaxDays - R.visitGapMinDays) * (r.relation / 100));
    if (r.relation >= R.visitMinRelation && state.player.place === 'camp' && day - r.lastVisitDay >= gap) {
      r.lastVisitDay = day;
      livingCovered = true;
      events.push({ type: 'town', msg: m('sim.relatives_visited_the_camp', { x: id === 'plot_rel_1' ? m('sim.the_sum_center_one') : m('sim.the_outskirts_one') }), good: true });
    }
  }
  return { events, livingCovered };
}

/** Сар бүр: банкны хүү */
export function townMonthly(cfg: GameConfig, state: GameState): void {
  const B = state.town.bankLoan;
  if (B) B.owed = Math.round(B.owed * (1 + cfg.town.bankLoan.interestPerMonth));
}

/** Улирал солигдоход: зун хамаатны хүүхдүүд туслахаар ирнэ, намар буцна; өвөл тэжээл авчирна */
export function townSeason(cfg: GameConfig, state: GameState, nextHelperId: () => number): TownEvent[] {
  const R = cfg.town.relatives, T = state.town, events: TownEvent[] = [];
  const season = seasonOf(cfg, state.time.day);
  // Өмнөх зуны хүүхдүүд буцна
  if (season !== 'summer' && T.summerKids.length) {
    const fam = new Set(T.summerKids);
    state.helpers.list = state.helpers.list.filter((h) => !fam.has(h.familyId));
    state.helpers.dwellings = state.helpers.dwellings.filter((d) => d.familyId === undefined || !fam.has(d.familyId));
    T.summerKids = [];
    events.push({ type: 'town', msg: m('sim.the_relatives_children_finished'), good: true });
  }
  for (const r of Object.values(T.relatives)) {
    if (season === 'summer' && r.relation >= R.summerHelpMin) {
      const familyId = nextHelperId();
      state.helpers.dwellings.push({ kind: 'familyGer', x: -24 + T.summerKids.length * 8, z: 26, familyId });
      const kid: Helper = {
        id: familyId, name: R.kidNames[T.summerKids.length % R.kidNames.length]!, kind: 'child', sex: T.summerKids.length % 2 ? 'f' : 'm',
        familyId, family: true, task: 'collect', herd: 'sheep', wage: 0, prepaid: 0,
        x: -21 + T.summerKids.length * 8, z: 28, heading: 0, tx: -21, tz: 28, mode: 'work', carry: [], trip: null, lastPasture: -1e9, homeDriven: 0,
      };
      state.helpers.list.push(kid);
      T.summerKids.push(familyId);
      events.push({ type: 'town', msg: m('sim.the_relatives_child_came', { name: kid.name }), good: true });
    }
    if (season === 'winter' && r.relation >= R.winterHayMin) {
      const bales = Math.round((r.relation / 10) * R.winterHayPer10);
      const c = state.camps[state.campId];
      if (c && bales > 0) {
        c.hay = (c.hay ?? 0) + bales;
        events.push({ type: 'town', msg: m('sim.relatives_brought_hay_bales', { bales }), good: true });
      }
    }
  }
  return events;
}
