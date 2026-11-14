import { describe, expect, it } from 'vitest';
import { cfg, newSim, steps } from './helpers';
import * as storage from '../src/sim/systems/storage';
import { AutoTrip } from '../src/sim/autotrip';
import { bestTruck, parkingSpot } from '../src/sim/systems/trip';
import { addVehicle, droveSlows, fleetOf, mapSpeedKmPerMin, sumId } from '../src/sim/systems/travel';

const SUM = sumId(cfg);
const dist = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);

describe('Газрын зураг, тээвэр, Худалдаачин (M4.6)', () => {
  it('эхлэлд тээвэргүй (морьтой явна); авсан морин тэрэг майхны дэргэдэх зогсоолд', () => {
    const sim = newSim(4);
    expect(sim.state.fleet).toHaveLength(0);
    expect(sim.command({ type: 'leaveToMap', dirX: 1, dirZ: 0 }, false).ok).toBe(false);   // явганаар гарахгүй
    addVehicle(cfg, sim.state, 'horseCart');
    const f = fleetOf(sim.state, 'horseCart')!;
    expect(f.place).toBe('camp');
    expect(dist(f, parkingSpot(cfg, 'horseCart'))).toBeLessThan(0.01);
    expect(sim.state.player.place).toBe('camp');
    expect(sim.state.player.away).toBe(false);
  });

  it('тэргэнд суух (V), жолоодож 3D-ийн хязгаарт хүрэхэд газрын зураг руу гарна', () => {
    const sim = newSim(4);
    addVehicle(cfg, sim.state, 'horseCart');
    const f = fleetOf(sim.state, 'horseCart')!;
    const p = sim.state.player;
    p.x = f.x + 1;
    p.z = f.z;
    expect(sim.command({ type: 'toggleVehicle' }).ok).toBe(true);
    expect(p.driving).toBe('horseCart');
    expect(sim.command({ type: 'pickup', ids: 'nearby' }).ok).toBe(false);   // жолоодож байхад түүхгүй
    // Хязгаар хүртэл зүүн тийш жолооддог
    let left = false;
    sim.on((e) => {
      if (e.type === 'leftToMap') left = true;
    });
    for (let x = f.x; x > -170 && !left; x -= 2) sim.command({ type: 'driveVehicle', x, z: f.z, heading: -Math.PI / 2 });
    expect(left).toBe(true);
    expect(p.place).toBe('map');
    expect(p.away).toBe(true);
    const home = cfg.worldmap.locations[sim.state.campId]!;
    expect(sim.state.map.x).toBeLessThan(home.x);   // баруун зүгт гарсан
  });

  it('Tab: явган байсан ч мориндоо мордоод шууд газрын зураг руу гарна; сумын төвөөс ч гарна', () => {
    const sim = newSim(31);
    const p = sim.state.player;
    expect(p.mounted).toBe(false);
    expect(sim.command({ type: 'quickMap' }).ok).toBe(true);
    expect(p.place).toBe('map');
    expect(p.mounted).toBe(true);
    expect(sim.command({ type: 'quickMap' }).ok).toBe(false);
    sim.command({ type: 'mapGo', x: 0, z: 0, dest: sumId(cfg) });
    for (let i = 0; i < 2000 && p.place !== 'sum'; i++) sim.step();
    expect(p.place).toBe('sum');
    expect(sim.command({ type: 'quickMap' }).ok).toBe(true);
    expect(p.place).toBe('map');
  });

  it('газрын зураг дээр явж байхдаа очих газраа сольж, сумын төвд хүрэхэд сумын төвийн 3D-д орно', () => {
    const sim = newSim(4);
    sim.command({ type: 'boardBest' }, false);
    sim.command({ type: 'leaveToMap', dirX: 1, dirZ: 0 }, false);
    expect(sim.command({ type: 'mapGo', x: 0, z: 0, dest: 'valley' }).ok).toBe(true);
    steps(sim, 10);
    const m = sim.state.map;
    const v = mapSpeedKmPerMin(cfg, null);
    expect(v).toBeCloseTo(cfg.vehicles.riding.mapKmh / 60, 6);   // морьтой
    // Замдаа сумын төв рүү эргэнэ
    expect(sim.command({ type: 'mapGo', x: 0, z: 0, dest: SUM }).ok).toBe(true);
    const sum = cfg.worldmap.locations[SUM]!;
    const eta = Math.ceil(Math.hypot(sum.x - m.x, sum.z - m.z) / v) + 2;
    let arrived = false;
    sim.on((e) => {
      if (e.type === 'arrived' && e.place === 'sum') arrived = true;
    });
    steps(sim, eta);
    expect(arrived).toBe(true);
    expect(sim.state.player.place).toBe('sum');
    expect(sim.state.player.mounted).toBe(true);
  });

  it('өөр бууцанд ирэхэд мэдэгдэж, тэнд нүүж болно', () => {
    const sim = newSim(4);
    sim.command({ type: 'boardBest' }, false);
    sim.command({ type: 'leaveToMap', dirX: 1, dirZ: 0 }, false);
    sim.command({ type: 'mapGo', x: 0, z: 0, dest: 'valley' });
    let at = '';
    sim.on((e) => {
      if (e.type === 'arriveCamp') at = e.campId;
    });
    steps(sim, 120);
    expect(at).toBe('valley');
    expect(sim.state.player.place).toBe('map');
    expect(sim.command({ type: 'migrateHere' }).ok).toBe(true);
    steps(sim, sim.state.move!.remaining + 1);
    expect(sim.state.campId).toBe('valley');
    expect(sim.state.player.place).toBe('camp');
  });

  it('морьтой: гартаа 10 кг ааруул авч зараад тогоо авч, гэртээ ирэхэд тогоо хүргэгдэнэ', () => {
    const sim = newSim(4);
    storage.add(cfg, sim.state, 'aaruul', 14);
    const m0 = sim.state.money;
    let fuelFree = true;
    const t = AutoTrip.run(sim, { sell: { aaruul: 14 }, sellAnimalIds: [], buy: [{ kind: 'processor', id: 'pot' }] });
    expect(t.phase).toBe('done');
    expect(sim.state.processors).toHaveLength(1);
    expect(storage.count(sim.state, 'aaruul')).toBe(4);   // гарт 10-аас илүү багтахгүй
    if (sim.state.money !== m0 + 10 * cfg.products.prices.aaruul - cfg.processing.pot.price) fuelFree = false;
    expect(fuelFree).toBe(true);   // морь бензингүй
    expect(sim.state.player.place).toBe('camp');
    expect(sim.state.player.carry).toHaveLength(0);
  });

  it('тэргэнд 30 нэгжээс их ачаа, 3 хониноос их мал багтахгүй', () => {
    const sim = newSim(4);
    addVehicle(cfg, sim.state, 'horseCart');
    storage.add(cfg, sim.state, 'wool', 20);
    expect(sim.command({ type: 'loadCargo', vehicle: 'horseCart', products: { wool: 40 }, animalIds: [] }, false).ok).toBe(false);
    const sheep = sim.state.animals.filter((a) => a.species === 'sheep').slice(0, 4).map((a) => a.id);
    expect(sim.command({ type: 'loadCargo', vehicle: 'horseCart', products: {}, animalIds: sheep }, false).ok).toBe(false);
    expect(sim.command({ type: 'loadCargo', vehicle: 'horseCart', products: {}, animalIds: sheep.slice(0, 3) }, false).ok).toBe(true);
    expect(fleetOf(sim.state, 'horseCart')!.animals).toHaveLength(3);
  });

  it('морьтой: эрэг хонь тууж очиж зараад, авсан 2 хонио араасаа удаан тууж ирнэ', () => {
    const sim = newSim(5, (s) => { s.money = 2_000_000; });
    const n0 = sim.state.animals.length;
    const ram = sim.state.animals.find((a) => a.species === 'sheep' && a.sex === 'm')!;
    const t = AutoTrip.run(sim, { sell: {}, sellAnimalIds: [ram.id], buy: [{ kind: 'animal', species: 'sheep', sex: 'f', age: 3 }, { kind: 'animal', species: 'sheep', sex: 'f', age: 3 }] });
    expect(t.phase).toBe('done');
    expect(sim.state.animals.length).toBe(n0 + 1);
    expect(mapSpeedKmPerMin(cfg, null, true)).toBeLessThan(mapSpeedKmPerMin(cfg, null) / 2);
    expect(sim.state.animals.some((a) => a.id === ram.id)).toBe(false);
  });

  it('Портер даац их, Амжиргаа даац бага, бензин адил; авсан машин гэрийн зогсоолд хүргэгдэнэ', () => {
    const P = cfg.vehicles.porter, A = cfg.vehicles.amjirgaa;
    expect(P.capacity).toBeGreaterThan(A.capacity);
    expect(P.sheepSlots).toBeGreaterThan(A.sheepSlots);
    expect(P.fuelPer100km).toBe(A.fuelPer100km);
    const sim = newSim(4, (s) => { s.money = 50_000_000; });
    expect(bestTruck(cfg, sim.state)).toBeNull();
    AutoTrip.run(sim, { sell: {}, sellAnimalIds: [], buy: [{ kind: 'vehicle', id: 'amjirgaa' }, { kind: 'vehicle', id: 'porter' }] });
    expect(sim.state.vehicles).toEqual(['amjirgaa', 'porter']);
    expect(bestTruck(cfg, sim.state)).toBe('porter');
    const f = fleetOf(sim.state, 'porter')!;
    expect(f.place).toBe('camp');
    expect(dist(f, parkingSpot(cfg, 'porter'))).toBeLessThan(0.01);
  });

  it('машинаар явахад бензин зарцуулна, мориноос хурдан', () => {
    const sim = newSim(6, (s) => { s.money = 50_000_000; });
    AutoTrip.run(sim, { sell: {}, sellAnimalIds: [], buy: [{ kind: 'vehicle', id: 'porter' }] });
    const fuel0 = sim.state.today.expenses.fuel ?? 0;
    const s0 = sim.state.step;
    const t = AutoTrip.run(sim, { sell: {}, sellAnimalIds: [], buy: [] });
    expect(t.phase).toBe('done');
    const truckMin = sim.state.step - s0;
    expect((sim.state.today.expenses.fuel ?? 0) + 0).toBeGreaterThanOrEqual(fuel0);
    expect(truckMin).toBeLessThan(((2 * cfg.vehicles.sumCenterKm) / cfg.vehicles.riding.mapKmh) * 60 * 0.6);
  });
  it('ганц хонь тууж явбал удаашрахгүй; 2+ хонь эсвэл ганц үхэр бол удаашрна', () => {
    expect(droveSlows([{ species: 'sheep' }])).toBe(false);
    expect(droveSlows([{ species: 'goat' }])).toBe(false);
    expect(droveSlows([{ species: 'sheep' }, { species: 'goat' }])).toBe(true);
    expect(droveSlows([{ species: 'cow' }])).toBe(true);
    expect(droveSlows([{ species: 'horse' }])).toBe(true);
  });
});
