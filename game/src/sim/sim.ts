/**
 * Симуляцын үндсэн давталт. Нэг step = 1 тоглоомын минут (architecture.md §3.2).
 */
import type { GameConfig } from './config';
import { tick, type ClockEvent } from './clock';
import { Rng } from './rng';
import { emptyDayStats, type CampState, type DayStats, type GameState } from './state';
import { applyCommand, type Command, type CommandResult } from './commands';
import { averageBiomass, dailyCampDegrade, typeQualities } from './systems/pasture';
import { applyAccess, coldNight, dailyAwayGrass, dailyGrass, dailySnow, feedHay, seasonOf } from './systems/seasons';
import type { Season } from './config';
import { grazingStep } from './systems/grazing';
import { cohesionCenters, findHerds, herdDecide, type FlockCenter, type Herd, type HerdDecision } from './systems/herds';
import { dogsStep } from './systems/dogs';
import { dailyAnimals, grazingSheepUnits, herdSheepUnits, liveWeightKg } from './systems/animals';
import { dailyBreeding } from './systems/breeding';
import { groundAgingStep } from './systems/production';
import { atHome, eveningStep, morning, sleepAll } from './systems/night';
import { processingStep } from './systems/processing';
import * as storage from './systems/storage';
import { mapStep, syncAway, type TravelEvent } from './systems/travel';
import { dailyOtor, helpersStep, payWages, refreshCandidates, type HelperEvent } from './systems/helpers';
import { moveStep } from './systems/camps';
import { herderStep } from './systems/herder';
import { wolvesStep, nightRaid, endRaid, type WolfEvent } from './systems/wolves';

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
  campDays: number;        // энэ бууцанд өнгөрүүлсэн өдөр
  regrowthMult: number;    // өвс ургах хурд (доройтлоор буурсан, 1 = бүрэн)
  camps: Record<string, CampState>;
  season: Season;
  snow: number;            // одоогийн бууцны цас (см)
  hay: number;             // одоогийн бууцны боодол өвс
  dogs: number;
  storageUsed: number;
  goalReached: boolean;
}

export type SimEvent = ClockEvent | WolfEvent | TravelEvent | HelperEvent | { type: 'dayReport'; report: DayReport } | { type: 'season'; season: Season; day: number };

export class Sim {
  readonly cfg: GameConfig;
  readonly state: GameState;
  private rng: Rng;
  private listeners: ((e: SimEvent) => void)[] = [];
  private moneyAtDayStart: number;
  private quality: Record<string, number>;
  private centers = new Map<number, FlockCenter>();
  /** Сүүлд гаргасан сүргийн шийдвэрүүд (тест, дүрслэл) */
  herdDecisions: HerdDecision[] = [];

  constructor(cfg: GameConfig, state: GameState) {
    this.cfg = cfg;
    this.state = state;
    this.rng = Rng.fromState(state.rngState);
    this.moneyAtDayStart = state.money;
    this.quality = typeQualities(cfg, state.camps[state.campId]?.degrade ?? 0, seasonOf(cfg, state.time.day));
    applyAccess(cfg, state.grass, state.camps[state.campId]?.snow ?? 0);
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
    const r = applyCommand(this, cmd, proximity);
    syncAway(this.state);
    return r;
  }

  /** Командаас гарсан үйл явдлыг (газрын зураг руу гарсан г.м.) сонсогчдод дамжуулна */
  emitTravel(ev: TravelEvent): void {
    this.emit(ev);
  }

