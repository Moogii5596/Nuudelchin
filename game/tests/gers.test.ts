/**
 * M6.13 Олон гэр (mvp-spec §3.2): гэр бүр (гол гэр ч) 1 ганц бие туслахын ор, хэмжээ орны тоонд нөлөөлөхгүй; нэмэлт гэрийг хэмжээгээр
 * сонгож худалдан авна (хотын сул цэгт); гэр зарах = үнийн 50%, сүүлийн гэрийг зарахгүй; нүүх хугацаа/шатахуун/багтаамж = гэр бүрийн нийлбэр;
 * айлын туслахын гэр тоонд ордоггүй; хуучин helperGer/helperTent → migrate-ээр гэр.
 */
import { describe, expect, it } from 'vitest';
import { cfg, newSim } from './helpers';
import { Rng } from '../src/sim/rng';
import { deserialize, serialize, validateState } from '../src/sim/save';
import { SAVE_VERSION } from '../src/sim/state';
import { bedsTotal, bedsUsed, refreshCandidates } from '../src/sim/systems/helpers';
import { deliver, orderPrice } from '../src/sim/systems/trip';
import { gerCount, gerSellPrice, moveMultSum, ownGers, sellGer, gerSizeOfDoor, extraDoorId, sellableGers } from '../src/sim/systems/ownGers';
import { moveHours } from '../src/sim/systems/camps';
import { capacity } from '../src/sim/systems/storage';
import { campEnterDoors, currentRoom } from '../src/sim/systems/interior';
import { gerInnerRadius } from '../src/sim/systems/gerLayout';
import { protectionZones } from '../src/sim/systems/wolves';

type S = ReturnType<typeof newSim>;

function hireSingle(sim: S): { ok: boolean; key?: string } {
  const st = sim.state;
  for (let k = 0; k < 60; k++) {
    refreshCandidates(cfg, st);
    const c = st.helpers.candidates.find((x) => !x.family);
    if (c) {
      const r = sim.command({ type: 'hire', candidate: c.id }, false);
      return { ok: r.ok, key: r.msg?.key };
    }
    st.helpers.candidatesDay -= 100;
    st.time.day += 1;
  }
  throw new Error('ганц бие нэр дэвшигч олдсонгүй');
}

describe('Гэрийн тоо = ганц бие туслахын тоо', () => {
  it('1 гэр → 1 туслах; 2 гэр → 2 туслах; 3 дахь нь татгалзана; хэмжээ нөлөөлөхгүй', () => {
    const sim = newSim(1, (s) => { s.money = 9e6; s.homeSize = 'w8'; });
    expect(bedsTotal(cfg, sim.state)).toBe(1);   // том гэр ч 1 ор
    expect(hireSingle(sim).ok).toBe(true);
    expect(hireSingle(sim)).toMatchObject({ ok: false, key: 'sim.a_single_helper_needs' });
    deliver(cfg, sim.state, new Rng(1), [{ kind: 'gerAdd', size: 'small4' }]);
    expect(bedsTotal(cfg, sim.state)).toBe(2);
    expect(hireSingle(sim).ok).toBe(true);
    expect(bedsUsed(sim.state)).toBe(2);
    expect(hireSingle(sim)).toMatchObject({ ok: false, key: 'sim.a_single_helper_needs' });
    // гол гэрийг томсгосон ч ор нэмэгдэхгүй
    deliver(cfg, sim.state, new Rng(1), [{ kind: 'ger', size: 'w8' }]);
    expect(bedsTotal(cfg, sim.state)).toBe(2);
  }, 60_000);

  it('айлын туслах: өөрийн гэртэй (тоонд ордоггүй), ор шаарддаггүй; гэрийн тоо өөрчлөгдөхгүй', () => {
    const sim = newSim(2, (s) => { s.money = 9e6; });
    const st = sim.state;
    let fam = null;
    for (let k = 0; k < 60 && !fam; k++) {
      refreshCandidates(cfg, st);
      fam = st.helpers.candidates.find((c) => c.family) ?? null;
      if (!fam) { st.helpers.candidatesDay -= 100; st.time.day += 1; }
    }
    expect(sim.command({ type: 'hire', candidate: fam!.id }, false).ok).toBe(true);
    expect(st.helpers.dwellings.some((d) => d.kind === 'familyGer')).toBe(true);
    expect(gerCount(cfg, st)).toBe(1);
    expect(bedsTotal(cfg, st)).toBe(1);
    expect(ownGers(cfg, st)).toHaveLength(1);
    expect(sellableGers(cfg, st)).toEqual([]);   // нэг л гэр → зарагдахгүй; айлын гэр жагсаалтад үгүй
  });
});

