/**
 * Цонхнууд (M3): агуулах ба боловсруулалт (B), өдрийн тайлан (20:00).
 * M4.6: ачаа (T, хотонд — гартаа авах, тээвэрт ачих/буулгах), Худалдаачин (E/T, сумын төвд), өөр бууцанд ирэх.
 * M4: нохойн команд (K), бууц сэлгэх (M), туршилтын цэс (`).
 * M5: цайны газар (сумын төвд E — туслах хөлслөх), туслахууд (J — үүрэг, малаар цалин, отор, халах).
 * GameState-ийг зөвхөн уншиж, үйлдлийг Command-аар илгээнэ (architecture.md §3.1).
 * Цонх нээлттэй үед тоглоом түр зогсоно.
 */
import { touchKeys } from '../../device';
import type { GameConfig, Species } from '../../sim/config';
import type { GameState, ProcessorKind, ProductId, VehicleId } from '../../sim/state';
import type { DayReport } from '../../sim/sim';
import * as storage from '../../sim/systems/storage';
import { cargoUnits, nearestVehicle, sellableAnimals, sellableAtShop, hayRoom } from '../../sim/systems/travel';
import type { DogOrderKind } from '../../sim/systems/dogs';
import type { CheatAction } from '../../sim/systems/cheats';
import type { HerdGroup } from '../../sim/systems/helpers';
import { closedMsg, isOpen } from '../../sim/systems/shops';
import { nearTradeDoor } from '../../sim/systems/sumtown';
import { bankLimit } from '../../sim/systems/town';
import { PROCESSOR_NAME } from './names';
import { t } from '../../i18n/i18n';
import { SleepPanel } from './sleepPanel';
import { traderPresent } from '../../sim/systems/trader';
import { animalGroups, selectedAnimals, type PanelCtx, type Draft, type HelperView, type Kind, type UiHooks } from './panelCtx';
export type { UiHooks } from './panelCtx';
import { storageHtml } from './panelStorage';
import { cargoHtml, shopHtml, traderHtml, shopPlan } from './panelTrade';
import { townCommand, townHtml, lotHtml, arriveHtml } from './panelTown';
import { milestonesHtml, ceremonyHtml, logHtml, reportHtml } from './panelReport';
import { dogsHtml, campsHtml, cheatHtml, teahouseHtml, helpersHtml } from './panelHerd';








export class Panels implements PanelCtx {
  private root: HTMLElement;
  private box: HTMLElement;
  kind: Kind | null = null;
  draft: Draft | null = null;
  report: DayReport | null = null;
  private reports: DayReport[] = [];
  /** 📜 Тэмдэглэл: идэвхтэй таб, харж буй тайлангийн дугаар (journal.reports дотор) */
  logTab: 'notes' | 'report' = 'notes';
  logIdx = 0;
  /** Банк: тоглогчийн сонгосон зээлийн дүн (лимит хүртэл) */
  bankAmt = 0;
  arriveCamp = '';
  private muteReports = false;
  private pressing = false;
  hv: HelperView = { mode: 'list', helper: 0, camp: '', counts: {} };
  tr: { sell: Partial<Record<ProductId, number>>; hay: number } = { sell: {}, hay: 0 };
  readonly sleep: SleepPanel;

