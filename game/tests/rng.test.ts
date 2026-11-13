import { describe, expect, it } from 'vitest';
import { Rng } from '../src/sim/rng';

describe('Rng', () => {
  it('нэг seed → яг ижил дараалал', () => {
    const a = new Rng(42), b = new Rng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });
  it('төлөвөөс сэргээхэд үргэлжилнэ', () => {
    const a = new Rng(7);
    a.next(); a.next();
    const b = Rng.fromState(a.state);
    expect(b.next()).toBe(a.next());
  });
  it('утга [0,1) хооронд, дундаж ~0.5', () => {
    const r = new Rng(1);
    let sum = 0;
    for (let i = 0; i < 10000; i++) {
      const v = r.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      sum += v;
    }
    expect(sum / 10000).toBeCloseTo(0.5, 1);
  });
});
