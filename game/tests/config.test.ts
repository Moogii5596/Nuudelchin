import { describe, expect, it } from 'vitest';
import { loadConfig, validateConfig } from '../src/sim/config';

describe('Тохиргоо (data/*.json)', () => {
  it('алдаагүй ачаалагдана', () => {
    expect(() => loadConfig()).not.toThrow();
  });
  it('алдаатай утгыг барина', () => {
    const cfg = structuredClone(loadConfig());
    cfg.start.camp = 'baihgui';
    cfg.pasture.types.steppe!.mix = { ulalj: 0.5 };
    const errors = validateConfig(cfg);
    expect(errors.some((e) => e.includes('start.camp'))).toBe(true);
    expect(errors.some((e) => e.includes('pasture.types.steppe'))).toBe(true);
  });
});
