/**
 * Цонхнууд (M3): агуулах ба боловсруулалт (B), сумын төв (T), өдрийн тайлан (20:00).
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
import {
  PRODUCT_EMOJI, PROCESSOR_NAME, expenseName, fmtMinutes, fmtMoney, fmtNum, productName, speciesEmoji, stageName, unitOf,
} from './names';

type Kind = 'storage' | 'trip' | 'report';

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
      } else if ((e.code === 'KeyB' && this.kind === 'storage') || (e.code === 'KeyT' && this.kind === 'trip')) this.close();
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
    if (this.kind === 'storage') this.render();
  }

  private render(): void {
    const scroll = this.box.scrollTop;
    if (this.kind === 'storage') this.box.innerHTML = this.storageHtml();
    else if (this.kind === 'trip') this.box.innerHTML = this.tripHtml();
    else if (this.kind === 'report') this.box.innerHTML = this.reportHtml();
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
      Бэлчээрийн өвс ${Math.round(r.grass * 100)}% · бууцны доройтол <span class="${r.campDegrade > 0.3 ? 'bad' : ''}">${Math.round(r.campDegrade * 100)}%</span>${r.campDegrade > 0.3 ? ' — бууцаа сэлгэх цаг боллоо' : ''}</p>
      <h3>Зорилго: гэр + ${goalSU} хонин толгой</h3>
      <div class="bar"><div style="width:${Math.min(100, (r.sheepUnits / goalSU) * 100)}%"></div></div>
      <p>${this.state.home === 'ger' ? '✅ Гэртэй' : `Гэр: ${fmtMoney(cfg.economy.gerPrice)}`} · хонин толгой ${fmtNum(r.sheepUnits)} / ${goalSU}${r.goalReached ? ' · <b class="good">🎉 Зорилгодоо хүрлээ!</b>' : ''}</p>
      <p><button class="btn gold big" data-act="close">Маргааш өглөө ▶</button> <span class="muted">Enter</span></p>`;
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