describe('Нэмэлт гэр худалдан авах', () => {
  it('хэмжээг сонгож, үнэ = хэмжээний үнэ; хотын сул цэгт автоматаар; майхантай бол боломжгүй', () => {
    const sim = newSim(3);
    const st = sim.state;
    expect(orderPrice(cfg, st, { kind: 'gerAdd', size: 'big5' })).toBe(cfg.ger.sizes.big5!.price);
    deliver(cfg, st, new Rng(1), [{ kind: 'gerAdd', size: 'big5' }, { kind: 'gerAdd', size: 'w6' }]);
    expect(st.extraGers.map((g) => g.size)).toEqual(['big5', 'w6']);
    const [a, b] = st.extraGers;
    expect(Math.hypot(a!.x - b!.x, a!.z - b!.z)).toBeGreaterThan(1);   // давхцахгүй
    const tent = newSim(4, (s) => { s.home = 'tent'; });
    expect(orderPrice(cfg, tent.state, { kind: 'gerAdd', size: 'small4' })).toBe(Infinity);
  });
});

describe('Гэр зарах', () => {
  it('үнийн 50%; нэмэлт гэрийг зарна; сүүлийн гэрийг зарахгүй; гол гэрийг зарвал нэмэлт нь гол болно', () => {
    const sim = newSim(5, (s) => { s.homeSize = 'big4'; s.money = 0; });
    const st = sim.state;
    expect(sellGer(cfg, st, 0, false)?.key).toBe('sim.you_cannot_sell_the_last_ger');
    deliver(cfg, st, new Rng(1), [{ kind: 'gerAdd', size: 'small5' }]);
    expect(gerSellPrice(cfg, 'small5')).toBe(Math.round(cfg.ger.sizes.small5!.price / 2));
    expect(sellGer(cfg, st, 1, false)).toBeNull();
    expect(st.money).toBe(gerSellPrice(cfg, 'small5'));
    expect(st.extraGers).toHaveLength(0);
    expect(sellGer(cfg, st, 0, false)?.key).toBe('sim.you_cannot_sell_the_last_ger');   // дахиж нэг л гэр
    deliver(cfg, st, new Rng(1), [{ kind: 'gerAdd', size: 'w6' }]);
    expect(sellGer(cfg, st, 0, false)).toBeNull();   // гол гэрийг (big4) зарна
    expect(st.homeSize).toBe('w6');
    expect(st.extraGers).toHaveLength(0);
    expect(st.money).toBe(gerSellPrice(cfg, 'small5') + gerSellPrice(cfg, 'big4'));
    expect(sellGer(cfg, st, 5, false)?.key).toBe('sim.no_such_ger');
  });

  it('командаар: гэр/майхны дэлгүүрийн үүдэнд л (proximity), сүүлийн гэр зарагдахгүй', () => {
    const sim = newSim(6);
    deliver(cfg, sim.state, new Rng(1), [{ kind: 'gerAdd', size: 'small4' }]);
    expect(sim.command({ type: 'sellGer', index: 1 }).msg?.key).toBe('sim.go_to_the_ger_shop');   // дэлгүүрт биш
    expect(sim.command({ type: 'sellGer', index: 1 }, false).ok).toBe(true);
    expect(sim.command({ type: 'sellGer', index: 0 }, false).ok).toBe(false);
  });
});

