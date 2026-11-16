/**
 * «Хамаатны айлд унтах» хэсэг (2026-11-16): сэрэх цаг сонгох + «Унтах». Хамаатны цонхонд (panels.ts, townHtml) шигтгэгдэнэ.
 * Дүрэм, тоо — sim/systems/sleep.ts, data/sleep.json.
 */
import type { GameConfig } from '../../sim/config';
import type { GameState } from '../../sim/state';
import type { Command, CommandResult } from '../../sim/commands';
import type { Msg } from '../../sim/msg';
import { sleepHours, sleepPlace, wakeOptions } from '../../sim/systems/sleep';
import { t } from '../../i18n/i18n';

export interface SleepCtx {
  dispatch: (cmd: Command) => CommandResult;
  toast: (msg: string | Msg, kind?: '' | 'good' | 'bad') => void;
  close: () => void;
  rerender: () => void;
}

const hhmm = (min: number): string => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export class SleepPanel {
  private wake: number;

  constructor(private cfg: GameConfig, private state: GameState) {
    this.wake = cfg.sleep.wakeDefault;
  }

  /** Хамаатны цонхны доод хэсэг */
  html(): string {
    if (!sleepPlace(this.cfg, this.state)) return '';   // зөвхөн хамаатны хашааны үүдэнд (дэлгүүрийн хамаатан биш)
    if (!sleepHours(this.cfg, this.state)) return `<p class="muted">${t('sleep.closed')}</p>`;
    const btns = wakeOptions(this.cfg).map((w) => `<button class="btn sm ${w === this.wake ? 'gold' : ''}" data-act="sleepWake:${w}">${hhmm(w)}</button>`).join(' ');
    return `<h3>${t('sleep.title')}</h3><p class="muted">${t('sleep.hint')}</p><p>${t('sleep.wake')}: ${btns}</p><p><button class="btn gold" data-act="sleep:${this.wake}">${t('sleep.go', { x: hhmm(this.wake) })}</button></p>`;
  }

  /** `sleepWake:<цаг>` / `sleep:<цаг>` үйлдлийг боловсруулна; өөр үйлдэл бол false */
  act(cmd: string, arg: string, ctx: SleepCtx): boolean {
    if (cmd === 'sleepWake') {
      this.wake = Number(arg);
      ctx.rerender();
      return true;
    }
    if (cmd !== 'sleep') return false;
    ctx.close();   // тайлан (20:00) унтах хооронд гарвал цонх нээгдэнэ, сэрсний дараа харагдана
    const r = ctx.dispatch({ type: 'sleep', wake: Number(arg) });
    ctx.toast(r.msg ?? '', r.ok ? 'good' : 'bad');
    return true;
  }
}
