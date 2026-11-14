import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/sim/config';
import { formatTime, newTime, phaseOf, realSecondsPerDay, realSecondsPerMinute, tick, type ClockEvent } from '../src/sim/clock';

const cfg = loadConfig().time;
const FULL = cfg.nightEndMinute - cfg.dayStartMinute;

describe('Цаг (шөнөтэй, M4.5)', () => {
  it('06:00 → 20:00 тайлан → 21:00 шөнө → дараа өглөөний 06:00', () => {
    const t = newTime(cfg);
    expect(t.minute).toBe(360);
    const events: ClockEvent[] = [];
    for (let i = 0; i < FULL; i++) events.push(...tick(t, cfg));
    expect(FULL).toBe(1440);
    expect(t.day).toBe(2);
    expect(t.minute).toBe(360);
    expect(events.filter((e) => e.type === 'dayEnd')).toHaveLength(1);
    expect(events.filter((e) => e.type === 'nightStart')).toHaveLength(1);
    expect(events.filter((e) => e.type === 'dayStart')).toEqual([{ type: 'dayStart', day: 2 }]);
    expect(events.filter((e) => e.type === 'hour')).toHaveLength(23); // 07:00 … 05:00
    // Тайлан нь шөнөөс өмнө
    const iEnd = events.findIndex((e) => e.type === 'dayEnd');
    const iNight = events.findIndex((e) => e.type === 'nightStart');
    expect(iEnd).toBeLessThan(iNight);
  });
  it('үе ба цагийн бичиглэл', () => {
    const t = newTime(cfg);
    expect(phaseOf(t, cfg)).toBe('day');
    t.minute = Math.min(...Object.values(cfg.homeMinute));
    expect(phaseOf(t, cfg)).toBe('evening');
    t.minute = cfg.sleepMinute;
    expect(phaseOf(t, cfg)).toBe('night');
    t.minute = 25 * 60 + 30;
    expect(formatTime(t)).toBe('01:30');
  });
  it('шөнө хурдан өнгөрнө', () => {
    expect(realSecondsPerMinute(cfg, cfg.sleepMinute + 10)).toBeLessThan(realSecondsPerMinute(cfg, 600));
    expect(realSecondsPerDay(cfg)).toBeGreaterThan(((cfg.sleepMinute - cfg.dayStartMinute) * cfg.realSecondsPerGameHour) / 60);
  });
  it('сар ба малын жил тохиргооны давтамжаар', () => {
    const t = newTime(cfg);
    const events: ClockEvent[] = [];
    for (let i = 0; i < FULL * cfg.animalYearDays; i++) events.push(...tick(t, cfg));
    expect(events.filter((e) => e.type === 'monthEnd')).toHaveLength(Math.floor(cfg.animalYearDays / cfg.monthDays));
    expect(events.filter((e) => e.type === 'animalYear')).toHaveLength(1);
  });
});
