/**
 * Цонхнууд (M3): агуулах ба боловсруулалт (B), сумын төв (T), өдрийн тайлан (20:00).
 * M4: нохойн команд (K), бууц сэлгэх (M), туршилтын цэс (`).
 * GameState-ийг зөвхөн уншиж, үйлдлийг Command-аар илгээнэ (architecture.md §3.1).
 * Цонх нээлттэй үед тоглоом түр зогсоно.
 */
import type { GameConfig, Sex, Species } from '../../sim/config';
import { SPECIES } from '../../sim/config';
import type { Animal, BuyOrder, GameState, ProcessorKind, ProductId, VehicleId } from '../../sim/state';
import { PRODUCTS } from '../../sim/state';
import type { Command, CommandResult } from '../../sim/commands';
import type { DayReport } from '../../sim/sim';
import * as storage from '../../sim/systems/storage';
import { recipe } from '../../sim/systems/processing';
import { animalSlots, orderPrice, productPrice } from '../../sim/systems/trip';
import { salePrice } from '../../sim/systems/animals';
import { realSecondsPerMinute } from '../../sim/clock';
import { DOG_ORDER_NAME, type DogOrderKind } from '../../sim/systems/dogs';
import { flockKey } from '../../sim/systems/herds';
import { moveHours } from '../../sim/systems/camps';
import { herdSheepUnits } from '../../sim/systems/animals';
import type { CheatAction } from '../../sim/systems/cheats';
import {
  PASTURE_NAME, PRODUCT_EMOJI, PROCESSOR_NAME, WATER_NAME, WOLF_LEVEL_NAME, expenseName, fmtMinutes, fmtMoney, fmtNum, productName, speciesEmoji, stageName, unitOf,
} from './names';
import { t } from '../../i18n/i18n';

type Kind = 'storage' | 'trip' | 'report' | 'dogs' | 'camps' | 'cheat';

const HERD_NAME: Record<string, string> = { sheep: '🐑 Хонь ямаа', cow: '🐄 Үхэр', horse: '🐎 Адуу' };

const CHEATS: { act: CheatAction; label: string }[][] = [
  [{ act: 'money', label: '💰 +1 000 000₮' }, { act: 'fillStorage', label: '🥛 Гарт сүү, ноос' }],
  [{ act: 'addSheep', label: '🐑 +10 хонь' }, { act: 'addGoats', label: '🐐 +10 ямаа' }, { act: 'addCows', label: '🐄 +5 үхэр' }, { act: 'addHorses', label: '🐎 +5 адуу' }, { act: 'addMixed', label: '+50 холимог' }],
  [{ act: 'addDog', label: '🐕 +1 нохой' }, { act: 'removeDog', label: '−1 нохой' }],
  [{ act: 'skipHour', label: '⏩ +1 цаг' }, { act: 'endDay', label: '🌅 Өдрийг дуусгах' }],
  [{ act: 'thirsty', label: '💧 Бүх мал цангах' }, { act: 'quench', label: 'Бүх мал ус уух' }, { act: 'hungry', label: '🌾 Идэш 0' }, { act: 'fatten', label: 'Бүдүүн тарган' }],
  [{ act: 'degradeUp', label: '🟫 Доройтол +10%' }, { act: 'degradeReset', label: 'Доройтол 0' }],
  [{ act: 'wolfAttack', label: '🐺 Чоно дайруулах' }, { act: 'scareAll', label: 'Бүх чоно үргээх' }, { act: 'wolvesPeaceful', label: 'Дайралт асаах/унтраах' }],
];

interface BuyItem {
  key: string;
  label: string;
  note: string;
  order: BuyOrder;
}

const ANIMAL_CATALOG: { key: string; species: Species; sex: Sex; age: number; note: string }[] = [
  { key: 'ewe', species: 'sheep', sex: 'f', age: 3, note: 'Төллөж, ноос өгнө' },
  { key: 'ram', species: 'sheep', sex: 'm', age: 3, note: '30 хүртэл эм хонинд үржлийн эр' },
  { key: 'goatF', species: 'goat', sex: 'f', age: 3, note: 'Ноолуур өгнө' },
  { key: 'buck', species: 'goat', sex: 'm', age: 3, note: 'Ямааны үржлийн эр' },
  { key: 'cowF', species: 'cow', sex: 'f', age: 4, note: 'Дараагийн мөчлөгт тугалж, сүү өгнө' },
  { key: 'bull', species: 'cow', sex: 'm', age: 4, note: 'Бухтай бол хөршийн бух хэрэггүй' },
  { key: 'mare', species: 'horse', sex: 'f', age: 4, note: 'Адуу' },
];

interface Draft {
  vehicle: VehicleId;
  sell: Partial<Record<ProductId, number>>;
  sellGroups: Record<string, number>;
  buyAnimals: Record<string, number>;
  buyItems: Set<string>;
}

export interface UiHooks {
  dispatch: (cmd: Command) => CommandResult;
  toast: (msg: string, kind?: '' | 'good' | 'bad') => void;
  /** Хамгаалалтын бүс харуулах (Z) — cheat цэснээс */
  toggleZones?: () => boolean;
}

export class Panels {
  private root: HTMLElement;
  private box: HTMLElement;
  kind: Kind | null = null;
  private draft: Draft | null = null;
  private report: DayReport | null = null;
  private reports: DayReport[] = [];

