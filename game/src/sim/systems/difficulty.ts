/**
 * Тайван тохиргоо — гулсуурууд (M6.10, mvp-spec §10.4). Утга `GameState.settings.difficulty`-д (хадгалалтад орно);
 * хүрээ, анхдагч `data/difficulty.json`. ×1 (анхдагч) нь гулсуур нэмэгдэхээс өмнөх тоглолттой ЯГ ИЖИЛ.
 *  - wolves ×0–1.5: шөнийн дайралтын магадлал, чонын өлсөх хурд; ×0 = чоно дайрахгүй
 *  - animalsDie: false бол чоно малыг айлгаж тараана, барихгүй (отор дээр ч)
 *  - products ×0.5–2: сүү, ноос, ноолуурын гарц
 *  - timeSpeed ×0.5–2: 1× хурдны өдрийн урт (main.ts-д цагийн хурдыг үржүүлнэ)
 */
import type { GameConfig } from '../config';

export interface Difficulty {
  wolves: number;
  animalsDie: boolean;
  products: number;
  timeSpeed: number;
}

export interface DifficultyRange { min: number; max: number; step: number; default: number }
export interface DifficultyConfig {
  wolves: DifficultyRange;
  products: DifficultyRange;
  timeSpeed: DifficultyRange;
  animalsDie: { default: boolean };
}

export const DIFFICULTY_KEYS = ['wolves', 'products', 'timeSpeed'] as const;

export function defaultDifficulty(cfg: GameConfig): Difficulty {
  const d = cfg.difficulty;
  return { wolves: d.wolves.default, animalsDie: d.animalsDie.default, products: d.products.default, timeSpeed: d.timeSpeed.default };
}

/** Хүрээнд оруулж, алхамд (step) тааруулна */
function snap(r: DifficultyRange, v: number): number {
  const c = Math.min(r.max, Math.max(r.min, v));
  const s = r.min + Math.round((c - r.min) / r.step) * r.step;
  return Math.round(Math.min(r.max, s) * 1e6) / 1e6;
}

/** Хэсэгчилсэн өөрчлөлтийг (patch) хүрээнд оруулж хэрэглэнэ */
export function clampDifficulty(cfg: GameConfig, cur: Difficulty, patch: Partial<Difficulty>): Difficulty {
  const out = { ...cur };
  for (const k of DIFFICULTY_KEYS) {
    const v = patch[k];
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = snap(cfg.difficulty[k], v);
  }
  if (typeof patch.animalsDie === 'boolean') out.animalsDie = patch.animalsDie;
  return out;
}

export function validateDifficultyConfig(cfg: GameConfig): string[] {
  const e: string[] = [];
  const d = cfg.difficulty;
  for (const k of DIFFICULTY_KEYS) {
    const r = d?.[k];
    if (!r || ![r.min, r.max, r.step, r.default].every(Number.isFinite)) { e.push(`difficulty.${k}: min, max, step, default тоо байх ёстой`); continue; }
    if (!(r.min <= r.default && r.default <= r.max && r.step > 0)) e.push(`difficulty.${k}: min ≤ default ≤ max, step > 0`);
  }
  if (typeof d?.animalsDie?.default !== 'boolean') e.push('difficulty.animalsDie.default: true/false');
  return e;
}

/** Хадгалсан settings.difficulty зөв эсэх (sim/save.ts) */
export function difficultyProblems(cfg: GameConfig, v: unknown): string[] {
  if (typeof v !== 'object' || v === null) return ['settings.difficulty алга'];
  const o = v as Record<string, unknown>, e: string[] = [];
  for (const k of DIFFICULTY_KEYS) {
    const r = cfg.difficulty[k], x = o[k];
    if (typeof x !== 'number' || !Number.isFinite(x) || x < r.min - 1e-9 || x > r.max + 1e-9) e.push(`settings.difficulty.${k}: ${r.min}…${r.max}`);
  }
  if (typeof o.animalsDie !== 'boolean') e.push('settings.difficulty.animalsDie: true/false');
  return e;
}
