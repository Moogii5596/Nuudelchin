/**
 * M6.13 Гэрийн хэмжээ: эхлэл бага 4 ханат, шат data/ger.json sizes-тай нэг эх сурвалж, томсгох = худалдан авалт (сольж авах),
 * state.homeSize → хаалганы цэг, дотор өрөө, багтаамж, нүүх хугацаа, хамгаалалтын бүс; хадгалалт, migrate.
 */
import { describe, expect, it } from 'vitest';
import { cfg, newSim } from './helpers';
import { Rng } from '../src/sim/rng';
import { createInitialState, MIGRATIONS, SAVE_VERSION } from '../src/sim/state';
import { deliver, orderPrice } from '../src/sim/systems/trip';
import { gerDoorOffset, gerLadder, gerRadiusFor, gerUpgradePrice, gerBoxes, gerInnerRadius } from '../src/sim/systems/gerLayout';
import { campEnterDoors, clampToRoom, currentRoom, roomSpec } from '../src/sim/systems/interior';
import { capacity } from '../src/sim/systems/storage';
import { moveHours } from '../src/sim/systems/camps';
import { protectionZones } from '../src/sim/systems/wolves';
import { deserialize, serialize, validateState, SaveError } from '../src/sim/save';
import { GER } from '../src/render/ger/config';

const SIZES = gerLadder(cfg.ger);

describe('Гэрийн хэмжээний шат (data/ger.json)', () => {
  it('эхлэл: бага 4 ханат гэр (майхан биш), хэмжээ data/ger.json-оос', () => {
    const st = createInitialState(cfg, 1);
    expect(cfg.start.home).toBe('ger');
    expect(st.home).toBe('ger');
    expect(st.homeSize).toBe('small4');
    expect(SIZES).toEqual(['small4', 'big4', 'small5', 'big5', 'w6', 'w8']);
    expect(GER.sizes.small4!.walls).toBe(4);
    expect(GER.sizes.w8!.walls).toBe(8);
  });

  it('үнэ, ханын тоо, багтаамж, нүүх үржвэр шат дагуу өсөнө; том 4 ханат 6 400 000₮', () => {
    let prev = null as null | (typeof cfg.ger.sizes)[string];
    for (const k of SIZES) {
      const z = cfg.ger.sizes[k]!;
      if (prev) {
        expect(z.price, k).toBeGreaterThan(prev.price);
        expect(z.storage, k).toBeGreaterThanOrEqual(prev.storage);
        expect(z.moveMult, k).toBeGreaterThanOrEqual(prev.moveMult);
        expect(z.diameter, k).toBeGreaterThan(prev.diameter);
      }
      prev = z;
    }
    expect(cfg.ger.sizes.big4!.price).toBe(6_400_000);
    expect(cfg.ger.sizes.small4!.storage).toBe(0);
    expect(cfg.ger.sizes.small4!.moveMult).toBe(1);
  });

  it('gerUpgradePrice: гэргүйгээс бүтэн үнэ, томсгохдоо одоогийнхыг tradeIn-ээр хасна, жижиг/ижил хэмжээ боломжгүй', () => {
    const g = cfg.ger;
    expect(gerUpgradePrice(g, null, 'small4')).toBe(g.sizes.small4!.price);
    expect(gerUpgradePrice(g, 'small4', 'big4')).toBe(g.sizes.big4!.price - Math.round(g.sizes.small4!.price * g.upgrade.tradeIn));
    expect(gerUpgradePrice(g, 'big4', 'small4')).toBe(Infinity);
    expect(gerUpgradePrice(g, 'big4', 'big4')).toBe(Infinity);
    expect(gerUpgradePrice(g, 'big4', 'nope')).toBe(Infinity);
  });
});