  constructor(private cfg: GameConfig, private state: GameState, private hooks: UiHooks) {
    this.root = document.getElementById('modal')!;
    this.box = document.getElementById('modalBox')!;
    this.root.addEventListener('click', (e) => {
      if (e.target === this.root && this.kind !== 'report') this.close();
      const el = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
      if (el && !el.hasAttribute('disabled')) this.act(el.dataset.act!);
    });
    window.addEventListener('keydown', (e) => {
      if (!this.kind) return;
      if (e.code === 'Escape' || (this.kind === 'report' && (e.code === 'Enter' || e.code === 'Space'))) {
        e.preventDefault();
        this.close();
      } else if (
        (e.code === 'KeyB' && this.kind === 'storage') ||
        (e.code === 'KeyT' && this.kind === 'trip') ||
        (e.code === 'KeyK' && this.kind === 'dogs') ||
        (e.code === 'KeyM' && this.kind === 'camps') ||
        (e.code === 'Backquote' && this.kind === 'cheat')
      ) this.close();
    });
  }

  get isOpen(): boolean {
    return this.kind !== null;
  }

  open(kind: Kind): void {
    if (this.kind === 'report' && kind !== 'report') return; // тайланг эхлээд хаана
    if (kind === 'trip') {
      if (this.state.trip) {
        this.hooks.toast('Тэрэг сумын төв рүү явсан байна', 'bad');
        return;
      }
      if (this.state.player.away) {
        this.hooks.toast('Малчин завгүй байна', 'bad');
        return;
      }
      this.draft = {
        vehicle: this.state.vehicles.includes('truck') ? 'truck' : 'horseCart',
        sell: {},
        sellGroups: {},
        buyAnimals: {},
        buyItems: new Set(),
      };
    }
    this.kind = kind;
    this.root.style.display = 'flex';
    this.render();
  }

  close(): void {
    if (this.kind === 'report') {
      this.report = this.reports.shift() ?? null;
      if (this.report) {
        this.render();
        return;
      }
    }
    this.kind = null;
    this.root.style.display = 'none';
    (document.querySelector('#app canvas') as HTMLElement | null)?.focus();
  }

  /** Өдрийн тайлан ирэхэд */
  showReport(r: DayReport): void {
    if (this.kind === 'report') {
      this.reports.push(r);
      return;
    }
    if (this.kind) this.close();
    this.report = r;
    this.open('report');
  }

  /** Цонх нээлттэй үед төлөв өөрчлөгдвөл (боловсруулалтын хугацаа г.м.) */
  refresh(): void {
    if (this.kind === 'storage' || this.kind === 'dogs' || this.kind === 'camps') this.render();
  }

  private render(): void {
    const scroll = this.box.scrollTop;
    if (this.kind === 'storage') this.box.innerHTML = this.storageHtml();
    else if (this.kind === 'trip') this.box.innerHTML = this.tripHtml();
    else if (this.kind === 'report') this.box.innerHTML = this.reportHtml();
    else if (this.kind === 'dogs') this.box.innerHTML = this.dogsHtml();
    else if (this.kind === 'camps') this.box.innerHTML = this.campsHtml();
    else if (this.kind === 'cheat') this.box.innerHTML = this.cheatHtml();
    this.box.scrollTop = scroll;
  }

