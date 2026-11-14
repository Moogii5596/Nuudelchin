import type { TimeConfig } from './config';

/**
 * Тоглоомын цаг. Симуляцын нэг алхам = 1 тоглоомын минут.
 * M4.5 (хэрэглэгчийн дүрэм 2026-11-14): шөнөтэй. Тоглоомын өдөр 06:00-аас дараагийн өглөөний 06:00 хүртэл.
 * minute нь 360 (06:00) … 1800 (дараа өдрийн 06:00) — 24-өөс давсан цаг нь шөнө дундаас хойших цаг.
 *
 * Үе:  day (06:00 – мал харих цаг) · evening (харих – 21:00, мал хотондоо ирнэ) · night (21:00 – 06:00, унтана)
 * 20:00 — өдрийн тайлан (dayEnd). Өдрийн дугаар өглөө 06:00-д нэмэгдэнэ (dayStart).
 */
export interface TimeState {
  day: number;     // 1-ээс эхэлнэ
  minute: number;  // 06:00 = 360 … 20:00 = 1200 … дараа өглөөний 06:00 = 1800
}

export type DayPhase = 'day' | 'evening' | 'night';

export type ClockEvent =
  | { type: 'hour'; hour: number }
  | { type: 'dayEnd'; day: number }        // 20:00 — өдрийн тайлан, өдрийн тооцоо
  | { type: 'nightStart'; day: number }    // 21:00 — хотондоо хүрээгүй мал хүрсэн газраа хоноглоно
  | { type: 'dayStart'; day: number }      // 06:00 — өглөө: сүү, ноос хоносон газарт үлдээд бэлчээрт гарна
  | { type: 'monthEnd'; day: number }      // цалин (5 өдөр тутам)
  | { type: 'animalYear'; day: number };   // хийсвэр нас (animalYearDays өдөр тутам)

export function newTime(cfg: TimeConfig): TimeState {
  return { day: 1, minute: cfg.dayStartMinute };
}

/** Мал хотондоо харьж эхлэх хамгийн эрт цаг (бүх төрлөөс) */
function earliestHome(cfg: TimeConfig): number {
  return Math.min(...Object.values(cfg.homeMinute));
}

export function phaseOf(t: TimeState, cfg: TimeConfig): DayPhase {
  if (t.minute >= cfg.sleepMinute) return 'night';
  if (t.minute >= earliestHome(cfg)) return 'evening';
  return 'day';
}

export function isNight(t: TimeState, cfg: TimeConfig): boolean {
  return t.minute >= cfg.sleepMinute;
}

/** Бэлчээрлэх өдрийн урт (минут): 06:00 → 20:00. Цангалт, өдрийн явцыг үүгээр тооцно */
export function activeDayMinutes(cfg: TimeConfig): number {
  return cfg.dayEndMinute - cfg.dayStartMinute;
}

/** Бүтэн өдөр (минут): 06:00 → дараа өглөөний 06:00 */
export function fullDayMinutes(cfg: TimeConfig): number {
  return cfg.nightEndMinute - cfg.dayStartMinute;
}

/** Нэг минут урагшлуулна */
export function tick(t: TimeState, cfg: TimeConfig): ClockEvent[] {
  const events: ClockEvent[] = [];
  t.minute += 1;
  if (t.minute % 60 === 0 && t.minute < cfg.nightEndMinute) {
    events.push({ type: 'hour', hour: (t.minute / 60) % 24 });
  }
  if (t.minute === cfg.dayEndMinute) {
    events.push({ type: 'dayEnd', day: t.day });
    if (t.day % cfg.monthDays === 0) events.push({ type: 'monthEnd', day: t.day });
    if (t.day % cfg.animalYearDays === 0) events.push({ type: 'animalYear', day: t.day });
  }
  if (t.minute === cfg.sleepMinute) events.push({ type: 'nightStart', day: t.day });
  if (t.minute >= cfg.nightEndMinute) {
    t.day += 1;
    t.minute = cfg.dayStartMinute;
    events.push({ type: 'dayStart', day: t.day });
  }
  return events;
}

/** 1× хурдаар нэг тоглоомын минут хэдэн бодит секунд вэ (шөнө хурдан өнгөрнө) */
export function realSecondsPerMinute(cfg: TimeConfig, minute?: number): number {
  if (minute !== undefined && minute >= cfg.sleepMinute) return cfg.nightRealSecondsPerGameHour / 60;
  return cfg.realSecondsPerGameHour / 60;
}

/** Нэг тоглоомын өдөр 1× хурдаар хэдэн бодит секунд */
export function realSecondsPerDay(cfg: TimeConfig): number {
  const night = cfg.nightEndMinute - cfg.sleepMinute;
  const day = cfg.sleepMinute - cfg.dayStartMinute;
  return (day * cfg.realSecondsPerGameHour + night * cfg.nightRealSecondsPerGameHour) / 60;
}

export function formatTime(t: TimeState): string {
  const h = Math.floor(t.minute / 60) % 24;
  const m = t.minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