describe('Томсгох = худалдан авалт → state.homeSize → хаалга, өрөө, багтаамж, нүүлт, бүс', () => {
  it('захиалгын үнэ ба хүргэлт: homeSize солигдож, дахин жижиг руу буцахгүй', () => {
    const sim = newSim(1);
    const st = sim.state;
    const order = { kind: 'ger' as const, size: 'big4' };
    expect(orderPrice(cfg, st, order)).toBe(gerUpgradePrice(cfg.ger, 'small4', 'big4'));
    expect(orderPrice(cfg, st, { kind: 'ger', size: 'small4' })).toBe(Infinity);
    deliver(cfg, st, new Rng(1), [order]);
    expect(st.home).toBe('ger');
    expect(st.homeSize).toBe('big4');
    expect(orderPrice(cfg, st, { kind: 'ger', size: 'small5' })).toBe(gerUpgradePrice(cfg.ger, 'big4', 'small5'));
    // майханаас гэрт: бүтэн үнэ
    const tent = newSim(2, (s) => (s.home = 'tent'));
    expect(orderPrice(cfg, tent.state, { kind: 'ger', size: 'small4' })).toBe(cfg.ger.sizes.small4!.price);
  });

  for (const size of SIZES) {
    it(`${size}: хаалганы цэг, дотор өрөө, агуулахын багтаамж, нүүх хугацаа, бүс хэмжээгээр`, () => {
      const sim = newSim(3, (s) => { s.home = 'ger'; s.homeSize = size; });
      const st = sim.state;
      const z = cfg.ger.sizes[size]!;
      // хаалга
      const door = campEnterDoors(cfg, st).find((d) => d.id === 'home')!;
      expect(door.z).toBeCloseTo(cfg.camps.home.z + gerDoorOffset(cfg.ger, size), 9);
      // өрөө
      const room = roomSpec(cfg, 'ger', size)!;
      expect(room.r).toBeCloseTo(gerInnerRadius(cfg.ger, size), 9);
      expect(room.obstacles!.length).toBe(gerBoxes(cfg.ger, size).length);
      for (const [x, zz] of [room.entry, room.exit]) {
        const c = clampToRoom(cfg, room, x, zz);
        expect(Math.hypot(c.x - x, c.z - zz), `${size} ${x},${zz}`).toBeLessThan(0.1);
      }
      // орсон байдал: currentRoom state-ийн хэмжээгээр
      st.player.x = door.x; st.player.z = door.z;
      expect(sim.command({ type: 'enterBuilding' }).ok).toBe(true);
      expect(currentRoom(cfg, st)!.r).toBeCloseTo(room.r!, 9);
      // багтаамж
      expect(capacity(cfg, st)).toBe((cfg.storage.levels[st.storageLevel]?.capacity ?? 0) + z.storage);
      // нүүх хугацаа
      expect(moveHours(cfg, st, true)).toBeCloseTo(Number(cfg.camps.move.truckHoursGer) * z.moveMult, 9);
      // хамгаалалтын бүс
      const zone = protectionZones(cfg, st).find((q) => q.kind === 'home')!;
      expect(zone.r).toBeCloseTo(gerRadiusFor(cfg.ger, cfg.wolves.protectRadius.ger, size), 9);
    });
  }

  it('бага 4 ханат: гэрийн радиус өмнөх тоотой ижил (2.5), хамгаалалтын бүс өөрчлөгдөөгүй', () => {
    expect(gerRadiusFor(cfg.ger, cfg.camps.home.gerRadius, 'small4')).toBeCloseTo(cfg.camps.home.gerRadius, 9);
    expect(gerRadiusFor(cfg.ger, cfg.wolves.protectRadius.ger, 'small4')).toBeCloseTo(cfg.wolves.protectRadius.ger, 9);
    expect(gerRadiusFor(cfg.ger, 2.5, 'w8')).toBeGreaterThan(gerRadiusFor(cfg.ger, 2.5, 'big4'));
  });
});

describe('Хадгалалт: homeSize, migrate 14 → 15', () => {
  it('homeSize хадгалагдаж ачаалагдана; мэдэгдэхгүй хэмжээг татгалзана', () => {
    const sim = newSim(4, (s) => { s.homeSize = 'big5'; });
    expect(deserialize(cfg, serialize(sim.state)).homeSize).toBe('big5');
    const bad = JSON.parse(serialize(sim.state)) as { state: { homeSize: string } };
    bad.state.homeSize = 'huge';
    expect(() => deserialize(cfg, JSON.stringify(bad))).toThrow(SaveError);
    expect(validateState(cfg, sim.state)).toEqual([]);
  });

  it('v14 хадгалалт: homeSize = small4, хүлээгдэж буй ger захиалгад size нөхөгдөнө', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(15);
    const sim = newSim(5);
    sim.state.player.orders.push({ kind: 'ger', size: 'big4' });
    const old = JSON.parse(JSON.stringify(sim.state)) as Record<string, unknown> & { player: { orders: { kind: string; size?: string }[] }; version: number };
    delete old.homeSize;
    delete old.player.orders[0]!.size;
    old.version = 14;
    const st = deserialize(cfg, JSON.stringify(old));
    expect(st.version).toBe(SAVE_VERSION);
    expect(st.homeSize).toBe(cfg.ger.home.size);
    expect(st.player.orders[0]).toEqual({ kind: 'ger', size: 'small4' });
    expect(MIGRATIONS[14]).toBeTypeOf('function');
  });
});

describe('Гол замын тэмдэг (mvp-spec §10.2): том гэр (≥ 5 ханат) + 40 хонин толгой', () => {
  const dayReport = (size: string, homeKind: 'ger' | 'tent', animals: number): boolean => {
    const sim = newSim(6, (s) => { s.home = homeKind; s.homeSize = size; });
    sim.command({ type: 'debugAddAnimals', n: animals });
    let goal = false;
    sim.on((e) => { if (e.type === 'dayReport') goal = e.report.goalReached; });
    sim.runDays(1);
    return goal;
  };
  it('эхлэл (бага 4 ханат) ба том 4 ханат + олон мал = зорилгод хүрээгүй; 5 ханат + 40 хонин толгой = хүрсэн; хонь цөөн бол үгүй', () => {
    expect(cfg.economy.goalGerWalls).toBe(5);
    expect(dayReport('small4', 'ger', 80)).toBe(false);
    expect(dayReport('big4', 'ger', 80)).toBe(false);
    expect(dayReport('small5', 'ger', 80)).toBe(true);
    expect(dayReport('w8', 'ger', 80)).toBe(true);
    expect(dayReport('small5', 'ger', 0)).toBe(false);
    expect(dayReport('small5', 'tent', 80)).toBe(false);
  }, 60_000);
});
