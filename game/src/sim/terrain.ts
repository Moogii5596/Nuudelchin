/**
 * Газрын өндөр (м). Three.js-гүй цэвэр функц тул sim, render хоёул ашиглана.
 * Прототип v1.2-ын heightAt-аас гаргаж, бууц бүрийн хэлбэрийг data/camps.json → terrain-д шилжүүлсэн.
 */
import type { CampConfig, WaterShape } from './config';

const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export const smoothstep = (a: number, b: number, x: number): number => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Голын төв шугамын z (долгионтой) */
export function riverZ(shape: WaterShape, x: number): number {
  if (shape.kind !== 'lineZ') return 0;
  let z = shape.z;
  for (const [amp, freq] of shape.waves ?? []) z += amp * Math.sin(x * freq);
  return z;
}

/** Ус хүртэлх хэвтээ зай (гол бол шугам хүртэл, булаг бол цэг хүртэл) */
export function waterDistance(shape: WaterShape, x: number, z: number): number {
  if (shape.kind === 'lineZ') return Math.abs(z - riverZ(shape, x));
  return Math.hypot(x - shape.x, z - shape.z);
}

/** Усгүй газрын өндөр (булаг/голын хонхоргүй) */
export function baseHeightAt(camp: CampConfig, x: number, z: number): number {
  const t = camp.terrain;
  const r = Math.hypot(x, z);
  const n = Math.sin(x * 0.045) * 1.2 + Math.cos(z * 0.038) * 1.0 + Math.sin((x + z) * 0.021) * 1.6 + Math.sin(x * 0.13 + z * 0.07) * 0.3;
  // Бууцны төв (r < 22) бараг тэгш, гадагшаа долгионтой
  let h = n * 0.22 + n * smoothstep(22, 48, r) * t.noiseAmp;

  const [rs, re, slope] = t.rim;
  let rim = smoothstep(rs, re, r) * (r - rs) * slope;
  if (t.open && r > 1) {
    const cos = (x * t.open.dirX + z * t.open.dirZ) / r;
    const ang = Math.acos(clamp(cos, -1, 1));
    const open = 1 - smoothstep(t.open.width * 0.55, t.open.width * 1.4, ang);
    rim *= 1 - 0.78 * open;
  }
  h += rim;

  if (t.tilt) {
    const along = x * t.tilt.dirX + z * t.tilt.dirZ;
    h += Math.max(0, along - t.tilt.start) * t.tilt.slope;
    if (t.tilt.start2 !== undefined && t.tilt.slope2 !== undefined) h += Math.max(0, along - t.tilt.start2) * t.tilt.slope2;
  }
  return h;
}

/** Газрын өндөр */
export function heightAt(camp: CampConfig, x: number, z: number): number {
  let h = baseHeightAt(camp, x, z);
  const t = camp.terrain;
  const w = camp.waterShape;
  if (w.kind === 'lineZ' && t.riverDepth) {
    const bank = t.riverBank ?? 8;
    const d = Math.abs(z - riverZ(w, x));
    if (d < bank) {
      const k = 1 - d / bank;
      h -= k * k * t.riverDepth;
    }
  } else if (w.kind === 'point' && t.pondDepth) {
    const R = w.r * 3;
    const d = Math.hypot(x - w.x, z - w.z);
    if (d < R) {
      const k = 1 - d / R;
      h -= k * k * t.pondDepth;
    }
  }
  return h;
}

/** Усны гадаргын өндөр (render-д) */
export function waterLevel(camp: CampConfig): number {
  const t = camp.terrain;
  const w = camp.waterShape;
  if (w.kind === 'lineZ') return -(t.riverDepth ?? 0) * 0.45;
  return baseHeightAt(camp, w.x, w.z) - (t.pondDepth ?? 0) * 0.45;
}

