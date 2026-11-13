import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/sim/config';
import { dailyConditionDelta, liveWeightKg, salePrice, sheepUnits } from '../src/sim/systems/animals';

const cfg = loadConfig().animals;

describe('Амьдын жин ба үнэ (grazing-livestock.md §1–2)', () => {
  it('нас гүйцсэн эм хонь: туранхай 37.5 кг, бүдүүн тарган 57.5 кг', () => {
    expect(liveWeightKg({ species: 'sheep', sex: 'f', age: 5, condition: 0 }, cfg)).toBeCloseTo(37.5);
    expect(liveWeightKg({ species: 'sheep', sex: 'f', age: 5, condition: 1 }, cfg)).toBeCloseTo(57.5);
  });
  it('эр хонь ~65 кг ≈ 490 000₮ (бодит үнэ, mvp-spec.md §5.1)', () => {
    const p = salePrice({ species: 'sheep', sex: 'm', age: 5, condition: 0.625 }, cfg);
    expect(p).toBeGreaterThan(460000);
    expect(p).toBeLessThan(510000);
  });
  it('хурга хонины үнээс хямд, хөгшин хонь хямд', () => {
    const adult = salePrice({ species: 'sheep', sex: 'f', age: 5, condition: 0.6 }, cfg);
    const lamb = salePrice({ species: 'sheep', sex: 'f', age: 0, condition: 0.6 }, cfg);
    const old = salePrice({ species: 'sheep', sex: 'f', age: 9, condition: 0.6 }, cfg);
    expect(lamb).toBeLessThan(adult);
    expect(old).toBeLessThan(adult);
  });
  it('хонин толгой: үхэр 6, тугал 3', () => {
    expect(sheepUnits({ species: 'cow', age: 5 }, cfg)).toBe(6);
    expect(sheepUnits({ species: 'cow', age: 0 }, cfg)).toBe(3);
  });
  it('өдрийн тааз: бүтэн идэш + сайн өвс → +0.06-аас хэтрэхгүй; өлсвөл −0.135', () => {
    expect(dailyConditionDelta(1, 0.86, false, cfg)).toBeCloseTo(0.06);
    expect(dailyConditionDelta(0, 0.86, false, cfg)).toBeCloseTo(-0.135);
    expect(dailyConditionDelta(0.69, 0.45, false, cfg)).toBeLessThan(0);
  });
});
