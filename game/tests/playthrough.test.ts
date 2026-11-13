/**
 * M3-ын гарах шалгуур: «тоглогч 10 өдөр гараар тоглож, бүтээгдэхүүнээ цуглуулж, боловсруулж, зарж, ашигтай ажиллана».
 * Гар тоглолтыг дуурайсан бот: 1× хурдаар морьтой давхиж (бодит хурд), ойрын бүтээгдэхүүнийг түүж,
 * майхны дэргэд агуулахад хийж, тогоо авсны дараа ааруул хийж, тэргээр сумын төвд зарна.
 * Бүх үйлдэл Command-аар, proximity=true (малчин тухайн газарт очих ёстой).
 */
import { describe, expect, it } from 'vitest';
import { cfg, newSim } from './helpers';
import type { Sim } from '../src/sim/sim';
import type { ProductId } from '../src/sim/state';
import * as storage from '../src/sim/systems/storage';
import { ridingHorse } from '../src/sim/systems/herder';
import { realSecondsPerMinute } from '../src/sim/clock';

const STEP_SEC = realSecondsPerMinute(cfg.time); // 1× хурдаар нэг алхам бодитоор

function moveToward(sim: Sim, tx: number, tz: number): boolean {
  const p = sim.state.player;
  const sp = (p.mounted ? cfg.player.mountedSpeed : cfg.player.walkSpeed) * STEP_SEC;
  const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
  if (d <= sp) {
    sim.command({ type: 'movePlayer', x: tx, z: tz });
    return true;
  }
  sim.command({ type: 'movePlayer', x: p.x + (dx / d) * sp, z: p.z + (dz / d) * sp, heading: Math.atan2(dx, dz) });
  return false;
}

interface Totals {
  dropped: number;
  collected: number;
  spoiled: number;
  income: number;
  trips: number;
}

function playDays(sim: Sim, days: number): Totals {
  const st = sim.state;
  const tot: Totals = { dropped: 0, collected: 0, spoiled: 0, income: 0, trips: 0 };
  sim.on((e) => {
    if (e.type !== 'dayReport') return;
    const r = e.report;
    tot.dropped += Object.values(r.dropped).reduce((s, n) => s + (n ?? 0), 0);
    tot.collected += Object.values(r.collected).reduce((s, n) => s + (n ?? 0), 0);
    tot.spoiled += Object.values(r.spoiled).reduce((s, n) => s + (n ?? 0), 0);
    tot.income += Object.values(r.income).reduce((s, n) => s + (n ?? 0), 0);
  });
  const home = cfg.camps.home;
  const end = st.time.day + days;
  while (st.time.day < end) {
    const p = st.player;
    if (!p.away) {
      // Морь унах
      if (!p.mounted) {
        const h = ridingHorse(st)!;
        if (Math.hypot(h.x - p.x, h.z - p.z) > cfg.player.mountRange) {
          if (!p.horseCalled) sim.command({ type: 'callHorse' });
        } else sim.command({ type: 'toggleMount' });
      }
      const carried = p.carry.reduce((s, c) => s + c.amount, 0);
      const free = storage.freeSpace(cfg, st);
      const atHome = Math.hypot(p.x - home.x, p.z - home.z) <= home.storageRadius;
      if (atHome) {
        if (carried) sim.command({ type: 'deposit' });
        if (st.processors.length) sim.command({ type: 'process', kind: 'pot' });
        // Зарах: орой эсвэл агуулах дүүрэх дөхсөн үед
        const sellable: Partial<Record<ProductId, number>> = {};
        let units = 0;
        for (const prod of ['aaruul', 'tarag', 'wool', 'milk'] as ProductId[]) {
          if (prod === 'milk' && st.processors.length) continue;
          const n = Math.min(storage.count(st, prod), cfg.vehicles.horseCart.capacity - units);
          if (n > 0) {
            sellable[prod] = n;
            units += n;
          }
        }
        const hour = st.time.minute / 60;
        const wantPot = !st.processors.length && st.money + units * 4000 > cfg.processing.pot.price + 60_000;
        if ((units >= 14 || (wantPot && units >= 4)) && hour >= 9 && hour <= 16) {
          const r = sim.command({ type: 'trip', plan: { vehicle: 'horseCart', sell: sellable, buy: wantPot ? [{ kind: 'processor', id: 'pot' }] : [] } });
          if (r.ok) tot.trips++;
          sim.step();
          continue;
        }
      }
      // Хаашаа явах вэ
      const full = carried >= cfg.products.carryUnits - 1e-9 || (free <= carried && carried > 0);
      let target: { x: number; z: number } | null = null;
      if (!full && free > carried) {
        let best = Infinity;
        for (const it of st.items) {
          const d = Math.hypot(it.x - p.x, it.z - p.z);
          if (d < best) {
            best = d;
            target = it;
          }
        }
      }
      if (!target && carried > 0) target = { x: home.x + 3, z: home.z + 3 };
      if (target) {
        moveToward(sim, target.x, target.z);
        if (st.items.some((it) => Math.hypot(it.x - p.x, it.z - p.z) <= cfg.products.pickupRadius)) sim.command({ type: 'pickup', ids: 'nearby' });
      } else if (!atHome) moveToward(sim, home.x + 3, home.z + 3);
    }
    sim.step();
  }
  return tot;
}

describe('M3: 10 өдрийн гар тоглолт (бот)', () => {
  it('бүтээгдэхүүнээ цуглуулж, тогоо авч ааруул хийж, зарж ашигтай ажиллана', () => {
    const sim = newSim(20261113);
    const m0 = sim.state.money;
    const tot = playDays(sim, 10);
    const st = sim.state;
    const stock = storage.used(st);
    // eslint-disable-next-line no-console
    console.log(`10 өдөр: мөнгө ${m0} → ${Math.round(st.money)}, орлого ${Math.round(tot.income)}, аялал ${tot.trips}, унасан ${tot.dropped.toFixed(1)}, түүсэн ${tot.collected.toFixed(1)}, муудсан ${tot.spoiled.toFixed(1)}, тогоо ${st.processors.length}, агуулахад ${stock}`);
    expect(st.processors.some((p) => p.kind === 'pot')).toBe(true);             // тогоо авсан
    expect(tot.collected).toBeGreaterThan(tot.dropped * 0.6);                    // ихэнхийг түүсэн
    expect(tot.trips).toBeGreaterThanOrEqual(2);
    // Ашиг: мөнгө + тогоо + агуулахын бараа эхлэлийн мөнгөнөөс их
    const assets = st.money + cfg.processing.pot.price + stock * 4000;
    expect(assets).toBeGreaterThan(m0 + 150_000);
  });
});
