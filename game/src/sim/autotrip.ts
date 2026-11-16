/**
 * Автомат аялал (M4.6): ачих → газрын зургаар сумын төв → Худалдаачинтай арилжаа → буцах → буулгах.
 * Тэнцвэрийн бот, тест, дараа нь M5-ын жолооч туслах ашиглана. 3D доторх жолоодлогыг алгасна
 * (замын төгсгөлөөс шууд газрын зураг руу) — газрын зураг дээрх аялалын хугацаа бодитоор явна.
 * Sim-ийн алхам бүрийн ДАРАА tick() дуудна (үйл явдлын сонсогч дотроос биш).
 */
import type { Sim } from './sim';
import type { BuyOrder, ProductId } from './state';
import { sellableAnimals, sellableAtShop, sumId } from './systems/travel';
import { isOpen } from './systems/shops';

export interface AutoTripPlan {
  sell: Partial<Record<ProductId, number>>;   // агуулахаас ачиж зарах
  sellAnimalIds: number[];                     // сүргээс ачиж зарах
  buy: BuyOrder[];
}

export type AutoTripPhase = 'start' | 'toSum' | 'home' | 'done' | 'failed';

export class AutoTrip {
  phase: AutoTripPhase = 'start';
  error: string | null = null;

  constructor(private plan: AutoTripPlan) {}

  get finished(): boolean {
    return this.phase === 'done' || this.phase === 'failed';
  }

  private fail(msg: string): boolean {
    this.error = msg;
    this.phase = 'failed';
    return true;
  }

  /** Нэг алхам. Дууссан бол true */
  tick(sim: Sim): boolean {
    const { cfg, state } = sim;
    const p = state.player;
    switch (this.phase) {
      case 'start': {
        if (p.place !== 'camp' || state.move) return this.fail('Гэртээ байх ёстой');
        if (!sim.command({ type: 'boardBest' }, false).ok) return this.fail('Унаа морь, тээвэр алга');
        const ids = this.plan.sellAnimalIds;
        if (p.driving) {
          const r = sim.command({ type: 'loadCargo', vehicle: p.driving, products: this.plan.sell, animalIds: ids }, false);
          if (!r.ok) return this.fail(r.msg?.key ?? 'Ачиж чадсангүй');
        } else {
          // Морьтой: гартаа (10 нэгж хүртэл), малаа араасаа тууна
          sim.command({ type: 'deposit' }, false);
          if (Object.keys(this.plan.sell).length) sim.command({ type: 'takeFromStorage', products: this.plan.sell }, false);
          if (ids.length) sim.command({ type: 'droveAnimals', animalIds: ids }, false);
        }
        const road = cfg.camps.camps[state.campId]!.road;
        const end = road[road.length - 1]!;
        const r = sim.command({ type: 'leaveToMap', dirX: end[0], dirZ: end[1] }, false);
        if (!r.ok) return this.fail(r.msg?.key ?? '');
        sim.command({ type: 'mapGo', x: 0, z: 0, dest: sumId(cfg) }, false);
        this.phase = 'toSum';
        return false;
      }
      case 'toSum': {
        if (p.place !== 'sum') return false;
        // Хаалттай бол нээгдэх хүртэл хүлээнэ (data/shops.json); Худалдаачин = buyer
        if (!isOpen(cfg, 'buyer', state.time.minute)) return false;
        const r = sim.command({
          type: 'trade',
          plan: { sell: sellableAtShop(state), sellAnimalIds: sellableAnimals(state).map((a) => a.id), buy: this.plan.buy },
        }, false);
        if (!r.ok) this.error = r.msg?.key ?? null;   // зарим зүйл авагдаагүй ч үргэлжилнэ
        const ex = cfg.sumcenter.entry.exit;
        sim.command({ type: 'leaveToMap', dirX: ex[0], dirZ: ex[1] }, false);
        sim.command({ type: 'mapGo', x: 0, z: 0, dest: state.campId }, false);
        this.phase = 'home';
        return false;
      }
      case 'home': {
        if (p.place !== 'camp') return false;
        if (p.driving) {
          sim.command({ type: 'unloadCargo', vehicle: p.driving }, false);
          sim.command({ type: 'toggleVehicle' }, false);
        }
        this.phase = 'done';
        return true;
      }
      default:
        return true;
    }
  }

  /** Тест/ботод: дуустал алхана (хамгийн ихдээ maxSteps) */
  static run(sim: Sim, plan: AutoTripPlan, maxSteps = 24 * 60): AutoTrip {
    const t = new AutoTrip(plan);
    for (let i = 0; i < maxSteps && !t.tick(sim); i++) sim.step();
    return t;
  }

}
