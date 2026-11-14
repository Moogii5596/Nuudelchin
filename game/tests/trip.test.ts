import { describe, expect, it } from 'vitest';
import { cfg, newSim, steps } from './helpers';
import * as storage from '../src/sim/systems/storage';
import { bestTruck, parkingSpot, tripPose } from '../src/sim/systems/trip';

describe('Сумын төвийн аялал (mvp-spec.md §5)', () => {
  it('тэргээр ааруул зарж, тогоо худалдаж авна', () => {
    const sim = newSim(4);
    storage.add(cfg, sim.state, 'aaruul', 10);
    const m0 = sim.state.money;
    const r = sim.command({ type: 'trip', plan: { vehicle: 'horseCart', sell: { aaruul: 10 }, buy: [{ kind: 'processor', id: 'pot' }] } });
    expect(r.ok).toBe(true);
    expect(sim.command({ type: 'deposit' }).ok).toBe(false); // малчин явсан
    steps(sim, Math.round(cfg.vehicles.horseCart.oneWayHours * 120) + 1);
    expect(sim.state.trip).toBeNull();
    expect(sim.state.processors).toHaveLength(1);
    expect(sim.state.money).toBe(m0 + 10 * cfg.products.prices.aaruul - cfg.processing.pot.price);
  });
  it('тэргэнд 30 нэгжээс их ачаа багтахгүй', () => {
    const sim = newSim(4);
    storage.add(cfg, sim.state, 'wool', 20);
    const r = sim.command({ type: 'trip', plan: { vehicle: 'horseCart', sell: { wool: 40 }, buy: [] } });
    expect(r.ok).toBe(false);
  });
  it('тэрэг замаар явж бууцны захаас алга болоод, буцахдаа замаар ирнэ; малчин дээр нь сууна (M4.5)', () => {
    const sim = newSim(4);
    storage.add(cfg, sim.state, 'wool', 5);
    expect(sim.command({ type: 'trip', plan: { vehicle: 'horseCart', sell: { wool: 5 }, buy: [] } }).ok).toBe(true);
    const t = sim.state.trip!;
    const park = parkingSpot(cfg, 'horseCart');
    const xs: number[] = [];
    let hidden = 0;
    for (let i = 0; i < t.total - 1; i++) {
      sim.step();
      const pose = tripPose(cfg, sim.state.trip!);
      if (!pose.visible) hidden++;
      else xs.push(pose.x);
      expect(sim.state.player.x).toBeCloseTo(pose.x, 5);
    }
    expect(hidden).toBeGreaterThan(10);                                   // газрын зургаас гадуур замдаа
    expect(Math.max(...xs)).toBeGreaterThan(cfg.vehicles.road.start.x + cfg.vehicles.road.length * 0.9);   // захын толгод хүртэл
    sim.step();
    expect(sim.state.trip).toBeNull();
    expect(Math.hypot(sim.state.player.x - park.x, sim.state.player.z - park.z)).toBeLessThan(5);
  });
  it('Портер даац их, Амжиргаа даац бага, бензин адил; авсан машин эзэмшилд нэмэгдэнэ', () => {
    const P = cfg.vehicles.porter, A = cfg.vehicles.amjirgaa;
    expect(P.capacity).toBeGreaterThan(A.capacity);
    expect(P.sheepSlots).toBeGreaterThan(A.sheepSlots);
    expect(P.fuelPer100km).toBe(A.fuelPer100km);
    const sim = newSim(4, (s) => { s.money = 50_000_000; });
    expect(bestTruck(cfg, sim.state)).toBeNull();
    sim.command({ type: 'trip', plan: { vehicle: 'horseCart', sell: {}, buy: [{ kind: 'vehicle', id: 'amjirgaa' }, { kind: 'vehicle', id: 'porter' }] } });
    steps(sim, sim.state.trip!.total + 1);
    expect(sim.state.vehicles).toEqual(['horseCart', 'amjirgaa', 'porter']);
    expect(bestTruck(cfg, sim.state)).toBe('porter');
  });
});
