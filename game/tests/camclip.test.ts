import { describe, expect, it } from 'vitest';
import { CAM_MARGIN, clipThroughSolids, type CamSolids, type V3 } from '../src/render/camclip';

const solids = (over: Partial<CamSolids> = {}): CamSolids => ({ boxes: [], cyls: [], ...over });
const at = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

describe('camera — барилга, гэрийн мөргөлдөөн', () => {
  const house = { x: 0, z: 0, hw: 5, hd: 4, rot: 0, y0: -1, y1: 6 };

  it('чөлөөтэй зам: t = 1', () => {
    expect(clipThroughSolids([20, 1.6, 0], [30, 8, 0], solids({ boxes: [house] }))).toBe(1);
  });

  it('барилгын ард камер: хана руу орохгүй, зайтай зогсоно', () => {
    const a: V3 = [8, 1.6, 0], b: V3 = [-6, 2, 0];                  // малчин зүүн талд, камер барилгын цаана
    const t = clipThroughSolids(a, b, solids({ boxes: [house] }));
    expect(t).toBeLessThan(1);
    const p = at(a, b, t);
    expect(p[0]).toBeGreaterThanOrEqual(5 + CAM_MARGIN - 1e-6);      // x = 5 хананаас ≥ CAM_MARGIN
  });

  it('дээвэр дээгүүр: камер хангалттай өндөр бол хайрцгийг давна', () => {
    expect(clipThroughSolids([8, 1.6, 0], [-6, 40, 0], solids({ boxes: [house] }))).toBeGreaterThan(0.5);
    expect(clipThroughSolids([8, 1.6, 0], [-6, 40, 0], solids({ boxes: [house] }))).toBe(1);
  });

  it('хаалганы өмнө (хананд 2 м) зогсож байхад ард нь эргэвэл ханын өмнө зогсоно', () => {
    const door: V3 = [0, 1.6, 4 + 2];                                // нүүр z+ талд, хаалга хананаас 2 м
    const cam: V3 = [0, 3, 4 + 2 - 12];                              // камер барилга дотор тал руу (хана дундуур)
    const t = clipThroughSolids(door, cam, solids({ boxes: [house] }));
    const p = at(door, cam, t);
    expect(p[2]).toBeGreaterThanOrEqual(4 + CAM_MARGIN - 1e-6);
    expect(t).toBeGreaterThan(0);
  });

  it('малчин хананд ойр (зөөлөн зайн дотор) байхад хана руу чиглэсэн зам хананы өмнө тасална', () => {
    const near: V3 = [0, 1.6, 4 + 0.4];                              // зөөлөн зайд орсон
    const t = clipThroughSolids(near, [0, 1.6, -10], solids({ boxes: [house] }));
    const p = at(near, [0, 1.6, -10], t);
    expect(p[2]).toBeGreaterThanOrEqual(4 + 0.2 - 1e-6);
    // харин хананаас холдох чиглэл чөлөөтэй
    expect(clipThroughSolids(near, [0, 3, 14], solids({ boxes: [house] }))).toBe(1);
  });

  it('эргэсэн барилга (rot): ирмэг нь зөв тооцогдоно', () => {
    const rot = { ...house, rot: Math.PI / 2 };                      // 90°: хагас өргөн 4 (x), гүн 5 (z) болно
    const a: V3 = [8, 1.6, 0], b: V3 = [-6, 2, 0];
    const t = clipThroughSolids(a, b, solids({ boxes: [rot] }));
    const p = at(a, b, t);
    expect(p[0]).toBeGreaterThanOrEqual(4 + CAM_MARGIN - 1e-6);
    expect(p[0]).toBeLessThan(4 + CAM_MARGIN + 0.1);
  });

  it('гэр (цилиндр): ард нь эргэхэд гэрийн өмнө зогсоно', () => {
    const ger = { x: 0, z: 0, r: 2.6, y0: -1, y1: 3.4 };
    const a: V3 = [6, 1.6, 0], b: V3 = [-5, 2.5, 0];
    const t = clipThroughSolids(a, b, solids({ cyls: [ger] }));
    const p = at(a, b, t);
    expect(Math.hypot(p[0], p[2])).toBeGreaterThanOrEqual(2.6 + CAM_MARGIN - 1e-6);
    expect(clipThroughSolids(a, [20, 3, 5], solids({ cyls: [ger] }))).toBe(1);
  });

  it('хэд хэдэн саад: хамгийн ойрыг сонгоно', () => {
    const a: V3 = [30, 1.6, 0], b: V3 = [-30, 2, 0];
    const t = clipThroughSolids(a, b, solids({ boxes: [house, { ...house, x: 15 }] }));
    expect(at(a, b, t)[0]).toBeGreaterThan(15);
  });
});
