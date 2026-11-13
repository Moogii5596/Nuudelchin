import type { TimeConfig } from './config';

/** Тоглоомын цаг. Симуляцын нэг алхам = 1 тоглоомын минут. Шөнө байхгүй (mvp-spec.md §2). */
export interface TimeState {
  day: number;     // 1-ээс эхэлнэ
  minute: number;  // өдрийн минут: 06:00 = 360 … 20:00 = 1200
}

export type ClockEvent =
  | { type: 'hour'; hour: number }
  | { type: 'dayEnd'; day: number }
  | { type: 'monthEnd'; day: number }      // цалин (5 өдөр тутам)
  | { type: 'animalYear'; day: number };   // хийсвэр нас (20 өдөр тутам)

export function newTime(cfg: TimeConfig): TimeState {
  return { day: 1, minute: cfg.dayStartMinute };
}

/**
 * Нэг минут урагшлуулна. Өдрийн эцэст (20:00) өдрийн үйл явдлууд гарч,
 * шууд дараагийн өглөө (06:00) эхэлнэ.
 */
export function tick(t: TimeState, cfg: TimeConfig): ClockEvent[] {
  const events: ClockEvent[] = [];
  t.minute += 1;
  if (t.minute % 60 === 0 && t.minute < cfg.dayEndMinute) {
    events.push({ type: 'hour', hour: t.minute / 60 });
  }
  if (t.minute >= cfg.dayEndMinute) {
    events.push({ type: 'dayEnd', day: t.day });
    if (t.day % cfg.monthDays === 0) events.push({ type: 'monthEnd', day: t.day });
    if (t.day % cfg.animalYearDays === 0) events.push({ type: 'animalYear', day: t.day });
    t.day += 1;
    t.minute = cfg.dayStartMinute;
  }
  return events;
}

/** 1× хурдаар нэг тоглоомын минут хэдэн бодит секунд вэ */
export function realSecondsPerMinute(cfg: TimeConfig): number {
  return cfg.realSecondsPerGameHour / 60;
}

export function formatTime(t: TimeState): string {
  const h = Math.floor(t.minute / 60);
  const m = t.minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
