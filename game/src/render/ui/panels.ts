/**
 * Цонхнууд (M3): агуулах ба боловсруулалт (B), өдрийн тайлан (20:00).
 * M4.6: ачаа (T, хотонд — гартаа авах, тээвэрт ачих/буулгах), Худалдаачин (E/T, сумын төвд), өөр бууцанд ирэх.
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
import { animalSlots, bestTruck, orderPrice, productPrice } from '../../sim/systems/trip';
import { animalRoom, atLoadingSpot, cargoSlots, cargoUnits, partySpeedKmPerMin, sellableAnimals, sellableAtShop } from '../../sim/systems/travel';
import { salePrice } from '../../sim/systems/animals';
import { DOG_ORDER_NAME, type DogOrderKind } from '../../sim/systems/dogs';
import { flockKey } from '../../sim/systems/herds';
import { moveHours } from '../../sim/systems/camps';
import { herdSheepUnits } from '../../sim/systems/animals';
import type { CheatAction } from '../../sim/systems/cheats';
import {
  PASTURE_NAME, PRODUCT_EMOJI, PROCESSOR_NAME, WATER_NAME, WOLF_LEVEL_NAME, expenseName, fmtMinutes, fmtMoney, fmtNum, productName, speciesEmoji, stageName, unitOf,
} from './names';
import { t } from '../../i18n/i18n';

type Kind = 'storage' | 'cargo' | 'shop' | 'arrive' | 'report' | 'dogs' | 'camps' | 'cheat';

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
  vehicle: VehicleId | null;    // ачих тээвэр (null = гартаа/морьтой)
  take: Partial<Record<ProductId, number>>;   // агуулахаас гартаа
  sell: Partial<Record<ProductId, number>>;   // ачих (хотонд) эсвэл зарах (сумын төвд)
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
  private arriveCamp = '';

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
        (e.code === 'KeyT' && (this.kind === 'cargo' || this.kind === 'shop')) ||
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
    if (kind === 'cargo' || kind === 'shop') {
      const st = this.state;
      if (kind === 'shop' && st.player.place !== 'sum') return;
      if (kind === 'cargo' && (st.player.place !== 'camp' || st.move)) {
        this.hooks.toast('Ачаа хотондоо ачна', 'bad');
        return;
      }
      const here = st.fleet.filter((f) => f.place === st.player.place);
      const v = st.player.driving ?? here.sort((a, b) => this.cfg.vehicles[b.id].capacity - this.cfg.vehicles[a.id].capacity)[0]?.id ?? null;
      this.draft = { vehicle: v, take: {}, sell: {}, sellGroups: {}, buyAnimals: {}, buyItems: new Set() };
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

  /** Газрын зураг дээр өөр бууцанд ирлээ */
  showArrive(campId: string): void {
    if (this.kind && this.kind !== 'report') this.close();
    this.arriveCamp = campId;
    if (this.kind !== 'report') this.open('arrive');
  }

  private render(): void {
    const scroll = this.box.scrollTop;
    if (this.kind === 'storage') this.box.innerHTML = this.storageHtml();
    else if (this.kind === 'cargo') this.box.innerHTML = this.cargoHtml();
    else if (this.kind === 'shop') this.box.innerHTML = this.shopHtml();
    else if (this.kind === 'arrive') this.box.innerHTML = this.arriveHtml();
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
  private animalGroups(src: Animal[] = this.state.animals): { key: string; label: string; list: Animal[] }[] {
    const groups = new Map<string, { key: string; label: string; list: Animal[] }>();
    for (const a of src) {
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
    for (const id of ['horseCart', 'porter', 'amjirgaa'] as const) {
      if (state.vehicles.includes(id)) continue;
      const v = cfg.vehicles[id];
      const kmh = Math.round(cfg.vehicles.sumCenterKm / v.oneWayHours);
      out.push({ key: id, label: `${v.emoji} ${v.name}${v.truck ? ' (ачааны машин)' : ''}`, note: `${v.capacity} нэгж, ${v.sheepSlots} хонь / ${v.cowSlots} үхэр, ${kmh} км/ц${v.fuelPer100km ? `, ${v.fuelPer100km} л/100 км` : ''} · гэрт тань хүргэнэ`, order: { kind: 'vehicle', id } });
    }
    return out;
  }

  private vehicleButtons(): string {
    const { cfg, state } = this;
    const d = this.draft!;
    const here = state.fleet.filter((f) => f.place === state.player.place);
    const btn = (id: VehicleId | null, label: string) => `<button class="btn ${id === d.vehicle ? 'gold' : ''}" data-act="veh:${id ?? ''}">${label}</button>`;
    return here.map((f) => btn(f.id, `${cfg.vehicles[f.id].emoji} ${cfg.vehicles[f.id].name}`)).join(' ');
  }

  private cargoList(): string {
    const { cfg, state } = this;
    const d = this.draft!;
    const f = d.vehicle ? state.fleet.find((x) => x.id === d.vehicle) : null;
    if (!f) return '';
    const v = cfg.vehicles[f.id];
    const prod = Object.entries(f.cargo).map(([p, n]) => `${PRODUCT_EMOJI[p as ProductId]} ${fmtNum(n ?? 0)} ${unitOf(p)}`).join(' · ');
    const an = this.animalGroups(f.animals).map((g) => `${g.label} ${g.list.length}`).join(' · ');
    const ord = f.orders.length ? `${f.orders.length} бараа` : '';
    const parts = [prod, an, ord].filter(Boolean).join(' · ');
    return `<p>Ачаа: <b>${fmtNum(cargoUnits(f))}/${v.capacity}</b> нэгж · мал ${fmtNum(cargoSlots(cfg, f))}/${v.sheepSlots} байр${parts ? ` — ${parts}` : ' — хоосон'}</p>`;
  }

  // ======================= ачаа (хотонд, T) =======================
  private cargoHtml(): string {
    const { cfg, state } = this;
    const d = this.draft!;
    const p = state.player;
    const carried = p.carry.reduce((s, c) => s + c.amount, 0);
    const room = Math.max(0, cfg.products.carryUnits - carried);
    const takeUnits = Object.values(d.take).reduce((s, n) => s + (n ?? 0), 0);
    const nearStore = Math.hypot(p.x - cfg.camps.home.x, p.z - cfg.camps.home.z) <= cfg.camps.home.storageRadius * 2;
    const takeRows = PRODUCTS.map((pr) => {
      const have = storage.count(state, pr);
      if (have <= 1e-9) return '';
      const n = d.take[pr] ?? 0;
      return `<tr><td>${PRODUCT_EMOJI[pr]} ${productName(pr)} <span class="muted">(${fmtNum(have)} ${unitOf(pr)})</span></td><td class="num">${fmtMoney(productPrice(cfg, pr))}</td>
        <td class="ctl"><button class="btn sm" data-act="take-:${pr}">−</button><b>${fmtNum(n)}</b><button class="btn sm" data-act="take+:${pr}">+</button><button class="btn sm" data-act="takeAll:${pr}">бүгд</button></td></tr>`;
    }).join('');
    let html = `<h2>🧺 Сумын төв рүү ачаа бэлтгэх <span class="close" data-act="close">✕</span></h2>
      <p class="muted">Морь унаж эсвэл тэрэг, машиндаа сууж (V) бууцны захын хязгаарт хүрэхэд газрын зураг гарна. Тэндээс сумын төв дээр дарж Худалдаачинд оч.</p>
      <h3>✋ Гартаа авах (морьтой явахад) — гарт ${fmtNum(carried)}/${cfg.products.carryUnits}</h3>
      <table>${takeRows || '<tr><td class="muted">Агуулах хоосон</td></tr>'}</table>
      <p><button class="btn gold" data-act="doTake" ${takeUnits > 0 && takeUnits <= room + 1e-9 && nearStore ? '' : 'disabled'}>Гартаа авах (${fmtNum(takeUnits)})</button>
      ${!nearStore ? ' <span class="bad">Агуулахын дэргэд оч</span>' : takeUnits > room + 1e-9 ? ` <span class="bad">Гарт ${fmtNum(room)} нэгж л багтана</span>` : ''}</p>`;

    // Морьтой: мал тууж явах
    const groups = this.animalGroups();
    if (p.mounted) {
      const rows = groups.map((g) => {
        const n = d.sellGroups[g.key] ?? 0;
        return `<tr><td>${g.label} <span class="muted">(${g.list.length})</span></td><td class="num">~${fmtMoney(salePrice(g.list[0]!, cfg.animals))}</td>
          <td class="ctl"><button class="btn sm" data-act="ag-:${g.key}">−</button><b>${n}</b><button class="btn sm" data-act="ag+:${g.key}">+</button></td></tr>`;
      }).join('');
      if (!d.vehicle) html += `<h3>🐎 Морьтой: мал араасаа тууж очиж зарах</h3><p class="muted">Мал тууж явбал газрын зураг дээр ${fmtNum(cfg.vehicles.riding.droveKmh)} км/ц болж удаашрна.</p>
        <table>${rows}</table><p><button class="btn gold" data-act="doDrove">Араасаа тууж явах</button></p>`;
    }
    if (!state.fleet.some((f) => f.place === 'camp')) {
      html += `<p class="muted">Тэрэг, машин алга. Морин тэрэг, Портер, Амжиргаа цагааныг Худалдаачнаас авч болно — илүү их ачаа, мал зөөнө.</p>`;
      return html;
    }
    html += `<h3>🚚 Тэрэг, машинд ачих</h3><p>${this.vehicleButtons()}</p>`;
    const f = d.vehicle ? state.fleet.find((x) => x.id === d.vehicle) : null;
    if (!f) return html;
    const v = cfg.vehicles[f.id];
    const atSpot = atLoadingSpot(cfg, state, f);
    const loadUnits = Object.values(d.sell).reduce((s, n) => s + (n ?? 0), 0);
    const loadRows = PRODUCTS.map((pr) => {
      const have = storage.count(state, pr);
      if (have <= 1e-9) return '';
      const n = d.sell[pr] ?? 0;
      return `<tr><td>${PRODUCT_EMOJI[pr]} ${productName(pr)} <span class="muted">(${fmtNum(have)} ${unitOf(pr)})</span></td><td class="num">${fmtMoney(productPrice(cfg, pr))}</td>
        <td class="ctl"><button class="btn sm" data-act="sell-:${pr}">−</button><b>${fmtNum(n)}</b><button class="btn sm" data-act="sell+:${pr}">+</button><button class="btn sm" data-act="sellAll:${pr}">бүгд</button></td></tr>`;
    }).join('');
    const animalRows = groups.map((g) => {
      const n = d.sellGroups[g.key] ?? 0;
      return `<tr><td>${g.label} <span class="muted">(${g.list.length})</span></td><td class="num">~${fmtMoney(salePrice(g.list[0]!, cfg.animals))}</td>
        <td class="ctl"><button class="btn sm" data-act="ag-:${g.key}">−</button><b>${n}</b><button class="btn sm" data-act="ag+:${g.key}">+</button></td></tr>`;
    }).join('');
    const loadSlots = this.selectedAnimals(groups).reduce((s, a) => s + animalSlots(cfg, f.id, a.species), 0);
    const errs: string[] = [];
    if (cargoUnits(f) + loadUnits > v.capacity + 1e-9) errs.push(`Ачаа багтахгүй (${v.capacity} нэгж)`);
    if (cargoSlots(cfg, f) + loadSlots > v.sheepSlots + 1e-9) errs.push(`Мал багтахгүй (${v.sheepSlots} хонь эсвэл ${v.cowSlots} үхэр)`);
    if (!atSpot) errs.push('Тээврээ майхны дэргэд авчир');
    html += this.cargoList() + `
      <table><tr><th>Агуулахаас ачих</th><th class="num">Үнэ</th><th></th></tr>${loadRows || '<tr><td class="muted">Агуулах хоосон</td></tr>'}</table>
      <table><tr><th>Зарахаар ачих мал</th><th class="num">~Үнэ</th><th></th></tr>${animalRows}</table>
      ${errs.length ? `<p class="bad">${errs.join(' · ')}</p>` : ''}
      <p><button class="btn gold" data-act="doLoad" ${errs.length || (!loadUnits && !loadSlots) ? 'disabled' : ''}>Ачих</button>
      <button class="btn" data-act="doUnload" ${atSpot && (cargoUnits(f) || f.animals.length || f.orders.length) ? '' : 'disabled'}>Бүгдийг буулгах</button></p>`;
    return html;
  }

  private selectedAnimals(groups: { key: string; list: Animal[] }[]): Animal[] {
    const d = this.draft!;
    const out: Animal[] = [];
    for (const g of groups) out.push(...g.list.slice().sort((a, b) => b.age - a.age).slice(0, d.sellGroups[g.key] ?? 0));
    return out;
  }

  // ======================= Худалдаачин (сумын төвд, E/T) =======================
  private shopHtml(): string {
    const { cfg, state } = this;
    const d = this.draft!;
    const p = state.player;
    const near = Math.hypot(p.x - cfg.worldmap.sum3d.shop.x, p.z - cfg.worldmap.sum3d.shop.z) <= cfg.worldmap.sum3d.shop.r;
    const have = sellableAtShop(state);
    const sellRows = PRODUCTS.map((pr) => {
      const n0 = have[pr] ?? 0;
      if (n0 <= 1e-9) return '';
      const n = d.sell[pr] ?? 0;
      return `<tr><td>${PRODUCT_EMOJI[pr]} ${productName(pr)} <span class="muted">(${fmtNum(n0)} ${unitOf(pr)})</span></td><td class="num">${fmtMoney(productPrice(cfg, pr))}</td>
        <td class="ctl"><button class="btn sm" data-act="sell-:${pr}">−</button><b>${fmtNum(n)}</b><button class="btn sm" data-act="sell+:${pr}">+</button><button class="btn sm" data-act="sellAll:${pr}">бүгд</button></td></tr>`;
    }).join('');
    const groups = this.animalGroups(sellableAnimals(state));
    const animalRows = groups.map((g) => {
      const n = d.sellGroups[g.key] ?? 0;
      return `<tr><td>${g.label} <span class="muted">(${g.list.length})</span></td><td class="num">~${fmtMoney(salePrice(g.list[0]!, cfg.animals))}</td>
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
    const plan = this.shopPlan();
    const income = Object.entries(plan.sell).reduce((s, [k, n]) => s + (n ?? 0) * productPrice(cfg, k as ProductId), 0)
      + sellableAnimals(state).filter((a) => plan.sellAnimalIds.includes(a.id)).reduce((s, a) => s + salePrice(a, cfg.animals), 0);
    const cost = plan.buy.reduce((s, o) => s + orderPrice(cfg, state, o), 0);
    const after = state.money + income - cost;
    const f = p.driving ? state.fleet.find((x) => x.id === p.driving) : null;
    const buySlots = plan.buy.reduce((s, o) => s + (o.kind === 'animal' ? (f ? animalSlots(cfg, f.id, o.species) : 1) : 0), 0);
    const freed = f ? sellableAnimals(state).filter((a) => plan.sellAnimalIds.includes(a.id)).reduce((s, a) => s + animalSlots(cfg, f.id, a.species), 0) : 0;
    const roomOk = buySlots <= animalRoom(cfg, state) + freed + 1e-9;
    const how = f ? `${cfg.vehicles[f.id].emoji} ${cfg.vehicles[f.id].name}` : '🐎 Морьтой';
    const animalNote = f ? `Авсан мал тэвшинд ачигдана (${cfg.vehicles[f.id].sheepSlots} хонь эсвэл ${cfg.vehicles[f.id].cowSlots} үхэр)` : `Морьтой бол авсан малаа араасаа тууж харина — газрын зураг дээр ${fmtNum(cfg.vehicles.riding.droveKmh)} км/ц`;
    const empty = !Object.keys(plan.sell).length && !plan.sellAnimalIds.length && !plan.buy.length;
    return `<h2>🏪 Худалдаачин <span class="close" data-act="close">✕</span></h2>
      <p>${how} · Мөнгө: <b>${fmtMoney(state.money)}</b>${f ? ' · ' : ''}${this.cargoList().replace(/^<p>|<\/p>$/g, '')}</p>
      <table><tr><th>Зарах</th><th class="num">Үнэ</th><th></th></tr>${sellRows || '<tr><td class="muted">Зарах бүтээгдэхүүн алга — хотондоо гартаа эсвэл тэргэндээ ачиж ир (T)</td></tr>'}</table>
      ${groups.length ? `<table><tr><th>Мал зарах</th><th class="num">~Үнэ</th><th></th></tr>${animalRows}</table>` : ''}
      <table><tr><th>Мал авах</th><th class="num">Үнэ</th><th></th></tr>${buyAnimalRows}</table>
      <p class="muted">${animalNote}</p>
      <table><tr><th>Бараа авах</th><th class="num">Үнэ</th><th></th></tr>${itemRows}</table>
      <table><tr class="total"><td>Орлого</td><td class="num">+${fmtMoney(income)}</td></tr><tr class="total"><td>Зардал</td><td class="num">−${fmtMoney(cost)}</td></tr>
      <tr class="total"><td><b>Дараа нь</b></td><td class="num"><b class="${after < 0 ? 'bad' : ''}">${fmtMoney(after)}</b></td></tr></table>
      ${!roomOk ? '<p class="bad">Авах мал тэвшинд багтахгүй</p>' : ''}${after < 0 ? '<p class="bad">Мөнгө хүрэхгүй — хүрэлцэхгүй бараа авагдахгүй</p>' : ''}
      ${!near ? '<p class="bad">Худалдаачны дэлгүүрийн дэргэд (шар тойрог) оч</p>' : ''}
      <p><button class="btn gold" data-act="doTrade" ${empty || !near ? 'disabled' : ''}>Арилжаа хийх</button>
      <label class="muted"><input type="checkbox" data-act="bull" ${state.neighborBull ? 'checked' : ''}> Хөршийн бух тавиулах (үнээ бүрт ${fmtMoney(cfg.economy.neighborBullFee)})</label></p>`;
  }

  private shopPlan(): { sell: Partial<Record<ProductId, number>>; sellAnimalIds: number[]; buy: BuyOrder[] } {
    const d = this.draft!;
    const sell: Partial<Record<ProductId, number>> = {};
    for (const [k, n] of Object.entries(d.sell)) if ((n ?? 0) > 0) sell[k as ProductId] = n;
    const sellAnimalIds = this.selectedAnimals(this.animalGroups(sellableAnimals(this.state))).map((a) => a.id);
    const buy: BuyOrder[] = [];
    for (const c of ANIMAL_CATALOG) for (let i = 0; i < (d.buyAnimals[c.key] ?? 0); i++) buy.push({ kind: 'animal', species: c.species, sex: c.sex, age: c.age });
    for (const it of this.buyItems()) if (d.buyItems.has(it.key)) buy.push(it.order);
    return { sell, sellAnimalIds, buy };
  }

  // ======================= өөр бууцанд ирэх (газрын зураг) =======================
  private arriveHtml(): string {
    const { cfg, state } = this;
    const id = this.arriveCamp;
    const c = cfg.camps.camps[id];
    const cs = state.camps[id];
    if (!c || !cs) return '';
    const deg = cfg.pasture.degradation;
    const types = [...new Set(c.rings.map(([, ty]) => ty).filter((ty) => ty !== 'camp'))].map((ty) => PASTURE_NAME[ty] ?? ty).join(', ');
    const hours = moveHours(cfg, state, false);
    const kmh = partySpeedKmPerMin(cfg, state) * 60;
    return `<h2>🏕 ${t('camp.' + id)} <span class="close" data-act="close">✕</span></h2>
      <table>
      <tr><td>Бэлчээр</td><td>${types}</td></tr>
      <tr><td>Ус</td><td>${WATER_NAME[c.water] ?? c.water}</td></tr>
      <tr><td>Чоно</td><td>${WOLF_LEVEL_NAME[c.wolfLevel] ?? c.wolfLevel}</td></tr>
      <tr><td>Доройтол</td><td>${Math.round(cs.degrade * 100)}% · өвс ургах хурд ${Math.round((1 - deg.growthPenalty * cs.degrade) * 100)}%</td></tr>
      </table>
      <p>Энд нүүвэл гэр бүл, сүрэг тань араас нүүж ирнэ: ~${fmtMinutes(Math.round(hours * 60))}. Тэр хооронд гэрийн бууцанд газарт үлдсэн бүтээгдэхүүн хаягдана.</p>
      <p><button class="btn gold" data-act="migrate">🏕 Энд нүүх</button> <button class="btn" data-act="close">Үргэлжлүүлэх (газрын зураг, ${Math.round(kmh)} км/ц)</button></p>`;
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
    const truck = bestTruck(cfg, state);
    const byTruck = truck !== null;
    const hours = moveHours(cfg, state, byTruck);
    const trips = state.home === 'ger' ? Number(cfg.camps.move.truckTripsGer) : Number(cfg.camps.move.truckTripsTent);
    const fuel = truck ? ((cfg.vehicles.campDistanceKm * 2 * trips * cfg.vehicles[truck].fuelPer100km) / 100) * cfg.vehicles.fuelPricePerL : 0;
    const su = herdSheepUnits(state, cfg.animals);
    const gainPerDay = deg.gainPerDayAtCapacity * (su / deg.campCapacitySheepUnits);
    const near = Math.hypot(state.player.x - cfg.camps.home.x, state.player.z - cfg.camps.home.z) <= cfg.camps.home.storageRadius * 2;
    const busy = Boolean(state.move || state.player.away || state.player.driving);
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
        if (d) {
          d.vehicle = (arg || null) as VehicleId | null;
          d.sell = {};
          d.sellGroups = {};
        }
        break;
      case 'take+':
      case 'take-':
      case 'takeAll': {
        if (!d) break;
        const p = arg as ProductId;
        const have = storage.count(state, p);
        const cur = d.take[p] ?? 0;
        const step = p === 'cashmere' ? 0.1 : p === 'wool' ? 0.5 : 1;
        const carried = state.player.carry.reduce((s2, c) => s2 + c.amount, 0);
        const others = Object.entries(d.take).reduce((s2, [k, n]) => s2 + (k === p ? 0 : n ?? 0), 0);
        const room = Math.max(0, cfg.products.carryUnits - carried - others);
        let n = cmd === 'takeAll' ? Math.min(have, room) : cmd === 'take+' ? Math.min(have, room, cur + step) : Math.max(0, cur - step);
        n = Math.round(n * 10) / 10;
        d.take[p] = n;
        break;
      }
      case 'doTake': {
        if (!d) break;
        const r = this.hooks.dispatch({ type: 'takeFromStorage', products: d.take });
        this.hooks.toast(r.msg ?? '', r.ok ? 'good' : 'bad');
        d.take = {};
        break;
      }
      case 'doDrove': {
        if (!d) break;
        const ids = this.selectedAnimals(this.animalGroups()).map((a2) => a2.id);
        const r = this.hooks.dispatch({ type: 'droveAnimals', animalIds: ids });
        this.hooks.toast(r.msg ?? '', r.ok ? 'good' : 'bad');
        d.sellGroups = {};
        break;
      }
      case 'doLoad': {
        if (!d || !d.vehicle) break;
        const ids = this.selectedAnimals(this.animalGroups()).map((a2) => a2.id);
        const r = this.hooks.dispatch({ type: 'loadCargo', vehicle: d.vehicle, products: d.sell, animalIds: ids });
        this.hooks.toast(r.msg ?? '', r.ok ? 'good' : 'bad');
        if (r.ok) {
          d.sell = {};
          d.sellGroups = {};
        }
        break;
      }
      case 'doUnload': {
        if (!d || !d.vehicle) break;
        const r = this.hooks.dispatch({ type: 'unloadCargo', vehicle: d.vehicle });
        this.hooks.toast(r.msg ?? '', r.ok ? 'good' : 'bad');
        break;
      }
      case 'doTrade': {
        if (!d) break;
        const r = this.hooks.dispatch({ type: 'trade', plan: this.shopPlan() });
        this.hooks.toast(r.msg ?? '', r.ok ? 'good' : 'bad');
        this.draft = { vehicle: d.vehicle, take: {}, sell: {}, sellGroups: {}, buyAnimals: {}, buyItems: new Set() };
        break;
      }
      case 'migrate': {
        const r = this.hooks.dispatch({ type: 'migrateHere' });
        this.hooks.toast(r.msg ?? '', r.ok ? 'good' : 'bad');
        if (r.ok) {
          this.close();
          return;
        }
        break;
      }
      case 'sell+':
      case 'sell-':
      case 'sellAll': {
        if (!d) break;
        const p = arg as ProductId;
        const shop = this.kind === 'shop';
        const have = shop ? sellableAtShop(state)[p] ?? 0 : storage.count(state, p);
        const cur = d.sell[p] ?? 0;
        const step = p === 'cashmere' ? 0.1 : p === 'wool' ? 0.5 : 1;
        const units = Object.entries(d.sell).reduce((s, [k, n]) => s + (k === p ? 0 : n ?? 0), 0);
        const f = d.vehicle ? state.fleet.find((x) => x.id === d.vehicle) : null;
        const room = shop ? Infinity : f ? Math.max(0, cfg.vehicles[f.id].capacity - cargoUnits(f) - units) : 0;
        let n = cmd === 'sellAll' ? Math.min(have, room) : cmd === 'sell+' ? Math.min(have, cur + step) : Math.max(0, cur - step);
        n = Math.round(n * 10) / 10;
        d.sell[p] = n;
        break;
      }
      case 'ag+':
      case 'ag-': {
        if (!d) break;
        const g = this.animalGroups(this.kind === 'shop' ? sellableAnimals(state) : state.animals).find((x) => x.key === arg);
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
    }
    this.render();
  }
}
