import { describe, expect, it, vi } from 'vitest';
import { AudioBus } from '../src/audio/bus';
import { AudioWatcher, diffEvents, snapshot } from '../src/audio/watch';
import { cfg, newSim } from './helpers';

describe('Дууны bus (T-12)', () => {
  it('on / emit / off', () => {
    const bus = new AudioBus();
    const fn = vi.fn();
    const off = bus.on('sale', fn);
    expect(bus.hasListeners).toBe(true);
    bus.emit('sale', { amount: 5 });
    bus.emit('birth');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith({ amount: 5 });
    off();
    bus.emit('sale');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(bus.hasListeners).toBe(false);
  });

  it('нэг сонсогч унавал бусад нь ажиллана', () => {
    const bus = new AudioBus();
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ok = vi.fn();
    bus.on('dusk', () => { throw new Error('x'); });
    bus.on('dusk', ok);
    bus.emit('dusk');
    expect(ok).toHaveBeenCalled();
    err.mockRestore();
  });

  it('diffEvents: борлуулалт, төл, чоно, нохой, шөнө/өглөө', () => {
    const a = { income: 0, births: 0, day: 1, hunters: 0, barking: new Set<number>(), night: false };
    const b = { income: 500, births: 2, day: 1, hunters: 1, barking: new Set([3]), night: true };
    const ev = diffEvents(a, b).map((e) => e.event).sort();
    expect(ev).toEqual(['birth', 'dogBark', 'dusk', 'sale', 'wolfHowl']);
    expect(diffEvents(b, { ...b, night: false }).map((e) => e.event)).toEqual(['dawn']);
    // шинэ өдөр: тоолуур 0-ээс эхэлнэ
    expect(diffEvents({ ...b, day: 1 }, { ...b, day: 2, income: 0, births: 0 })).toEqual([]);
    expect(diffEvents(null, b)).toEqual([]);
  });

  it('AudioWatcher: сонсогчгүй үед юу ч гаргахгүй; sim-ээс dusk/dawn гарна', () => {
    const sim = newSim(2);
    const bus = new AudioBus();
    const w = new AudioWatcher(bus, cfg.time.sleepMinute, cfg.time.dayStartMinute);
    w.watch(sim.state);   // сонсогчгүй
    const seen: string[] = [];
    bus.on('dusk', () => seen.push('dusk'));
    bus.on('dawn', () => seen.push('dawn'));
    for (let i = 0; i < 1500; i++) { sim.step(); if (i % 5 === 0) w.watch(sim.state); }
    expect(seen).toContain('dusk');
    expect(seen).toContain('dawn');
    expect(snapshot(sim.state, cfg.time.sleepMinute, cfg.time.dayStartMinute).day).toBeGreaterThan(1);
  });
});