  /** Нэг тоглоомын минут */
  step(): void {
    const { cfg, state, rng } = this;
    state.step += 1;
    const hc = cfg.pasture.grazing.herd;
    let herds: Herd[] | undefined;
    if (state.step % hc.decideEverySteps === 0) {
      herds = findHerds(state, hc.linkRadius);
      this.centers = cohesionCenters(herds, hc.rejoinDistance);
      this.herdDecisions = herdDecide(cfg, state, rng, this.quality, herds);
    }
    herderStep(cfg, state);
    eveningStep(cfg, state, rng);
    for (const ev of helpersStep(cfg, state, rng, this.quality)) this.emit(ev);
    grazingStep(cfg, state, rng, this.quality, this.centers);
    dogsStep(cfg, state, herds);
    for (const ev of wolvesStep(cfg, state)) this.emit(ev);
    groundAgingStep(cfg, state);
    processingStep(cfg, state);
    for (const ev of mapStep(cfg, state, rng)) this.emit(ev);
    if (moveStep(cfg, state, rng)) {
      this.refreshQuality();
      this.centers = new Map();
      this.emit({ type: 'arrived', place: 'camp' });
    }
    syncAway(state);

    const events = tick(state.time, cfg.time);
    for (const ev of events) {
      if (ev.type === 'dayEnd') this.endDay(ev.day);
      else if (ev.type === 'monthEnd') for (const e2 of payWages(cfg, state)) this.emit(e2);
      else if (ev.type === 'nightStart') {
        sleepAll(state);
        state.today.coldHit += coldNight(cfg, state, (a) => atHome(cfg, a));
        const n = nightRaid(cfg, state);
        if (n) this.emit({ type: 'wolfRaid', n });
      } else if (ev.type === 'dayStart') {
        const prevSeason = seasonOf(cfg, ev.day - 1);
        dailySnow(cfg, state);
        const season = seasonOf(cfg, ev.day);
        if (season !== prevSeason) {
          this.refreshQuality();
          this.emit({ type: 'season', season, day: ev.day });
        }
        morning(cfg, state, rng);
        endRaid(state);
        refreshCandidates(cfg, state);
      }
      this.emit(ev);
    }
    state.rngState = rng.state;
  }

  /** Бууцны доройтол өөрчлөгдвөл бэлчээрийн чанарыг дахин тооцно */
  refreshQuality(): void {
    this.quality = typeQualities(this.cfg, this.state.camps[this.state.campId]?.degrade ?? 0, seasonOf(this.cfg, this.state.time.day));
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

    t.hayFed += feedHay(cfg, state);   // өвөл, хавар идэш дутсан малд боодол өвс (M5.5)
    for (const a of state.animals) a.lastGut = a.gutFill;   // өглөөний сүү, ноос (night.ts)
    const dead = dailyAnimals(cfg, state);
    t.deaths += dead.length;
    const br = dailyBreeding(cfg, state, rng);
    t.births += br.births;
    if (br.bullFees) this.spend('neighborBull', br.bullFees);

    const su = herdSheepUnits(state, cfg.animals);
    dailyCampDegrade(cfg, state.camps, state.campId, grazingSheepUnits(state, cfg.animals));
    for (const e2 of dailyOtor(cfg, state, rng)) this.emit(e2);
    const degrade = state.camps[state.campId]?.degrade ?? 0;
    dailyGrass(cfg, state);
    dailyAwayGrass(cfg, state);
    state.camps[state.campId]!.grass = averageBiomass(state.grass, 150);
    this.quality = typeQualities(cfg, degrade, seasonOf(cfg, day));

    const spoiled = storage.dailyStorageAging(cfg, state);
    for (const [p, n] of Object.entries(spoiled)) t.spoiled[p as keyof typeof t.spoiled] = (t.spoiled[p as keyof typeof t.spoiled] ?? 0) + (n ?? 0);

    this.spend('living', cfg.economy.dailyLivingCost);
    if (state.dogs.length) this.spend('dogFood', state.dogs.length * cfg.dogs.foodPerDay);

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
      campDays: state.camps[state.campId]?.daysSpent ?? 0,
      regrowthMult: 1 - cfg.pasture.degradation.growthPenalty * degrade,
      camps: Object.fromEntries(Object.entries(state.camps).map(([id, c]) => [id, { ...c }])),
      season: seasonOf(cfg, day),
      snow: state.camps[state.campId]?.snow ?? 0,
      hay: state.camps[state.campId]?.hay ?? 0,
      dogs: state.dogs.length,
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