  // ======================= агуулах =======================
  private storageHtml(): string {
    const { cfg, state } = this;
    const cap = storage.capacity(cfg, state), used = storage.used(state);
    const lvlNames = ['Сав суулга (майхны хажууд)', 'Модон амбаар', 'Том агуулах'];
    const rows = PRODUCTS.map((p) => {
      const batches = state.storage.filter((b) => b.product === p);
      const n = batches.reduce((s, b) => s + b.amount, 0);
      if (n <= 1e-9) return '';
      let note = '';
      if (p === 'milk') note = 'Маргааш тараг болно — боловсруул эсвэл зар';
      if (p === 'tarag') {
        const old = batches.filter((b) => b.ageDays >= cfg.products.storage.milkSpoilDays - 1).reduce((s, b) => s + b.amount, 0);
        note = old > 0 ? `${fmtNum(old)} л маргааш муудна` : '';
      }
      return `<tr><td>${PRODUCT_EMOJI[p]} ${productName(p)}</td><td class="num">${fmtNum(n)} ${unitOf(p)}</td><td class="num">${fmtMoney(productPrice(cfg, p))}</td><td class="muted">${note}</td></tr>`;
    }).join('');
    const carry = state.player.carry;
    const carryTxt = carry.length
      ? carry.map((c) => `${PRODUCT_EMOJI[c.product]} ${fmtNum(c.amount)}`).join(' · ')
      : 'хоосон';
    const near = Math.hypot(state.player.x - cfg.camps.home.x, state.player.z - cfg.camps.home.z) <= cfg.camps.home.storageRadius * 2;
    const procs = (Object.keys(PROCESSOR_NAME) as ProcessorKind[]).map((kind) => {
      const r = recipe(cfg, kind);
      const owned = state.processors.filter((p) => p.kind === kind);
      const recipeTxt = `${Object.entries(r.input).map(([p, n]) => `${n} ${unitOf(p)} ${productName(p).toLowerCase()}`).join(', ')} → ${Object.entries(r.output).map(([p, n]) => `${n} ${unitOf(p)} ${productName(p).toLowerCase()}`).join(', ')} · ${r.hours} цаг`;
      if (!owned.length) return `<tr><td>${PROCESSOR_NAME[kind]}</td><td class="muted" colspan="2">${recipeTxt}</td><td class="muted">Байхгүй · сумын төвөөс ${fmtMoney(r.price)}</td></tr>`;
      return owned.map((pr) => {
        const pending = Object.keys(pr.pending).length;
        const status = pr.remaining > 0 ? `⏳ ${fmtMinutes(pr.remaining)} үлдсэн` : pending ? '⚠ Агуулах дүүрсэн — гаралт хүлээж байна' : 'Сул';
        const can = pr.remaining <= 0 && !pending && Object.entries(r.input).every(([p, n]) => storage.count(state, p as ProductId) >= n - 1e-9);
        return `<tr><td>${PROCESSOR_NAME[kind]}</td><td class="muted" colspan="2">${recipeTxt}</td><td>${status} <button class="btn gold" data-act="process:${kind}" ${can && near ? '' : 'disabled'}>Эхлүүлэх</button></td></tr>`;
      }).join('');
    }).join('');
    return `
      <h2>📦 Агуулах ба боловсруулалт <span class="close" data-act="close">✕</span></h2>
      <div class="bar"><div style="width:${cap ? Math.min(100, (used / cap) * 100) : 0}%"></div></div>
      <p>${lvlNames[state.storageLevel] ?? ''}: <b>${fmtNum(used)} / ${cap}</b> нэгж (1 л сүү = 1 кг ноос = 1 нэгж) · Гарт: ${carryTxt} (${fmtNum(carry.reduce((s, c) => s + c.amount, 0))}/${cfg.products.carryUnits})</p>
      <table>${rows || '<tr><td class="muted">Агуулах хоосон байна. Газарт унасан сав сүү, ноосыг түүж (E) майхны дэргэд авчир.</td></tr>'}</table>
      <h3>Боловсруулах</h3>
      <table>${procs}</table>
      ${near ? '' : '<p class="muted">Боловсруулахын тулд майхныхаа дэргэд оч.</p>'}
      <p class="muted">Сүү агуулахад 1 өдрийн дараа тараг болж, 2 өдрийн дараа муудна. Ааруул, өрөм, эсгий муудахгүй.</p>`;
  }

  // ======================= сумын төв =======================
  private animalGroups(): { key: string; label: string; list: Animal[] }[] {
    const groups = new Map<string, { key: string; label: string; list: Animal[] }>();
    for (const a of this.state.animals) {
      if (a.riding) continue;
      const label = stageName(this.cfg, a.species, a.sex, a.age);
      const key = `${a.species}|${a.sex}|${label}`;
      let g = groups.get(key);
      if (!g) {
        g = { key, label: `${speciesEmoji(a.species)} ${label}`, list: [] };
        groups.set(key, g);
      }
      g.list.push(a);
    }
    const order = (k: string) => SPECIES.indexOf(k.split('|')[0] as Species);
    return [...groups.values()].sort((a, b) => order(a.key) - order(b.key) || a.label.localeCompare(b.label));
  }

  private buyItems(): BuyItem[] {
    const { cfg, state } = this;
    const out: BuyItem[] = [];
    for (const kind of Object.keys(PROCESSOR_NAME) as ProcessorKind[]) {
      if (state.processors.some((p) => p.kind === kind)) continue;
      out.push({ key: 'proc:' + kind, label: PROCESSOR_NAME[kind]!, note: 'Цагаан идээ, эсгий хийнэ', order: { kind: 'processor', id: kind } });
    }
    const next = cfg.storage.levels[state.storageLevel + 1];
    if (next) out.push({ key: 'storage', label: state.storageLevel === 0 ? 'Модон амбаар' : 'Том агуулах', note: `Багтаамж ${next.capacity} нэгж`, order: { kind: 'storage' } });
    if (state.home !== 'ger') out.push({ key: 'ger', label: 'Гэр (4 ханатай)', note: 'Зорилго: гэр + 40 хонин толгой', order: { kind: 'ger' } });
    if (state.dogs.length < cfg.dogs.maxDogs) out.push({ key: 'dog', label: 'Нохой (банхар)', note: `10 м хамгаалалтын бүс, ойртсон чоныг хөөнө · хоол өдөрт ${fmtMoney(cfg.dogs.foodPerDay)} · K — команд`, order: { kind: 'dog' } });
    if (!state.vehicles.includes('truck')) out.push({ key: 'truck', label: 'Ачааны машин', note: `${cfg.vehicles.truck.capacity} нэгж, нэг тийш ${Math.round(cfg.vehicles.truck.oneWayHours * 60)} мин, бензинтэй`, order: { kind: 'vehicle', id: 'truck' } });
    return out;
  }

  private planFromDraft(): { sell: Partial<Record<ProductId, number>>; sellIds: number[]; buy: BuyOrder[] } {
    const d = this.draft!;
    const sellIds: number[] = [];
    for (const g of this.animalGroups()) {
      const n = d.sellGroups[g.key] ?? 0;
      // Тухайн бүлгийн хамгийн хөгшнөөс нь
      g.list.slice().sort((a, b) => b.age - a.age).slice(0, n).forEach((a) => sellIds.push(a.id));
    }
    const buy: BuyOrder[] = [];
    for (const c of ANIMAL_CATALOG) for (let i = 0; i < (d.buyAnimals[c.key] ?? 0); i++) buy.push({ kind: 'animal', species: c.species, sex: c.sex, age: c.age });
    for (const it of this.buyItems()) if (d.buyItems.has(it.key)) buy.push(it.order);
    const sell: Partial<Record<ProductId, number>> = {};
    for (const [p, n] of Object.entries(d.sell)) if ((n ?? 0) > 0) sell[p as ProductId] = n;
    return { sell, sellIds, buy };
  }

