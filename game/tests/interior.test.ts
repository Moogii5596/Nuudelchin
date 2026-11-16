import { describe, expect, it } from 'vitest';
import { cfg, newSim, steps } from './helpers';
import { migrateState, SAVE_VERSION } from '../src/sim/state';
import { nearTradeDoor, sumDoors } from '../src/sim/systems/sumtown';
import { nearTownDoor, plotDoors } from '../src/sim/systems/town';
import {
  atCounter, atExit, campEnterDoors, currentRoom, enterDoors, interiorService, nearEnterDoor, sumEnterDoors, validateInteriors,
} from '../src/sim/systems/interior';
import type { Sim } from '../src/sim/sim';

/** Тоглогчийг сумын төвийн (x, z) цэгт тавина */
function atSum(sim: Sim, x: number, z: number): void {
  const p = sim.state.player;
  p.place = 'sum';
  p.away = true;
  p.x = x;
  p.z = z;
}

describe('Орж болдог барилга (V6.1)', () => {
  it('data/interiors.json зөв; орох хаалга бүрт өрөө, үйлчилгээтэй барилгад лангуу бий', () => {
    expect(validateInteriors(cfg)).toEqual([]);
    const kinds = new Set(sumEnterDoors(cfg).map((e) => cfg.sumcenter && e.door.room));
    for (const r of ['school', 'temple', 'admin', 'bank', 'culture', 'kindergarten', 'teahouse', 'shop', 'houseA', 'houseB', 'houseC']) expect(kinds.has(r), r).toBe(true);
    // Хашааны хаалга (мал зах) орох хаалга биш
    expect(sumEnterDoors(cfg).some((e) => e.door.id === 'market')).toBe(false);
    expect(plotDoors(cfg).length).toBeGreaterThan(0);
  });

  it('өөрийн гэрт орж гарна; майхан орохгүй; хадгалалтын талбар state-д', () => {
    const sim = newSim(1, (s) => (s.home = 'ger'));
    const p = sim.state.player;
    p.x = 20;
    p.z = 20;
    expect(sim.command({ type: 'enterBuilding' }).ok).toBe(false);   // хаалгаас хол
    const door = campEnterDoors(cfg, sim.state).find((d) => d.id === 'home')!;
    p.x = door.x + 1;
    p.z = door.z;
    expect(nearEnterDoor(cfg, sim.state)?.id).toBe('home');
    expect(sim.command({ type: 'enterBuilding' }).ok).toBe(true);
    expect(p.interior).toMatchObject({ door: 'home', room: 'ger' });
    expect(p.place).toBe('camp');
    expect(p.x).toBe(door.x);
    // дотор алхах: хана хүртэл
    sim.command({ type: 'moveInterior', x: 50, z: 50, heading: 1 });
    const room = currentRoom(cfg, sim.state)!;
    expect(Math.hypot(p.interior!.x, p.interior!.z)).toBeLessThanOrEqual(room.r! - cfg.interiors.bodyR + 1e-6);
    // хаалганаас хол байхад E-ээр гарахгүй; ойр бол гарна
    sim.command({ type: 'moveInterior', x: 0, z: -2 });
    expect(atExit(cfg, sim.state)).toBe(false);
    expect(sim.command({ type: 'exitBuilding' }).ok).toBe(false);
    sim.command({ type: 'moveInterior', x: room.exit[0], z: room.exit[1] });
    expect(atExit(cfg, sim.state)).toBe(true);
    expect(sim.command({ type: 'exitBuilding' }).ok).toBe(true);
    expect(p.interior).toBeNull();
    expect(p.x).toBe(door.x);

    const tent = newSim(1, (s) => (s.home = 'tent'));
    expect(campEnterDoors(cfg, tent.state).some((d) => d.id === 'home')).toBe(false);
  });

  it('туслахын гэр, айлын гэрт орно; майхан орохгүй', () => {
    const sim = newSim(2, (s) => {
      s.home = 'ger';
      s.helpers.dwellings.push({ kind: 'helperGer', x: -16, z: 12 }, { kind: 'helperTent', x: -18, z: -8 }, { kind: 'familyGer', x: -6, z: 22, familyId: 1 });
    });
    const doors = enterDoors(cfg, sim.state);
    expect(doors.map((d) => d.room).sort()).toEqual(['ger', 'ger', 'helperGer']);   // өөрийн, айлын, туслахын (майхан үгүй)
    const hg = doors.find((d) => d.room === 'helperGer')!;
    sim.state.player.x = hg.x;
    sim.state.player.z = hg.z;
    expect(sim.command({ type: 'enterBuilding' }).ok).toBe(true);
    expect(sim.state.player.interior?.door).toBe(hg.id);
  });

  it('сумын төвийн орж болох барилга бүрт орж гарна', () => {
    const sim = newSim(3);
    const owned = Object.fromEntries(plotDoors(cfg).map((d) => [d.id, { mode: 'empty' as const }]));
    sim.state.town.houses = owned as typeof sim.state.town.houses;
    for (const { door } of sumEnterDoors(cfg)) {
      atSum(sim, door.x, door.z + 0.5);
      const r = sim.command({ type: 'enterBuilding', door: door.id });
      expect(r.ok, `${door.id}: ${r.msg?.key}`).toBe(true);
      expect(sim.state.player.interior?.room).toBe(cfg.interiors.idRoom[`${door.id}:owned`] ?? door.room);   // зарах байшин: авсны дараа тавилгатай өрөө
      expect(sim.command({ type: 'exitBuilding', force: true }).ok).toBe(true);
      expect(sim.state.player.interior).toBeNull();
      expect(sim.state.player.x).toBe(door.x);
    }
  });

  it('зарагдаагүй байшин хоосон өрөөтэй (V3.5), авсны дараа тавилгатай; хамаатны гэрт орно; морьтой/жолоодож байхад орохгүй', () => {
    const sim = newSim(4);
    const sale = plotDoors(cfg).find((d) => d.role === 'house')!;
    const rel = plotDoors(cfg).find((d) => d.role === 'relative')!;
    atSum(sim, sale.x, sale.z);
    expect(sim.command({ type: 'enterBuilding' }).ok).toBe(true);
    expect(sim.state.player.interior?.room).toBe('houseB');   // хоосон
    sim.command({ type: 'exitBuilding', force: true });
    sim.state.town.houses[sale.id] = { mode: 'empty' };
    expect(sim.command({ type: 'enterBuilding' }).ok).toBe(true);
    expect(sim.state.player.interior?.room).toBe('houseBf');   // тавилгатай
    sim.command({ type: 'exitBuilding', force: true });
    atSum(sim, rel.x, rel.z);
    sim.state.player.mounted = true;
    expect(sim.command({ type: 'enterBuilding' }).msg?.key).toBe('sim.dismount');
    sim.state.player.mounted = false;
    expect(sim.command({ type: 'enterBuilding' }).ok).toBe(true);
  });

  it('худалдаа, цонх дотроос ч ажиллана (хаалганы цэг хэвээр, лангуунд E)', () => {
    const sim = newSim(5);
    const shop = sumEnterDoors(cfg).find((e) => e.role === 'feed')!.door;
    atSum(sim, shop.x, shop.z);
    sim.command({ type: 'enterBuilding' });
    const room = currentRoom(cfg, sim.state)!;
    // дотор ч дэлгүүрийн хаалга ойр гэж тооцогдоно → зарах/авах команд ажиллана
    expect(nearTradeDoor(cfg, sim.state)?.id).toBe(shop.id);
    expect(interiorService(cfg, sim.state)).toBeNull();   // орох цэг лангуунаас хол
    sim.command({ type: 'moveInterior', x: room.counter![0], z: room.counter![1] });
    expect(atCounter(cfg, sim.state)).toBe(true);
    expect(interiorService(cfg, sim.state)).toBe('shop');

    // дуганд хандив: дотор лангууны дэргэдээс
    const temple = sumEnterDoors(cfg).find((e) => e.role === 'temple')!.door;
    sim.command({ type: 'exitBuilding', force: true });
    atSum(sim, temple.x, temple.z);
    sim.command({ type: 'enterBuilding' });
    expect(nearTownDoor(cfg, sim.state)?.id).toBe(temple.id);
    expect(interiorService(cfg, sim.state)).toBeNull();
    const t = currentRoom(cfg, sim.state)!;
    sim.command({ type: 'moveInterior', x: t.counter![0], z: t.counter![1] });
    expect(interiorService(cfg, sim.state)).toBe('town');
    sim.state.money = 1_000_000;
    const rep = sim.state.town.reputation, amount = cfg.town.temple.donations[0]!;
    expect(sim.command({ type: 'donate', amount }).ok).toBe(true);
    expect(sim.state.money).toBe(1_000_000 - amount);
    expect(sim.state.town.reputation).toBeGreaterThanOrEqual(rep);
  });

  it('орж гарахад тоглолт тасрахгүй: дотор цаг явна, гадаад үйлдэл автоматаар гаргана', () => {
    const sim = newSim(6, (s) => (s.home = 'ger'));
    const p = sim.state.player;
    const door = campEnterDoors(cfg, sim.state)[0]!;
    p.x = door.x;
    p.z = door.z;
    sim.command({ type: 'enterBuilding' });
    const step0 = sim.state.step;
    steps(sim, 120);
    expect(sim.state.step).toBe(step0 + 120);
    expect(p.interior).not.toBeNull();
    expect(p.place).toBe('camp');
    // гадна ертөнцийн үйлдэл: эхлээд гарна
    expect(sim.command({ type: 'movePlayer', x: door.x + 3, z: door.z, heading: 0 }).ok).toBe(true);
    expect(p.interior).toBeNull();
    expect(p.x).toBe(door.x + 3);
    // дахин орж, газрын зураг руу гарахад автоматаар гарна
    p.x = door.x;
    p.z = door.z;
    sim.command({ type: 'enterBuilding' });
    sim.command({ type: 'quickMap' });
    expect(p.interior).toBeNull();
  });

  it('орсон хаалга алга болбол гаднаа гарна (туслах халах, ачаалсан хадгалалт)', () => {
    const sim = newSim(8, (s) => {
      s.home = 'ger';
      s.helpers.list.push({ id: 1, family: true, familyId: 5 } as never);
      s.helpers.dwellings.push({ kind: 'familyGer', x: -6, z: 22, familyId: 5 });
    });
    const d = campEnterDoors(cfg, sim.state).find((x) => x.room === 'ger' && x.id !== 'home')!;
    sim.state.player.x = d.x;
    sim.state.player.z = d.z;
    expect(sim.command({ type: 'enterBuilding' }).ok).toBe(true);
    expect(sim.state.player.interior?.door).toBe(d.id);
    expect(sim.command({ type: 'fireHelper', helper: 1 }).ok).toBe(true);
    expect(sim.state.helpers.dwellings.some((x) => x.familyId === 5)).toBe(false);
    expect(sim.state.player.interior).toBeNull();
    // ачаалсан хадгалалтад байхгүй хаалга
    const bad = newSim(9, (s) => {
      s.player.interior = { door: 'nope', room: 'ger', x: 0, z: 0, heading: 0 };
    });
    expect(bad.state.player.interior).toBeNull();
  });

  it('хадгалалт: interior JSON-д орно, хуучин (v11) хадгалалт null болно', () => {
    const sim = newSim(7, (s) => (s.home = 'ger'));
    const door = campEnterDoors(cfg, sim.state)[0]!;
    sim.state.player.x = door.x;
    sim.state.player.z = door.z;
    sim.command({ type: 'enterBuilding' });
    const saved = JSON.parse(JSON.stringify(sim.state));
    expect(saved.version).toBe(SAVE_VERSION);
    expect(saved.player.interior).toMatchObject({ door: 'home', room: 'ger' });
    expect(migrateState(structuredClone(saved)).player.interior).toMatchObject({ door: 'home' });
    const old = structuredClone(saved);
    old.version = 11;
    delete old.player.interior;
    const m = migrateState(old);
    expect(m.player.interior).toBeNull();
    expect(m.version).toBe(SAVE_VERSION);
    expect(sumDoors(cfg).length).toBeGreaterThan(0);
  });
});
