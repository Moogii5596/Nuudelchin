/**
 * Эхлэлийн дэлгэц, тоглоомын цэс, шинэ тоглоом, слот, файл, тохиргоо, оршил (M6.3).
 * Тоглоомын `state` объект нэг амьдралын туршид хуваалцагддаг тул ӨӨР тоглоом (шинэ, өөр слот, файл) эхлэх нь
 * «зорилго» (Intent) sessionStorage-д бичээд хуудсыг дахин ачаалж, `main.ts → boot()` уншина. «Үргэлжлүүлэх» нь дахин ачаалахгүй.
 */
import './menu.css';
import pkg from '../../../package.json';
import { t, setLang, getLang, type Lang } from '../../i18n/i18n';
import type { GameConfig } from '../../sim/config';
import type { GameState } from '../../sim/state';
import { SAVE_VERSION } from '../../sim/state';
import type { Command, CommandResult } from '../../sim/commands';
import { DIFFICULTY_KEYS, defaultDifficulty, type Difficulty } from '../../sim/systems/difficulty';
import { seasonOf } from '../../sim/systems/seasons';
import { SLOTS, type SaveStore, type SlotInfo } from '../../persist/idb';
import type { Autosave } from '../../persist/autosave';
import { downloadFile, readFile } from '../../persist/file';
import { saveMeta, serialize } from '../../sim/save';
import { TransferError, createTransfer, redeemTransfer } from '../../persist/transfer';
import { normalizeCode } from '../../persist/transferCode';
import { pwa } from '../../pwa';
import { QUALITIES, QUALITY_NAME, type Quality } from '../../device';
import { SEASON_EMOJI, SEASON_NAME, fmtMoney } from './names';

export type Intent = { kind: 'new'; slot: number; difficulty: Difficulty; seed: number } | { kind: 'slot'; slot: number };
const INTENT_KEY = 'nuudel.intent';
const LANG_KEY = 'nuudel.lang';

/** Дахин ачаалах «зорилго»-г нэг удаа уншиж устгана */
export function takeIntent(): Intent | null {
  try {
    const raw = sessionStorage.getItem(INTENT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(INTENT_KEY);
    const i = JSON.parse(raw) as Intent;
    return i && (i.kind === 'new' || i.kind === 'slot') && Number.isInteger(i.slot) ? i : null;
  } catch {
    return null;
  }
}

export function putIntent(i: Intent): void {
  sessionStorage.setItem(INTENT_KEY, JSON.stringify(i));
}

/** Хадгалсан хэл (localStorage) */
export function storedLang(): Lang | null {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return v === 'mn' || v === 'en' ? v : null;
  } catch {
    return null;
  }
}

export interface MenuDeps {
  cfg: GameConfig;
  state: GameState;
  store: SaveStore | null;
  /** Одоо ашиглаж буй хадгалалтын слот (автомат хадгалалт ийшээ бичнэ) */
  getSlot: () => number;
  setSlot: (n: number) => void;
  autosave: Autosave | null;
  dispatch: (cmd: Command) => CommandResult;
  /** Эхлэлийн дэлгэцийн ард хадгалсан тоглоом байгаа эсэх (Үргэлжлүүлэх идэвхтэй эсэх) */
  hasGame: boolean;
  toast: (msg: string, kind?: '' | 'good' | 'bad') => void;
  getQuality: () => Quality;
  setQuality: (q: Quality) => void;
  openHelp: () => void;
  reload: () => void;
  /** Цэсэнд хамгийн эхний товшилт (утсанд бүтэн дэлгэц/хэвтээ түгжих зөвшөөрөл) */
  onFirstTap?: () => void;
}

type Screen = 'start' | 'slots' | 'new' | 'file' | 'settings' | 'game' | 'intro' | 'transfer' | 'code';