  private tripHtml(): string {
    const { cfg, state } = this;
    const d = this.draft!;
    const v = cfg.vehicles[d.vehicle];
    const plan = this.planFromDraft();
    const units = Object.values(plan.sell).reduce((s, n) => s + (n ?? 0), 0);
    const sellSlots = plan.sellIds.reduce((s, id) => s + animalSlots(cfg, d.vehicle, state.animals.find((a) => a.id === id)?.species ?? 'sheep'), 0);
    const buySlots = plan.buy.reduce((s, o) => s + (o.kind === 'animal' ? animalSlots(cfg, d.vehicle, o.species) : 0), 0);
    const income = Object.entries(plan.sell).reduce((s, [p, n]) => s + (n ?? 0) * productPrice(cfg, p as ProductId), 0)
      + plan.sellIds.reduce((s, id) => {
        const a = state.animals.find((x) => x.id === id);
        return s + (a ? salePrice(a, cfg.animals) : 0);
      }, 0);
    const cost = plan.buy.reduce((s, o) => s + orderPrice(cfg, state, o), 0);
    const fuel = ((cfg.vehicles.sumCenterKm * 2 * v.fuelPer100km) / 100) * cfg.vehicles.fuelPricePerL;
    const after = state.money + income - cost - fuel;
    const tripMin = Math.round(v.oneWayHours * 2 * 60);
    const realSec = tripMin * realSecondsPerMinute(cfg.time);

    const vehicles = state.vehicles.map((id) => `<button class="btn ${id === d.vehicle ? 'gold' : ''}" data-act="veh:${id}">${id === 'truck' ? '🚚 Ачааны машин' : '🐴 Морин тэрэг'} (${cfg.vehicles[id].capacity})</button>`).join(' ');

    const prodRows = PRODUCTS.map((p) => {
      const have = storage.count(state, p);
      if (have <= 1e-9) return '';
      const n = d.sell[p] ?? 0;
      return `<tr><td>${PRODUCT_EMOJI[p]} ${productName(p)} <span class="muted">(${fmtNum(have)} ${unitOf(p)})</span></td><td class="num">${fmtMoney(productPrice(cfg, p))}</td>
        <td class="ctl"><button class="btn sm" data-act="sell-:${p}">−</button><b>${fmtNum(n)}</b><button class="btn sm" data-act="sell+:${p}">+</button><button class="btn sm" data-act="sellAll:${p}">бүгд</button></td></tr>`;
    }).join('');

    const animalRows = this.animalGroups().map((g) => {
      const n = d.sellGroups[g.key] ?? 0;
      const sample = g.list.slice().sort((a, b) => b.age - a.age)[0]!;
      return `<tr><td>${g.label} <span class="muted">(${g.list.length})</span></td><td class="num">~${fmtMoney(salePrice(sample, cfg.animals))}</td>
        <td class="ctl"><button class="btn sm" data-act="ag-:${g.key}">−</button><b>${n}</b><button class="btn sm" data-act="ag+:${g.key}">+</button></td></tr>`;
    }).join('');

    const buyAnimalRows = ANIMAL_CATALOG.map((c) => {
      const n = d.buyAnimals[c.key] ?? 0;
      const price = orderPrice(cfg, state, { kind: 'animal', species: c.species, sex: c.sex, age: c.age });
      return `<tr><td>${speciesEmoji(c.species)} ${stageName(cfg, c.species, c.sex, c.age)} <span class="muted">${c.note}</span></td><td class="num">${fmtMoney(price)}</td>
        <td class="ctl"><button class="btn sm" data-act="ba-:${c.key}">−</button><b>${n}</b><button class="btn sm" data-act="ba+:${c.key}">+</button></td></tr>`;
    }).join('');

    const itemRows = this.buyItems().map((it) => {
      const on = d.buyItems.has(it.key);
      return `<tr><td>${it.label} <span class="muted">${it.note}</span></td><td class="num">${fmtMoney(orderPrice(cfg, state, it.order))}</td>
        <td class="ctl"><button class="btn sm ${on ? 'gold' : ''}" data-act="bi:${it.key}">${on ? '✓ Авна' : 'Авах'}</button></td></tr>`;
    }).join('');

    const errs: string[] = [];
    if (units > v.capacity + 1e-9) errs.push(`Ачаа багтахгүй: ${fmtNum(units)}/${v.capacity}`);
    if (sellSlots > v.sheepSlots + 1e-9) errs.push(`Зарах мал багтахгүй (${v.sheepSlots} хонь эсвэл ${v.cowSlots} үхэр)`);
    if (buySlots > v.sheepSlots + 1e-9) errs.push(`Авах мал багтахгүй (${v.sheepSlots} хонь эсвэл ${v.cowSlots} үхэр)`);
    const warn = after < 0 ? `<p class="bad">Мөнгө хүрэхгүй: зарсны дараа ${fmtMoney(state.money + income - fuel)} байна. Хүрэлцэхгүй бараа авагдахгүй.</p>` : '';
    const empty = !units && !plan.sellIds.length && !plan.buy.length;
    const near = Math.hypot(state.player.x - cfg.camps.home.x, state.player.z - cfg.camps.home.z) <= cfg.camps.home.storageRadius * 2;

    return `
      <h2>🏘 Сумын төв рүү явах <span class="close" data-act="close">✕</span></h2>
      <p>${vehicles}</p>
      <p class="muted">Хоёр тийш ${fmtMinutes(tripMin)} (1× хурдаар ~${Math.round(realSec)} сек). Энэ хугацаанд малчин явна: сүрэг хараа хяналтгүй, газарт унасан сүү исэлж, тараг болно.${fuel ? ` Бензин ${fmtMoney(fuel)}.` : ''}</p>
      <h3>Зарах бүтээгдэхүүн <span class="muted">${fmtNum(units)} / ${v.capacity} нэгж</span></h3>
      <div class="bar"><div style="width:${Math.min(100, (units / v.capacity) * 100)}%"></div></div>
      <table>${prodRows || '<tr><td class="muted">Агуулахад зарах бүтээгдэхүүн алга.</td></tr>'}</table>
      <h3>Мал зарах <span class="muted">${fmtNum(sellSlots)} / ${v.sheepSlots} байр</span></h3>
      <table>${animalRows}</table>
      <h3>Мал авах <span class="muted">${fmtNum(buySlots)} / ${v.sheepSlots} байр</span></h3>
      <table>${buyAnimalRows}</table>
      <h3>Бараа авах</h3>
      <table>${itemRows || '<tr><td class="muted">Бүгдийг авсан байна.</td></tr>'}</table>
      <p><label><input type="checkbox" data-act="bull" ${state.neighborBull ? 'checked' : ''}> Хөршийн бух тавиулах (бухгүй бол үнээ бүрт ${fmtMoney(cfg.economy.neighborBullFee)}, тугалах үед)</label></p>
      <div class="sum">
        <div>Орлого: <b class="good">+${fmtMoney(income)}</b></div>
        <div>Зардал: <b class="bad">${fmtMoney(-(cost + fuel))}</b></div>
        <div>Дараа нь мөнгө: <b>${fmtMoney(after)}</b></div>
      </div>
      ${errs.map((e) => `<p class="bad">${e}</p>`).join('')}${warn}
      ${near ? '' : '<p class="bad">Тэрэг майхны дэргэд байна — тийшээ оч.</p>'}
      <p><button class="btn gold big" data-act="go" ${errs.length || empty || !near ? 'disabled' : ''}>Явах</button> <button class="btn" data-act="close">Болих</button></p>`;
  }

