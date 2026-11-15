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
  it('сумын кампусын барилга давхцах, хашаанаас гарахыг барина (V3.1)', () => {
    const cfg = structuredClone(loadConfig());
    expect(validateConfig(cfg).filter((e) => e.includes('sum3d'))).toEqual([]);
    const [school, kinder] = cfg.worldmap.sum3d.campus.buildings;
    kinder!.x = school!.x + 1;
    cfg.worldmap.sum3d.campus.field.x = 100;
    cfg.worldmap.sum3d.bank.u = cfg.worldmap.sum3d.campus.u;
    const errors = validateConfig(cfg);
    expect(errors.some((e) => e.includes('school ба kindergarten давхцсан'))).toBe(true);
    expect(errors.some((e) => e.includes('campus.field: хашаанаас гарсан'))).toBe(true);
    expect(errors.some((e) => e.includes('sum3d.bank'))).toBe(true);
  });
});
