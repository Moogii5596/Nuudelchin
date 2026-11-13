/**
 * Симуляцын үндсэн давталт. Нэг step = 1 тоглоомын минут.
 * Системүүд (бэлчээр, бэлчээрлэлт, бүтээгдэхүүн, ...) M1-д энд нэмэгдэнэ (milestones.md).
 */
import type { GameConfig } from './config';
import { tick, type ClockEvent } from './clock';
import { Rng } from './rng';
import type { GameState } from './state';

export interface DayReport {
  day: number;
  moneyStart: number;
  moneyEnd: number;
  livingCost: number;
  animals: number;
}

export type SimEvent = ClockEvent | { type: 'dayReport'; report: DayReport };

export class Sim {
  readonly cfg: GameConfig;
  readonly state: GameState;
  private rng: Rng;
  private listeners: ((e: SimEvent) => void)[] = [];
  private moneyAtDayStart: number;

  constructor(cfg: GameConfig, state: GameState) {
    this.cfg = cfg;
    this.state = state;
    this.rng = Rng.fromState(state.rngState);
    this.moneyAtDayStart = state.money;
  }

  on(fn: (e: SimEvent) => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((f) => f !== fn);
    };
  }

  private emit(e: SimEvent): void {
    for (const fn of this.listeners) fn(e);
  }

  /** Нэг тоглоомын минут */
  step(): void {
    const events = tick(this.state.time, this.cfg.time);
    // TODO(M1): pasture, grazing, production, storage, processing, transport, helpers, wolves
    for (const ev of events) {
      if (ev.type === 'dayEnd') this.endDay(ev.day);
      this.emit(ev);
    }
    this.state.rngState = this.rng.state;
  }

  /** 3D-гүй горим: n өдрийг хамгийн хурдан гүйлгэнэ (тэнцвэрийн симулятор, тест) */
  runDays(n: number): void {
    const target = this.state.time.day + n;
    while (this.state.time.day < target) this.step();
  }

  private endDay(day: number): void {
    const living = this.cfg.economy.dailyLivingCost;
    this.state.money -= living;
    const report: DayReport = {
      day,
      moneyStart: this.moneyAtDayStart,
      moneyEnd: this.state.money,
      livingCost: living,
      animals: this.state.animals.length,
    };
    this.moneyAtDayStart = this.state.money;
    this.emit({ type: 'dayReport', report });
  }

  /** Санамсаргүй тоо зөвхөн энэ генератороос (seed-тэй) */
  get random(): Rng {
    return this.rng;
  }
}
