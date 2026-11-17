/**
 * Утасны удирдлага (мэдрэгч дэлгэц). Гарын товчны оронд дэлгэцэн дээрх товчнууд:
 *  - зүүн доод: джойстик — алхах/давхих (захад нь түлхвэл гүйнэ), жолоодох
 *  - баруун доод: үйлдлийн том товчнууд — Морь, Зураг, Уурга байнга; бусад нь нөхцөлөөр (түүх: ойр бүтээгдэхүүн байхад,
 *    үргээх: чоно ойртоход г.м.). Тухайн мөчид хамгийн хэрэгтэй товч томорч тодорно (.prime)
 *  - баруун дээд: хурд, ⏭ алгасах (render/ui/timebar.ts), бүтэн дэлгэц, ☰ цэс (агуулах, нүүх, туслах, нохой, бүс, тусламж); 🧺 ачаа бэлтгэх нь тэрэгний дэргэд үйлдлийн товчоор гарна
 * Товч бүр PlayerController.press(<товчны код>)-ийг дуудна — тоглоомын логик гартай яг адил.
 * Газар дээр дарах (тийш явах), чирэх (камер), хоёр хуруугаар чимхэх (томруулах) — render/camera.ts.
 */
import { t } from '../i18n/i18n';
import type { GameConfig } from '../sim/config';
import type { GameState } from '../sim/state';
import { driverSendTarget, type PlayerController } from './controller';
import { nearestVehicle } from '../sim/systems/travel';
import { huntingWolves } from '../sim/systems/wolves';
import { ridingHorse } from '../sim/systems/herder';
import { nearEnterDoor } from '../sim/systems/interior';
import { el, popup, type Popup, type TimeBar } from '../render/ui/timebar';
import { pwa, isIOS, inAppBrowser, canLockLandscape, landscapeFullscreen } from '../pwa';

interface Btn {
  el: HTMLElement;
  show: (s: GameState) => boolean;
  /** Одоо хамгийн хэрэгтэй үйлдэл үү: > 0 бол тэргүүлэх зэрэг (их нь түрүүлнэ) */
  prime?: (s: GameState) => number;
}

export class TouchUI {
  private joy: HTMLElement;
  private zone: HTMLElement;
  private knob: HTMLElement;
  private joyId: number | null = null;
  private acts: Btn[] = [];
  private menu: Btn[] = [];
  private menuPop: Popup;
  private startEl: HTMLElement;
  private rotateEl: HTMLElement;
  private started = false;
  private sheetEl: HTMLElement;

