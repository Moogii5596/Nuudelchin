/**
 * T-27 UI лаб — утасны HUD 2-ын DOM давхарга (хэвтээ утас). Загвар: game/ui-lab.html-ийн CSS (.l-*).
 *  - зүүн доод: хөвөгч джойстик
 *  - баруун доод, эрхий хурууны 4 тогтмол байрлал: алтан контекст товч, Horse, Actions (дугуй), Map
 *  - ойр 2+ зүйл: алтан товчны хажууд жагсаалт (хамгийн ойрх нь сонгогдсон) + объект дээр тэмдэг
 *  - дээд: нэг мөр төлөв (дарахад дэлгэрнэ); баруун дээд: хурд, алгасах, цэс
 * Тоглоомын логик энд байхгүй: бүх үйлдэл HudHooks-оор гарна (main.ts → PlayerController / Command).
 */
import type { SkipTarget } from '../input/skip';
import type { HorseMode, Target } from './context';
import { icon } from './icons';

export const WHEEL_IDS = ['shout', 'call', 'process', 'load', 'switch', 'log'] as const;
export type WheelId = (typeof WHEEL_IDS)[number];

export interface TargetView { t: Target; label: string; icon: string }

export interface HudModel {
  /** Цонх нээлттэй: бүх удирдлага нуугдана */
  hidden: boolean;
  targets: TargetView[];
  horse: { mode: HorseMode; label: string; icon: string };
  mapOn: boolean;
  joyOn: boolean;
  wheelOn: boolean;
  /** Нэг мөр төлөв (HTML) ба дэлгэрэнгүй */
  status: string;
  detail: string;
  speed: string;
  unread: number;
  skip: { target: SkipTarget; label: string; on: boolean }[];
  /** Алгасаж байгаа бол төвийн цаг, үгүй бол null */
  skipClock: string | null;
}

export interface HudLabels {
  horse: string; actions: string; map: string; nothing: string; stop: string; rotate: string; speed: string; skip: string; menu: string;
  wheel: Record<WheelId, string>;
  menuItems: { code: string; icon: string; label: string }[];
  scenes: string[];
}

export interface HudHooks {
  run: (t: Target) => void;
  hold: (t: Target, on: boolean) => void;
  horse: () => void;
  map: () => void;
  wheel: (id: WheelId) => void;
  wheelOpen: (open: boolean) => void;
  stick: (x: number, y: number) => void;
  cycleSpeed: () => void;
  skip: (target: SkipTarget) => void;
  stopSkip: () => void;
  menu: (code: string) => void;
  scene: (name: string) => void;
  /** Дэлхийн цэг → дэлгэцийн px (объект дээрх тэмдэг) */
  project: (x: number, z: number, h: number) => { x: number; y: number };
}

const mk = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, html = '', parent?: HTMLElement): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.className = cls;
  e.innerHTML = html;
  parent?.appendChild(e);
  return e;
};

export class LabHud {
  private root: HTMLElement;
  private joy: HTMLElement;
  private zone: HTMLElement;
  private knob: HTMLElement;
  private joyId: number | null = null;
  private gold: HTMLButtonElement;
  private horseBtn: HTMLButtonElement;
  private actBtn: HTMLButtonElement;
  private mapBtn: HTMLButtonElement;
  private list: HTMLElement;
  private marks: HTMLElement;
  private wheelEl: HTMLElement;
  private wheelHub: HTMLElement;
  private wheelItems: HTMLElement[] = [];
  private statusEl: HTMLElement;
  private detailEl: HTMLElement;
  private speedBtn: HTMLButtonElement;
  private skipPop: HTMLElement;
  private menuPop: HTMLElement;
  private skipBox: HTMLElement;
  private skipClock: HTMLElement;
  private rotateEl: HTMLElement;
  private badge: HTMLElement;
  private model: HudModel | null = null;
  private held: Target | null = null;
  private sig = '';
  private expanded = false;
  wheelIsOpen = false;

