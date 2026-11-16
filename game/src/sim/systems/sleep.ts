/**
 * Хамаатны айлд унтах (2026-11-16, хэрэглэгчийн шийдвэр). Тоглогч сумын төвд хамаатны хашааны үүдэнд
 * ойрхон, 18:00–03:00 хооронд «Унтах» → сонгосон сэрэх цаг хүртэл sim ердийн алхмаараа (Sim.step) гүйнэ:
 * сурга, туслах, нохой, чонын шөнийн эрсдэл хэвээр, тоглогч бууцанд байхгүй. Тоо — data/sleep.json.
 * Өдрийн тайлан 20:00-д ердийнхөөр гарна (унтахдаа 20:00-оос өмнө эхэлсэн бол сэрэхэд тайлан хүлээж байна).
 */
import type { GameConfig } from '../config';
import type { GameState } from '../state';
import type { Sim } from '../sim';
import { m, type Msg } from '../msg';
import { nearTownDoor, plotDoors } from './town';
import { toggleMount } from './herder';

/** Сэрэх цагийн сонголтууд (өдрийн цагийн минут: 240 = 04:00) */
export function wakeOptions(cfg: GameConfig): number[] {
  const Z = cfg.sleep, out: number[] = [];
  for (let w = Z.wakeMin; w <= Z.wakeMax; w += Z.wakeStep) out.push(w);
  return out;
}

/** Одоо унтаж болох цаг уу (18:00–03:00) */
export function sleepHours(cfg: GameConfig, state: GameState): boolean {
  const t = state.time.minute;
  return t >= cfg.sleep.startMinute && t <= cfg.sleep.endMinute;
}

/** Тоглогчийн ойрын хамаатны хашааны id (унтах газар), байхгүй бол null */
export function sleepPlace(cfg: GameConfig, state: GameState): string | null {
  const p = state.player;
  if (p.place !== 'sum' || p.driving || p.interior) return null;
  const d = nearTownDoor(cfg, state);
  return d && d.role === 'relative' && plotDoors(cfg).some((x) => x.id === d.id) ? d.id : null;
}

/** Сэрэх хүртэлх минут (wake < 06:00 бол тухайн шөнө, түүнээс хойш бол дараа өдрийн өглөө) */
export function minutesUntilWake(cfg: GameConfig, state: GameState, wake: number): number {
  const T = cfg.time, now = state.time.minute;
  const target = wake < T.dayStartMinute ? wake + 1440 : T.nightEndMinute + (wake - T.dayStartMinute);
  return target - now;
}

/** Унтах: алдаа байвал Msg, амжилттай бол null */
export function sleepUntil(sim: Sim, wake: number, proximity: boolean): Msg | null {
  const { cfg, state } = sim;
  const Z = cfg.sleep, p = state.player;
  if (state.move) return m('sim.you_are_moving_camp');
  const place = sleepPlace(cfg, state);
  if (proximity && !place) return m('sim.sleep_go_to_relatives');
  if (!sleepHours(cfg, state)) return m('sim.sleep_only_at_night');
  if (!Number.isInteger(wake) || wake < Z.wakeMin || wake > Z.wakeMax || (wake - Z.wakeMin) % Z.wakeStep !== 0) return m('sim.sleep_bad_wake');
  const door = place ? plotDoors(cfg).find((x) => x.id === place) : null;
  if (door) {   // хамаатны үүдэнд унтана, сэрэхдээ ч тэнд
    p.x = door.x;
    p.z = door.z;
  }
  if (p.mounted) toggleMount(cfg, state);   // морьтой бол буугаад (морь хажууд зогсоно)
  const n = minutesUntilWake(cfg, state, wake);
  for (let i = 0; i < n; i++) sim.step();
  return null;
}
