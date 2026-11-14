/**
 * Утасны удирдлага (мэдрэгч дэлгэц). Гарын товчны оронд дэлгэцэн дээрх товчнууд:
 *  - зүүн доод: джойстик — алхах/давхих (захад нь түлхвэл гүйнэ), жолоодох
 *  - баруун доод: үйлдлийн том товчнууд (Хөөе, чоно үргээх, түүх, морь, уурга, тэрэг, газрын зураг)
 *  - баруун дээд: цэс (агуулах, ачаа, нүүх, туслах, нохой, бүс, хурд, тусламж, бүтэн дэлгэц)
 * Товч бүр PlayerController.press(<товчны код>)-ийг дуудна — тоглоомын логик гартай яг адил.
 * Газар дээр дарах (тийш явах), чирэх (камер), хоёр хуруугаар чимхэх (томруулах) — render/camera.ts.
 */
import type { GameConfig } from '../sim/config';
import type { GameState } from '../sim/state';
import type { PlayerController } from './controller';
import { nearestVehicle } from '../sim/systems/travel';

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
  private knob: HTMLElement;
  private joyId: number | null = null;
  private acts: Btn[] = [];
  private menu: Btn[] = [];
  private speedBtn: HTMLElement | null = null;
  private startEl: HTMLElement;
  private rotateEl: HTMLElement;
  private started = false;

  constructor(private cfg: GameConfig, private ctl: PlayerController, private hooks: TouchHooks) {
    document.body.classList.add('touch');

    // --- Джойстик ---
    this.joy = el('div', 'joy');
    this.knob = el('div', 'knob');
    this.joy.appendChild(this.knob);
    const move = (e: PointerEvent): void => {
      const r = this.joy.getBoundingClientRect();
      const R = r.width / 2;
      let dx = (e.clientX - (r.left + R)) / R;
      let dy = (e.clientY - (r.top + R)) / R;
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
    };
    this.joy.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.joy.setPointerCapture(e.pointerId);
      this.joyId = e.pointerId;
      move(e);
    });
    this.joy.addEventListener('pointermove', (e) => {
      if (e.pointerId === this.joyId) move(e);
    });
    this.joy.addEventListener('pointerup', release);
    this.joy.addEventListener('pointercancel', release);
    document.body.appendChild(this.joy);

    // --- Үйлдлийн товчнууд ---
    const camp = (s: GameState): boolean => s.player.place === 'camp' && !s.player.driving && !s.move;
    const actBox = el('div', 'acts');
    const addAct = (icon: string, label: string, code: string, show: (s: GameState) => boolean, hold = false): void => {
      const b = el('button', 'tbtn act', `<span>${icon}</span><small>${label}</small>`);
      this.bind(b, code, hold);
      actBox.appendChild(b);
      this.acts.push({ el: b, show });
    };
    const nearV = (s: GameState): boolean => !!nearestVehicle(this.cfg, s, this.cfg.vehicles.road.enterRange);
    addAct('📣', 'Хөөе', 'Space', camp);
    addAct('🐺', 'Үргээх', 'KeyQ', camp);
    addAct('✋', 'Түүх', 'KeyE', camp);
    addAct('🏪', 'Худалдаа', 'KeyE', (s) => s.player.place === 'sum' && !s.player.driving);
    addAct('🪵', 'Уурга', 'KeyU', camp);
    addAct('🐎', 'Морь', 'KeyF', (s) => (s.player.place === 'camp' || s.player.place === 'sum') && !s.player.driving && !s.move);
    addAct('🐴', 'Дуудах', 'KeyH', (s) => camp(s) && !s.player.mounted);
    addAct('🚚', 'Тэрэг', 'KeyV', (s) => s.player.place !== 'map' && !s.move && (!!s.player.driving || (!s.player.mounted && nearV(s))));
    addAct('🗺', 'Зураг', 'Tab', (s) => s.player.place !== 'map' && !s.move);
    addAct('⏩', 'Хурдлах', 'ShiftLeft', (s) => s.player.place === 'map' && !s.move, true);
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
    addMenu('📦', 'Агуулах', () => this.ctl.press('KeyB'), atCamp);
    addMenu('🧺', 'Ачаа бэлтгэх', () => this.ctl.press('KeyT'), atCamp);
    addMenu('🏕', 'Бууц сэлгэх', () => this.ctl.press('KeyM'), atCamp);
    addMenu('👥', 'Туслахууд', () => this.ctl.press('KeyJ'));
    addMenu('🐕', 'Нохой', () => this.ctl.press('KeyK'), (s) => s.dogs.length > 0);
    addMenu('🛡', 'Хамгаалалтын бүс', () => this.ctl.press('KeyZ'), atCamp);
    this.speedBtn = addMenu('1×', 'Хурд', () => {
      const n = (this.hooks.speedIdx() + 1) % this.hooks.speeds.length;
      this.ctl.press('Digit' + (n + 1));
    });
    addMenu('❓', 'Тусламж', () => this.ctl.press('F1'));
    if (document.fullscreenEnabled) addMenu('⛶', 'Бүтэн дэлгэц', () => void this.fullscreen(!document.fullscreenElement));
    document.body.appendChild(menuBox);

    // --- Утсаа хэвтээ эргүүл ---
    this.rotateEl = el('div', 'rotate', '<div><div style="font-size:54px">📱↻</div>Утсаа хэвтээ эргүүлнэ үү</div>');
    document.body.appendChild(this.rotateEl);

    // --- Эхлэлийн дэлгэц (бүтэн дэлгэц, хэвтээ байрлалыг хэрэглэгчийн товшилтоор асаана) ---
    this.startEl = el(
      'div',
      'tstart',
      `<div class="tstart-box">
        <h1>Нүүдэлчин</h1>
        <p>Малаа өсгөж, бууцаа сэлгэж, чоноос хамгаалж, сумын төвд бүтээгдэхүүнээ зар.</p>
        <ul>
          <li>🕹 Зүүн доод джойстик — алхах, захад нь түлхвэл гүйнэ</li>
          <li>👆 Газар дээр дарах — тийш явах, хоёр удаа дарвал гүйнэ</li>
          <li>☝️ Чирэх — камер эргүүлэх · ✌️ чимхэх — ойртуулах</li>
          <li>📣 Хөөе — мал бөөгнөрч танаас холдоно · 🐺 чоно үргээх</li>
          <li>❓ — бүх тайлбар</li>
        </ul>
        <button class="btn gold big">▶ Тоглох</button>
      </div>`,
    );
    this.startEl.querySelector('button')!.addEventListener('click', () => {
      this.started = true;
      this.startEl.style.display = 'none';
      if (document.fullscreenEnabled) void this.fullscreen(true);
    });
    document.body.appendChild(this.startEl);
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
    this.rotateEl.style.display = this.portrait ? 'flex' : 'none';
    const p = state.player;
    const hideAll = panelOpen;
    this.joy.style.display = hideAll || p.place === 'map' || state.move ? 'none' : '';
    for (const b of this.acts) b.el.style.display = !hideAll && b.show(state) ? '' : 'none';
    for (const b of this.menu) b.el.style.display = !hideAll && b.show(state) ? '' : 'none';
    if (this.speedBtn) this.speedBtn.textContent = `${this.hooks.speeds[this.hooks.speedIdx()] ?? 1}×`;
    if (hideAll && this.joyId === null) this.ctl.stick = { x: 0, y: 0 };
  }
}
