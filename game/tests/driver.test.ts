import { describe, expect, it } from 'vitest';
import { cfg, newSim, steps } from './helpers';
import { refreshCandidates } from '../src/sim/systems/helpers';
import { addVehicle, fleetOf } from '../src/sim/systems/travel';
import { shopHours } from '../src/sim/systems/shops';
import * as storage from '../src/sim/systems/storage';
import type { Sim } from '../src/sim/sim';
import type { VehicleId } from '../src/sim/state';

/** Жолооч хөлсөлж, тээвэр өгнө */
function withDriver(seed: number, vehicle: VehicleId, auto = false): Sim {
  const sim = newSim(seed);
  const s = sim.state;
  for (let k = 0; k < 30 && !s.helpers.list.length; k++) {
    refreshCandidates(cfg, s);
    const c = s.helpers.candidates.find((x) => !x.family);
    if (c) expect(sim.command({ type: 'hire', candidate: c.id }, false).ok).toBe(true);
    else { s.helpers.candidatesDay -= 100; s.time.day += 1; }
  }
  addVehicle(cfg, s, vehicle);
  const h = s.helpers.list.find((x) => x.kind === 'adult')!;
  expect(sim.command({ type: 'helperTask', helper: h.id, task: 'drive' }).ok).toBe(true);
  if (!auto) sim.command({ type: 'setAutoTrip', on: false });   // гараар явуулах тестэд 9 цагийн аялал саад болохгүй
  return sim;
}
const stepTo = (sim: Sim, minute: number): void => { while (sim.state.time.minute !== minute) sim.step(); };
const load = (sim: Sim, v: VehicleId, n: number): void => { fleetOf(sim.state, v)!.cargo.aaruul = n; };