  // ======================= өдрийн тайлан =======================
  private reportHtml(): string {
    const r = this.report!;
    const cfg = this.cfg;
    const inc = Object.entries(r.income).filter(([, n]) => (n ?? 0) > 0);
    const exp = Object.entries(r.expenses).filter(([, n]) => (n ?? 0) > 0);
    const totalInc = inc.reduce((s, [, n]) => s + (n ?? 0), 0);
    const totalExp = exp.reduce((s, [, n]) => s + (n ?? 0), 0);
    const prods = PRODUCTS.filter((p) => (r.dropped[p] ?? 0) + (r.collected[p] ?? 0) + (r.spoiled[p] ?? 0) > 0);
    const prodRows = prods.map((p) => `<tr><td>${PRODUCT_EMOJI[p]} ${productName(p)}</td><td class="num">${fmtNum(r.dropped[p] ?? 0)}</td><td class="num">${fmtNum(r.collected[p] ?? 0)}</td><td class="num ${(r.spoiled[p] ?? 0) > 0 ? 'bad' : ''}">${fmtNum(r.spoiled[p] ?? 0)}</td></tr>`).join('');
    const cap = storage.capacity(cfg, this.state);
    const goalSU = cfg.economy.goalSheepUnits;
    const profit = r.moneyEnd - r.moneyStart;
    return `
      <h2>🌅 ${r.day}-р өдрийн тайлан</h2>
      <div class="cols">
        <div>
          <h3>Мөнгө</h3>
          <table>
            ${inc.map(([k, n]) => `<tr><td>${k === 'animals' ? '🐑 Мал зарсан' : `${PRODUCT_EMOJI[k] ?? ''} ${productName(k)}`}</td><td class="num good">+${fmtMoney(n ?? 0)}</td></tr>`).join('') || '<tr><td class="muted">Өнөөдөр орлого ороогүй</td><td></td></tr>'}
            ${exp.map(([k, n]) => `<tr><td>${expenseName(k)}</td><td class="num bad">${fmtMoney(-(n ?? 0))}</td></tr>`).join('')}
            <tr class="total"><td>Өдрийн дүн</td><td class="num ${profit >= 0 ? 'good' : 'bad'}">${profit >= 0 ? '+' : ''}${fmtMoney(profit)}</td></tr>
            <tr><td>Одоо байгаа мөнгө</td><td class="num"><b>${fmtMoney(r.moneyEnd)}</b></td></tr>
          </table>
          <p class="muted">Орлого ${fmtMoney(totalInc)} · зардал ${fmtMoney(totalExp)}</p>
        </div>
        <div>
          <h3>Бүтээгдэхүүн</h3>
          <table><tr class="muted"><td></td><td class="num">унасан</td><td class="num">түүсэн</td><td class="num">муудсан</td></tr>
          ${prodRows || '<tr><td class="muted" colspan="4">—</td></tr>'}</table>
          <p>📦 Агуулах: ${fmtNum(r.storageUsed)} / ${cap}</p>
        </div>
      </div>
      <h3>Мал ба бэлчээр</h3>
      <p>Мал ${r.animals} · хонин толгой <b>${fmtNum(r.sheepUnits)}</b>${r.births ? ` · 🐣 төл ${r.births}` : ''}${r.deaths ? ` · <span class="bad">үхсэн ${r.deaths}</span>` : ''}<br>
      Дундаж тарга ${Math.round(r.avgCondition * 100)}% · өнөөдрийн идэш ${Math.round(r.avgGutFill * 100)}% · эм хонины жин ${fmtNum(Math.round(r.avgEweKg * 10) / 10)} кг<br>
      ${this.wolfKillsHtml(r)}</p>
      <h3>Бууц: ${t('camp.' + this.state.campId)} · ${r.campDays} дахь өдөр</h3>
      <p>Бэлчээрийн өвс ${Math.round(r.grass * 100)}% · доройтол <span class="${r.campDegrade > 0.3 ? 'bad' : ''}">${Math.round(r.campDegrade * 100)}%</span> · өвс ургах хурд <span class="${r.regrowthMult < 0.8 ? 'bad' : ''}">${Math.round(r.regrowthMult * 100)}%</span>
      ${r.campDegrade > 0.6 ? '<br><b class="bad">Бэлчээр доройтож өвс бараг ургахгүй байна — мал турна. M — нүүх</b>' : r.campDegrade > 0.3 ? '<br><span class="bad">Бууцаа сэлгэх цаг боллоо (M — нүүх)</span>' : ''}
      <br><span class="muted">Бусад бууц (амарч сэргэж байна): ${Object.entries(r.camps).filter(([id]) => id !== this.state.campId).map(([id, c]) => `${t('camp.' + id)} ${Math.round(c.degrade * 100)}%`).join(' · ')}</span></p>
      <h3>Зорилго: гэр + ${goalSU} хонин толгой</h3>
      <div class="bar"><div style="width:${Math.min(100, (r.sheepUnits / goalSU) * 100)}%"></div></div>
      <p>${this.state.home === 'ger' ? '✅ Гэртэй' : `Гэр: ${fmtMoney(cfg.economy.gerPrice)}`} · хонин толгой ${fmtNum(r.sheepUnits)} / ${goalSU}${r.goalReached ? ' · <b class="good">🎉 Зорилгодоо хүрлээ!</b>' : ''}</p>
      <p><button class="btn gold big" data-act="close">Маргааш өглөө ▶</button> <span class="muted">Enter</span></p>`;
  }

