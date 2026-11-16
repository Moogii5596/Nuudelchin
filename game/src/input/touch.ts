/**
 * Утасны удирдлага (мэдрэгч дэлгэц). Гарын товчны оронд дэлгэцэн дээрх товчнууд:
 *  - зүүн доод: джойстик — алхах/давхих (захад нь түлхвэл гүйнэ), жолоодох
 *  - баруун доод: үйлдлийн том товчнууд (Хөөе, чоно үргээх, түүх, морь, уурга, тэрэг, газрын зураг)
 *  - баруун дээд: цэс (агуулах, ачаа, нүүх, туслах, нохой, бүс, хурд, тусламж, бүтэн дэлгэц)
 * Товч бүр PlayerController.press(<товчны код>)-ийг дуудна — тоглоомын логик гартай яг адил.
 * Газар дээр дарах (тийш явах), чирэх (камер), хоёр хуруугаар чимхэх (томруулах) — render/camera.ts.
 */
import { t } from '../i18n/i18n';
import type { GameConfig } from '../sim/config';
import type { GameState } from '../sim/state';
import { primaryAction, type PlayerController, type PrimaryAction } from './controller';

const MAIN_ICON: Record<PrimaryAction, string> = { deposit: '📥', pickup: '✋', send: '📦', enter: '🚪', leave: '🚪', service: '🛎', trade: '🏪' };
const mainLabel = (k: PrimaryAction): string => {
  switch (k) {
    case 'deposit': return t('ui.act_deposit');
    case 'pickup': return t('ui.act_pickup');
    case 'send': return t('ui.act_send');
    case 'enter': return t('ui.act_enter');
    case 'leave': return t('ui.act_leave');
    case 'service': return t('ui.act_service');
    case 'trade': return t('ui.act_trade');
  }
};
import { nearestVehicle } from '../sim/systems/travel';
import { pwa, isIOS, inAppBrowser, canLockLandscape, landscapeFullscreen } from '../pwa';

export interface TouchHooks {
  speedIdx: () => number;
  speeds: number[];
}

interface Btn {
  el: HTMLElement;
  show: (s: GameState) => boolean;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, html = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.className = cls;
  e.innerHTML = html;
  return e;
};

export class TouchUI {
  private joy: HTMLElement;
  private zone: HTMLElement;
  private main!: HTMLElement;
  private mainKind: PrimaryAction | null | undefined;
  private knob: HTMLElement;
  private joyId: number | null = null;
  private acts: Btn[] = [];
  private menu: Btn[] = [];
  private speedBtn: HTMLElement | null = null;
  private startEl: HTMLElement;
  private rotateEl: HTMLElement;
  private started = false;
  private sheetEl: HTMLElement;