  constructor(readonly cfg: GameConfig, readonly state: GameState, readonly hooks: UiHooks) {
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

  /** Одоо нээлттэй цонхны төрөл (null = хаалттай) */
  get current(): string | null {
    return this.kind;
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
      const nearV = kind === 'cargo' && !st.player.driving ? nearestVehicle(this.cfg, st, this.cfg.vehicles.road.enterRange) : null;
      const atV = kind === 'cargo' && (!!st.player.driving || nearV?.place === 'camp');
      this.draft = { vehicle: atV && nearV ? nearV.id : v, atVehicle: atV, take: {}, sell: {}, sellGroups: {}, buyAnimals: {}, buyItems: new Set(), hay: 0 };
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
    if (this.kind === 'storage') html = storageHtml(this);
    else if (this.kind === 'cargo') html = cargoHtml(this);
    else if (this.kind === 'shop') html = shopHtml(this);
    else if (this.kind === 'lot') html = lotHtml(this);
    else if (this.kind === 'town') html = townHtml(this);
    else if (this.kind === 'arrive') html = arriveHtml(this);
    else if (this.kind === 'report') html = reportHtml(this);
    else if (this.kind === 'log') html = logHtml(this);
    else if (this.kind === 'dogs') html = dogsHtml(this);
    else if (this.kind === 'camps') html = campsHtml(this);
    else if (this.kind === 'cheat') html = cheatHtml(this);
    else if (this.kind === 'teahouse') html = teahouseHtml(this);
    else if (this.kind === 'helpers') html = helpersHtml(this);
    else if (this.kind === 'milestones') html = milestonesHtml(this);
    else if (this.kind === 'ceremony') html = ceremonyHtml(this);
    else if (this.kind === 'trader') html = traderHtml(this);
    this.box.innerHTML = touchKeys(html);   // утсанд товчны нэрийг товчны дүрсээр
    this.box.scrollTop = scroll;
  }

  // ======================= 📜 тэмдэглэл: мэдэгдэл + өдрийн тайлан =======================
  /** Тэмдэглэлийг нээх: анхдагчаар мэдэгдэл; tab='report' бол хамгийн сүүлийн (өчигдрийн) тайлан */
  openLog(tab: 'notes' | 'report' = 'notes'): void {
    this.logTab = tab;
    this.logIdx = Math.max(0, this.state.journal.reports.length - 1);
    this.open('log');
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
        const ids = selectedAnimals(this, animalGroups(this)).map((a2) => a2.id);
        const r = this.hooks.dispatch({ type: 'droveAnimals', animalIds: ids });
        this.hooks.toast(r.msg ?? '', r.ok ? 'good' : 'bad');
        d.sellGroups = {};
        break;
      }
      case 'doLoad': {
        if (!d || !d.vehicle) break;
        const ids = selectedAnimals(this, animalGroups(this)).map((a2) => a2.id);
        const r = this.hooks.dispatch({ type: 'loadCargo', vehicle: d.vehicle, products: d.sell, animalIds: ids });
        this.hooks.toast(r.msg ?? '', r.ok ? 'good' : 'bad');
        if (r.ok) {
          d.sell = {};
          d.sellGroups = {};
        }
        break;
      }
      case 'doSend': {
        if (!d || !d.vehicle) break;
        const r = this.hooks.dispatch({ type: 'sendDriver', vehicle: d.vehicle });
        this.hooks.toast(r.msg ?? '', r.ok ? 'good' : 'bad');
        if (r.ok) { this.close(); return; }
        break;
      }
      case 'logTab':
        this.logTab = arg === 'report' ? 'report' : 'notes';
        break;
      case 'logPrev':
        this.logIdx--;
        break;
      case 'logNext':
        this.logIdx++;
        break;
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
        const r = this.hooks.dispatch(townCommand(this, cmd, arg));
        this.hooks.toast(r.msg ?? '', r.ok ? 'good' : 'bad');
        break;
      }
      case 'bankAmt': {
        const B = cfg.town.bankLoan, lim = bankLimit(cfg, state);
        const next = arg === 'min' ? B.minAmount : arg === 'max' ? lim : this.bankAmt + Number(arg);
        this.bankAmt = Math.min(lim, Math.max(B.minAmount, next));
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
        const r = this.hooks.dispatch({ type: 'trade', plan: shopPlan(this) });
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
        const g = animalGroups(this, this.kind === 'shop' ? sellableAnimals(state) : state.animals).find((x) => x.key === arg);
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
        const g = animalGroups(this).find((x) => x.key === arg);
        const cur = this.hv.counts[arg] ?? 0;
        const max = g?.list.length ?? 0;
        this.hv.counts[arg] = cmd === 'oaAll' ? max : cmd === 'oa+' ? Math.min(cur + 1, max) : Math.max(0, cur - 1);
        break;
      }
      case 'doOtor': {
        const groups = animalGroups(this);
        const ids = groups.flatMap((g) => g.list.slice(0, this.hv.counts[g.key] ?? 0).map((a) => a.id));
        const r = this.hooks.dispatch({ type: 'sendOtor', helper: this.hv.helper, animalIds: ids, camp: this.hv.camp });
        this.hooks.toast(r.ok ? t('ui.otor_sent_to_animals', { x: t('camp.' + this.hv.camp), length: ids.length }) : r.msg ?? '', r.ok ? 'good' : 'bad');
        if (r.ok) this.hv = { mode: 'list', helper: 0, camp: '', counts: {} };
        break;
      }
      case 'pa': {
        const g = animalGroups(this).find((x) => x.key === arg);
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