  private wolfKillsHtml(r: DayReport): string {
    const k = Object.entries(r.wolfKills).filter(([, n]) => (n ?? 0) > 0);
    if (!k.length) return '';
    return `<br><b class="bad">🐺 Чонод барьдсан: ${k.map(([sp, n]) => `${speciesEmoji(sp as Species)} ${t('species.' + sp).toLowerCase()} ${n}`).join(', ')}</b> <span class="muted">— сүргээ чонын нутгаас хол байлга, нохой ав, дэргэд нь бай</span>`;
  }

  // ======================= нохой (K) =======================
  private dogsHtml(): string {
    const { cfg, state } = this;
    const p = state.player;
    if (!state.dogs.length) {
      return `<h2>🐕 Нохой <span class="close" data-act="close">✕</span></h2>
        <p>Танд нохой алга. Сумын төвөөс (T) авна: <b>${fmtMoney(cfg.dogs.price)}</b>, хоол өдөрт ${fmtMoney(cfg.dogs.foodPerDay)}.</p>
        <p class="muted">Нохой бүр ${cfg.wolves.protectRadius.dog} м хамгаалалтын бүстэй: чоно бүс рүү нь орохгүй, доторх малд дайрахгүй. Ойртсон чоныг хуцаж хөөнө.</p>`;
    }
    const keys = [...new Set(state.animals.filter((a) => !a.riding).map((a) => flockKey(a.species)))];
    const buttons = (target: string) => {
      const base = (['follow', 'stay', 'patrol', 'patrolCamp'] as DogOrderKind[])
        .map((o) => `<button class="btn sm" data-act="dog:${target}|${o}">${DOG_ORDER_NAME[o]}</button>`).join(' ');
      const herd = keys.map((k) => `<button class="btn sm" data-act="dog:${target}|guardHerd|${k}">${HERD_NAME[k]}</button>`).join(' ');
      return `${base}<br><span class="muted">Сүргийг хамгаал:</span> ${herd || '<span class="muted">мал алга</span>'}`;
    };
    const rows = state.dogs.map((d) => {
      const dist = Math.round(Math.hypot(d.x - p.x, d.z - p.z));
      const cur = d.order === 'guardHerd' ? `${DOG_ORDER_NAME.guardHerd} (${HERD_NAME[d.herd]})` : DOG_ORDER_NAME[d.order];
      const status = d.mode === 'chase' ? '<b class="bad">🐺 Чоно хөөж байна</b>' : cur;
      return `<tr><td><b>🐕 ${d.name}</b><br><span class="muted">${dist} м зайд</span></td><td>${status}</td><td>${buttons(String(d.id))}</td></tr>`;
    }).join('');
    return `<h2>🐕 Нохойн команд <span class="close" data-act="close">✕</span></h2>
      <p class="muted">«Энд» = таны одоо зогсож буй газар. Нохой бүр ${cfg.wolves.protectRadius.dog} м хамгаалалтын бүстэй, ${cfg.dogs.alertRadius} м-т ойртсон чоныг хөөнө (харуулын цэгээсээ ${cfg.dogs.leash} м-ээс холгүй). <kbd>N</kbd> — бүх нохой намайг дага.</p>
      <table>${rows}
      ${state.dogs.length > 1 ? `<tr class="total"><td><b>Бүх нохой</b></td><td></td><td>${buttons('all')}</td></tr>` : ''}</table>`;
  }