describe('Жолооч: сум руу шууд явуулах + 9 цагийн аялал', () => {
  it('9 цагийн автомат аялал 3 өдөр дараалан явна (буцах замд дэлгүүр хаагдсан ч)', () => {
    for (const v of ['horseCart', 'porter'] as VehicleId[]) {
      const sim = withDriver(7, v, true);
      sim.state.money = 1e7;
      const h = sim.state.helpers.list[0]!;
      const departed: number[] = [];
      for (let d = 0; d < 3; d++) {
        stepTo(sim, cfg.helpers.driver.departHour * 60 - 1);
        expect(h.trip, `${v} өдөр ${d}: өмнөх аяллаас буцсан`).toBeNull();
        storage.add(cfg, sim.state, 'aaruul', 15);
        steps(sim, 2);
        if (h.trip) departed.push(sim.state.time.day);
      }
      expect(departed, v).toHaveLength(3);
    }
  });

  it('зарсны дараа буцах замд дэлгүүр хаагдахад жолоочийг сум руу буцааж татахгүй', () => {
    const sim = withDriver(3, 'horseCart');
    const h = sim.state.helpers.list[0]!;
    load(sim, 'horseCart', 20);
    const close = shopHours(cfg, 'buyer').close * 60;
    stepTo(sim, close - 30);
    expect(sim.command({ type: 'sendDriver', vehicle: 'horseCart' }).ok).toBe(true);
    const total = h.trip!.total;
    h.trip!.remaining = Math.ceil(total / 2) + 5;   // хаагдахаас өмнөхөн сумд хүрнэ
    steps(sim, 10);
    expect(h.trip!.sale?.aaruul).toBe(20 * cfg.products.prices.aaruul);
    steps(sim, 40);   // дэлгүүр хаагдсан — буцах зам үргэлжилнэ
    expect(h.trip === null || h.trip.remaining < Math.ceil(total / 2) - 30).toBe(true);
  });

  it('(а) ачаатай, жолоочтой → шууд хөдөлж, мөнгөтэй буцна; аялал тоглоомын цаг зарцуулна', () => {
    const sim = withDriver(7, 'horseCart');
    const h = sim.state.helpers.list[0]!;
    load(sim, 'horseCart', 20);
    stepTo(sim, 10 * 60);
    const money = sim.state.money;
    let income = -1;
    sim.on((e) => { if (e.type === 'helperTrip') income = e.income; });
    const r = sim.command({ type: 'sendDriver', vehicle: 'horseCart' });
    expect(r.ok, r.msg?.key).toBe(true);
    expect(h.trip!.total).toBeGreaterThan(0);
    expect(fleetOf(sim.state, 'horseCart')!.place).toBe('map');
    expect(sim.command({ type: 'sendDriver', vehicle: 'horseCart' }).ok).toBe(false);
    const t0 = sim.state.step;
    while (h.trip) sim.step();
    expect(sim.state.step - t0).toBeGreaterThanOrEqual(h.trip === null ? 2 : 0);
    expect(income).toBe(20 * cfg.products.prices.aaruul);
    expect(sim.state.money).toBe(money + income);
    expect(fleetOf(sim.state, 'horseCart')!.place).toBe('camp');
    expect(Object.keys(fleetOf(sim.state, 'horseCart')!.cargo)).toHaveLength(0);
  });

  it('(б) түлшгүй, ачаагүй, жолоочгүй, жолооч завгүй → шалтгаан буцаана', () => {
    const sim = withDriver(7, 'porter');
    const key = (v: VehicleId): string | undefined => sim.command({ type: 'sendDriver', vehicle: v }).msg?.key;
    expect(key('porter')).toBe('sim.driver_no_cargo');
    load(sim, 'porter', 20);
    sim.state.money = 0;
    expect(key('porter')).toBe('sim.driver_no_fuel');
    expect(sim.state.helpers.list[0]!.trip).toBeNull();
    sim.state.money = 1e6;
    addVehicle(cfg, sim.state, 'horseCart');
    load(sim, 'horseCart', 5);
    expect(sim.command({ type: 'sendDriver', vehicle: 'porter' }).ok).toBe(true);
    expect(key('horseCart')).toBe('sim.driver_is_busy');
    sim.state.helpers.list[0]!.task = 'herd';
    sim.state.helpers.list[0]!.trip = null;
    expect(key('horseCart')).toBe('sim.no_driver');
  });

  it('(в) дэлгүүр хаалттай → нээгдтэл хүлээгээд зарна', () => {
    const sim = withDriver(7, 'horseCart');
    const h = sim.state.helpers.list[0]!;
    load(sim, 'horseCart', 20);
    const hours = shopHours(cfg, 'buyer');
    stepTo(sim, hours.close * 60 + 5);
    const day = sim.state.time.day;
    expect(sim.command({ type: 'sendDriver', vehicle: 'horseCart' }).ok).toBe(true);
    const atSum = Math.ceil(h.trip!.total / 2);
    steps(sim, atSum + 60);
    expect(h.trip!.remaining).toBe(atSum);   // хаалганы өмнө хүлээж байна
    expect(h.trip!.sale).toBeUndefined();
    let income = -1;
    sim.on((e) => { if (e.type === 'helperTrip') income = e.income; });
    while (h.trip) sim.step();
    expect(income).toBe(20 * cfg.products.prices.aaruul);
    expect(sim.state.time.day).toBe(day + 1);
    expect(sim.state.time.minute).toBeGreaterThanOrEqual(hours.open * 60);
  });

  it('автомат аяллыг унтраавал 9 цагт явахгүй; асаавал цонхны дотор хоцорч ч явна', () => {
    const sim = withDriver(7, 'horseCart');
    const h = sim.state.helpers.list[0]!;
    storage.add(cfg, sim.state, 'aaruul', 15);
    stepTo(sim, cfg.helpers.driver.departHour * 60 + 30);
    expect(h.trip).toBeNull();
    sim.command({ type: 'setAutoTrip', on: true });
    steps(sim, 2);
    expect(h.trip).not.toBeNull();
  });
});
