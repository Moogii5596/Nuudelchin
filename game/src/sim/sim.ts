/**
 * Симуляцын үндсэн давталт. Нэг step = 1 тоглоомын минут (architecture.md §3.2).
 */
import type { GameConfig, Species } from './config';
import { tick, type ClockEvent } from './clock';
import { Rng } from './rng';
import { emptyDayStats, type DayStats, type GameState } from './state';
import { applyCommand, type Command, type CommandResult } from './commands';
import { averageBiomass, dailyCampDegrade, dailyRegrowth, typeQualities } from './systems/pasture';
import { flockCenters, grazingStep, type FlockCenter } from './systems/grazing';
import { dailyAnimals, herdSheepUnits, liveWeightKg } from './systems/animals';
import { dailyBreeding } from './systems/breeding';
import { dailyFiber, groundAgingStep, productionStep } from './systems/production';
import { processingStep } from './systems/processing';
import * as storage from './systems/storage';
import { tripStep } from './systems/trip';
import { moveStep } from './systems/camps';

export interface DayReport extends DayStats {
  day: number;
  moneyStart: number;
  moneyEnd: number;
  animals: number;
  sheepUnits: number;
  avgEweKg: number;        // нас гүйцсэн эм хонины дундаж жин
  avgCondition: number;
  avgGutFill: number;      // өнөөдрийн дундаж идэш (тааз = 1)
  grass: number;           // бууцны 120 м доторх дундаж өвс
  campDegrade: number;
  storageUsed: number;
  goalReached: boolean;
}

export type SimEvent = ClockEvent | { type: 'dayReport'; report: DayReport };

export class Sim {
  readonly cfg: GameConfig;
  readonly state: GameState;
  private rng: Rng;
  private listeners: ((e: SimEvent) => void)[] = [];
  private moneyAtDayStart: number;
  private quality: Record<string, number>;
  private centers: Partial<Record<Species, FlockCenter>> = {};

  constructor(cfg: GameConfig, state: GameState) {
    this.cfg = cfg;
    this.state = state;
    this.rng = Rng.fromState(state.rngState);
    this.moneyAtDayStart = state.money;
    this.quality = typeQualities(cfg, state.camps[state.campId]?.degrade ?? 0);
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

  command(cmd: Command, proximity = true): CommandResult {
    return applyCommand(this, cmd, proximity);
  }

  /** Нэг тоглоомын минут */
  step(): void {
    const { cfg, state, rng } = this;
    state.step += 1;
    if (state.step % 5 === 0) this.centers = flockCenters(state);
    grazingStep(cfg, state, rng, this.quality, this.centers);
    productionStep(cfg, state, rng);
    groundAgingStep(cfg, state);
    processingStep(cfg, state);
    tripStep(cfg, state, rng);
    if (moveStep(cfg, state, rng)) {
      this.quality = typeQualities(cfg, state.camps[state.campId]?.degrade ?? 0);
      this.centers = flockCenters(state);
    }

    const events = tick(state.time, cfg.time);
    for (const ev of events) {
      if (ev.type === 'dayEnd') this.endDay(ev.day);
      this.emit(ev);
    }
    state.rngState = rng.state;
  }

  /** 3D-гүй горим: n өдрийг хамгийн хурдан гүйлгэнэ */
  runDays(n: number): void {
    const target = this.state.time.day + n;
    while (this.state.time.day < target) this.step();
  }

  private endDay(day: number): void {
    const { cfg, state, rng } = this;
    const t = state.today;
    // Тайланд зориулж өдрийн идэшийг тэглэхээс өмнө хэмжинэ
    const grazers = state.animals.filter((a) => !a.riding);
    const avgGut = grazers.length ? grazers.reduce((s, a) => s + a.gutFill, 0) / grazers.length : 0;

    const dead = dailyAnimals(cfg, state);
    t.deaths += dead.length;
    const br = dailyBreeding(cfg, state, rng);
    t.births += br.births;
    if (br.bullFees) this.spend('neighborBull', br.bullFees);
    dailyFiber(cfg, state, rng);

    const su = herdSheepUnits(state, cfg.animals);
    dailyCampDegrade(cfg, state.camps, state.campId, su);
    const degrade = state.camps[state.campId]?.degrade ?? 0;
    dailyRegrowth(cfg, state.grass, degrade);
    this.quality = typeQualities(cfg, degrade);

    const spoiled = storage.dailyStorageAging(cfg, state);
    for (const [p, n] of Object.entries(spoiled)) t.spoiled[p as keyof typeof t.spoiled] = (t.spoiled[p as keyof typeof t.spoiled] ?? 0) + (n ?? 0);

    this.spend('living', cfg.economy.dailyLivingCost);

    const goal = state.home === 'ger' && su >= cfg.economy.goalSheepUnits;
    if (goal && state.goalReachedDay === null) state.goalReachedDay = day;

    const ewes = state.animals.filter((a) => a.species === 'sheep' && a.sex === 'f' && a.age >= cfg.animals.species.sheep.adultAge);
    const report: DayReport = {
      ...t,
      day,
      moneyStart: this.moneyAtDayStart,
      moneyEnd: state.money,
      animals: state.animals.length,
      sheepUnits: su,
      avgEweKg: ewes.length ? ewes.reduce((s, a) => s + liveWeightKg(a, cfg.animals), 0) / ewes.length : 0,
      avgCondition: grazers.length ? grazers.reduce((s, a) => s + a.condition, 0) / grazers.length : 0,
      avgGutFill: avgGut,
      grass: averageBiomass(state.grass, 120),
      campDegrade: degrade,
      storageUsed: storage.used(state),
      goalReached: goal,
    };
    this.moneyAtDayStart = state.money;
    state.today = emptyDayStats();
    this.emit({ type: 'dayReport', report });
  }

  private spend(key: string, amount: number): void {
    this.state.money -= amount;
    this.state.today.expenses[key] = (this.state.today.expenses[key] ?? 0) + amount;
  }

  /** Санамсаргүй тоо зөвхөн энэ генератороос (seed-тэй) */
  get random(): Rng {
    return this.rng;
  }
}
