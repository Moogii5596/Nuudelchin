import { describe, expect, it } from 'vitest';
import { cfg, newSim, steps } from './helpers';
import * as storage from '../src/sim/systems/storage';

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
});
