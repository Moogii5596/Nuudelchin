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
import { startMove } from './systems/camps';
import { shout, toggleMount } from './systems/herder';
import { scareWolves } from './systems/wolves';
import { newAnimal } from './state';
import { SPECIES } from './config';

export type Command =
  | { type: 'movePlayer'; x: number; z: number; heading?: number }
  | { type: 'shout' }                 // «Хөөе!» (Space)
  | { type: 'toggleMount' }           // морь унах/буух (F)
  | { type: 'callHorse' }             // морь дуудах (H)
  | { type: 'scareWolves' }           // чоно үргээх (Q)
  | { type: 'debugAddAnimals'; n: number; x?: number; z?: number }   // туршилтын цэс: мал нэмэх
  | { type: 'pickup'; ids: number[] | 'nearby' }
  | { type: 'deposit' }
  | { type: 'drive'; species: Species; x: number; z: number }
  | { type: 'process'; kind: ProcessorKind }
  | { type: 'trip'; plan: TripPlan }
  | { type: 'neighborBull'; on: boolean }
  | { type: 'moveCamp'; to: string };

export interface CommandResult {
  ok: boolean;
  msg?: string;
}

const ok = (msg?: string): CommandResult => ({ ok: true, msg });
const fail = (msg: string): CommandResult => ({ ok: false, msg });

export function applyCommand(sim: Sim, cmd: Command, proximity = true): CommandResult {
  const { cfg, state } = sim;
  const p = state.player;
  if (p.away && cmd.type !== 'neighborBull' && cmd.type !== 'debugAddAnimals') return fail('Малчин сумын төвд явсан');

  switch (cmd.type) {
    case 'movePlayer': {
      p.x = cmd.x;
      p.z = cmd.z;
      if (cmd.heading !== undefined) p.heading = cmd.heading;
      return ok();
    }

    case 'shout': {
      const n = shout(cfg, state, sim.random);
      return n ? ok(`Хөөе! ${n} мал туугдлаа`) : fail('Ойрхон мал алга');
    }

    case 'toggleMount': {
      const err = toggleMount(cfg, state);
      if (err) return fail(err);
      return ok(p.mounted ? 'Морь унлаа' : 'Мориноосоо буулаа');
    }

    case 'callHorse': {
      if (p.mounted) return fail('Та мориндоо сууж байна');
      p.horseCalled = true;
      return ok('Чүү, нааш! Морь давхиж ирж байна');
    }

    case 'scareWolves': {
      const n = scareWolves(cfg, state);
      return n ? ok(`Хуу-хай! ${n} чоно үүр лүүгээ зугтлаа`) : fail('Ойрхон чоно алга');
    }

    case 'debugAddAnimals': {
      // Насны холимог сүрэг (хонь 70%, ямаа 15%, үхэр 10%, адуу 5%), бууцны ойролцоо
      const rng = sim.random;
      const cx = cmd.x ?? 30, cz = cmd.z ?? 0;
      for (let i = 0; i < cmd.n; i++) {
        const u = rng.next();
        const species = u < 0.7 ? SPECIES[0]! : u < 0.85 ? SPECIES[1]! : u < 0.95 ? SPECIES[2]! : SPECIES[3]!;
        const ang = rng.range(0, Math.PI * 2), r = Math.sqrt(rng.next()) * 35;
        state.animals.push(newAnimal(cfg, rng, state.nextId++, {
          species,
          sex: rng.chance(0.15) ? 'm' : 'f',
          age: rng.range(0.2, 6),
          x: cx + Math.cos(ang) * r,
          z: cz + Math.sin(ang) * r,
        }));
      }
      return ok(`${cmd.n} мал нэмлээ`);
    }

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

    case 'moveCamp': {
      const err = startMove(cfg, state, cmd.to);
      if (err) return fail(err);
      // Шинэ бууцны чанарыг Sim дахин тооцно
      return ok('Нүүж байна');
    }
  }
}

export type { BuyOrder };
