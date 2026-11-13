import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/sim/config';
import { newTime, tick, type ClockEvent } from '../src/sim/clock';

const cfg = loadConfig().time;

describe('Цаг (шөнөгүй)', () => {
  it('06:00-аас эхэлж, 20:00-д өдөр дуусаад шууд дараагийн өглөө болно', () => {
    const t = newTime(cfg);
    expect(t.minute).toBe(360);
    const events: ClockEvent[] = [];
    const minutesPerDay = cfg.dayEndMinute - cfg.dayStartMinute;
    for (let i = 0; i < minutesPerDay; i++) events.push(...tick(t, cfg));
    expect(t.day).toBe(2);
    expect(t.minute).toBe(360);
    expect(events.filter((e) => e.type === 'dayEnd')).toHaveLength(1);
    expect(events.filter((e) => e.type === 'hour')).toHaveLength(13); // 07:00 … 19:00
  });
  it('сар ба малын жил тохиргооны давтамжаар', () => {
    const t = newTime(cfg);
    const events: ClockEvent[] = [];
    const minutesPerDay = cfg.dayEndMinute - cfg.dayStartMinute;
    for (let i = 0; i < minutesPerDay * cfg.animalYearDays; i++) events.push(...tick(t, cfg));
    expect(events.filter((e) => e.type === 'monthEnd')).toHaveLength(Math.floor(cfg.animalYearDays / cfg.monthDays));
    expect(events.filter((e) => e.type === 'animalYear')).toHaveLength(1);
  });
});