  /** opts.menuGate: «▶ Тоглох» хаалгыг эхлэлийн цэс (render/ui/menu.ts) орлоно — цэсний эхний товшилт нь хэвтээ/бүтэн дэлгэцийн зөвшөөрөл болно (M6.3) */
  constructor(private cfg: GameConfig, private ctl: PlayerController, private hooks: TouchHooks, opts: { menuGate?: boolean } = {}) {
    document.body.classList.add('touch');

    // --- Джойстик: зүүн доод бүсийн хаана ч хуруугаа тавихад тэнд гарч ирнэ (хөвөгч) ---
    this.joy = el('div', 'joy');
    this.knob = el('div', 'knob');
    this.joy.appendChild(this.knob);
    this.zone = el('div', 'joyzone');
    let cx = 0, cy = 0, R = 60;
    const move = (e: PointerEvent): void => {
      let dx = (e.clientX - cx) / R;
      let dy = (e.clientY - cy) / R;
      const l = Math.hypot(dx, dy);
      if (l > 1) {
        dx /= l;
        dy /= l;
      }
      this.ctl.stick = { x: dx, y: dy };
      this.knob.style.transform = `translate(${dx * R * 0.6}px, ${dy * R * 0.6}px)`;
    };
    const release = (e: PointerEvent): void => {
      if (e.pointerId !== this.joyId) return;
      this.joyId = null;
      this.ctl.stick = { x: 0, y: 0 };
      this.knob.style.transform = '';
      this.joy.classList.remove('live');
      this.joy.style.left = this.joy.style.top = this.joy.style.bottom = '';
    };
    this.zone.addEventListener('pointerdown', (e) => {
      if (this.joyId !== null) return;
      e.preventDefault();
      this.zone.setPointerCapture(e.pointerId);
      this.joyId = e.pointerId;
      R = this.joy.offsetWidth / 2 || 60;
      // Хуруу тавьсан цэг төв болно (дэлгэцээс гарахгүй)
      cx = Math.min(Math.max(e.clientX, R + 4), window.innerWidth - R - 4);
      cy = Math.min(Math.max(e.clientY, R + 4), window.innerHeight - R - 4);
      this.joy.style.left = `${cx - R}px`;
      this.joy.style.top = `${cy - R}px`;
      this.joy.style.bottom = 'auto';
      this.joy.classList.add('live');
      move(e);
    });
    this.zone.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.joyId) move(e);
    });
    this.zone.addEventListener('pointerup', release);
    this.zone.addEventListener('pointercancel', release);
    this.zone.addEventListener('contextmenu', (e) => e.preventDefault());
    document.body.appendChild(this.zone);
    document.body.appendChild(this.joy);

    // --- Үйлдлийн товчнууд ---
    const camp = (s: GameState): boolean => s.player.place === 'camp' && !s.player.driving && !s.move && !s.player.interior;
    const actBox = el('div', 'acts');
    const addAct = (icon: string, label: string, code: string, show: (s: GameState) => boolean, hold = false): void => {
      const b = el('button', 'tbtn act', `<span>${icon}</span><small>${label}</small>`);
      this.bind(b, code, hold);
      actBox.appendChild(b);
      this.acts.push({ el: b, show });
    };
    const nearV = (s: GameState): boolean => !!nearestVehicle(this.cfg, s, this.cfg.vehicles.road.enterRange);
    // Гол товч (E): нөхцөлөөс хамаарч нэр, дүрс нь солигдоно; хийх зүйлгүй бол нуугдана (update)
    this.main = el('button', 'tbtn act main');
    this.bind(this.main, 'KeyE', false);
    actBox.appendChild(this.main);
    addAct('📣', t('ui.shout'), 'Space', camp);
    addAct('🐺', t('ui.scare'), 'KeyQ', camp);
    addAct('🪵', t('ui.switch'), 'KeyU', camp);
    addAct('🐎', t('ui.horse'), 'KeyF', (s) => (s.player.place === 'camp' || s.player.place === 'sum') && !s.player.driving && !s.move && !s.player.interior);
    addAct('🐴', t('ui.call'), 'KeyH', (s) => camp(s) && !s.player.mounted);
    addAct('🚚', t('ui.cart'), 'KeyV', (s) => s.player.place !== 'map' && !s.move && (!!s.player.driving || (!s.player.mounted && nearV(s))));
    addAct('🗺', t('ui.map'), 'Tab', (s) => s.player.place !== 'map' && !s.move);
    addAct('⏩', t('ui.gallop'), 'ShiftLeft', (s) => s.player.place === 'map' && !s.move, true);
    document.body.appendChild(actBox);

    // --- Цэс ---
    const menuBox = el('div', 'tmenu');
    const addMenu = (icon: string, title: string, onTap: () => void, show: (s: GameState) => boolean = () => true): HTMLElement => {
      const b = el('button', 'tbtn sm', icon);
      b.title = title;
      b.setAttribute('aria-label', title);
      b.addEventListener('click', (e) => {
        e.preventDefault();
        onTap();
      });
      menuBox.appendChild(b);
      this.menu.push({ el: b, show });
      return b;
    };
    const atCamp = (s: GameState): boolean => s.player.place === 'camp' && !s.move;
    addMenu('📦', t('ui.storage'), () => this.ctl.press('KeyB'), atCamp);
    addMenu('🧺', t('ui.load_goods'), () => this.ctl.press('KeyT'), atCamp);
    addMenu('🏕', t('ui.move_camp'), () => this.ctl.press('KeyM'), atCamp);
    addMenu('👥', t('ui.helpers_319'), () => this.ctl.press('KeyJ'));
    addMenu('🐕', t('ui.dogs'), () => this.ctl.press('KeyK'), (s) => s.dogs.length > 0);
    addMenu('🛡', t('ui.zones'), () => this.ctl.press('KeyZ'), atCamp);
    this.speedBtn = addMenu('1×', t('ui.speed'), () => {
      const n = (this.hooks.speedIdx() + 1) % this.hooks.speeds.length;
      this.ctl.press('Digit' + (n + 1));
    });
    addMenu('❓', t('ui.help'), () => this.ctl.press('F1'));
    if (document.fullscreenEnabled) addMenu('⛶', t('ui.fullscreen'), () => void this.fullscreen(!document.fullscreenElement));
    document.body.appendChild(menuBox);

    // --- Босоо байрлал: хэвтээ болгох / суулгах ---
    // Android: «Хэвтээ дэлгэцээр тоглох» товч нь бүтэн дэлгэц болгоод хэвтээ түгжинэ — утсаа эргүүлэх шаардлагагүй.
    // Суулгасан апп (нүүр дэлгэцээс) Android-д manifest-ийн дагуу өөрөө хэвтээ нээгдэнэ.
    this.rotateEl = el(
      'div',
      'rotate',
      t('ui.nuudel_is_played_in', { x: canLockLandscape ? t('ui.play_in_landscape') : '', x2: canLockLandscape ? t('ui.or_turn_your_phone') : t('ui.please_turn_your_phone'), x3: inAppBrowser ? t('ui.if_you_opened_this') : '' }),
    );
    document.body.appendChild(this.rotateEl);

    // --- Эхлэлийн дэлгэц (бүтэн дэлгэц, хэвтээ байрлалыг хэрэглэгчийн товшилтоор асаана) ---
    this.startEl = el(
      'div',
      'tstart',
      t('ui.mongolian_nomad_simulator_grow'),
    );
    document.body.appendChild(this.startEl);

    // --- iPhone: суулгах заавар ---
    this.sheetEl = el(
      'div',
      'tsheet',
      t('ui.install_on_iphone_tap'),
    );
    document.body.appendChild(this.sheetEl);

    const onTap = (e: Event): void => {
      const b = (e.target as HTMLElement).closest('[data-t]') as HTMLElement | null;
      if (!b) return;
      e.preventDefault();
      switch (b.dataset.t) {
        case 'play':
          this.start();
          if (canLockLandscape) void landscapeFullscreen();
          break;
        case 'land':
          this.start();
          void landscapeFullscreen();
          break;
        case 'install':
          void this.install();
          break;
        case 'sheetClose':
          this.sheetEl.style.display = 'none';
          break;
      }
    };
    for (const box of [this.rotateEl, this.startEl, this.sheetEl]) box.addEventListener('click', onTap);
    pwa.onChange(() => this.refreshInstall());
    this.refreshInstall();
    if (opts.menuGate) this.start();
  }

  /** Хэрэглэгчийн товшилтоор (цэснээс) бүтэн дэлгэц + хэвтээ түгжих (Android) */
  enterLandscape(): void {
    if (canLockLandscape) void landscapeFullscreen();
  }

  private start(): void {
    this.started = true;
    this.startEl.style.display = 'none';
  }

  /** Суулгах товчийг боломжтой үед л харуулна */
  private refreshInstall(): void {
    const show = pwa.available;
    document.querySelectorAll<HTMLElement>('.install').forEach((b) => (b.style.display = show ? '' : 'none'));
    const note = this.startEl.querySelector<HTMLElement>('.install-note');
    if (note) note.style.display = show ? '' : 'none';
  }

  private async install(): Promise<void> {
    if (pwa.native) {
      await pwa.prompt();
      return;
    }
    if (isIOS) this.sheetEl.style.display = 'flex';
  }

  /** Товч дарахад (pointerdown — хурдан хариу үйлдэл) */
  private bind(b: HTMLElement, code: string, hold: boolean): void {
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      b.classList.add('on');
      if (hold) this.ctl.hold(code, true);
      else this.ctl.press(code);
    });
    const up = (): void => {
      b.classList.remove('on');
      if (hold) this.ctl.hold(code, false);
    };
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private async fullscreen(on: boolean): Promise<void> {
    try {
      if (on) {
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
        const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
        await o.lock?.('landscape').catch(() => undefined);
      } else await document.exitFullscreen();
    } catch {
      /* iPhone Safari бүтэн дэлгэц дэмждэггүй — «Нүүр дэлгэцэд нэмэх»-ээр бүтэн дэлгэц болно */
    }
  }

  /** Босоо байрлал эсвэл эхлэлийн дэлгэц — тоглоом зогсоно */
  get paused(): boolean {
    return !this.started || this.portrait;
  }

  get portrait(): boolean {
    return window.innerHeight > window.innerWidth * 1.05;
  }

  /** HUD-тай хамт 0.25 сек тутам: тухайн нөхцөлд хэрэгтэй товчнуудыг л харуулна */
  update(state: GameState, panelOpen: boolean): void {
    this.rotateEl.style.display = this.portrait && this.sheetEl.style.display !== 'flex' ? 'flex' : 'none';
    const p = state.player;
    const hideAll = panelOpen;
    const noJoy = hideAll || p.place === 'map' || !!state.move;
    this.joy.style.display = this.zone.style.display = noJoy ? 'none' : '';
    const kind = hideAll ? null : primaryAction(this.cfg, state);
    if (kind !== this.mainKind) {
      this.mainKind = kind;
      this.main.style.display = kind ? '' : 'none';
      if (kind) this.main.innerHTML = `<span>${MAIN_ICON[kind]}</span><small>${mainLabel(kind)}</small>`;
    }
    for (const b of this.acts) b.el.style.display = !hideAll && b.show(state) ? '' : 'none';
    for (const b of this.menu) b.el.style.display = !hideAll && b.show(state) ? '' : 'none';
    if (this.speedBtn) this.speedBtn.textContent = `${this.hooks.speeds[this.hooks.speedIdx()] ?? 1}×`;
    if (hideAll && this.joyId === null) this.ctl.stick = { x: 0, y: 0 };
  }
}