  constructor(private L: HudLabels, private hooks: HudHooks, private wheelCfg: { slidePx: number; radius: number }) {
    const root = (this.root = mk('div', 'l-hud', '', document.body));
    this.marks = mk('div', 'l-marks', '', root);

    // --- Дээд: төлөвийн мөр ---
    const top = mk('div', 'l-top', '', root);
    this.statusEl = mk('button', 'l-status', '', top);
    this.detailEl = mk('div', 'l-detail', '', root);
    this.statusEl.addEventListener('click', () => {
      this.expanded = !this.expanded;
      this.detailEl.classList.toggle('open', this.expanded);
    });
    const tr = mk('div', 'l-tr', '', root);
    this.speedBtn = mk('button', 'l-btn l-sm', '1×', tr);
    this.speedBtn.setAttribute('aria-label', L.speed);
    this.speedBtn.addEventListener('click', () => this.hooks.cycleSpeed());
    const skipBtn = mk('button', 'l-btn l-sm', icon('skip', 20), tr);
    skipBtn.setAttribute('aria-label', L.skip);
    const menuBtn = mk('button', 'l-btn l-sm', icon('menu', 20), tr);
    menuBtn.setAttribute('aria-label', L.menu);
    this.skipPop = mk('div', 'l-pop', '', root);
    this.menuPop = mk('div', 'l-pop l-grid', '', root);
    const toggle = (pop: HTMLElement, other: HTMLElement) => (): void => {
      other.classList.remove('open');
      pop.classList.toggle('open');
    };
    skipBtn.addEventListener('click', toggle(this.skipPop, this.menuPop));
    menuBtn.addEventListener('click', toggle(this.menuPop, this.skipPop));
    document.addEventListener('pointerdown', (e) => {
      const tg = e.target as HTMLElement;
      if (!tg.closest('.l-pop') && !tg.closest('.l-tr')) this.closePops();
    }, true);
    for (const it of L.menuItems) {
      const b = mk('button', 'l-item', `${icon(it.icon, 20)}<span>${it.label}</span>`, this.menuPop);
      b.addEventListener('click', () => { this.closePops(); this.hooks.menu(it.code); });
    }
    const scenes = mk('div', 'l-scenes', '', this.menuPop);
    for (const s of L.scenes) mk('button', 'l-chip', s, scenes).addEventListener('click', () => this.hooks.scene(s));

    // --- Джойстик (зүүн доод бүсэд хуруу тавьсан газар гарч ирнэ) ---
    this.zone = mk('div', 'l-joyzone', '', root);
    this.joy = mk('div', 'l-joy', '', root);
    this.knob = mk('div', 'l-knob', '', this.joy);
    this.bindJoystick();

    // --- Баруун доод: 4 тогтмол товч ---
    this.list = mk('div', 'l-list', '', root);
    this.mapBtn = mk('button', 'l-btn l-map', `${icon('map', 22)}<small>${L.map}</small>`, root);
    this.actBtn = mk('button', 'l-btn l-act', `${icon('actions', 26)}<small>${L.actions}</small><i></i>`, root);
    this.badge = this.actBtn.querySelector('i')!;
    this.horseBtn = mk('button', 'l-btn l-horse', '', root);
    this.gold = mk('button', 'l-btn l-gold', '', root);
    this.tap(this.mapBtn, () => this.hooks.map());
    this.tap(this.horseBtn, () => this.hooks.horse());
    this.bindTarget(this.gold, () => this.model?.targets[0]?.t ?? null);

    // --- Actions дугуй ---
    this.wheelEl = mk('div', 'l-wheel', '', root);
    const ring = mk('div', 'l-ring', '', this.wheelEl);
    this.wheelHub = mk('div', 'l-hubtxt', L.actions, ring);
    WHEEL_IDS.forEach((id, i) => {
      const a = (-90 + i * 60) * (Math.PI / 180);
      const b = mk('button', 'l-witem', `${icon(id === 'switch' ? 'uurga' : id, 24)}<small>${L.wheel[id]}</small>`, ring);
      b.style.left = `${Math.cos(a) * wheelCfg.radius}px`;
      b.style.top = `${Math.sin(a) * wheelCfg.radius}px`;
      b.dataset.w = id;
      this.wheelItems.push(b);
    });
    this.bindWheel(ring);

    // --- Алгасах үеийн төвийн самбар, босоо байрлалын сануулга ---
    this.skipBox = mk('div', 'l-skip', '', root);
    this.skipClock = mk('b', '', '', this.skipBox);
    mk('button', 'l-chip', L.stop, this.skipBox).addEventListener('click', () => this.hooks.stopSkip());
    this.rotateEl = mk('div', 'l-rotate', `${icon('full', 40)}<p>${L.rotate}</p>`, root);
    root.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  get portrait(): boolean {
    return window.innerHeight > window.innerWidth * 1.05;
  }

  private closePops(): void {
    this.skipPop.classList.remove('open');
    this.menuPop.classList.remove('open');
  }

  /** pointerdown-д хариулна (хурдан), камерт дамжуулахгүй */
  private tap(b: HTMLElement, fn: () => void): void {
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (b.classList.contains('off')) return;
      b.classList.add('on');
      fn();
    });
    const up = (): void => b.classList.remove('on');
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
  }

  /** Контекст товч/жагсаалтын мөр: энгийн үйлдэл — дарахад; дарж байх үйлдэл (давхих) — дарсан хугацаанд */
  private bindTarget(b: HTMLElement, get: () => Target | null): void {
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const t = get();
      if (!t) return;
      b.classList.add('on');
      if (t.hold) {
        this.held = t;
        this.hooks.hold(t, true);
      } else this.hooks.run(t);
    });
    const up = (): void => {
      b.classList.remove('on');
      if (this.held) this.hooks.hold(this.held, false);
      this.held = null;
    };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
  }

  private bindJoystick(): void {
    let cx = 0, cy = 0, R = 56;
    const move = (e: PointerEvent): void => {
      let dx = (e.clientX - cx) / R, dy = (e.clientY - cy) / R;
      const l = Math.hypot(dx, dy);
      if (l > 1) { dx /= l; dy /= l; }
      this.hooks.stick(dx, dy);
      this.knob.style.transform = `translate(${dx * R * 0.6}px, ${dy * R * 0.6}px)`;
    };
    const release = (e: PointerEvent): void => {
      if (e.pointerId !== this.joyId) return;
      this.joyId = null;
      this.hooks.stick(0, 0);
      this.knob.style.transform = '';
      this.joy.classList.remove('live');
      this.joy.style.left = this.joy.style.top = this.joy.style.bottom = '';
    };
    this.zone.addEventListener('pointerdown', (e) => {
      if (this.joyId !== null) return;
      e.preventDefault();
      this.zone.setPointerCapture(e.pointerId);
      this.joyId = e.pointerId;
      R = this.joy.offsetWidth / 2 || 56;
      cx = Math.min(Math.max(e.clientX, R + 4), window.innerWidth - R - 4);
      cy = Math.min(Math.max(e.clientY, R + 4), window.innerHeight - R - 4);
      this.joy.style.left = `${cx - R}px`;
      this.joy.style.top = `${cy - R}px`;
      this.joy.style.bottom = 'auto';
      this.joy.classList.add('live');
      move(e);
    });
    this.zone.addEventListener('pointermove', (e) => { if (e.pointerId === this.joyId) move(e); });
    this.zone.addEventListener('pointerup', release);
    this.zone.addEventListener('pointercancel', release);
  }

  /**
   * Дугуй: (а) товшиж нээгээд сегмент товшино, (б) дараад гулсуулж сегмент дээр авна.
   * Нээлттэй үед тоглоом удааширна (hooks.wheelOpen).
   */
  private bindWheel(ring: HTMLElement): void {
    let sx = 0, sy = 0, moved = false, pid: number | null = null, hot: HTMLElement | null = null;
    const pick = (x: number, y: number): HTMLElement | null => {
      const r = ring.getBoundingClientRect();
      const dx = x - r.left, dy = y - r.top;
      if (Math.hypot(dx, dy) < this.wheelCfg.radius * 0.42) return null;
      let a = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (a < 0) a += 360;
      return this.wheelItems[Math.round(a / 60) % 6] ?? null;
    };
    const setHot = (h: HTMLElement | null): void => {
      if (h === hot) return;
      hot?.classList.remove('hot');
      hot = h;
      hot?.classList.add('hot');
      this.wheelHub.textContent = hot ? this.L.wheel[hot.dataset.w as WheelId] : this.L.actions;
    };
    const fire = (h: HTMLElement | null): void => {
      setHot(null);
      this.setWheel(false);
      if (h) this.hooks.wheel(h.dataset.w as WheelId);
    };
    this.actBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.actBtn.classList.contains('off')) return;
      if (this.wheelIsOpen) { fire(null); return; }
      this.actBtn.setPointerCapture(e.pointerId);
      pid = e.pointerId;
      sx = e.clientX; sy = e.clientY;
      moved = false;
      this.setWheel(true);
    });
    this.actBtn.addEventListener('pointermove', (e) => {
      if (e.pointerId !== pid) return;
      if (!moved && Math.hypot(e.clientX - sx, e.clientY - sy) < this.wheelCfg.slidePx) return;
      moved = true;
      setHot(pick(e.clientX, e.clientY));
    });
    const up = (e: PointerEvent): void => {
      if (e.pointerId !== pid) return;
      pid = null;
      if (moved) fire(hot);   // гулсуулсан: сегмент дээр авбал гүйцэтгэнэ, гадна бол хаана
    };
    this.actBtn.addEventListener('pointerup', up);
    this.actBtn.addEventListener('pointercancel', (e) => { if (e.pointerId === pid) { pid = null; fire(null); } });
    this.wheelEl.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      fire((e.target as HTMLElement).closest('.l-witem') as HTMLElement | null);
    });
  }

  setWheel(open: boolean): void {
    if (open === this.wheelIsOpen) return;
    this.wheelIsOpen = open;
    this.wheelEl.classList.toggle('open', open);
    this.root.classList.toggle('wheeling', open);
    this.actBtn.classList.toggle('on', open);
    this.hooks.wheelOpen(open);
  }

  /** hudRefreshSec тутам: товч, жагсаалт, төлөв */
  update(m: HudModel): void {
    this.model = m;
    const portrait = this.portrait;
    this.rotateEl.classList.toggle('open', portrait);
    this.root.classList.toggle('hide', m.hidden || portrait);
    if (m.hidden && this.wheelIsOpen) this.setWheel(false);
    this.statusEl.innerHTML = m.status;
    if (this.expanded) this.detailEl.innerHTML = m.detail;
    this.speedBtn.textContent = m.speed;
    this.badge.textContent = m.unread ? String(m.unread) : '';
    this.skipBox.classList.toggle('open', m.skipClock !== null);
    if (m.skipClock !== null) this.skipClock.textContent = m.skipClock;
    this.joy.style.display = this.zone.style.display = m.joyOn ? '' : 'none';
    if (!m.joyOn && this.joyId === null) this.hooks.stick(0, 0);
    this.mapBtn.classList.toggle('off', !m.mapOn);
    this.actBtn.classList.toggle('off', !m.wheelOn);
    this.horseBtn.classList.toggle('off', m.horse.mode === 'none' || m.horse.mode === 'coming');

    // Дахин зурахыг багасгана: бүтэц өөрчлөгдсөн үед л (дарж байх үед товч солигдохгүй)
    const sig = m.targets.map((v) => v.t.kind + (v.t.ref ?? '')).join('|') + '#' + m.horse.mode + '#' + m.skip.map((s) => s.label + s.on).join('|');
    if (sig === this.sig || this.held) return;
    this.sig = sig;
    const first = m.targets[0];
    this.gold.innerHTML = first ? `${icon(first.icon, 32)}<small>${first.label}</small>` : `${icon('dot', 26)}<small>${this.L.nothing}</small>`;
    this.gold.classList.toggle('off', !first);
    this.horseBtn.innerHTML = `${icon(m.horse.icon, 26)}<small>${m.horse.label}</small>`;
    this.list.innerHTML = '';
    if (m.targets.length > 1) {
      m.targets.forEach((v, i) => {
        const b = mk('button', 'l-row' + (i === 0 ? ' sel' : ''), `${icon(v.icon, 20)}<span>${v.label}</span>`, this.list);
        this.bindTarget(b, () => this.model?.targets.find((x) => x.t.kind === v.t.kind && x.t.ref === v.t.ref)?.t ?? null);
      });
    }
    this.skipPop.innerHTML = '';
    for (const s of m.skip) {
      const b = mk('button', 'l-item' + (s.on ? '' : ' off'), `${icon('skip', 20)}<span>${s.label}</span>`, this.skipPop);
      b.addEventListener('click', () => { if (!s.on) return; this.closePops(); this.hooks.skip(s.target); });
    }
  }

  /** Кадр бүр: объект дээрх тэмдгүүд (хамгийн ойрх нь тод) */
  frame(): void {
    const ts = this.model && !this.model.hidden ? this.model.targets.filter((v) => v.t.at) : [];
    while (this.marks.childElementCount < ts.length) mk('div', 'l-mark', '<i></i>', this.marks);
    const first = this.model?.targets[0];
    for (let i = 0; i < this.marks.childElementCount; i++) {
      const e = this.marks.children[i] as HTMLElement;
      const v = ts[i];
      if (!v) { e.style.display = 'none'; continue; }
      const at = v.t.at!, s = this.hooks.project(at.x, at.z, at.h);
      e.style.display = '';
      e.style.transform = `translate(${Math.round(s.x)}px, ${Math.round(s.y)}px)`;
      e.classList.toggle('sel', v === first);
    }
  }
}