  // ======================= бууц сэлгэх (M) =======================
  private campsHtml(): string {
    const { cfg, state } = this;
    const deg = cfg.pasture.degradation;
    const byTruck = state.vehicles.includes('truck');
    const hours = moveHours(cfg, state, byTruck);
    const trips = state.home === 'ger' ? Number(cfg.camps.move.truckTripsGer) : Number(cfg.camps.move.truckTripsTent);
    const fuel = byTruck ? ((cfg.vehicles.campDistanceKm * 2 * trips * cfg.vehicles.truck.fuelPer100km) / 100) * cfg.vehicles.fuelPricePerL : 0;
    const su = herdSheepUnits(state, cfg.animals);
    const gainPerDay = deg.gainPerDayAtCapacity * (su / deg.campCapacitySheepUnits);
    const near = Math.hypot(state.player.x - cfg.camps.home.x, state.player.z - cfg.camps.home.z) <= cfg.camps.home.storageRadius * 2;
    const busy = Boolean(state.trip || state.move || state.player.away);
    const rows = Object.entries(cfg.camps.camps).map(([id, c]) => {
      const cs = state.camps[id]!;
      const here = id === state.campId;
      const types = [...new Set(c.rings.map(([, ty]) => ty).filter((ty) => ty !== 'camp'))].map((ty) => PASTURE_NAME[ty] ?? ty).join(', ');
      const growth = 1 - deg.growthPenalty * cs.degrade;
      const dCls = cs.degrade > 0.3 ? 'bad' : cs.degrade < 0.1 ? 'good' : '';
      const action = here
        ? `<b>📍 Энд байна</b><br><span class="muted">${cs.daysSpent} өдөр · өдөрт +${fmtNum(Math.round(gainPerDay * 1000) / 10)}%</span>`
        : `<button class="btn gold" data-act="move:${id}" ${!near || busy ? 'disabled' : ''}>Нүүх</button>`;
      return `<tr><td><b>${t('camp.' + id)}</b><br><span class="muted">${types}</span></td>
        <td>${WATER_NAME[c.water] ?? c.water}</td>
        <td class="${c.wolfLevel === 'high' ? 'bad' : ''}">${WOLF_LEVEL_NAME[c.wolfLevel] ?? c.wolfLevel}</td>
        <td><span class="${dCls}">${Math.round(cs.degrade * 100)}%</span><div class="bar"><div style="width:${Math.round(cs.degrade * 100)}%;background:#b8873a"></div></div></td>
        <td class="num">${Math.round(growth * 100)}%</td>
        <td>${action}</td></tr>`;
    }).join('');
    const lost = state.items.reduce((s, it) => s + it.amount, 0);
    return `<h2>🏕 Бууц сэлгэх <span class="close" data-act="close">✕</span></h2>
      <p class="muted">Нэг бууцанд удах тусам бэлчээр доройтож өвс удаан ургана, чанар нь муудна. Доройтол 60%-иас дээш бол мал турж эхэлнэ. Орхисон бууц өдөрт ${Math.round(deg.recoverPerDayWhenAway * 100)}% сэргэнэ.</p>
      <table><tr class="muted"><td>Бууц, бэлчээр</td><td>Ус</td><td>Чоно</td><td>Доройтол</td><td class="num">Өвс ургалт</td><td></td></tr>${rows}</table>
      <div class="sum">
        <div>Нүүх хугацаа: <b>${fmtNum(hours)} цаг</b> ${byTruck ? '🚚 машинаар' : '🐴 тэргээр'} (${state.home === 'ger' ? 'гэртэй' : 'майхантай'})</div>
        ${fuel ? `<div>Бензин: <b class="bad">${fmtMoney(-fuel)}</b></div>` : ''}
        <div>Сүрэг: ${fmtNum(su)} хонин толгой</div>
      </div>
      <p class="muted">Нүүх хугацаанд малчин завгүй — тэр зуур чоно, муудал таныг хүлээхгүй. Мал, нохой, агуулах хамт нүүнэ.${lost > 0 ? ` <span class="bad">Газарт унасан ${fmtNum(lost)} нэгж бүтээгдэхүүн хаягдана — эхлээд түүж ав.</span>` : ''}</p>
      ${busy ? '<p class="bad">Малчин завгүй байна (сумын төвд эсвэл нүүж байна).</p>' : !near ? '<p class="bad">Нүүхийн тулд майхандаа оч (ачаа бараагаа ачина).</p>' : ''}`;
  }