  /** opts.menuGate: «▶ Тоглох» хаалгыг эхлэлийн цэс (render/ui/menu.ts) орлоно — цэсний эхний товшилт нь хэвтээ/бүтэн дэлгэцийн зөвшөөрөл болно (M6.3) */
  constructor(private cfg: GameConfig, private ctl: PlayerController, private bar: TimeBar, opts: { menuGate?: boolean } = {}) {
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
    // --- Үйлдлийн товчнууд (нөхцөлөөс хамаарна) ---
    const camp = (s: GameState): boolean => s.player.place === 'camp' && !s.player.driving && !s.move && !s.player.interior;
    const actBox = el('div', 'acts');
    const addAct = (icon: string, label: string, code: string, show: (s: GameState) => boolean, prime?: (s: GameState) => number, hold = false): void => {
      const b = el('button', 'tbtn act', `<span>${icon}</span><small>${label}</small>`);
      this.bind(b, code, hold);
      actBox.appendChild(b);
      this.acts.push({ el: b, show, prime });
    };
    const dist = (a: { x: number; z: number }, b: { x: number; z: number }): number => Math.hypot(a.x - b.x, a.z - b.z);
    const nearV = (s: GameState): boolean => !!nearestVehicle(this.cfg, s, this.cfg.vehicles.road.enterRange);
    // Чоно ойртсон: мал хөөж байгаа, эсвэл үргээх зайд (Q хүрэх зай) чоно байна
    const wolfNear = (s: GameState): boolean => {
      const r = this.cfg.wolves.scareRadius[s.player.mounted ? 'mounted' : 'onFoot'];
      return huntingWolves(s).length > 0 || s.wolves.list.some((w) => w.mode !== 'flee' && dist(w, s.player) <= r);
    };
    // Түүх/хийх: ойр бүтээгдэхүүн байна, эсвэл гартаа ачаатай агуулахын дэргэд
    const canPick = (s: GameState): boolean => {
      const p = s.player, home = this.cfg.camps.home;
      return s.items.some((it) => dist(it, p) <= this.cfg.products.pickupRadius * 1.6) || (p.carry.length > 0 && dist(p, home) <= home.storageRadius);
    };
    // Тэрэг/машины дэргэд: эхлээд 🧺 ачаа бэлтгэх; ачаатай (жолоочтой) болмогц 📦 сум руу явуулах гарна
    const campVehicle = (s: GameState) => {
      const f = camp(s) && !s.player.mounted ? nearestVehicle(this.cfg, s, this.cfg.vehicles.road.enterRange) : null;
      return f && f.place === 'camp' ? f : null;
    };
    const loaded = (s: GameState): boolean => Object.keys(campVehicle(s)?.cargo ?? {}).length > 0;
    const canSend = (s: GameState): boolean => camp(s) && !!driverSendTarget(this.cfg, s) && loaded(s);
    const herdNear = (s: GameState): boolean => {
      const r = s.player.mounted ? this.cfg.player.shout.radiusMounted : this.cfg.player.shout.radius;
      return s.animals.some((a) => !a.riding && dist(a, s.player) <= r);
    };
    const horseFar = (s: GameState): boolean => {
      const h = ridingHorse(s);
      return !!h && dist(h, s.player) > this.cfg.player.mountRange;
    };
    addAct('🐺', t('ui.scare'), 'KeyQ', (s) => camp(s) && wolfNear(s), () => 5);
    addAct('✋', t('ui.pick_up'), 'KeyE', (s) => camp(s) && !canSend(s) && canPick(s), () => 4);
    addAct('📦', t('ui.send_act'), 'KeyE', canSend, () => 4);
    // Гэр/майхны гадаа (агуулахын ойр): 🥣 боловсруулах — агуулах, боловсруулалтын цонх (B)
    const atHome = (s: GameState): boolean => camp(s) && dist(s.player, this.cfg.camps.home) <= this.cfg.camps.home.storageRadius * 2;
    addAct('🥣', t('ui.process_act'), 'KeyB', atHome, () => 1);
    addAct('🧺', t('ui.load_act'), 'KeyT', (s) => !!campVehicle(s), (s) => (loaded(s) ? 0 : 3));
    addAct('🚪', t('ui.enter_act'), 'KeyE', (s) => camp(s) && !canSend(s) && !canPick(s) && !s.player.mounted && !!nearEnterDoor(this.cfg, s), () => 3);
    addAct('🏪', t('ui.trade'), 'KeyE', (s) => s.player.place === 'sum' && !s.player.driving && !s.player.interior, () => 3);
    addAct('🚪', t('ui.leave_act'), 'KeyE', (s) => !!s.player.interior, () => 3);   // V6.1: дотор E — гарах эсвэл лангуунд цонх нээх
    addAct('📣', t('ui.shout'), 'Space', (s) => camp(s) && herdNear(s));
    addAct('🐴', t('ui.call'), 'KeyH', (s) => camp(s) && !s.player.mounted && horseFar(s));
    addAct('🚚', t('ui.cart'), 'KeyV', (s) => s.player.place !== 'map' && !s.move && (!!s.player.driving || (!s.player.mounted && nearV(s))), (s) => (s.player.driving ? 0 : 2));
    addAct('🪵', t('ui.switch'), 'KeyU', camp);
    addAct('🐎', t('ui.horse'), 'KeyF', (s) => (s.player.place === 'camp' || s.player.place === 'sum') && !s.player.driving && !s.move && !s.player.interior);
    addAct('🗺', t('ui.map'), 'Tab', (s) => s.player.place !== 'map' && !s.move);
    addAct('⏩', t('ui.gallop'), 'ShiftLeft', (s) => s.player.place === 'map' && !s.move, undefined, true);
    document.body.appendChild(actBox);

    // --- Баруун дээд: хурд, ⏭ (TimeBar) + бүтэн дэлгэц + ☰ цэс ---
    const top = (icon: string, title: string): HTMLButtonElement => {
      const b = el('button', 'tbtn sm', icon);
      b.title = title;
      b.setAttribute('aria-label', title);
      this.bar.box.appendChild(b);
      return b;
    };
    if (document.fullscreenEnabled) {
      top('⛶', t('ui.fullscreen')).addEventListener('click', (e) => {
        e.preventDefault();
        void this.fullscreen(!document.fullscreenElement);
      });
    }
    this.menuPop = popup(top('☰', t('ui.menu')), 'grid');
    const addMenu = (icon: string, label: string, code: string, show: (s: GameState) => boolean = () => true): void => {
      const b = el('button', 'tbtn item', `<span>${icon}</span>${label}`);
      b.addEventListener('click', (e) => {
        e.preventDefault();
        this.menuPop.close();
        this.ctl.press(code);
      });
      this.menuPop.el.appendChild(b);
      this.menu.push({ el: b, show });
    };
    const atCamp = (s: GameState): boolean => s.player.place === 'camp' && !s.move;
    addMenu('📦', t('ui.storage'), 'KeyB', atCamp);
    addMenu('🏕', t('ui.move_camp'), 'KeyM', atCamp);
    addMenu('👥', t('ui.helpers_319'), 'KeyJ');
    addMenu('🐕', t('ui.dogs'), 'KeyK', (s) => s.dogs.length > 0);
    addMenu('🛡', t('ui.zones'), 'KeyZ', atCamp);
    addMenu('❓', t('ui.help'), 'F1');

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

  /** HUD-тай хамт 0.25 сек тутам: тухайн нөхцөлд хэрэгтэй товчнуудыг л харуулж, хамгийн хэрэгтэйг нь тодруулна */
  update(state: GameState, panelOpen: boolean): void {
    this.rotateEl.style.display = this.portrait && this.sheetEl.style.display !== 'flex' ? 'flex' : 'none';
    const p = state.player;
    const hideAll = panelOpen;
    this.joy.style.display = this.zone.style.display = hideAll || p.place === 'map' || state.move ? 'none' : '';
    let best: Btn | null = null, bestK = 0;
    for (const b of this.acts) {
      const on = !hideAll && b.show(state);
      b.el.style.display = on ? '' : 'none';
      const k = on && b.prime ? b.prime(state) : 0;
      if (k > bestK) { best = b; bestK = k; }
    }
    for (const b of this.acts) b.el.classList.toggle('prime', b === best);
    for (const b of this.menu) b.el.style.display = b.show(state) ? '' : 'none';
    if (hideAll && this.joyId === null) this.ctl.stick = { x: 0, y: 0 };
  }
}
