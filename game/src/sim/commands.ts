/**
 * Тоглогчийн командууд. Input (гар, хулгана) болон тэнцвэрийн симуляторын стратеги
 * хоёул эдгээрээр л sim-ийг өөрчилнө (architecture.md §3.1).
 *
 * proximity=true үед (3D тоглолт) малчин бүтээгдэхүүн, агуулахын ойролцоо байх ёстой.
 * 3D-гүй симуляторт proximity=false: алхах хугацааг тооцохгүй (гараар тоглолтын дээд хязгаар).
 */
import type { Species } from './config';
import type { BuyOrder, ProcessorKind, ProductId } from './state';
import type { Sim } from './sim';
import { driveFlock } from './systems/grazing';
import * as storage from './systems/storage';
import * as processing from './systems/processing';
import { startTrip, type TripPlan } from './systems/trip';

export type Command =
  | { type: 'movePlayer'; x: number; z: number }
  | { type: 'pickup'; ids: number[] | 'nearby' }
  | { type: 'deposit' }
  | { type: 'drive'; species: Species; x: number; z: number }
  | { type: 'process'; kind: ProcessorKind }
  | { type: 'trip'; plan: TripPlan }
  | { type: 'neighborBull'; on: boolean };

export interface CommandResult {
  ok: boolean;
  msg?: string;
}

const ok = (msg?: string): CommandResult => ({ ok: true, msg });
const fail = (msg: string): CommandResult => ({ ok: false, msg });

export function applyCommand(sim: Sim, cmd: Command, proximity = true): CommandResult {
  const { cfg, state } = sim;
  const p = state.player;
  if (p.away && cmd.type !== 'neighborBull') return fail('Малчин сумын төвд явсан');

  switch (cmd.type) {
    case 'movePlayer':
      p.x = cmd.x;
      p.z = cmd.z;
      return ok();

    case 'pickup': {
      const r = cfg.products.pickupRadius;
      const cap = cfg.products.carryUnits;
      let carried = p.carry.reduce((s, c) => s + c.amount, 0);
      const picked: number[] = [];
      for (const it of state.items) {
        if (cmd.ids !== 'nearby' && !cmd.ids.includes(it.id)) continue;
        if ((proximity || cmd.ids === 'nearby') && Math.hypot(it.x - p.x, it.z - p.z) > r) continue;
        if (carried + it.amount > cap + 1e-9) break;
        p.carry.push({ product: it.product, amount: it.amount, age: it.age });
        carried += it.amount;
        picked.push(it.id);
      }
      if (!picked.length) return fail(carried >= cap ? 'Гар дүүрсэн' : 'Ойролцоо бүтээгдэхүүн алга');
      state.items = state.items.filter((it) => !picked.includes(it.id));
      return ok(`${picked.length} ширхэг авлаа`);
    }

    case 'deposit': {
      const h = cfg.camps.home;
      if (proximity && Math.hypot(p.x - h.x, p.z - h.z) > h.storageRadius) return fail('Агуулахаас хол байна');
      const left: typeof p.carry = [];
      for (const c of p.carry) {
        const added = storage.add(cfg, state, c.product as ProductId, c.amount, 0);
        if (added > 0) state.today.collected[c.product] = (state.today.collected[c.product] ?? 0) + added;
        if (c.amount - added > 1e-9) left.push({ ...c, amount: c.amount - added });
      }
      p.carry = left;
      return left.length ? fail('Агуулах дүүрсэн') : ok();
    }

    case 'drive': {
      const n = driveFlock(cfg, state, sim.random, cmd.species, cmd.x, cmd.z);
      return n ? ok(`${n} мал туулаа`) : fail('Мал алга');
    }

    case 'process': {
      const pr = state.processors.find((x) => x.kind === cmd.kind && processing.canStart(cfg, state, x));
      if (!pr) return fail('Төхөөрөмж завгүй эсвэл түүхий эд дутуу');
      processing.start(cfg, state, pr);
      return ok();
    }

    case 'trip': {
      const err = startTrip(cfg, state, cmd.plan);
      return err ? fail(err) : ok();
    }

    case 'neighborBull':
      state.neighborBull = cmd.on;
      return ok();
  }
}

export type { BuyOrder };
