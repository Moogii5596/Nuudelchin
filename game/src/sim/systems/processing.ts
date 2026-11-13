/**
 * Боловсруулалт: тогоо, сепаратор, эсгий. Нэг төхөөрөмж нэг удаад нэг ажил (mvp-spec.md §4.3).
 */
import type { GameConfig } from '../config';
import type { GameState, ProcessorKind, ProductId, ProcessorState } from '../state';
import * as storage from './storage';

type Recipe = { price: number; input: Record<string, number>; output: Record<string, number>; hours: number };

export function recipe(cfg: GameConfig, kind: ProcessorKind): Recipe {
  return cfg.processing[kind] as Recipe;
}

export function canStart(cfg: GameConfig, state: GameState, p: ProcessorState): boolean {
  if (p.remaining > 0 || Object.keys(p.pending).length) return false;
  const r = recipe(cfg, p.kind);
  return Object.entries(r.input).every(([prod, n]) => storage.count(state, prod as ProductId) >= n - 1e-9);
}

/** Оролтыг агуулахаас авч ажлыг эхлүүлнэ (сүү дутвал тараг ашиглахгүй — шинэ сүү хэрэгтэй) */
export function start(cfg: GameConfig, state: GameState, p: ProcessorState): boolean {
  if (!canStart(cfg, state, p)) return false;
  const r = recipe(cfg, p.kind);
  for (const [prod, n] of Object.entries(r.input)) storage.take(state, prod as ProductId, n);
  p.remaining = r.hours * 60;
  return true;
}

export function processingStep(cfg: GameConfig, state: GameState): void {
  for (const p of state.processors) {
    if (p.remaining > 0) {
      p.remaining -= 1;
      if (p.remaining <= 0) {
        p.remaining = 0;
        const r = recipe(cfg, p.kind);
        for (const [prod, n] of Object.entries(r.output)) p.pending[prod as ProductId] = (p.pending[prod as ProductId] ?? 0) + n;
      }
    }
    // Дууссан гаралтыг агуулахад багтаах
    for (const [prod, n] of Object.entries(p.pending)) {
      const added = storage.add(cfg, state, prod as ProductId, n ?? 0);
      const left = (n ?? 0) - added;
      if (left <= 1e-9) delete p.pending[prod as ProductId];
      else p.pending[prod as ProductId] = left;
    }
  }
}
