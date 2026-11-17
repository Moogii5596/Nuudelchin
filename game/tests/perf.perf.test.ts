/**
 * Гүйцэтгэлийн (хугацаа хэмждэг) тестүүд — ердийн `npm test`-д ОРОХГҮЙ (vite.config.ts exclude), `npm run test:perf` -аар л ажиллана.
 * Шалтгаан: хугацаа хэмждэг тест зэрэгцээ агентуудын / worker-уудын CPU ачаалалд унадаг (lessons_learned.md).
 * Ажиллуулахдаа машин чөлөөтэй (өөр агент, vite, хөтөч ажиллахгүй) үед, нэг агент ажиллаж байхад.
 */
import { describe, expect, it } from 'vitest';
import { newSim } from './helpers';
import { Sim } from '../src/sim/sim';
import { createInitialState } from '../src/sim/state';
import { loadConfig } from '../src/sim/config';

/** Процессорын ачаалалд хамт удааширдаг жишиг ажил (300 мал × 840 алхамтай ижил хэмжээний тоон гогцоо). Ачаалалгүй машинд ≈ REF_MS */
const REF_MS = 17;
function referenceLoop(): number {
  const t0 = performance.now();
  const xs = new Float64Array(300), zs = new Float64Array(300);
  let acc = 0;
  for (let s = 0; s < 840; s++) for (let i = 0; i < 300; i++) {
    xs[i] = xs[i]! + Math.cos(i + s) * 0.1;
    zs[i] = zs[i]! + Math.sin(i * s) * 0.1;
    acc += Math.hypot(xs[i]!, zs[i]!) + Math.atan2(zs[i]!, xs[i]! + 1);
  }
  if (acc === 12345.678) throw new Error('unreachable');
  return performance.now() - t0;
}

describe('Гүйцэтгэл (M2)', () => {
  // 4× хурдаар секундэд 24 алхам. 1 өдөр = 840 алхам < 300 мс бол нэг кадрт < 1 мс sim зарцуулна (60 FPS-д хангалттай).
  // Бүтэн vitest-д бусад worker-ууд CPU-г эзэлдэг тул хугацаа 3–30× хэлбэлздэг (S1, S3-д 2 удаа унасан). Тиймээс өдөр бүрийг жишиг гогцоотой
  // зэрэгцүүлж ХУГАЦААГ ЖИШИГ=REF_MS болгож нормчилно (ачаалал хоёуланг ижил удаашруулна), 9 хэмжилтийн минимумыг авна. Зорилт < 300 мс хэвээр.
  it('300 малтай 1 өдөр 3D-гүйгээр < 300 мс (ачаалалд нормчилсон)', () => {
    const sim = newSim(14);
    sim.command({ type: 'debugAddAnimals', n: 300 - sim.state.animals.length });
    expect(sim.state.animals.length).toBe(300);
    sim.runDays(1); // халаалт (JIT)
    referenceLoop();
    const norm: number[] = [];
    for (let i = 0; i < 9; i++) {
      const ref = referenceLoop();
      const t0 = performance.now();
      sim.runDays(1);
      norm.push(((performance.now() - t0) * REF_MS) / ref);
    }
    const best = Math.min(...norm);
    expect(best, `нормчилсон мс: ${norm.map((x) => x.toFixed(0)).join(", ")}`).toBeLessThan(300);
  });
});

describe('Гүйцэтгэл (T-13) — 1000 мал', () => {
  // Зорилт < 50 мс/өдөр (BOARD T-13) хараахан биш: одоо ~300–350 мс (wolves, detectStuck, decide үлдсэн). Босго нь буцалтаас хамгаална (өмнө ~600 мс).
  it('1000 малтай 1 өдөр < 500 мс (ачаалалд нормчилсон)', () => {
    const sim = newSim(14);
    sim.command({ type: 'debugAddAnimals', n: 1000 - sim.state.animals.length });
    sim.runDays(1);
    referenceLoop();
    const norm: number[] = [];
    for (let i = 0; i < 5; i++) {
      const ref = referenceLoop();
      const t0 = performance.now();
      sim.runDays(1);
      norm.push(((performance.now() - t0) * REF_MS) / ref);
    }
    expect(Math.min(...norm), `нормчилсон мс: ${norm.map((x) => x.toFixed(0)).join(', ')}`).toBeLessThan(500);
  });
});

describe('Гүйцэтгэл (M2) — 30 өдөр', () => {
  it('30 өдрийг хурдан гүйлгэнэ (< 5 сек)', () => {
    const c = loadConfig();
    const s = new Sim(c, createInitialState(c, 1));
    const t0 = performance.now();
    s.runDays(30);
    expect(performance.now() - t0).toBeLessThan(5000);
  });
});