describe('Олон гэртэй: нүүх, агуулах, бүс, дотор', () => {
  it('нүүх хугацаа = гэр бүрийн moveMult-ийн нийлбэр; багтаамж нийлбэр', () => {
    const sim = newSim(7);
    const st = sim.state;
    const base = moveHours(cfg, st, true);
    expect(moveMultSum(cfg, st)).toBe(cfg.ger.sizes.small4!.moveMult);
    deliver(cfg, st, new Rng(1), [{ kind: 'gerAdd', size: 'big5' }, { kind: 'gerAdd', size: 'w8' }]);
    const sum = cfg.ger.sizes.small4!.moveMult + cfg.ger.sizes.big5!.moveMult + cfg.ger.sizes.w8!.moveMult;
    expect(moveMultSum(cfg, st)).toBeCloseTo(sum, 9);
    expect(moveHours(cfg, st, true)).toBeCloseTo((base / cfg.ger.sizes.small4!.moveMult) * sum, 9);
    expect(capacity(cfg, st)).toBe((cfg.storage.levels[st.storageLevel]?.capacity ?? 0) + cfg.ger.sizes.small4!.storage + cfg.ger.sizes.big5!.storage + cfg.ger.sizes.w8!.storage);
  });

  it('нэмэлт гэр: хамгаалалтын бүс, хаалга (ger|i), дотор өрөө өөрийн хэмжээгээр', () => {
    const sim = newSim(8);
    const st = sim.state;
    deliver(cfg, st, new Rng(1), [{ kind: 'gerAdd', size: 'w6' }]);
    const g = st.extraGers[0]!;
    expect(protectionZones(cfg, st).filter((z) => z.kind === 'home')).toHaveLength(2);
    const door = campEnterDoors(cfg, st).find((d) => d.id === extraDoorId(0))!;
    expect(door).toBeTruthy();
    expect(Math.hypot(door.x - g.x, door.z - g.z)).toBeGreaterThan(cfg.ger.sizes.w6!.diameter / 2);
    expect(gerSizeOfDoor(st, 'home')).toBe('small4');
    expect(gerSizeOfDoor(st, extraDoorId(0))).toBe('w6');
    st.player.x = door.x;
    st.player.z = door.z;
    expect(sim.command({ type: 'enterBuilding', door: door.id }, false).ok).toBe(true);
    expect(currentRoom(cfg, st)!.r).toBeCloseTo(gerInnerRadius(cfg.ger, 'w6'), 9);
  });
});

describe('Хадгалалт: v16 → v17 (helperGer, helperTent → гэр)', () => {
  it('хуучин туслахын байр нэмэлт бага 4 ханат гэр болж, захиалга gerAdd болно; айлын гэр хэвээр', () => {
    const sim = newSim(9);
    const st = sim.state;
    st.helpers.dwellings.push({ kind: 'helperGer', x: -16, z: 12 }, { kind: 'helperTent', x: -18, z: -8 }, { kind: 'familyGer', x: -6, z: 22, familyId: 1 });
    st.player.orders.push({ kind: 'helperTent' } as never);
    const old = JSON.parse(JSON.stringify(st)) as Record<string, unknown> & { version: number };
    delete old.extraGers;
    old.version = 16;
    const back = deserialize(cfg, JSON.stringify(old));
    expect(back.version).toBe(SAVE_VERSION);
    expect(back.extraGers).toEqual([{ size: 'small4', x: -16, z: 12 }, { size: 'small4', x: -18, z: -8 }]);
    expect(back.helpers.dwellings.map((d) => d.kind)).toEqual(['familyGer']);
    expect(back.player.orders[0]).toEqual({ kind: 'gerAdd', size: 'small4' });
    expect(validateState(cfg, back)).toEqual([]);
    expect(bedsTotal(cfg, back)).toBe(3);   // гол гэр + 2
  });

  it('extraGers хадгалагдаж ачаалагдана; мэдэгдэхгүй хэмжээг татгалзана', () => {
    const sim = newSim(10);
    deliver(cfg, sim.state, new Rng(1), [{ kind: 'gerAdd', size: 'big4' }]);
    expect(deserialize(cfg, serialize(sim.state)).extraGers).toEqual(sim.state.extraGers);
    const bad = JSON.parse(serialize(sim.state)) as { state: { extraGers: { size: string }[] } };
    bad.state.extraGers[0]!.size = 'huge';
    expect(() => deserialize(cfg, JSON.stringify(bad))).toThrow();
  });
});
