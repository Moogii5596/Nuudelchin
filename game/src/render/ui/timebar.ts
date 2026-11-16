/**
 * Цагийн удирдлага (дэлгэцийн баруун дээд булан; утас, компьютер хоёуланд):
 *  - хурдны товч → 1× 2× 3× 4× жижиг цэс (одоогийн хурд тодорно, сонгоход хаагдана)
 *  - ⏭ алгасах → «Орой болтол» / «Маргааш өглөө» (input/skip.ts); алгасах үед дэлгэц бүдгэрч, төвд цаг гүйнэ, «Зогсоох» товчтой
 * Утасны ☰ цэс, бүтэн дэлгэцийн товч (input/touch.ts) энэ мөрөнд нэмэгдэнэ — popup()-ийг хамт ашиглана.
 */
import { t } from '../../i18n/i18n';
import type { SkipTarget } from '../../input/skip';

export const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, html = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.className = cls;
  e.innerHTML = html;
  return e;
};

export interface Popup {
  el: HTMLElement;
  close: () => void;
}

const pops: Popup[] = [];
let outsideBound = false;

/** Товчин дээр дарахад нээгдэх жижиг цэс. Нэг удаад нэг л нээлттэй; гадна дарахад хаагдана */
export function popup(anchor: HTMLElement, cls: string, onOpen?: () => void): Popup {
  const box = el('div', 'tpop ' + cls);
  const p: Popup = { el: box, close: () => { box.classList.remove('open'); anchor.classList.remove('on'); } };
  pops.push(p);
  anchor.addEventListener('click', (e) => {
    e.preventDefault();
    const open = !box.classList.contains('open');
    for (const q of pops) q.close();
    if (!open) return;
    onOpen?.();
    box.classList.add('open');
    anchor.classList.add('on');
  });
  if (!outsideBound) {
    outsideBound = true;
    document.addEventListener('pointerdown', (e) => {
      const tg = e.target as HTMLElement;
      if (!tg.closest('.tpop') && !tg.closest('.tmenu')) for (const q of pops) q.close();
    }, true);
  }
  document.body.appendChild(box);
  return p;
}

export function closePopups(): void {
  for (const q of pops) q.close();
}

export interface TimeBarHooks {
  speeds: number[];
  speedIdx: () => number;
  setSpeed: (idx: number) => void;
  /** Зорилтот цагийн бичвэр («19:00»); null = одоо боломжгүй (орой болсон) */
  skipTime: (target: SkipTarget) => string | null;
  startSkip: (target: SkipTarget) => void;
  stopSkip: () => void;
}

export class TimeBar {
  /** Товчнуудын мөр — утасны цэс энд товчоо нэмнэ */
  readonly box: HTMLElement;
  private speedBtn: HTMLButtonElement;
  private speedPop: Popup;
  private skipBtn: HTMLButtonElement;
  private fade: HTMLElement;
  private clock: HTMLElement;
  private label: HTMLElement;

  constructor(private hooks: TimeBarHooks) {
    this.box = el('div', 'tmenu');
    const mk = (html: string, title: string): HTMLButtonElement => {
      const b = el('button', 'tbtn sm', html);
      b.title = title;
      b.setAttribute('aria-label', title);
      this.box.appendChild(b);
      return b;
    };
    this.speedBtn = mk('1×', t('ui.speed'));
    this.skipBtn = mk('⏭', t('ui.skip'));
    document.body.appendChild(this.box);

    this.speedPop = popup(this.speedBtn, 'row', () => this.renderSpeeds());
    this.speedPop.el.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('[data-speed]') as HTMLElement | null;
      if (!b) return;
      this.hooks.setSpeed(Number(b.dataset.speed));
      this.speedPop.close();
      this.update();
    });

    const skipPop = popup(this.skipBtn, 'col', () => {
      const row = (target: SkipTarget, icon: string, key: string): string => {
        const at = this.hooks.skipTime(target);
        return `<button class="tbtn item" data-skip="${target}" ${at ? '' : 'disabled'}><span>${icon}</span>${t(key, { x: at ?? '—' })}</button>`;
      };
      skipPop.el.innerHTML = row('evening', '🌇', 'ui.skip_evening') + row('morning', '🌅', 'ui.skip_morning');
    });
    skipPop.el.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('[data-skip]') as HTMLButtonElement | null;
      if (!b || b.disabled) return;
      skipPop.close();
      this.hooks.startSkip(b.dataset.skip as SkipTarget);
    });

    // Алгасах үеийн бүдгэрүүлэлт: төвд цаг, «Зогсоох»
    this.fade = el('div', 'skipfade');
    const boxEl = el('div', 'skipbox');
    this.clock = el('div', 'skipclock');
    this.label = el('div', 'skiplbl');
    const stop = el('button', 'tbtn skipstop', t('ui.skip_stop'));
    stop.addEventListener('click', (e) => {
      e.preventDefault();
      this.hooks.stopSkip();
    });
    boxEl.append(this.clock, this.label, stop);
    this.fade.appendChild(boxEl);
    document.body.appendChild(this.fade);
    this.update();
  }

  private renderSpeeds(): void {
    const cur = this.hooks.speedIdx();
    this.speedPop.el.innerHTML = this.hooks.speeds.map((s, i) => `<button class="tbtn sm ${i === cur ? 'cur' : ''}" data-speed="${i}">${s}×</button>`).join('');
  }

  /** Хурдны товчны бичвэр (HUD-тай хамт шинэчлэгдэнэ); hidden — цонх нээлттэй үед мөрийг нууна */
  update(hidden = false): void {
    this.box.style.display = hidden ? 'none' : '';
    if (hidden) closePopups();
    this.speedBtn.textContent = `${this.hooks.speeds[this.hooks.speedIdx()] ?? 1}×`;
  }

  showSkip(at: string): void {
    closePopups();
    this.label.textContent = t('ui.skip_running', { x: at });
    this.fade.classList.add('open');
  }

  setSkipClock(text: string): void {
    if (this.clock.textContent !== text) this.clock.textContent = text;
  }

  hideSkip(): void {
    this.fade.classList.remove('open');
  }
}
