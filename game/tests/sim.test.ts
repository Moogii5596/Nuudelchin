import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/sim/config';
import { createInitialState } from '../src/sim/state';
import { Sim, type DayReport } from '../src/sim/sim';

describe('Sim (3D-гүй)', () => {
  it('эхлэлийн төлөв mvp-spec.md §3-тай таарна', () => {
    const cfg = loadConfig();
    const s = createInitialState(cfg, 1);
    expect(s.money).toBe(cfg.economy.startMoney);
    expect(s.animals.filter((a) => a.species === 'sheep')).toHaveLength(10);
    expect(s.animals.filter((a) => a.species === 'cow')).toHaveLength(2);
  });
  it('30 өдрийг хурдан гүйлгэж, өдөр бүр тайлан гаргана', () => {
    const cfg = loadConfig();
    const sim = new Sim(cfg, createInitialState(cfg, 1));
    const reports: DayReport[] = [];
    sim.on((e) => { if (e.type === 'dayReport') reports.push(e.report); });
    const t0 = performance.now();
    sim.runDays(30);
    expect(performance.now() - t0).toBeLessThan(2000);
    expect(reports).toHaveLength(30);
    expect(sim.state.time.day).toBe(31);
  });
  it('нэг seed → ижил үр дүн', () => {
    const cfg = loadConfig();
    const a = new Sim(cfg, createInitialState(cfg, 99));
    const b = new Sim(cfg, createInitialState(cfg, 99));
    a.runDays(5); b.runDays(5);
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
  });
});
