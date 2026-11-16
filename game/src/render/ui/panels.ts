/**
 * Цонхнууд (M3): агуулах ба боловсруулалт (B), өдрийн тайлан (20:00).
 * M4.6: ачаа (T, хотонд — гартаа авах, тээвэрт ачих/буулгах), Худалдаачин (E/T, сумын төвд), өөр бууцанд ирэх.
 * M4: нохойн команд (K), бууц сэлгэх (M), туршилтын цэс (`).
 * M5: цайны газар (сумын төвд E — туслах хөлслөх), туслахууд (J — үүрэг, малаар цалин, отор, халах).
 * GameState-ийг зөвхөн уншиж, үйлдлийг Command-аар илгээнэ (architecture.md §3.1).
 * Цонх нээлттэй үед тоглоом түр зогсоно.
 */
import { touchKeys } from '../../device';
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
import { averageBiomass } from '../../sim/systems/pasture';
import { herdSheepUnits } from '../../sim/systems/animals';
import type { CheatAction } from '../../sim/systems/cheats';
import { bedsTotal, bedsUsed, nearTeahouse, playerOwned, spareTents, type Helper, type HerdGroup } from '../../sim/systems/helpers';
import { campAccess, seasonProgress, yearOf } from '../../sim/systems/seasons';
import { hayRoom } from '../../sim/systems/travel';
import { closedMsg, isOpen } from '../../sim/systems/shops';
import { canSellAnimals, canSellProducts, nearLotSlot, nearTradeDoor, orderAllowed } from '../../sim/systems/sumtown';
import { bankLimit, housePrice, nearTownDoor, zdtgPackages, zdtgRepayable } from '../../sim/systems/town';
import {
  CAMP_HINT, SEASON_EMOJI, SEASON_NAME, PASTURE_NAME, PRODUCT_EMOJI, PROCESSOR_NAME, WATER_NAME, WOLF_LEVEL_NAME, expenseName, fmtMinutes, fmtMoney, fmtNum, productName, speciesEmoji, stageName, unitOf,
} from './names';
import { t } from '../../i18n/i18n';
import { SleepPanel } from './sleepPanel';
import { gerLadder, goalGerReached } from '../../sim/systems/gerLayout';
import { sellableGers } from '../../sim/systems/ownGers';
import { formatTime } from '../../sim/clock';
import { nearTrader, traderBuyPrice, traderHayPrice, traderPresent } from '../../sim/systems/trader';
import type { Msg } from '../../sim/msg';

type Kind = 'storage' | 'cargo' | 'shop' | 'lot' | 'town' | 'arrive' | 'report' | 'dogs' | 'camps' | 'cheat' | 'teahouse' | 'helpers' | 'milestones' | 'ceremony' | 'trader';

/** Туслахуудын цонхны дэд хэсэг: жагсаалт, отор явуулах, малаар цалинжуулах */
interface HelperView {
  mode: 'list' | 'otor' | 'pay';
  helper: number;
  camp: string;
  counts: Record<string, number>;
}

const HERD_NAME: Record<string, string> = { sheep: t('ui.sheep_goats'), cow: t('ui.cattle'), horse: t('ui.horses') };

const CHEATS: { act: CheatAction; label: string }[][] = [
  [{ act: 'money', label: '💰 +1 000 000₮' }, { act: 'fillStorage', label: t('ui.milk_wool_in_hand') }],
  [{ act: 'addSheep', label: t('ui.10_sheep') }, { act: 'addGoats', label: t('ui.10_goats') }, { act: 'addCows', label: t('ui.5_cattle') }, { act: 'addHorses', label: t('ui.5_horses') }, { act: 'addMixed', label: t('ui.50_mixed') }],
  [{ act: 'addDog', label: t('ui.1_dog') }, { act: 'removeDog', label: t('ui.1_dog_93') }],
  [{ act: 'skipHour', label: t('ui.1_hour') }, { act: 'endDay', label: t('ui.end_the_day') }],
  [{ act: 'thirsty', label: t('ui.all_animals_thirsty') }, { act: 'quench', label: t('ui.all_animals_drink') }, { act: 'hungry', label: t('ui.feed_0') }, { act: 'fatten', label: t('ui.very_fat') }],
  [{ act: 'degradeUp', label: t('ui.degradation_10') }, { act: 'degradeReset', label: t('ui.degradation_0') }],
  [{ act: 'nextSeason', label: t('ui.next_season') }, { act: 'addHay', label: t('ui.20_hay_bales') }, { act: 'snowUp', label: t('ui.snow_10_cm') }, { act: 'snowClear', label: t('ui.clear_snow') }],
  [{ act: 'wolfAttack', label: t('ui.trigger_a_wolf_attack') }, { act: 'scareAll', label: t('ui.scare_all_wolves_away') }, { act: 'wolvesPeaceful', label: t('ui.wolf_attacks_on_off') }],
];

interface BuyItem {
  key: string;
  label: string;
  note: string;
  order: BuyOrder;
}

const ANIMAL_CATALOG: { key: string; species: Species; sex: Sex; age: number; note: string }[] = [
  { key: 'ewe', species: 'sheep', sex: 'f', age: 3, note: t('ui.gives_birth_gives_wool') },
  { key: 'ram', species: 'sheep', sex: 'm', age: 3, note: t('ui.a_breeding_ram_for') },
  { key: 'goatF', species: 'goat', sex: 'f', age: 3, note: t('ui.gives_cashmere') },
  { key: 'buck', species: 'goat', sex: 'm', age: 3, note: t('ui.breeding_buck_for_goats') },
  { key: 'cowF', species: 'cow', sex: 'f', age: 4, note: t('ui.gives_a_calf_and') },
  { key: 'bull', species: 'cow', sex: 'm', age: 4, note: t('ui.with_a_bull_you') },
  { key: 'mare', species: 'horse', sex: 'f', age: 4, note: t('ui.horses_115') },
];

interface Draft {
  vehicle: VehicleId | null;    // ачих тээвэр (null = гартаа/морьтой)
  take: Partial<Record<ProductId, number>>;   // агуулахаас гартаа
  sell: Partial<Record<ProductId, number>>;   // ачих (хотонд) эсвэл зарах (сумын төвд)
  sellGroups: Record<string, number>;
  buyAnimals: Record<string, number>;
  buyItems: Set<string>;
  hay: number;                   // авах боодол өвс (M5.5)
}

export interface UiHooks {
  dispatch: (cmd: Command) => CommandResult;
  toast: (msg: string | Msg, kind?: '' | 'good' | 'bad') => void;
  /** Хамгаалалтын бүс харуулах (Z) — cheat цэснээс */
  toggleZones?: () => boolean;
  /** FPS/draw/tris самбар (анхдагчаар нуугдсан) — cheat цэснээс асаана/унтраана */
  perf?: { on: () => boolean; toggle: () => void };
}

export class Panels {
  private root: HTMLElement;
  private box: HTMLElement;
  kind: Kind | null = null;
  private draft: Draft | null = null;
  private report: DayReport | null = null;
  private reports: DayReport[] = [];
  private arriveCamp = '';
  private muteReports = false;
  private pressing = false;
  private hv: HelperView = { mode: 'list', helper: 0, camp: '', counts: {} };
  private sleep: SleepPanel;

