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
  it('сумын төвийн байршлын алдааг барина (V3.3, data/sumcenter.json)', () => {
    const cfg = structuredClone(loadConfig());
    expect(validateConfig(cfg).filter((e) => e.includes('sum'))).toEqual([]);
    const tea = cfg.sumcenter.buildings.find((b) => b.gameRole === 'teahouse')!;
    tea.gameRole = 'baihgui';
    cfg.sumcenter.buildings[0]!.id = cfg.sumcenter.buildings[1]!.id;
    cfg.worldmap.sum3d.radius = 900;
    const errors = validateConfig(cfg);
    expect(errors.some((e) => e.includes('gameRole "baihgui"'))).toBe(true);
    expect(errors.some((e) => e.includes('Цайны газар'))).toBe(true);
    expect(errors.some((e) => e.includes('давхардсан'))).toBe(true);
    expect(errors.some((e) => e.includes('terrain.size'))).toBe(true);
  });
});