const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export class MenuUI {
  private readonly el: HTMLDivElement;
  private screen: Screen = 'start';
  /** Дэд дэлгэцээс «Буцах» хаашаа */
  private root: 'start' | 'game' = 'start';
  private slots: SlotInfo[] = [];
  private draft: { slot: number; difficulty: Difficulty } | null = null;
  private fileSlot = 1;
  private confirmDelete = 0;
  private introPage = 0;
  private introDone: (() => void) | null = null;
  private busy = false;
  private open_ = false;
  private tapped = false;
  /** Шилжүүлэх код (M6.4): үүсгэсэн код ба явц */
  private xfer: { phase: 'idle' | 'busy' | 'done'; display?: string; msg?: string } = { phase: 'idle' };
  private codeText = '';
  private codeSlot = 1;
  private confirmCode = false;
  private codeMsg = '';
  private online = typeof navigator === 'undefined' || navigator.onLine !== false;

  constructor(private readonly d: MenuDeps) {
    this.el = document.createElement('div');
    this.el.id = 'menu';
    document.body.appendChild(this.el);
    this.el.addEventListener('click', (e) => void this.onClick(e));
    this.el.addEventListener('input', (e) => this.onInput(e));
    this.el.addEventListener('change', (e) => void this.onChange(e));
    window.addEventListener('keydown', (e) => this.onKey(e), true);
    pwa.onChange(() => { if (this.open_ && this.screen === 'start') this.render(); });
    // Интернет тасрах/сэргэхэд «Интернет хэрэгтэй» товчнууд шинэчлэгдэнэ
    const net = (on: boolean) => () => { this.online = on; if (this.open_) this.render(); };
    window.addEventListener('online', net(true));
    window.addEventListener('offline', net(false));
  }

  get isOpen(): boolean { return this.open_; }
  /** Эхлэлийн дэлгэц (ард нь 3D эргэлдэнэ, sim зогссон) */
  get isStart(): boolean { return this.open_ && this.root === 'start' && this.screen !== 'intro'; }

  // ---------------------------------------------------------------------- нээх/хаах

  showStart(): void {
    this.root = 'start';
    this.go('start');
  }

  toggleGame(): void {
    if (this.open_) { this.close(); return; }
    this.root = 'game';
    this.go('game');
  }

  close(): void {
    this.open_ = false;
    this.el.classList.remove('open', 'start', 'game', 'intro');
    document.body.classList.remove('menu-open');
  }

  /** Шинэ тоглоомын оршил: 3 дэлгэц, алгасаж болно */
  showIntro(done: () => void): void {
    this.introPage = 0;
    this.introDone = done;
    this.root = 'game';
    this.go('intro');
  }

  private go(screen: Screen): void {
    this.screen = screen;
    this.open_ = true;
    this.confirmDelete = 0;
    this.el.classList.add('open');
    document.body.classList.add('menu-open');
    this.el.classList.toggle('start', this.root === 'start' && screen !== 'intro');
    this.el.classList.toggle('game', this.root === 'game' && screen !== 'intro');
    this.el.classList.toggle('intro', screen === 'intro');
    this.render();
    if (screen === 'transfer') this.xfer = { phase: 'idle' };
    if (screen === 'code') { this.codeMsg = ''; this.confirmCode = false; this.codeSlot = this.d.getSlot(); }
    if (screen === 'slots' || screen === 'new' || screen === 'file' || screen === 'code') void this.refreshSlots();
  }

  private async refreshSlots(): Promise<void> {
    if (!this.d.store) return;
    try {
      this.slots = await this.d.store.list();
    } catch {
      this.slots = [];
    }
    if (this.open_) this.render();
  }

  private onKey(e: KeyboardEvent): void {
    if (!this.open_ || e.code !== 'Escape') return;
    e.preventDefault();
    e.stopImmediatePropagation();   // main.ts-ийн Esc (цэс нээх) нэг товшилтод дахин нээхгүй
    if (this.screen === 'intro') this.finishIntro();
    else if (this.screen !== this.root) this.go(this.root);
    else if (this.root === 'game') this.close();
  }

  // ---------------------------------------------------------------------- дүрслэл

  private render(): void {
    const h = this.screen === 'start' ? this.rStart() : this.screen === 'game' ? this.rGame() : this.screen === 'slots' ? this.rSlots()
      : this.screen === 'new' ? this.rNew() : this.screen === 'file' ? this.rFile() : this.screen === 'settings' ? this.rSettings()
        : this.screen === 'transfer' ? this.rTransfer() : this.screen === 'code' ? this.rCode() : this.rIntro();
    this.el.innerHTML = `<div class="mbox ${this.screen === 'new' ? 'wide' : ''}">${h}</div>`;
  }

  private ver(): string {
    return `<div class="ver">${t('menu.version', { v: pkg.version, save: SAVE_VERSION })}</div>`;
  }

  private back(title: string): string {
    return `<h2>${title}<button class="mb sm back" data-a="back">← ${t('menu.back')}</button></h2>`;
  }

  private rStart(): string {
    const persist = !!this.d.store;
    const canInstall = pwa.available;
    return `<h1>${t('menu.title')}</h1><div class="sub">${t('menu.subtitle')}</div>
      <div class="grid">
        <button class="mb gold wide" data-a="continue" ${this.d.hasGame ? '' : 'disabled'}>▶ ${t('menu.continue')}</button>
        <button class="mb" data-a="new" ${persist ? '' : 'disabled'}>🆕 ${t('menu.new')}</button>
        <button class="mb" data-a="slots" ${persist ? '' : 'disabled'}>📂 ${t('menu.slots')}</button>
        <button class="mb" data-a="file">📄 ${t('menu.file')}</button>
        <button class="mb" data-a="settings">⚙ ${t('menu.settings')}</button>
        ${canInstall ? `<button class="mb" data-a="install">📲 ${t('menu.install')}</button>` : ''}
        ${this.netBtn('transfer', '📤', t('menu.transfer'), !this.d.hasGame)}
        ${this.netBtn('code', '📥', t('menu.enterCode'), !persist)}
      </div>
      ${persist ? '' : `<div class="note">${t('menu.noStorage')}</div>`}${this.ver()}`;
  }

  /** Интернет шаардсан товч: офлайн үед идэвхгүй, «Интернет хэрэгтэй» гэж бичнэ */
  private netBtn(action: string, icon: string, label: string, disabled: boolean): string {
    const off = !this.online;
    return `<button class="mb" data-a="${action}" ${disabled || off ? 'disabled' : ''} ${off ? `title="${t('menu.needNet')}"` : ''}>${icon} ${label}${off ? `<br><small>${t('menu.needNet')}</small>` : ''}</button>`;
  }

  private rTransfer(): string {
    const x = this.xfer;
    let h = this.back('📤 ' + t('menu.transfer'));
    h += `<div class="hint">${t('menu.transfer.hint')}</div>`;
    if (x.phase === 'done' && x.display) {
      h += `<div class="codebox"><div class="code">${esc(x.display)}</div><div class="hint">${t('menu.transfer.done')}</div></div>
        <div class="macts"><button class="mb sm" data-a="copyCode">📋 ${t('menu.copy')}</button><button class="mb sm" data-a="newCode">${t('menu.transfer.again')}</button></div>`;
    } else {
      h += `<div class="macts"><button class="mb gold" data-a="makeCode" ${x.phase === 'busy' || !this.online ? 'disabled' : ''}>${x.phase === 'busy' ? '…' : '📤 ' + t('menu.transfer.make')}</button></div>`;
    }
    if (x.msg) h += `<div class="note">${esc(x.msg)}</div>`;
    return h;
  }

  private rCode(): string {
    let h = this.back('📥 ' + t('menu.enterCode'));
    h += `<div class="hint">${t('menu.code.hint')}</div>
      <div class="row"><input id="menuCode" class="codein" type="text" inputmode="text" autocapitalize="characters" autocomplete="off" spellcheck="false" maxlength="12" placeholder="K7M2-9QXA" value="${esc(this.codeText)}"></div>
      <div class="hint">${t('menu.import.into')}</div>`;
    for (let n = 1; n <= SLOTS; n++) {
      const i = this.slots.find((x) => x.slot === n);
      h += `<div class="slot ${n === this.codeSlot ? 'sel' : ''}"><div class="si">${this.slotInfoHtml(i, n)}${i && !i.empty && n === this.codeSlot ? `<br><small>⚠ ${t('menu.overwrite')}</small>` : ''}</div>
        <div class="sb"><button class="mb sm ${n === this.codeSlot ? 'gold' : ''}" data-a="codeSlot" data-n="${n}">${n === this.codeSlot ? '✓' : t('menu.choose')}</button></div></div>`;
    }
    const target = this.slots.find((x) => x.slot === this.codeSlot);
    const occupied = !!target && !target.empty;
    h += `<div class="macts"><button class="mb gold" data-a="redeem" ${this.online ? '' : 'disabled'}>${this.confirmCode && occupied ? '⚠ ' + t('menu.code.confirm') : '📥 ' + t('menu.code.get')}</button></div>`;
    if (this.codeMsg) h += `<div class="note">${esc(this.codeMsg)}</div>`;
    return h;
  }

  private xferError(e: unknown): string {
    if (e instanceof TransferError) return t('menu.err.' + e.kind);
    return String((e as Error).message ?? e);
  }

  private rGame(): string {
    return `<h2>${t('menu.gameMenu')}</h2>
      <div class="grid">
        <button class="mb gold wide" data-a="resume">▶ ${t('menu.resume')}</button>
        <button class="mb" data-a="save" ${this.d.store ? '' : 'disabled'}>💾 ${t('menu.save')}</button>
        <button class="mb" data-a="slots" ${this.d.store ? '' : 'disabled'}>📂 ${t('menu.slots')}</button>
        <button class="mb" data-a="file">📄 ${t('menu.file')}</button>
        ${this.netBtn('transfer', '📤', t('menu.transfer'), false)}
        ${this.netBtn('code', '📥', t('menu.enterCode'), !this.d.store)}
        <button class="mb" data-a="settings">⚙ ${t('menu.settings')}</button>
        <button class="mb" data-a="help">❓ ${t('menu.help')}</button>
        <button class="mb" data-a="main">🏠 ${t('menu.mainMenu')}</button>
      </div>
      <div class="hint">${t('menu.slotNow', { n: this.d.getSlot() })}</div>${this.ver()}`;
  }

  private slotInfoHtml(i: SlotInfo | undefined, n: number): string {
    if (!i || i.empty) return `<b>${t('menu.slot', { n })}</b><br><small>${t('menu.slotEmpty')}</small>`;
    if (i.damaged || !i.meta) return `<b>${t('menu.slot', { n })}</b><br><small>⚠ ${t('menu.slotDamaged')}</small>`;
    const m = i.meta, season = seasonOf(this.d.cfg, m.day);
    const when = new Date(i.savedAt).toLocaleString(getLang() === 'mn' ? 'mn-MN' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' });
    return `<b>${t('menu.slot', { n })}</b> · ${t('hud.day', { day: m.day })} · ${SEASON_EMOJI[season] ?? ''} ${esc(SEASON_NAME[season] ?? season)}<br>
      💰 ${fmtMoney(m.money)} · 🐑 ${m.animals} ${t('menu.animalsUnit')}<br><small>🕒 ${esc(when)}</small>`;
  }

  private rSlots(): string {
    const cur = this.d.getSlot();
    let h = this.back(t('menu.slots'));
    for (let n = 1; n <= SLOTS; n++) {
      const i = this.slots.find((s) => s.slot === n);
      const has = !!i && !i.empty && !i.damaged;
      h += `<div class="slot ${n === cur ? 'sel' : ''}"><div class="si">${this.slotInfoHtml(i, n)}</div><div class="sb">
        <button class="mb sm gold" data-a="load" data-n="${n}" ${has ? '' : 'disabled'}>${t('menu.load')}</button>
        ${this.root === 'game' ? `<button class="mb sm" data-a="saveTo" data-n="${n}">💾 ${t('menu.saveHere')}</button>` : ''}
        <button class="mb sm danger" data-a="del" data-n="${n}" ${i && !i.empty ? '' : 'disabled'}>${this.confirmDelete === n ? t('menu.sure') : '🗑'}</button></div></div>`;
    }
    return h;
  }

  private rangeRow(k: (typeof DIFFICULTY_KEYS)[number], v: number, id: string): string {
    const r = this.d.cfg.difficulty[k];
    return `<div class="row"><label for="${id}">${t('menu.diff.' + k)}</label><input id="${id}" type="range" data-k="${k}" min="${r.min}" max="${r.max}" step="${r.step}" value="${v}"><output>×${v.toFixed(1)}</output></div>`;
  }

  private difficultyHtml(dif: Difficulty): string {
    return `${DIFFICULTY_KEYS.map((k) => this.rangeRow(k, dif[k], 'dif-' + k)).join('')}
      <div class="row"><label>${t('menu.diff.animalsDie')}</label><div class="pick"><button class="mb ${dif.animalsDie ? 'on' : ''}" data-a="die" data-v="1">${t('menu.yes')}</button><button class="mb ${dif.animalsDie ? '' : 'on'}" data-a="die" data-v="0">${t('menu.no')}</button></div></div>
      <div class="hint">${t('menu.diff.hint')}</div>`;
  }

  private rNew(): string {
    this.draft ??= { slot: this.firstFreeSlot(), difficulty: defaultDifficulty(this.d.cfg) };
    const dr = this.draft;
    let h = this.back('🆕 ' + t('menu.new'));
    h += `<div class="twocol"><div><div class="hint">${t('menu.new.slotHint')}</div>`;
    for (let n = 1; n <= SLOTS; n++) {
      const i = this.slots.find((s) => s.slot === n);
      h += `<div class="slot ${n === dr.slot ? 'sel' : ''}"><div class="si">${this.slotInfoHtml(i, n)}${i && !i.empty ? `<br><small>⚠ ${t('menu.overwrite')}</small>` : ''}</div>
        <div class="sb"><button class="mb sm ${n === dr.slot ? 'gold' : ''}" data-a="pickSlot" data-n="${n}">${n === dr.slot ? '✓' : t('menu.choose')}</button></div></div>`;
    }
    h += `</div><div><h2 class="dh">${t('menu.diff.title')}</h2>${this.difficultyHtml(dr.difficulty)}</div></div>`;
    h += `<div class="macts stick"><button class="mb gold" data-a="begin">▶ ${t('menu.begin')}</button></div>`;
    return h;
  }

  private firstFreeSlot(): number {
    for (let n = 1; n <= SLOTS; n++) if (this.slots.find((s) => s.slot === n)?.empty !== false) return n;
    return 1;
  }

  private rFile(): string {
    let h = this.back('📄 ' + t('menu.file'));
    h += `<div class="hint">${t('menu.file.hint')}</div><div class="grid">
      <button class="mb" data-a="export" ${this.d.hasGame || this.root === 'game' ? '' : 'disabled'}>⬇ ${t('menu.export')}</button>
      <button class="mb" data-a="importPick" ${this.d.store ? '' : 'disabled'}>⬆ ${t('menu.import')}</button></div>
      <div class="hint" style="margin-top:10px">${t('menu.import.into')}</div><div class="pick">`;
    for (let n = 1; n <= SLOTS; n++) h += `<button class="mb ${n === this.fileSlot ? 'on' : ''}" data-a="fileSlot" data-n="${n}">${t('menu.slot', { n })}</button>`;
    return h + `</div><input id="menuFile" type="file" accept=".nuudel,.json,application/json,application/gzip" style="display:none">`;
  }

  private rSettings(): string {
    const q = this.d.getQuality(), lang = getLang();
    let h = this.back('⚙ ' + t('menu.settings'));
    h += `<div class="row"><label>${t('menu.graphics')}</label><div class="pick">${QUALITIES.map((x) => `<button class="mb ${x === q ? 'on' : ''}" data-a="quality" data-v="${x}">${esc(QUALITY_NAME[x])}</button>`).join('')}</div></div>`;
    h += `<div class="row"><label>${t('menu.language')}</label><div class="pick"><button class="mb ${lang === 'mn' ? 'on' : ''}" data-a="lang" data-v="mn">Монгол</button><button class="mb ${lang === 'en' ? 'on' : ''}" data-a="lang" data-v="en">English</button></div></div>`;
    if (this.root === 'game') h += `<h2 style="margin-top:10px">${t('menu.diff.title')}</h2>${this.difficultyHtml(this.d.state.settings.difficulty)}`;
    else h += `<div class="hint">${t('menu.diff.atNew')}</div>`;
    return h;
  }

  private rIntro(): string {
    const p = this.introPage, last = p === 2;
    const pics = ['🏔️', '🐑', '🌅'];
    return `<div class="intro"><div class="pic">${pics[p]}</div><h2>${t(`intro.${p}.title`)}</h2><p>${t(`intro.${p}.text`)}</p>
      <div class="dots">${[0, 1, 2].map((i) => `<i class="${i === p ? 'on' : ''}"></i>`).join('')}</div>
      <div class="macts"><button class="mb sm" data-a="skip">${t('intro.skip')}</button><button class="mb gold" data-a="next">${last ? '▶ ' + t('intro.start') : t('intro.next') + ' →'}</button></div></div>`;
  }

  // ---------------------------------------------------------------------- үйлдэл

  private finishIntro(): void {
    const done = this.introDone;
    this.introDone = null;
    this.close();
    done?.();
  }

  private onInput(e: Event): void {
    const el = e.target as HTMLInputElement;
    if (el.id === 'menuCode') { this.codeText = el.value.toUpperCase(); this.confirmCode = false; return; }
    const k = el.dataset.k as (typeof DIFFICULTY_KEYS)[number] | undefined;
    if (!k) return;
    const v = Number(el.value);
    (el.nextElementSibling as HTMLOutputElement).textContent = `×${v.toFixed(1)}`;
    if (this.screen === 'new' && this.draft) this.draft.difficulty = { ...this.draft.difficulty, [k]: v };
    else if (this.screen === 'settings') this.d.dispatch({ type: 'setDifficulty', patch: { [k]: v } });
  }

  private async onChange(e: Event): Promise<void> {
    const el = e.target as HTMLInputElement;
    if (el.id !== 'menuFile' || !el.files?.[0] || !this.d.store) return;
    const file = el.files[0];
    try {
      const st = await readFile(this.d.cfg, file);
      await this.d.store.write(this.fileSlot, serialize(st), saveMeta(st));
      putIntent({ kind: 'slot', slot: this.fileSlot });
      this.d.reload();
    } catch (err) {
      this.d.toast(t('menu.import.fail', { msg: (err as Error).message.split('\n')[0] ?? '' }), 'bad');
    }
  }

  private setDie(v: boolean): void {
    if (this.screen === 'new' && this.draft) this.draft.difficulty = { ...this.draft.difficulty, animalsDie: v };
    else this.d.dispatch({ type: 'setDifficulty', patch: { animalsDie: v } });
  }

  private async onClick(e: MouseEvent): Promise<void> {
    const b = (e.target as HTMLElement).closest('[data-a]') as HTMLElement | null;
    if (!this.tapped) { this.tapped = true; this.d.onFirstTap?.(); }
    if (!b || b.hasAttribute('disabled') || this.busy) return;
    const a = b.dataset.a!, n = Number(b.dataset.n ?? 0), v = b.dataset.v;
    switch (a) {
      case 'continue': case 'resume': this.close(); return;
      case 'back': this.go(this.root); return;
      case 'transfer': case 'code': this.go(a); return;
      case 'makeCode':
        this.xfer = { phase: 'busy' };
        this.render();
        try {
          const r = await createTransfer(this.d.state);
          this.xfer = { phase: 'done', display: r.display };
        } catch (err) {
          this.xfer = { phase: 'idle', msg: this.xferError(err) };
        }
        this.render();
        return;
      case 'newCode': this.xfer = { phase: 'idle' }; this.render(); return;
      case 'copyCode':
        try { await navigator.clipboard.writeText(this.xfer.display ?? ''); this.d.toast(t('menu.copied'), 'good'); } catch { this.d.toast(this.xfer.display ?? '', ''); }
        return;
      case 'codeSlot': this.codeSlot = n; this.confirmCode = false; this.render(); return;
      case 'redeem': {
        const code = normalizeCode(this.codeText);
        if (!code) { this.codeMsg = t('menu.err.bad_code'); this.render(); return; }
        const target = this.slots.find((x) => x.slot === this.codeSlot);
        if (target && !target.empty && !this.confirmCode) { this.confirmCode = true; this.codeMsg = ''; this.render(); return; }   // слотын зөрчил: дахин товшиж баталгаажуулна
        await this.busyDo(async () => {
          try {
            const st = await redeemTransfer(this.d.cfg, code);
            await this.d.store!.write(this.codeSlot, serialize(st), saveMeta(st));
            putIntent({ kind: 'slot', slot: this.codeSlot });
            this.d.reload();
          } catch (err) {
            this.codeMsg = this.xferError(err);
            this.confirmCode = false;
            this.render();
          }
        });
        return;
      }
      case 'new': this.draft = null; this.go('new'); return;
      case 'slots': case 'file': case 'settings': this.go(a); return;
      case 'help': this.close(); this.d.openHelp(); return;
      case 'install':
        if (pwa.native) await pwa.prompt();
        else this.d.toast(t('menu.install.ios'), 'good');
        return;
      case 'pickSlot': if (this.draft) this.draft.slot = n; this.render(); return;
      case 'die': this.setDie(v === '1'); this.render(); return;
      case 'quality': this.d.setQuality(v as Quality); this.render(); return;
      case 'lang':
        setLang(v as Lang);
        try { localStorage.setItem(LANG_KEY, v!); } catch { /* хадгалахгүй */ }
        this.render();
        return;
      case 'fileSlot': this.fileSlot = n; this.render(); return;
      case 'importPick': (this.el.querySelector('#menuFile') as HTMLInputElement | null)?.click(); return;
      case 'export':
        try { await downloadFile(this.d.state); } catch (err) { this.d.toast(String((err as Error).message), 'bad'); }
        return;
      case 'begin': {
        if (!this.draft) return;
        putIntent({ kind: 'new', slot: this.draft.slot, difficulty: this.draft.difficulty, seed: Math.floor(Math.random() * 2_000_000_000) + 1 });
        this.d.reload();
        return;
      }
      case 'load':
        if (n === this.d.getSlot() && this.root === 'start' && this.d.hasGame) { this.close(); return; }
        await this.busyDo(async () => {
          if (this.root === 'game') await this.d.autosave?.saveNow('manual');
          putIntent({ kind: 'slot', slot: n });
          this.d.reload();
        });
        return;
      case 'save': case 'saveTo':
        await this.busyDo(async () => {
          if (a === 'saveTo') this.d.setSlot(n);
          await this.d.autosave?.saveNow('manual');
          await this.refreshSlots();
        });
        return;
      case 'del':
        if (this.confirmDelete !== n) { this.confirmDelete = n; this.render(); return; }
        await this.busyDo(async () => { await this.d.store?.remove(n); this.confirmDelete = 0; await this.refreshSlots(); });
        return;
      case 'main':
        await this.busyDo(async () => { await this.d.autosave?.saveNow('manual'); this.d.reload(); });
        return;
      case 'next': if (this.introPage >= 2) this.finishIntro(); else { this.introPage++; this.render(); } return;
      case 'skip': this.finishIntro(); return;
      default: return;
    }
  }

  private async busyDo(f: () => Promise<void>): Promise<void> {
    this.busy = true;
    try { await f(); } catch (err) { this.d.toast(String((err as Error).message ?? err), 'bad'); } finally { this.busy = false; }
  }
}