  constructor(private cfg: GameConfig, private state: GameState, private hooks: UiHooks) {
    this.sleep = new SleepPanel(cfg, state);
    this.root = document.getElementById('modal')!;
    this.box = document.getElementById('modalBox')!;
    // Утсанд товшиж байх үед цонхыг дахин зурвал товч «алга болж» дарагдахгүй — дарж байхад refresh хийхгүй
    this.root.addEventListener('pointerdown', () => (this.pressing = true));
    const up = (): void => void setTimeout(() => (this.pressing = false), 50);
    this.root.addEventListener('pointerup', up);
    this.root.addEventListener('pointercancel', up);
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
        (e.code === 'KeyJ' && this.kind === 'helpers') ||
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
      if (kind === 'shop' && this.closedShop(nearTradeDoor(this.cfg, st)?.id)) return;
      if (kind === 'cargo' && (st.player.place !== 'camp' || st.move)) {
        this.hooks.toast(t('ui.loads_goods_at_the'), 'bad');
        return;
      }
      const here = st.fleet.filter((f) => f.place === st.player.place);
      const v = st.player.driving ?? here.sort((a, b) => this.cfg.vehicles[b.id].capacity - this.cfg.vehicles[a.id].capacity)[0]?.id ?? null;
      this.draft = { vehicle: v, take: {}, sell: {}, sellGroups: {}, buyAnimals: {}, buyItems: new Set(), hay: 0 };
    }
    if (kind === 'teahouse') {
      if (this.state.player.place !== 'sum') return;
      if (this.closedShop('teahouse')) return;
      this.hooks.dispatch({ type: 'teahouse' });
    }
    if (kind === 'trader') {
      if (!traderPresent(this.state) || this.state.player.place !== 'sum') return;
      this.tr = { sell: {}, hay: 0 };
    }
    if (kind === 'helpers') this.hv = { mode: 'list', helper: 0, camp: '', counts: {} };
    this.kind = kind;
    this.root.style.display = 'flex';
    this.render();
  }

  /** Хаалттай бол мэдэгдэл гаргаад true (data/shops.json) */
  private closedShop(id: string | undefined): boolean {
    if (!id || isOpen(this.cfg, id, this.state.time.minute)) return false;
    const msg = closedMsg(this.cfg, id);
    this.hooks.toast(t(msg.key, msg.params), 'bad');
    return true;
  }

  close(): void {
    if (this.kind === 'ceremony') this.hooks.dispatch({ type: 'ackCeremony' });   // Esc, гадна товшилт ч баярын мөчийг хаана (давтан гарахгүй)
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
    if (this.muteReports) return;   // cheat: олон өдөр гүйлгэхэд тайлан гаргахгүй
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
    if (this.pressing) return;
    if (this.kind === 'storage' || this.kind === 'dogs' || this.kind === 'camps' || (this.kind === 'helpers' && this.hv.mode === 'list')) this.render();
  }

  /** Газрын зураг дээр өөр бууцанд ирлээ */
  showArrive(campId: string): void {
    if (this.kind && this.kind !== 'report') this.close();
    this.arriveCamp = campId;
    if (this.kind !== 'report') this.open('arrive');
  }

  private render(): void {
    const scroll = this.box.scrollTop;
    let html = '';
    if (this.kind === 'storage') html = this.storageHtml();
    else if (this.kind === 'cargo') html = this.cargoHtml();
    else if (this.kind === 'shop') html = this.shopHtml();
    else if (this.kind === 'lot') html = this.lotHtml();
    else if (this.kind === 'town') html = this.townHtml();
    else if (this.kind === 'arrive') html = this.arriveHtml();
    else if (this.kind === 'report') html = this.reportHtml();
    else if (this.kind === 'dogs') html = this.dogsHtml();
    else if (this.kind === 'camps') html = this.campsHtml();
    else if (this.kind === 'cheat') html = this.cheatHtml();
    else if (this.kind === 'teahouse') html = this.teahouseHtml();
    else if (this.kind === 'helpers') html = this.helpersHtml();
    else if (this.kind === 'milestones') html = this.milestonesHtml();
    else if (this.kind === 'ceremony') html = this.ceremonyHtml();
    else if (this.kind === 'trader') html = this.traderHtml();
    this.box.innerHTML = touchKeys(html);   // утсанд товчны нэрийг товчны дүрсээр
    this.box.scrollTop = scroll;
  }

  // ======================= замын тэмдэг (M6.5) =======================
  private milestonesHtml(): string {
    const { cfg, state } = this;
    const row = (grp: 'stage' | 'first', id: string, desc: boolean): string => {
      const day = state.milestones.reached[id];
      return `<tr><td>${day !== undefined ? '✅' : '⬜'} <b>${t('ms.' + grp + '.' + id)}</b>${desc ? `<br><span class="muted">${t('ms.stage.' + id + '.desc')}</span>` : ''}</td><td class="num ${day !== undefined ? 'good' : 'muted'}">${day !== undefined ? t('ms.reached_day', { day }) : t('ms.not_yet')}</td></tr>`;
    };
    return `<h2>${t('ms.title')} <span class="close" data-act="close">✕</span></h2><h3>${t('ms.long_path')}</h3><table>${cfg.milestones.stages.map((d) => row('stage', d.id, true)).join('')}</table>
      <h3>${t('ms.firsts')}</h3><table>${cfg.milestones.firsts.map((d) => row('first', d.id, false)).join('')}</table>`;
  }

  /** Хоёр цуваа график (SVG): хонин толгой, мөнгө */
  private spark(values: number[], color: string): string {
    if (values.length < 2) return '';
    const W = 300, H = 70, lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
    const pts = values.map((v, i) => `${((i / (values.length - 1)) * W).toFixed(1)},${(H - 4 - ((v - lo) / span) * (H - 8)).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none"><polyline fill="none" stroke="${color}" stroke-width="2" points="${pts}"/></svg>`;
  }

  /** Баярын мөч: гэр босгосон дүрслэл (🛖🔥), статистик, график, «▶ Үргэлжлүүлэх» */
  private ceremonyHtml(): string {
    const { state } = this;
    const S = state.stats, d = S.daily;
    const stat = (k: string, v: string | number): string => `<tr><td>${t('ms.stat.' + k)}</td><td class="num"><b>${v}</b></td></tr>`;
    return `<div style="text-align:center"><div style="font-size:56px;line-height:1.1">🛖🔥</div><h2 style="justify-content:center">${t('ms.ceremony.title')}</h2><p class="muted">${t('ms.ceremony.text')}</p></div>
      <table>${stat('days', state.time.day)}${stat('animals', state.animals.length)}${stat('income', fmtMoney(S.income))}${stat('expenses', fmtMoney(S.expenses))}${stat('births', S.births)}${stat('deaths', S.deaths)}${stat('wolfLost', S.wolfLost)}${stat('moves', S.moves)}</table>
      <div class="cols"><div><h3>${t('ms.graph.sheep')}</h3>${this.spark(d.map((x) => x.sheepUnits), '#7bbf5a')}</div><div><h3>${t('ms.graph.money')}</h3>${this.spark(d.map((x) => x.money), '#c8962c')}</div></div>
      <p style="text-align:center"><button class="btn gold big" data-act="close">${t('ms.continue')}</button></p>`;
  }

  // ======================= агуулах =======================
  private storageHtml(): string {
    const { cfg, state } = this;
    const cap = storage.capacity(cfg, state), used = storage.used(state);
    const lvlNames = [t('ui.containers_beside_the_tent'), t('ui.wooden_barn'), t('ui.large_storage')];
    const rows = PRODUCTS.map((p) => {
      const batches = state.storage.filter((b) => b.product === p);
      const n = batches.reduce((s, b) => s + b.amount, 0);
      if (n <= 1e-9) return '';
      let note = '';
      if (p === 'milk') note = t('ui.becomes_tarag_yogurt_tomorrow');
      if (p === 'tarag') {
        const old = batches.filter((b) => b.ageDays >= cfg.products.storage.milkSpoilDays - 1).reduce((s, b) => s + b.amount, 0);
        note = old > 0 ? t('ui.l_spoil_tomorrow', { x: fmtNum(old) }) : '';
      }
      return `<tr><td>${PRODUCT_EMOJI[p]} ${productName(p)}</td><td class="num">${fmtNum(n)} ${unitOf(p)}</td><td class="num">${fmtMoney(productPrice(cfg, p))}</td><td class="muted">${note}</td></tr>`;
    }).join('');
    const carry = state.player.carry;
    const carryTxt = carry.length
      ? carry.map((c) => `${PRODUCT_EMOJI[c.product]} ${fmtNum(c.amount)}`).join(' · ')
      : t('ui.empty');
    const near = Math.hypot(state.player.x - cfg.camps.home.x, state.player.z - cfg.camps.home.z) <= cfg.camps.home.storageRadius * 2;
    const procs = (Object.keys(PROCESSOR_NAME) as ProcessorKind[]).map((kind) => {
      const r = recipe(cfg, kind);
      const owned = state.processors.filter((p) => p.kind === kind);
      const recipeTxt = t('ui.h', { x: Object.entries(r.input).map(([p, n]) => `${n} ${unitOf(p)} ${productName(p).toLowerCase()}`).join(', '), x2: Object.entries(r.output).map(([p, n]) => `${n} ${unitOf(p)} ${productName(p).toLowerCase()}`).join(', '), hours: r.hours });
      if (!owned.length) return t('ui.not_available_buy_in', { x: PROCESSOR_NAME[kind], recipeTxt, x2: fmtMoney(r.price) });
      return owned.map((pr) => {
        const pending = Object.keys(pr.pending).length;
        const status = pr.remaining > 0 ? t('ui.left', { x: fmtMinutes(pr.remaining) }) : pending ? t('ui.storage_is_full_output') : t('ui.idle');
        const can = pr.remaining <= 0 && !pending && Object.entries(r.input).every(([p, n]) => storage.count(state, p as ProductId) >= n - 1e-9);
        return t('ui.start', { x: PROCESSOR_NAME[kind], recipeTxt, status, kind, x2: can && near ? '' : 'disabled' });
      }).join('');
    }).join('');
    return t('ui.storage_processing_units_1', { x: cap ? Math.min(100, (used / cap) * 100) : 0, x2: lvlNames[state.storageLevel] ?? '', x3: fmtNum(used), cap, carryTxt, x4: fmtNum(carry.reduce((s, c) => s + c.amount, 0)), carryUnits: cfg.products.carryUnits, x5: rows || t('ui.the_storage_is_empty'), procs, x6: near ? '' : t('ui.go_near_your_tent') });
  }

  // ======================= сумын төв =======================
  private animalGroups(src: Animal[] = this.state.animals): { key: string; label: string; list: Animal[] }[] {
    const groups = new Map<string, { key: string; label: string; list: Animal[] }>();
    for (const a of src) {
      if (a.riding || !playerOwned(a)) continue;   // туслахын малыг тоглогч зарж, ачиж чадахгүй
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
      out.push({ key: 'proc:' + kind, label: PROCESSOR_NAME[kind]!, note: t('ui.makes_dairy_products_and'), order: { kind: 'processor', id: kind } });
    }
    const next = cfg.storage.levels[state.storageLevel + 1];
    if (next) out.push({ key: 'storage', label: state.storageLevel === 0 ? t('ui.wooden_barn') : t('ui.large_storage'), note: t('ui.capacity_units', { capacity: next.capacity }), order: { kind: 'storage' } });
    // M6.13: гэрийн хэмжээний шат — дараагийн (томсгох) хэмжээг л санал болгоно; үнэ = шинэ үнэ − одоогийнхоо буцаан тооцох хувь
    const ladder = gerLadder(cfg.ger), nextSize = ladder[state.home === 'ger' ? ladder.indexOf(state.homeSize) + 1 : 0];
    if (nextSize) out.push({ key: 'ger:' + nextSize, label: t('ui.ger_size', { x: t('ger.size.' + nextSize) }), note: t('ui.ger_size_note', { storage: cfg.ger.sizes[nextSize]!.storage, walls: cfg.ger.sizes[nextSize]!.walls }), order: { kind: 'ger', size: nextSize } });
    if (state.dogs.length < cfg.dogs.maxDogs) out.push({ key: 'dog', label: t('ui.dog_bankhar'), note: t('ui.10_m_protection_zone', { x: fmtMoney(cfg.dogs.foodPerDay) }), order: { kind: 'dog' } });
    if (state.home === 'ger') for (const size of gerLadder(cfg.ger)) out.push({ key: 'gerAdd:' + size, label: t('ui.ger_add', { x: t('ger.size.' + size) }), note: t('ui.ger_add_note', { walls: cfg.ger.sizes[size]!.walls }), order: { kind: 'gerAdd', size } });   // M6.13: гэр бүр 1 ганц бие туслахын ор
    out.push({ key: 'otorTent', label: t('ui.otor_tent'), note: t('ui.sending_a_herder_to', { x: spareTents(state) }), order: { kind: 'otorTent' } });
    for (const id of ['horseCart', 'porter', 'amjirgaa'] as const) {
      if (state.vehicles.includes(id)) continue;
      const v = cfg.vehicles[id];
      const kmh = Math.round(cfg.vehicles.sumCenterKm / v.oneWayHours);
      out.push({ key: id, label: `${v.emoji} ${v.name}${v.truck ? t('ui.truck') : ''}`, note: t('ui.units_sheep_cattle_km', { capacity: v.capacity, sheepSlots: v.sheepSlots, cowSlots: v.cowSlots, kmh, x: v.fuelPer100km ? t('ui.l_100_km', { fuelPer100km: v.fuelPer100km }) : '' }), order: { kind: 'vehicle', id } });
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
    const ord = f.orders.length ? t('ui.item_s', { length: f.orders.length }) : '';
    const parts = [prod, an, ord].filter(Boolean).join(' · ');
    return t('ui.cargo_units_animals_slots', { x: fmtNum(cargoUnits(f)), capacity: v.capacity, x2: fmtNum(cargoSlots(cfg, f)), sheepSlots: v.sheepSlots, x3: parts ? ` — ${parts}` : t('ui.empty_148') });
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
      return t('ui.all', { x: PRODUCT_EMOJI[pr], x2: productName(pr), x3: fmtNum(have), x4: unitOf(pr), x5: fmtMoney(productPrice(cfg, pr)), pr, x6: fmtNum(n), pr2: pr, pr3: pr });
    }).join('');
    let html = t('ui.prepare_goods_for_the', { x: fmtNum(carried), carryUnits: cfg.products.carryUnits, x2: takeRows || t('ui.storage_is_empty'), x3: takeUnits > 0 && takeUnits <= room + 1e-9 && nearStore ? '' : 'disabled', x4: fmtNum(takeUnits), x5: !nearStore ? t('ui.go_to_the_storage') : takeUnits > room + 1e-9 ? t('ui.your_hands_only_hold', { x: fmtNum(room) }) : '' });

    // Морьтой: мал тууж явах
    const groups = this.animalGroups();
    if (p.mounted) {
      const rows = groups.map((g) => {
        const n = d.sellGroups[g.key] ?? 0;
        return `<tr><td>${g.label} <span class="muted">(${g.list.length})</span></td><td class="num">~${fmtMoney(salePrice(g.list[0]!, cfg.animals))}</td>
          <td class="ctl"><button class="btn sm" data-act="ag-:${g.key}">−</button><b>${n}</b><button class="btn sm" data-act="ag+:${g.key}">+</button></td></tr>`;
      }).join('');
      if (!d.vehicle) html += t('ui.riding_drive_animals_behind', { x: fmtNum(cfg.vehicles.riding.droveKmh), rows });
    }
    if (!state.fleet.some((f) => f.place === 'camp')) {
      html += t('ui.you_have_no_cart');
      return html;
    }
    html += t('ui.load_onto_cart_vehicle', { x: this.vehicleButtons() });
    const f = d.vehicle ? state.fleet.find((x) => x.id === d.vehicle) : null;
    if (!f) return html;
    const v = cfg.vehicles[f.id];
    const atSpot = atLoadingSpot(cfg, state, f);
    const loadUnits = Object.values(d.sell).reduce((s, n) => s + (n ?? 0), 0);
    const loadRows = PRODUCTS.map((pr) => {
      const have = storage.count(state, pr);
      if (have <= 1e-9) return '';
      const n = d.sell[pr] ?? 0;
      return t('ui.all_158', { x: PRODUCT_EMOJI[pr], x2: productName(pr), x3: fmtNum(have), x4: unitOf(pr), x5: fmtMoney(productPrice(cfg, pr)), pr, x6: fmtNum(n), pr2: pr, pr3: pr });
    }).join('');
    const animalRows = groups.map((g) => {
      const n = d.sellGroups[g.key] ?? 0;
      return `<tr><td>${g.label} <span class="muted">(${g.list.length})</span></td><td class="num">~${fmtMoney(salePrice(g.list[0]!, cfg.animals))}</td>
        <td class="ctl"><button class="btn sm" data-act="ag-:${g.key}">−</button><b>${n}</b><button class="btn sm" data-act="ag+:${g.key}">+</button></td></tr>`;
    }).join('');
    const loadSlots = this.selectedAnimals(groups).reduce((s, a) => s + animalSlots(cfg, f.id, a.species), 0);
    const errs: string[] = [];
    if (cargoUnits(f) + loadUnits > v.capacity + 1e-9) errs.push(t('ui.cargo_does_not_fit', { capacity: v.capacity }));
    if (cargoSlots(cfg, f) + loadSlots > v.sheepSlots + 1e-9) errs.push(t('ui.animals_do_not_fit', { sheepSlots: v.sheepSlots, cowSlots: v.cowSlots }));
    if (!atSpot) errs.push(t('ui.bring_your_vehicle_next'));
    html += this.cargoList() + t('ui.load_from_storage_price', { x: loadRows || t('ui.storage_is_empty'), animalRows, x2: errs.length ? `<p class="bad">${errs.join(' · ')}</p>` : '', x3: errs.length || (!loadUnits && !loadSlots) ? 'disabled' : '', x4: atSpot && (cargoUnits(f) || f.animals.length || f.orders.length) ? '' : 'disabled' });
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
    // V3.3: дэлгүүр бүр өөр үүрэгтэй — зөвхөн тухайн дэлгүүрийн хэсгүүд харагдана
    const door = nearTradeDoor(cfg, state);
    const near = !!door;
    const role = door?.role ?? null;
    const f = p.driving ? state.fleet.find((x) => x.id === p.driving) : null;
    const have = sellableAtShop(state);
    const sellRows = PRODUCTS.map((pr) => {
      const n0 = have[pr] ?? 0;
      if (n0 <= 1e-9) return '';
      const n = d.sell[pr] ?? 0;
      return t('ui.all_158', { x: PRODUCT_EMOJI[pr], x2: productName(pr), x3: fmtNum(n0), x4: unitOf(pr), x5: fmtMoney(productPrice(cfg, pr)), pr, x6: fmtNum(n), pr2: pr, pr3: pr });
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
    const hayMax = hayRoom(cfg, state);
    const hayRow = t('ui.hay_bales_fed_automatically', { sheepDaysPerBale: cfg.seasons.hay.sheepDaysPerBale, hayMax, x: f ? t('ui.free_vehicle_slots') : t('ui.riding'), x2: fmtNum(state.camps[state.campId]?.hay ?? 0), x3: fmtMoney(cfg.seasons.hay.price), hay: d.hay });
    const itemRows = (role === 'feed' ? hayRow : '') + this.buyItems().filter((it) => role !== null && orderAllowed(role, it.order)).map((it) => {
      const on = d.buyItems.has(it.key);
      return `<tr><td>${it.label} <span class="muted">${it.note}</span></td><td class="num">${fmtMoney(orderPrice(cfg, state, it.order))}</td>
        <td class="ctl"><button class="btn sm ${on ? 'gold' : ''}" data-act="bi:${it.key}">${on ? t('ui.will_take') : t('ui.take')}</button></td></tr>`;
    }).join('');
    const plan = this.shopPlan();
    const income = Object.entries(plan.sell).reduce((s, [k, n]) => s + (n ?? 0) * productPrice(cfg, k as ProductId), 0)
      + sellableAnimals(state).filter((a) => plan.sellAnimalIds.includes(a.id)).reduce((s, a) => s + salePrice(a, cfg.animals), 0);
    const cost = plan.buy.reduce((s, o) => s + orderPrice(cfg, state, o), 0);
    const after = state.money + income - cost;
    const buySlots = plan.buy.reduce((s, o) => s + (o.kind === 'animal' ? (f ? animalSlots(cfg, f.id, o.species) : 1) : 0), 0);
    const freed = f ? sellableAnimals(state).filter((a) => plan.sellAnimalIds.includes(a.id)).reduce((s, a) => s + animalSlots(cfg, f.id, a.species), 0) : 0;
    const roomOk = buySlots <= animalRoom(cfg, state) + freed + 1e-9;
    const how = f ? `${cfg.vehicles[f.id].emoji} ${cfg.vehicles[f.id].name}` : t('ui.mounted');
    const animalNote = f ? t('ui.animals_you_buy_are', { x: cfg.vehicles[f.id].sheepSlots, x2: cfg.vehicles[f.id].cowSlots }) : t('ui.if_riding_you_drive', { x: fmtNum(cfg.vehicles.riding.droveKmh) });
    const empty = !Object.keys(plan.sell).length && !plan.sellAnimalIds.length && !plan.buy.length;
    const title = door ? t(`sum3d.${door.id}`) : t('ui.shop');
    if (!role) {
      return t('ui.go_to_the_shop', { title });
    }
    const sellSec = canSellProducts(role) ? t('ui.sell_price', { x: sellRows || t('ui.nothing_to_sell_bring') }) : '';
    const animalSec = canSellAnimals(role)
      ? t('ui.buy_animals_price', { x: groups.length ? t('ui.sell_animals_price', { animalRows }) : '', buyAnimalRows, animalNote }) : '';
    const itemSec = itemRows ? t('ui.buy_goods_price', { itemRows }) : '';
    return t('ui.money_income_expenses_after', { title, how, x: fmtMoney(state.money), x2: f ? ' · ' : '', x3: this.cargoList().replace(/^<p>|<\/p>$/g, ''), sellSec, animalSec, itemSec: itemSec + (role === 'ger_tent' ? this.gerSellHtml() : ''), x4: fmtMoney(income), x5: fmtMoney(cost), x6: after < 0 ? 'bad' : '', x7: fmtMoney(after), x8: !roomOk ? t('ui.the_animals_you_want') : '', x9: after < 0 ? t('ui.not_enough_money_items') : '', x10: empty || !near ? 'disabled' : '', x11: role === 'livestock' ? t('ui.use_the_neighbor_s', { x: state.neighborBull ? 'checked' : '', x2: fmtMoney(cfg.economy.neighborBullFee) }) : '' });
  }

  private tr: { sell: Partial<Record<ProductId, number>>; hay: number } = { sell: {}, hay: 0 };

  /** Явуулын худалдаачин (M6.12): бүтээгдэхүүнийг дэлгүүрээс хямд авна, боодол өвс зарна */
  private traderHtml(): string {
    const { cfg, state } = this;
    const v = traderPresent(state);
    if (!v) return `<h2>${t('trader.title', { kind: '' })} <span class="close" data-act="close">✕</span></h2><p class="bad">${t('sim.the_trader_is_not_here')}</p>`;
    const K = cfg.trader.kinds[v.kind]!;
    const have = sellableAtShop(state);
    const rows = K.products.filter((p) => (have[p] ?? 0) > 1e-9).map((p) => {
      const n0 = have[p] ?? 0, n = this.tr.sell[p] ?? 0;
      return `<tr><td>${PRODUCT_EMOJI[p]} ${productName(p)} <span class="muted">(${fmtNum(n0)} ${unitOf(p)})</span></td><td class="num">${fmtMoney(traderBuyPrice(cfg, v.kind, p))}</td><td class="ctl"><button class="btn sm" data-act="tr-:${p}">−</button><b>${fmtNum(n)}</b><button class="btn sm" data-act="tr+:${p}">+</button><button class="btn sm" data-act="trAll:${p}">${t('trader.all')}</button></td></tr>`;
    }).join('');
    const income = K.products.reduce((s, p) => s + (this.tr.sell[p] ?? 0) * traderBuyPrice(cfg, v.kind, p), 0);
    const hayCost = this.tr.hay * traderHayPrice(cfg, v.kind);
    const near = nearTrader(cfg, state);
    const until = formatTime({ day: state.time.day, minute: v.to });
    return `<h2>${t('trader.title', { kind: t('trader.kind.' + v.kind) })} <span class="close" data-act="close">✕</span></h2><p class="muted">${t('trader.until', { until })}</p>
      ${near ? '' : `<p class="bad">${t('trader.far')}</p>`}
      <h3>${t('trader.sell', { pct: Math.round(K.buyMult * 100) })}</h3><table>${rows || `<tr><td class="muted">${t('trader.nothing')}</td></tr>`}</table>
      <h3>${t('trader.hay', { left: v.hay })}</h3><table><tr><td>🌾 ${fmtMoney(traderHayPrice(cfg, v.kind))}</td><td class="ctl"><button class="btn sm" data-act="trh-:1">−</button><b>${this.tr.hay}</b><button class="btn sm" data-act="trh+:1">+</button></td></tr></table>
      <table><tr class="total"><td>${t('trader.income')}</td><td class="num">+${fmtMoney(income)}</td></tr><tr class="total"><td>${t('trader.expenses')}</td><td class="num">−${fmtMoney(hayCost)}</td></tr></table>
      <p><button class="btn gold" data-act="doTrader" ${near && (income > 0 || this.tr.hay > 0) ? '' : 'disabled'}>${t('trader.do')}</button></p>`;
  }

  /** Гэр зарах (M6.13): гэр/майхны дэлгүүрт үнийн 50%; сүүлийн гэрийг зарахгүй */
  private gerSellHtml(): string {
    const { cfg, state } = this;
    const rows = sellableGers(cfg, state).map((g) => `<tr><td>🛖 ${t('ger.size.' + g.size)}${g.index === 0 ? ' <span class="muted">(' + t('ui.main_ger') + ')</span>' : ''}</td><td class="num">+${fmtMoney(g.price)}</td><td class="ctl"><button class="btn sm" data-act="sellGer:${g.index}">${t('ui.sell')}</button></td></tr>`).join('');
    return rows ? `<h3>${t('ui.sell_gers')}</h3><table>${rows}</table>` : '';
  }

  // ======================= Сумын төвийн амьдрал (V3.4): дуган, ЗДТГ, банк, байшин, хамаатан =======================
  private townCommand(cmd: string, arg: string): Command {
    const { state } = this;
    switch (cmd) {
      case 'donate':
        return { type: 'donate', amount: Number(arg) };
      case 'zdtgLoan':
        return { type: 'zdtgLoan', pkg: arg };
      case 'zdtgRepay':
        return { type: 'zdtgRepay', mode: arg === 'money' ? 'money' : 'animals' };
      case 'bankLoan':
        return { type: 'bankLoan', amount: Number(arg) };
      case 'bankRepay':
        return { type: 'bankRepay', amount: Number(arg) };
      case 'buyHouse':
        return { type: 'buyHouse', plot: arg };
      case 'houseMode': {
        const [plot, mode] = arg.split(',') as [string, 'empty' | 'rent' | 'child'];
        return { type: 'houseMode', plot, mode };
      }
      default: {
        // gift:<relId>,<what>  what = dairy | animals | all
        const [rel, what] = arg.split(',') as [string, string];
        const dairy: Partial<Record<ProductId, number>> = {};
        if (what !== 'animals') for (const [k, n] of Object.entries(sellableAtShop(state))) if (this.cfg.town.relatives.giftProducts.includes(k)) dairy[k as ProductId] = n ?? 0;
        const animalIds = what !== 'dairy' ? sellableAnimals(state).map((a) => a.id) : [];
        return { type: 'gift', relative: rel, plan: { products: dairy, animalIds } };
      }
    }
  }

  private townHtml(): string {
    const { cfg, state } = this;
    const T = state.town;
    const door = nearTownDoor(cfg, state);
    const close = '<span class="close" data-act="close">✕</span>';
    if (!door) return t('ui.sum_center_go_to', { close });
    const rep = t('ui.reputation', { x: fmtNum(T.reputation), max: cfg.town.reputation.max });
    const money = t('ui.money', { x: fmtMoney(state.money) });
    switch (door.role) {
      case 'soon':
        return t('ui.opening_very_soon', { x: t('sum3d.' + door.id), close });
      case 'temple': {
        const btns = cfg.town.temple.donations.map((a) => `<button class="btn ${state.money >= a ? 'gold' : ''}" data-act="donate:${a}" ${state.money >= a ? '' : 'disabled'}>${fmtMoney(a)}</button>`).join(' ');
        return t('ui.donating_at_the_temple', { x: t('sum3d.' + door.id), close, money, rep, reputationPer10k: cfg.town.temple.reputationPer10k, minReputation: cfg.town.zdtgLoan.minReputation, btns });
      }
      case 'zdtg': {
        const L = T.zdtgLoan, Z = cfg.town.zdtgLoan;
        let body = '';
        if (L) {
          const have = zdtgRepayable(cfg, state).length;
          const cost = Math.round(L.value * Z.moneyMult);
          body = t('ui.livestock_loan_due_on', { n: L.n, x: t('species.' + L.species).toLowerCase(), dueDay: L.dueDay, x2: L.overdue ? t('ui.overdue') : '', x3: have >= L.n ? '' : 'disabled', n2: L.n, have, x4: state.money >= cost ? '' : 'disabled', x5: fmtMoney(cost) });
        } else if (T.reputation < Z.minReputation) {
          body = t('ui.you_need_a_reputation', { minReputation: Z.minReputation });
        } else {
          body = t('ui.take_a_loan_in', { termDays: Z.termDays, moneyMult: Z.moneyMult, onTimeReputation: Z.onTimeReputation, x: zdtgPackages(cfg).map((k) => `<button class="btn gold" data-act="zdtgLoan:${k.id}">${k.n} ${t('species.' + k.species).toLowerCase()}</button>`).join(' ') });
        }
        return t('ui.the_police_station_is', { x: t('sum3d.' + door.id), close, money, rep, body });
      }
      case 'bank': {
        const L = T.bankLoan, B = cfg.town.bankLoan;
        const lim = bankLimit(cfg, state);
        let body = '';
        if (L) {
          body = t('ui.loan_balance_principal_per', { x: fmtMoney(L.owed), x2: fmtMoney(L.principal), x3: Math.round(B.interestPerMonth * 100), dueDay: L.dueDay, x4: [L.owed, Math.round(L.owed / 2)].map((a) => t('ui.pay', { x: state.money >= a ? 'gold' : '', a, x2: state.money >= a ? '' : 'disabled', x3: fmtMoney(a) })).join(' ') });
        } else {
          const opts = [0.25, 0.5, 1].map((k) => Math.floor((lim * k) / 10000) * 10000).filter((a) => a >= B.minAmount);
          body = t('ui.borrow_against_animals_of', { x: Math.round(B.animalLtv * 100), x2: Math.round(B.houseLtv * 100), x3: fmtMoney(lim), termDays: B.termDays, x4: Math.round(B.interestPerMonth * 100), x5: opts.length ? opts.map((a) => t('ui.borrow', { a, x: fmtMoney(a) })).join(' ') : t('ui.not_enough_collateral') });
        }
        return `<h2>🏦 ${t('sum3d.' + door.id)} ${close}</h2><p>${money} · ${rep}</p>${body}`;
      }
      case 'house': {
        const h = housePrice(cfg, door.id)!;
        const own = T.houses[door.id];
        if (!own) {
          return t('ui.yard_house_for_sale_196', { close, money, x: fmtMoney(h.price), x2: fmtMoney(h.rentPerDay), id: door.id, x3: state.money >= h.price ? '' : 'disabled' });
        }
        const btn = (m: string, label: string, dis = false): string => `<button class="btn ${own.mode === m ? 'gold' : ''}" data-act="houseMode:${door.id},${m}" ${dis ? 'disabled' : ''}>${label}</button>`;
        return t('ui.your_yard_house_keeping', { close, x: btn('rent', t('ui.rent_out_per_day', { x: fmtMoney(h.rentPerDay) })), x2: btn('empty', t('ui.empty_198')), x3: btn('child', t('ui.keep_your_schoolchild_here'), true) });
      }
      default: {
        const r = T.relatives[door.id];
        const R = cfg.town.relatives;
        const have = sellableAtShop(state);
        const dairy = Object.entries(have).filter(([k, n]) => R.giftProducts.includes(k) && (n ?? 0) > 0).map(([k, n]) => `${PRODUCT_EMOJI[k as ProductId]} ${fmtNum(n ?? 0)}`).join(' ');
        const animals = sellableAnimals(state).length;
        return t('ui.relatives_closeness_100_gifts', { close, x: fmtNum(r?.relation ?? 0), visitMinRelation: R.visitMinRelation, summerHelpMin: R.summerHelpMin, winterHayMin: R.winterHayMin, x2: dairy || t('ui.no_dairy'), animals, id: door.id, x3: dairy ? '' : 'disabled', id2: door.id, x4: animals ? '' : 'disabled' }) + this.sleep.html();
      }
    }
  }

  // ======================= Машин худалдааны талбай (V3.3) =======================
  private lotHtml(): string {
    const { cfg, state } = this;
    const s = nearLotSlot(cfg, state);
    if (!s) return t('ui.move_closer_to_the', { x: t('sum3d.car_dealer') });
    const known = !s.display && s.vehicle in cfg.vehicles;
    if (!known) return t('ui.going_on_sale_soon', { x: t('sum3d.lot.' + s.vehicle) });
    const id = s.vehicle as VehicleId;
    const v = cfg.vehicles[id];
    const owned = state.vehicles.includes(id);
    const kmh = Math.round(cfg.vehicles.sumCenterKm / v.oneWayHours);
    const can = !owned && state.money >= v.price && !state.player.driving;
    return t('ui.units_of_cargo_sheep', { emoji: v.emoji, name: v.name, capacity: v.capacity, sheepSlots: v.sheepSlots, cowSlots: v.cowSlots, kmh, x: v.fuelPer100km ? t('ui.l_100_km_205', { fuelPer100km: v.fuelPer100km }) : '', x2: fmtMoney(v.price), x3: fmtMoney(state.money), x4: owned ? t('ui.you_already_own_this') : state.money < v.price ? t('ui.not_enough_money') : '', id: s.id, x5: can ? '' : 'disabled' });
  }

  private shopPlan(): { sell: Partial<Record<ProductId, number>>; sellAnimalIds: number[]; buy: BuyOrder[] } {
    const d = this.draft!;
    const role = nearTradeDoor(this.cfg, this.state)?.role ?? null;
    const sell: Partial<Record<ProductId, number>> = {};
    if (role && canSellProducts(role)) for (const [k, n] of Object.entries(d.sell)) if ((n ?? 0) > 0) sell[k as ProductId] = n;
    const sellAnimalIds = role && canSellAnimals(role) ? this.selectedAnimals(this.animalGroups(sellableAnimals(this.state))).map((a) => a.id) : [];
    const buy: BuyOrder[] = [];
    for (const c of ANIMAL_CATALOG) for (let i = 0; i < (d.buyAnimals[c.key] ?? 0); i++) buy.push({ kind: 'animal', species: c.species, sex: c.sex, age: c.age });
    for (const it of this.buyItems()) if (d.buyItems.has(it.key)) buy.push(it.order);
    if (d.hay > 0) buy.push({ kind: 'hay', n: d.hay });
    return { sell, sellAnimalIds, buy: buy.filter((o) => role !== null && orderAllowed(role, o)) };
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
    const g = state.helpers.otor.find((x) => x.campId === id);
    let otor = '';
    if (g) {
      const h = state.helpers.list.find((x) => x.id === g.helperId);
      const col = g.collectorId !== undefined ? state.helpers.list.find((x) => x.id === g.collectorId) : undefined;
      const cnt = this.animalGroups(g.animals).map((x) => `${x.label} ${x.list.length}`).join(' · ');
      const avg = g.animals.length ? g.animals.reduce((s2, a) => s2 + a.condition, 0) / g.animals.length : 0;
      const items = (g.items ?? []).filter((it) => it.amount > 1e-9);
      const itemsTxt = items.map((it) => `${PRODUCT_EMOJI[it.product]} ${fmtNum(it.amount)} ${unitOf(it.product)}`).join(' · ');
      otor = t('ui.otor_days_average_condition', { x: h?.name ?? t('ui.herder'), x2: col ? t('ui.collector', { name: col.name }) : '', days: g.days, x3: cnt || t('ui.no_animals'), x4: Math.round(avg * 100), x5: itemsTxt ? t('ui.products', { itemsTxt }) : t('ui.no_products_collected'), x6: col ? '' : t('ui.with_no_collector_the'), id, x7: items.length ? '' : 'disabled', x8: state.player.driving ? t('ui.on_the_vehicle') : t('ui.in_hand') });
    }
    const shed = c.shed ? t('ui.sheltered_warm_camp_animals') : t('ui.plain_pen_no_shelter');
    return t('ui.snow_grass_camp_pasture', { x: t('camp.' + id), x2: CAMP_HINT[id] ?? '', x3: (cs.snow ?? 0) < 0.5 ? t('ui.no_snow') : t('ui.cm_grazing_access', { x: Math.round(cs.snow), x2: Math.round(campAccess(cfg, cs.snow) * 100) }), x4: Math.round((cs.grass ?? 0) * 100), shed, x5: (cs.hay ?? 0) > 0 ? t('ui.hay_bales', { x: fmtNum(cs.hay) }) : '', types, x6: WATER_NAME[c.water] ?? c.water, x7: WOLF_LEVEL_NAME[c.wolfLevel] ?? c.wolfLevel, x8: Math.round(cs.degrade * 100), x9: Math.round((1 - deg.growthPenalty * cs.degrade) * 100), x10: fmtMinutes(Math.round(hours * 60)), otor, x11: Math.round(kmh) });
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
    const goalSU = cfg.economy.goalSheepUnits, walls = cfg.economy.goalGerWalls;
    const profit = r.moneyEnd - r.moneyStart;
    const html = t('ui.daily_report_year_money', { day: r.day, x: SEASON_EMOJI[r.season], x2: SEASON_NAME[r.season], x3: yearOf(cfg, r.day), x4: inc.map(([k, n]) => `<tr><td>${k === 'animals' ? t('ui.animals_sold') : k === 'rent' ? t('ui.house_rent') : k === 'loan' ? t('ui.bank_loan') : `${PRODUCT_EMOJI[k] ?? ''} ${productName(k)}`}</td><td class="num good">+${fmtMoney(n ?? 0)}</td></tr>`).join('') || t('ui.no_income_today'), x5: exp.map(([k, n]) => `<tr><td>${expenseName(k)}</td><td class="num bad">${fmtMoney(-(n ?? 0))}</td></tr>`).join(''), x6: profit >= 0 ? 'good' : 'bad', x7: profit >= 0 ? '+' : '', x8: fmtMoney(profit), x9: fmtMoney(r.moneyEnd), x10: fmtMoney(totalInc), x11: fmtMoney(totalExp), x12: prodRows || '<tr><td class="muted" colspan="4">—</td></tr>', x13: fmtNum(r.storageUsed), cap, animals: r.animals, x14: fmtNum(r.sheepUnits), x15: r.births ? t('ui.born', { births: r.births }) : '', x16: r.deaths ? t('ui.died', { deaths: r.deaths }) : '', x17: Math.round(r.avgCondition * 100), x18: Math.round(r.avgGutFill * 100), x19: fmtNum(Math.round(r.avgEweKg * 10) / 10), x20: this.wolfKillsHtml(r), x21: t('camp.' + this.state.campId), campDays: r.campDays, x22: r.snow >= 0.5 ? t('ui.snow_cm_grazing_access', { x: Math.round(r.snow), x2: Math.round(campAccess(cfg, r.snow) * 100) }) : '', x23: r.hayFed > 0 ? t('ui.hay_bales_fed_left', { x: fmtNum(Math.round(r.hayFed * 10) / 10), x2: fmtNum(Math.round(r.hay * 10) / 10) }) : r.season === 'winter' || r.season === 'spring' ? t('ui.hay_feed_bales', { x: r.hay > 0 ? '' : 'bad', x2: fmtNum(Math.round(r.hay * 10) / 10) }) : '', x24: r.coldHit > 0 ? t('ui.animals_lost_condition_sleeping', { coldHit: r.coldHit }) : '', x25: Math.round(r.grass * 100), x26: r.campDegrade > 0.3 ? 'bad' : '', x27: Math.round(r.campDegrade * 100), x28: r.regrowthMult < 0.8 ? 'bad' : '', x29: Math.round(r.regrowthMult * 100), x30: r.campDegrade > 0.6 ? t('ui.the_pasture_is_degraded') : r.campDegrade > 0.3 ? t('ui.time_to_change_camp') : '', x31: Object.entries(r.camps).filter(([id]) => id !== this.state.campId).map(([id, c]) => `${t('camp.' + id)} ${Math.round(c.degrade * 100)}%`).join(' · '), goalSU, walls, x32: Math.min(100, (r.sheepUnits / goalSU) * 100), x33: this.state.home === 'ger' ? t('ui.ger_progress', { mark: goalGerReached(cfg, this.state) ? '✅' : '⬜', label: t('ger.size.' + this.state.homeSize), have: cfg.ger.sizes[this.state.homeSize]!.walls, need: cfg.economy.goalGerWalls }) : t('ui.ger', { x: fmtMoney(cfg.ger.sizes[cfg.ger.home.size]!.price) }), x34: fmtNum(r.sheepUnits), goalSU2: goalSU, x35: r.goalReached ? t('ui.goal_reached') : '' });
    // M6.5: өдрийн онцлох мөр — энэ өдөр хүрсэн замын тэмдэг
    const hl = r.milestones.length ? `<p class="good">${t('ms.highlight', { x: r.milestones.map((id) => t(cfg.milestones.stages.some((s) => s.id === id) ? 'ms.stage.' + id : 'ms.first.' + id)).join(', ') })}</p>` : '';
    return html.replace('</h2>', '</h2>' + hl);
  }

  private wolfKillsHtml(r: DayReport): string {
    const k = Object.entries(r.wolfKills).filter(([, n]) => (n ?? 0) > 0);
    if (!k.length) return '';
    return t('ui.taken_by_wolves_keep', { x: k.map(([sp, n]) => `${speciesEmoji(sp as Species)} ${t('species.' + sp).toLowerCase()} ${n}`).join(', ') });
  }

  // ======================= нохой (K) =======================
  private dogsHtml(): string {
    const { cfg, state } = this;
    const p = state.player;
    if (!state.dogs.length) {
      return t('ui.dogs_you_have_no', { x: fmtMoney(cfg.dogs.price), x2: fmtMoney(cfg.dogs.foodPerDay), dog: cfg.wolves.protectRadius.dog });
    }
    const keys = [...new Set(state.animals.filter((a) => !a.riding).map((a) => flockKey(a.species)))];
    const buttons = (target: string) => {
      const base = (['follow', 'stay', 'patrol', 'patrolCamp'] as DogOrderKind[])
        .map((o) => `<button class="btn sm" data-act="dog:${target}|${o}">${DOG_ORDER_NAME[o]}</button>`).join(' ');
      const herd = keys.map((k) => `<button class="btn sm" data-act="dog:${target}|guardHerd|${k}">${HERD_NAME[k]}</button>`).join(' ');
      return t('ui.guard_the_herd', { base, x: herd || t('ui.no_animals_242') });
    };
    const rows = state.dogs.map((d) => {
      const dist = Math.round(Math.hypot(d.x - p.x, d.z - p.z));
      const cur = d.order === 'guardHerd' ? `${DOG_ORDER_NAME.guardHerd} (${HERD_NAME[d.herd]})` : DOG_ORDER_NAME[d.order];
      const status = d.mode === 'chase' ? t('ui.chasing_a_wolf') : cur;
      return t('ui.m_away', { name: d.name, dist, x: (d.health ?? 100) < 100 ? ` · 🩹 ${Math.round(d.health ?? 100)}%` : '', status, x2: buttons(String(d.id)) });
    }).join('');
    return t('ui.dog_commands_here_where', { dog: cfg.wolves.protectRadius.dog, alertRadius: cfg.dogs.alertRadius, leash: cfg.dogs.leash, rows, x: state.dogs.length > 1 ? t('ui.all_dogs', { x: buttons('all') }) : '' });
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
    const r120 = averageBiomass(state.grass, 150);
    const sp = seasonProgress(cfg, state.time.day);
    const rows = Object.entries(cfg.camps.camps).map(([id, c]) => {
      const cs = state.camps[id]!;
      const here = id === state.campId;
      const types = [...new Set(c.rings.map(([, ty]) => ty).filter((ty) => ty !== 'camp'))].map((ty) => PASTURE_NAME[ty] ?? ty).join(', ');
      const growth = 1 - deg.growthPenalty * cs.degrade;
      const dCls = cs.degrade > 0.3 ? 'bad' : cs.degrade < 0.1 ? 'good' : '';
      const action = here
        ? t('ui.you_are_here_days', { daysSpent: cs.daysSpent, x: fmtNum(Math.round(gainPerDay * 1000) / 10) })
        : t('ui.move', { id, x: !near || busy ? 'disabled' : '' });
      const snowTxt = (cs.snow ?? 0) < 0.5 ? '' : t('ui.cm', { x: Math.round(cs.snow), x2: Math.round(campAccess(cfg, cs.snow) * 100) });
      return t('ui.grass', { x: t('camp.' + id), x2: c.shed ? ' 🏚' : '', x3: CAMP_HINT[id] ?? types, x4: snowTxt || '—', x5: Math.round((here ? r120 : cs.grass ?? 0) * 100), x6: (cs.hay ?? 0) > 0 ? ` · 🌾${fmtNum(cs.hay)}` : '', x7: WATER_NAME[c.water] ?? c.water, x8: c.wolfLevel === 'high' ? 'bad' : '', x9: WOLF_LEVEL_NAME[c.wolfLevel] ?? c.wolfLevel, dCls, x10: Math.round(cs.degrade * 100), x11: Math.round(cs.degrade * 100), x12: Math.round(growth * 100), action });
    }).join('');
    const lost = state.items.reduce((s, it) => s + it.amount, 0);
    return t('ui.change_camp_the_longer', { x: Math.round(deg.recoverPerDayWhenAway * 100), x2: SEASON_EMOJI[sp.season], x3: SEASON_NAME[sp.season], dayOf: sp.dayOf, days: sp.days, rows, x4: fmtNum(hours), x5: byTruck ? t('ui.by_truck') : t('ui.by_cart'), x6: state.home === 'ger' ? t('ui.with_a_ger') : t('ui.with_tents'), x7: fuel ? t('ui.fuel', { x: fmtMoney(-fuel) }) : '', x8: fmtNum(su), x9: lost > 0 ? t('ui.units_of_products_lying', { x: fmtNum(lost) }) : '', x10: busy ? t('ui.the_herder_is_busy') : !near ? t('ui.go_to_your_tent') : '' });
  }

  // ======================= туршилтын цэс (`) =======================
  private cheatHtml(): string {
    const { cfg, state } = this;
    const perf = this.hooks.perf ? `<p><button class="btn sm ${this.hooks.perf.on() ? 'gold' : ''}" data-act="perf">${t('ui.perf_panel', { x: this.hooks.perf.on() ? t('ui.on') : t('ui.off') })}</button></p>` : '';
    const rows = CHEATS.map((row) => `<p>${row.map((c) => `<button class="btn sm" data-act="cheat:${c.act}">${c.label}</button>`).join(' ')}</p>`).join('') + perf;
    const camps = Object.keys(cfg.camps.camps).map((id) => `<button class="btn sm ${id === state.campId ? 'gold' : ''}" data-act="cheat:camp:${id}">${t('camp.' + id)}</button>`).join(' ');
    return t('ui.debug_menu_jump_to', { rows, camps, x: state.wolves.peaceful ? t('ui.off_261') : t('ui.on_262'), length: state.dogs.length, length2: state.animals.length });
  }


  // ======================= цайны газар (M5) =======================
  private teahouseHtml(): string {
    const { cfg, state } = this;
    const H = cfg.helpers;
    const near = nearTeahouse(cfg, state);
    const per = H.payEveryDays;
    const beds = bedsTotal(cfg, state);
    const used = bedsUsed(state);
    const icon = (m: { kind: string; sex: string }) => (m.kind === 'child' ? '🧒' : m.sex === 'f' ? '👩' : '👨');
    const rows = state.helpers.candidates.map((c) => {
      const who = c.members.map((m) => `${icon(m)} ${m.name}${m.kind === 'child' ? t('ui.child_collector') : ''}`).join('<br>');
      const type = c.family ? t('ui.family_comes_with_their') : t('ui.single_needs_a_bed');
      const noBed = !c.family && used + 1 > beds;
      return t('ui.days_hire', { who, type, x: fmtMoney(c.wage * per), per, id: c.id, x2: near && !noBed ? '' : 'disabled', x3: noBed ? t('ui.no_bed') : '' });
    }).join('');
    return t('ui.teahouse_herders_looking_for', { used, beds, per, x: rows ? t('ui.person_wage', { rows }) : t('ui.nobody_is_looking_for'), x2: near ? '' : t('ui.step_inside_the_teahouse'), refreshDays: H.teahouse.refreshDays });
  }

  // ======================= туслахууд (M5) =======================
  private helpersHtml(): string {
    if (this.hv.mode === 'otor') return this.otorHtml();
    if (this.hv.mode === 'pay') return this.payHtml();
    const { cfg, state } = this;
    const hs = state.helpers;
    const per = cfg.helpers.payEveryDays;
    const head = t('ui.helpers');
    if (!hs.list.length)
      return head + t('ui.you_have_no_helpers');
    const total = hs.list.reduce((s, h) => s + h.wage, 0) * per;
    const md = cfg.time.monthDays;
    const left = (md - (state.time.day % md)) % md;
    const nextPay = left === 0 ? t('ui.today_at_20_00') : t('ui.in_days', { left });
    const owned = (h: Helper) => state.animals.filter((a) => a.ownerId === h.id).length + hs.otor.reduce((s, g) => s + g.animals.filter((a) => a.ownerId === h.id).length, 0);
    const icon = (h: Helper) => (h.kind === 'child' ? '🧒' : h.sex === 'f' ? '👩' : '👨');
    const herdBtn = (h: Helper, g: HerdGroup) => `<button class="btn sm ${h.task === 'herd' && h.herd === g ? 'gold' : ''}" data-act="task:${h.id}|herd|${g}">${HERD_NAME[g]}</button>`;
    const rows = hs.list.map((h) => {
      let what = '';
      let btns = '';
      if (h.kind === 'child' && h.task === 'otor') {
        const g = hs.otor.find((x) => x.collectorId === h.id);
        what = t('ui.collector_at_the_otor', { x: g ? `: ${t('camp.' + g.campId)}` : '' });
        btns = t('ui.send_home', { id: h.id });
      } else if (h.kind === 'child') {
        what = t('ui.collector_collects_milk_and');
        btns = hs.otor.filter((g) => g.collectorId === undefined).map((g) => t('ui.to_the_otor', { id: h.id, campId: g.campId, x: t('camp.' + g.campId) })).join(' ');
      }
      else if (h.task === 'otor') {
        const g = hs.otor.find((x) => x.helperId === h.id);
        const it = g ? (g.items ?? []).reduce((s2, x) => s2 + x.amount, 0) : 0;
        what = g ? t('ui.otor_animals_days', { x: t('camp.' + g.campId), length: g.animals.length, days: g.days, x2: it > 0 ? t('ui.units_of_products_go', { x: fmtNum(it) }) : '' }) : t('ui.otor_283');
        btns = t('ui.recall_from_otor', { id: h.id });
      } else if (h.trip) {
        what = t('ui.heading_to_the_sum', { x: cfg.vehicles[h.trip.vehicle].emoji, x2: fmtMinutes(Math.round(h.trip.remaining)) });
      } else {
        const auto = hs.autoTrip !== false;
        what = h.task === 'drive' ? t(auto ? 'ui.driver_sells_the_storage' : 'ui.driver_waits_for_orders', { departHour: cfg.helpers.driver.departHour }) : t('ui.herding', { x: HERD_NAME[h.herd] });
        btns = t('ui.driver_otor', { x: herdBtn(h, 'sheep'), x2: herdBtn(h, 'cow'), x3: herdBtn(h, 'horse'), x4: h.task === 'drive' ? 'gold' : '', id: h.id, id2: h.id });
        if (h.task === 'drive') btns += ' ' + t('ui.auto_trip_toggle', { cls: auto ? 'gold' : '', on: auto ? 0 : 1, departHour: cfg.helpers.driver.departHour, state: t(auto ? 'ui.on' : 'ui.off') });
      }
      const pay = h.task === 'otor' || h.trip ? '' : t('ui.pay_in_animals_fire', { id: h.id, id2: h.id });
      const own = owned(h);
      return `<tr><td>${icon(h)} <b>${h.name}</b>${h.family ? t('ui.family') : ''}<br><span class="muted">${what}</span></td>
        <td class="num">${fmtMoney(h.wage * per)}<br><span class="muted">${h.prepaid > 0 ? t('ui.advance', { x: fmtMoney(h.prepaid) }) : h.prepaid < 0 ? t('ui.debt', { x: fmtMoney(-h.prepaid) }) : ''}${own ? t('ui.animals', { own }) : ''}</span></td>
        <td>${btns}<br>${pay}</td></tr>`;
    }).join('');
    return head + t('ui.wages_every_days_total', { per, x: fmtMoney(total), nextPay, x2: bedsUsed(state), x3: bedsTotal(cfg, state), x4: spareTents(state), rows });
  }

  private otorHtml(): string {
    const { cfg, state } = this;
    const v = this.hv;
    const h = state.helpers.list.find((x) => x.id === v.helper);
    if (!h) return '';
    const spare = spareTents(state);
    const camps = Object.keys(cfg.camps.camps).filter((id) => id !== state.campId)
      .map((id) => `<button class="btn ${v.camp === id ? 'gold' : ''}" data-act="oc:${id}">${t('camp.' + id)}</button>`).join(' ');
    const groups = this.animalGroups();
    const rows = groups.map((g) => {
      const n = v.counts[g.key] ?? 0;
      return t('ui.all_295', { label: g.label, length: g.list.length, key: g.key, n, key2: g.key, key3: g.key });
    }).join('');
    const n = Object.values(v.counts).reduce((s, x) => s + x, 0);
    const errs: string[] = [];
    if (spare <= 0) errs.push(t('ui.no_spare_tent_get'));
    if (state.player.place !== 'camp') errs.push(t('ui.can_be_sent_while'));
    return t('ui.send_to_otor_split', { name: h.name, spare, camps, n, rows, x: errs.length ? `<p class="bad">${errs.join(' · ')}</p>` : '', x2: errs.length || !n || !v.camp ? 'disabled' : '' });
  }

  private payHtml(): string {
    const { cfg, state } = this;
    const h = state.helpers.list.find((x) => x.id === this.hv.helper);
    if (!h) return '';
    const per = cfg.helpers.payEveryDays;
    const fam = state.helpers.list.filter((x) => x.familyId === h.familyId);
    const due = fam.reduce((s, x) => s + x.wage, 0) * per;
    const prepaid = fam.reduce((s, x) => s + x.prepaid, 0);
    const rows = this.animalGroups().map((g) => {
      const price = salePrice(g.list[0]!, cfg.animals);
      return t('ui.give_1', { label: g.label, length: g.list.length, x: fmtMoney(price), key: g.key });
    }).join('');
    return t('ui.pay_in_animals_the', { name: h.name, per, x: fmtMoney(due), x2: fmtMoney(prepaid), x3: due ? Math.floor(prepaid / due) : 0, rows });
  }

  // ======================= үйлдлүүд =======================
  private act(a: string): void {
    const [cmd, arg = ''] = a.split(/:(.*)/s) as [string, string?];
    const d = this.draft;
    const { cfg, state } = this;
    if (this.sleep.act(cmd, arg, { dispatch: this.hooks.dispatch, toast: this.hooks.toast, close: () => this.close(), rerender: () => this.render() })) return;
    switch (cmd) {
      case 'close':
        this.close();
        return;
      case 'process': {
        const r = this.hooks.dispatch({ type: 'process', kind: arg as ProcessorKind });
        this.hooks.toast(r.ok ? t('ui.started_working', { x: PROCESSOR_NAME[arg] }) : r.msg ?? '', r.ok ? 'good' : 'bad');
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
      // V3.4 сумын төвийн амьдрал
      case 'donate':
      case 'zdtgLoan':
      case 'zdtgRepay':
      case 'bankLoan':
      case 'bankRepay':
      case 'buyHouse':
      case 'houseMode':
      case 'gift': {
        const r = this.hooks.dispatch(this.townCommand(cmd, arg));
        this.hooks.toast(r.msg ?? '', r.ok ? 'good' : 'bad');
        break;
      }
      case 'buyLot': {
        const r = this.hooks.dispatch({ type: 'buyLotVehicle', slot: arg });
        this.hooks.toast(r.msg ?? '', r.ok ? 'good' : 'bad');
        if (r.ok) {
          this.close();
          return;
        }
        break;
      }
      case 'tr+': case 'tr-': case 'trAll': {
        const p = arg as ProductId, have = sellableAtShop(state)[p] ?? 0;
        const cur = this.tr.sell[p] ?? 0;
        this.tr.sell[p] = cmd === 'trAll' ? have : Math.max(0, Math.min(have, cur + (cmd === 'tr+' ? 1 : -1)));
        break;
      }
      case 'trh+': case 'trh-': {
        const v = traderPresent(state);
        this.tr.hay = Math.max(0, Math.min(v?.hay ?? 0, this.tr.hay + (cmd === 'trh+' ? 1 : -1)));
        break;
      }
      case 'doTrader': {
        const r = this.hooks.dispatch({ type: 'traderTrade', sell: this.tr.sell, buyHay: this.tr.hay });
        this.hooks.toast(r.msg ?? '', r.ok ? 'good' : 'bad');
        this.tr = { sell: {}, hay: 0 };
        break;
      }
      case 'sellGer': {
        const r = this.hooks.dispatch({ type: 'sellGer', index: Number(arg) });
        this.hooks.toast(r.msg ?? '', r.ok ? 'good' : 'bad');
        break;
      }
      case 'doTrade': {
        if (!d) break;
        const r = this.hooks.dispatch({ type: 'trade', plan: this.shopPlan() });
        this.hooks.toast(r.msg ?? '', r.ok ? 'good' : 'bad');
        this.draft = { vehicle: d.vehicle, take: {}, sell: {}, sellGroups: {}, buyAnimals: {}, buyItems: new Set(), hay: 0 };
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
      case 'hay+':
      case 'hay-':
        if (d) d.hay = Math.max(0, Math.min(hayRoom(cfg, state), d.hay + (cmd === 'hay+' ? Number(arg) : -Number(arg))));
        break;
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
        this.hooks.toast(r.ok ? t('ui.moving_to_302', { x: t('camp.' + arg) }) : r.msg ?? '', r.ok ? 'good' : 'bad');
        if (r.ok) {
          this.close();
          return;
        }
        break;
      }
      case 'cheat': {
        this.muteReports = arg === 'nextSeason';
        const r = this.hooks.dispatch({ type: 'cheat', action: arg as CheatAction });
        this.muteReports = false;
        if (r.msg) this.hooks.toast(r.msg, r.ok ? 'good' : 'bad');
        if (this.kind !== 'cheat') return;   // өдрийн тайлан нээгдсэн
        break;
      }
      case 'perf':
        this.hooks.perf?.toggle();
        break;
      case 'zones': {
        const on = this.hooks.toggleZones?.();
        this.hooks.toast(on ? t('ui.protection_zones_are_visible_303') : t('ui.protection_zones_hidden'), 'good');
        break;
      }
      case 'hire': {
        const r = this.hooks.dispatch({ type: 'hire', candidate: Number(arg) });
        this.hooks.toast(r.msg ?? '', r.ok ? 'good' : 'bad');
        break;
      }
      case 'task': {
        const [id, task, herd] = arg.split('|');
        const r = this.hooks.dispatch({ type: 'helperTask', helper: Number(id), task: task as 'herd' | 'drive', herd: herd as HerdGroup | undefined });
        if (!r.ok) this.hooks.toast(r.msg ?? '', 'bad');
        break;
      }
      case 'autoTrip': {
        const r = this.hooks.dispatch({ type: 'setAutoTrip', on: arg === '1' });
        this.hooks.toast(r.msg ?? '', 'good');
        break;
      }
      case 'fire': {
        const r = this.hooks.dispatch({ type: 'fireHelper', helper: Number(arg) });
        this.hooks.toast(r.msg ?? '', r.ok ? 'good' : 'bad');
        break;
      }
      case 'recall': {
        const r = this.hooks.dispatch({ type: 'recallOtor', helper: Number(arg) });
        this.hooks.toast(r.msg ?? '', r.ok ? 'good' : 'bad');
        break;
      }
      case 'takeOtor': {
        const r = this.hooks.dispatch({ type: 'takeOtor', camp: arg });
        this.hooks.toast(r.msg ?? '', r.ok ? 'good' : 'bad');
        break;
      }
      case 'collector': {
        const [id, camp] = arg.split('|');
        const r = this.hooks.dispatch({ type: 'otorCollector', helper: Number(id), camp: camp ? camp : null });
        this.hooks.toast(r.msg ?? '', r.ok ? 'good' : 'bad');
        break;
      }
      case 'otorOpen':
        this.hv = { mode: 'otor', helper: Number(arg), camp: '', counts: {} };
        break;
      case 'payOpen':
        this.hv = { mode: 'pay', helper: Number(arg), camp: '', counts: {} };
        break;
      case 'hvBack':
        this.hv = { mode: 'list', helper: 0, camp: '', counts: {} };
        break;
      case 'oc':
        this.hv.camp = arg;
        break;
      case 'oa+':
      case 'oa-':
      case 'oaAll': {
        const g = this.animalGroups().find((x) => x.key === arg);
        const cur = this.hv.counts[arg] ?? 0;
        const max = g?.list.length ?? 0;
        this.hv.counts[arg] = cmd === 'oaAll' ? max : cmd === 'oa+' ? Math.min(cur + 1, max) : Math.max(0, cur - 1);
        break;
      }
      case 'doOtor': {
        const groups = this.animalGroups();
        const ids = groups.flatMap((g) => g.list.slice(0, this.hv.counts[g.key] ?? 0).map((a) => a.id));
        const r = this.hooks.dispatch({ type: 'sendOtor', helper: this.hv.helper, animalIds: ids, camp: this.hv.camp });
        this.hooks.toast(r.ok ? t('ui.otor_sent_to_animals', { x: t('camp.' + this.hv.camp), length: ids.length }) : r.msg ?? '', r.ok ? 'good' : 'bad');
        if (r.ok) this.hv = { mode: 'list', helper: 0, camp: '', counts: {} };
        break;
      }
      case 'pa': {
        const g = this.animalGroups().find((x) => x.key === arg);
        const a = g?.list[0];
        if (!a) break;
        const r = this.hooks.dispatch({ type: 'payWithAnimal', helper: this.hv.helper, animal: a.id });
        this.hooks.toast(r.msg ?? '', r.ok ? 'good' : 'bad');
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
