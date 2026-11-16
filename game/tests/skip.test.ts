import { describe, expect, it } from 'vitest';
import { cfg, newSim } from './helpers';
import { SkipRun, skipGoal } from '../src/input/skip';

const K = cfg.time.skip;
/** Алгасалтыг дуустал гүйлгэнэ (дээд тал нь 2 өдөр) */
function run(skip: SkipRun): number {
  let n = 0;
  while (skip.step() && n < 3000) n++;
  skip.dispose();
  return n;
}

describe('Цаг алгасах (⏭)', () => {
  it('(а) тайван өдөр: орой 19:00 болтол алгасна, цаг үсрэхгүй — алхам бүр жинхэнээр тооцогдоно', () => {
    const sim = newSim(41);
    sim.command({ type: 'cheat', action: 'wolvesPeaceful' });
    const from = sim.state.time.minute;
    const skip = new SkipRun(sim, 'evening');
    const n = run(skip);
    expect(skip.stop).toBe('done');
    expect(sim.state.time.minute).toBe(K.eveningMinute);
    expect(n + 1).toBe(K.eveningMinute - from);
    expect(skipGoal(cfg, sim.state.time, 'evening')).toBeNull();   // орой болсон — дахин санал болгохгүй
  });

  it('(б) шөнө чоно ирэхэд зогсоно', () => {
    const sim = newSim(42);
    sim.command({ type: 'cheat', action: 'wolvesPeaceful' });
    const toNight = new SkipRun(sim, 'evening');
    run(toNight);
    while (sim.state.time.minute < cfg.time.sleepMinute + 60) sim.step();   // 22:00 — шөнө
    // Нэг хонь хотноос хол үлдсэн, чоно түүн рүү дайрна (cheat)
    const bait = sim.state.animals.find((a) => a.species === 'sheep')!;
    const den = sim.state.wolves.dens[0]!;
    bait.x = bait.tx = den.x + 6;
    bait.z = bait.tz = den.z;
    const skip = new SkipRun(sim, 'morning');
    expect(skip.stop).toBeNull();
    for (let i = 0; i < 20; i++) skip.step();
    sim.command({ type: 'cheat', action: 'wolfAttack' });
    run(skip);
    expect(skip.stop).toBe('wolf');
    expect(sim.state.time.minute).toBeGreaterThan(cfg.time.sleepMinute);   // өглөө болоогүй
  });

  it('(в) маргааш өглөө 07:00-д зогсоно, хотонд сүү үлдсэн байна', () => {
    const sim = newSim(43);
    sim.command({ type: 'cheat', action: 'wolvesPeaceful' });
    const day = sim.state.time.day;
    const skip = new SkipRun(sim, 'morning');
    run(skip);
    expect(skip.stop).toBe('done');
    expect(sim.state.time.day).toBe(day + 1);
    expect(sim.state.time.minute).toBe(K.morningMinute);
    expect(sim.state.items.some((it) => it.product === 'milk' && it.amount > 0)).toBe(true);
  });

  it('«Зогсоох» дарвал тэр дороо зогсоно', () => {
    const sim = newSim(44);
    const skip = new SkipRun(sim, 'morning');
    skip.step();
    skip.cancel();
    expect(skip.step()).toBe(false);
    expect(skip.stop).toBe('user');
    skip.dispose();
  });
});