  // ======================= туршилтын цэс (`) =======================
  private cheatHtml(): string {
    const { cfg, state } = this;
    const rows = CHEATS.map((row) => `<p>${row.map((c) => `<button class="btn sm" data-act="cheat:${c.act}">${c.label}</button>`).join(' ')}</p>`).join('');
    const camps = Object.keys(cfg.camps.camps).map((id) => `<button class="btn sm ${id === state.campId ? 'gold' : ''}" data-act="cheat:camp:${id}">${t('camp.' + id)}</button>`).join(' ');
    return `<h2>🛠 Туршилтын цэс <span class="close" data-act="close">✕</span></h2>
      ${rows}
      <p>Шууд нүүх: ${camps}</p>
      <p><button class="btn sm" data-act="zones">🛡 Хамгаалалтын бүс харуулах (Z)</button> <span class="muted">Чонын дайралт: ${state.wolves.peaceful ? 'унтраасан' : 'асаалттай'} · нохой ${state.dogs.length} · мал ${state.animals.length}</span></p>
      <p class="muted">Энэ цэс тоглоомын дүрмийг турших зорилготой. \` — хаах.</p>`;
  }

  // ======================= үйлдлүүд =======================
  private act(a: string): void {
    const [cmd, arg = ''] = a.split(/:(.*)/s) as [string, string?];
    const d = this.draft;
    const { cfg, state } = this;
    switch (cmd) {
      case 'close':
        this.close();
        return;
      case 'process': {
        const r = this.hooks.dispatch({ type: 'process', kind: arg as ProcessorKind });
        this.hooks.toast(r.ok ? `${PROCESSOR_NAME[arg]} ажиллаж эхэллээ` : r.msg ?? '', r.ok ? 'good' : 'bad');
        break;
      }
      case 'veh':
        if (d) d.vehicle = arg as VehicleId;
        break;
      case 'sell+':
      case 'sell-':
      case 'sellAll': {
        if (!d) break;
        const p = arg as ProductId;
        const have = storage.count(state, p);
        const cur = d.sell[p] ?? 0;
        const step = p === 'cashmere' ? 0.1 : p === 'wool' ? 0.5 : 1;
        const units = Object.entries(d.sell).reduce((s, [k, n]) => s + (k === p ? 0 : n ?? 0), 0);
        const room = Math.max(0, cfg.vehicles[d.vehicle].capacity - units);
        let n = cmd === 'sellAll' ? Math.min(have, room) : cmd === 'sell+' ? Math.min(have, cur + step) : Math.max(0, cur - step);
        n = Math.round(n * 10) / 10;
        d.sell[p] = n;
        break;
      }
      case 'ag+':
      case 'ag-': {
        if (!d) break;
        const g = this.animalGroups().find((x) => x.key === arg);
        const cur = d.sellGroups[arg] ?? 0;
        d.sellGroups[arg] = cmd === 'ag+' ? Math.min(g?.list.length ?? 0, cur + 1) : Math.max(0, cur - 1);
        break;
      }
      case 'ba+':
      case 'ba-': {
        if (!d) break;
        const cur = d.buyAnimals[arg] ?? 0;
        d.buyAnimals[arg] = cmd === 'ba+' ? Math.min(cur + 1, 30) : Math.max(0, cur - 1);
        break;
      }
      case 'bi':
        if (d) {
          if (d.buyItems.has(arg)) d.buyItems.delete(arg);
          else d.buyItems.add(arg);
        }
        break;
      case 'dog': {
        const [target, order, herd] = arg.split('|') as [string, DogOrderKind, Species?];
        const r = this.hooks.dispatch({ type: 'dogOrder', dog: target === 'all' ? 'all' : Number(target), order, herd });
        this.hooks.toast(r.msg ?? '', r.ok ? 'good' : 'bad');
        if (r.ok) {
          this.close();
          return;
        }
        break;
      }
      case 'move': {
        const r = this.hooks.dispatch({ type: 'moveCamp', to: arg });
        this.hooks.toast(r.ok ? `🏕 ${t('camp.' + arg)} руу нүүж байна` : r.msg ?? '', r.ok ? 'good' : 'bad');
        if (r.ok) {
          this.close();
          return;
        }
        break;
      }
      case 'cheat': {
        const r = this.hooks.dispatch({ type: 'cheat', action: arg as CheatAction });
        if (r.msg) this.hooks.toast(r.msg, r.ok ? 'good' : 'bad');
        if (this.kind !== 'cheat') return;   // өдрийн тайлан нээгдсэн
        break;
      }
      case 'zones': {
        const on = this.hooks.toggleZones?.();
        this.hooks.toast(on ? 'Хамгаалалтын бүс харагдаж байна (Z)' : 'Хамгаалалтын бүс нуулаа', 'good');
        break;
      }
      case 'bull': {
        const on = !state.neighborBull;
        this.hooks.dispatch({ type: 'neighborBull', on });
        break;
      }
      case 'go': {
        if (!d) break;
        const plan = this.planFromDraft();
        const r = this.hooks.dispatch({ type: 'trip', plan: { vehicle: d.vehicle, sell: plan.sell, sellAnimalIds: plan.sellIds, buy: plan.buy } });
        if (r.ok) {
          this.hooks.toast(d.vehicle === 'truck' ? '🚚 Сумын төв рүү машинаар явлаа' : '🐴 Сумын төв рүү тэргээр явлаа', 'good');
          this.close();
          return;
        }
        this.hooks.toast(r.msg ?? 'Явж чадсангүй', 'bad');
        break;
      }
    }
    this.render();
  }
}
