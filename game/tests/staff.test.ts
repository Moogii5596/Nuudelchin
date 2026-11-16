import { describe, expect, it } from 'vitest';
import { cfg, DAY, newSim, steps } from './helpers';
import { addDwelling, bedsTotal, herderPhase, refreshCandidates, payWages, spareTents, type Candidate } from '../src/sim/systems/helpers';
import { herdSheepUnits } from '../src/sim/systems/animals';
import { protectionZones, isProtected } from '../src/sim/systems/wolves';
import { addVehicle } from '../src/sim/systems/travel';
import * as storage from '../src/sim/systems/storage';
import { morning } from '../src/sim/systems/night';
import { Rng } from '../src/sim/rng';
import type { Sim } from '../src/sim/sim';

/** Тест: цайны газрын нэр дэвшигчээс хөлслөх (ойр байх шаардлагагүй) */
function hireOne(sim: Sim, family: boolean): Candidate {
  const s = sim.state;
  for (let k = 0; k < 30; k++) {
    refreshCandidates(cfg, s);
    const c = s.helpers.candidates.find((x) => x.family === family);
    if (c) {
      const r = sim.command({ type: 'hire', candidate: c.id }, false);
      expect(r.ok, r.msg?.key).toBe(true);
      return c;
    }
    s.helpers.candidatesDay -= 100;   // дахин шинэчлэх
    s.time.day += 1;
  }
  throw new Error('нэр дэвшигч олдсонгүй');
}

describe('Туслах малчид (M5)', () => {
  it('цайны газрын нэр дэвшигч: ганц бие эсвэл айл (малчин + хүүхэд), айлын цалин ×0.8', () => {
    const sim = newSim(1);
    let fam: Candidate | undefined, single: Candidate | undefined;
    for (let d = 0; d < 200 && (!fam || !single); d += 5) {
      sim.state.time.day = d + 1;
      refreshCandidates(cfg, sim.state);
      fam ??= sim.state.helpers.candidates.find((c) => c.family);
      single ??= sim.state.helpers.candidates.find((c) => !c.family);
    }
    expect(single!.members).toHaveLength(1);
    expect(single!.wage).toBe(cfg.helpers.wage.adult);
    expect(fam!.members.some((m) => m.kind === 'child')).toBe(true);
    const sum = fam!.members.reduce((s, m) => s + cfg.helpers.wage[m.kind], 0);
    expect(fam!.wage).toBeCloseTo(sum * cfg.helpers.familyWageMult, -3);
  });

  it('ганц бие туслахад байр хэрэгтэй; айл өөрийн гэртэй ирнэ', () => {
    const sim = newSim(2);
    refreshCandidates(cfg, sim.state);
    let single = sim.state.helpers.candidates.find((c) => !c.family);
    for (let k = 0; !single && k < 20; k++) {
      sim.state.time.day += 5;
      refreshCandidates(cfg, sim.state);
      single = sim.state.helpers.candidates.find((c) => !c.family);
    }
    expect(sim.command({ type: 'hire', candidate: single!.id }, false).ok).toBe(false);
    addDwelling(sim.state, 'helperTent');
    expect(bedsTotal(cfg, sim.state)).toBe(2);
    expect(sim.command({ type: 'hire', candidate: single!.id }, false).ok).toBe(true);
    hireOne(sim, true);
    expect(sim.state.helpers.dwellings.some((d) => d.kind === 'familyGer')).toBe(true);
    expect(sim.state.helpers.list.some((h) => h.kind === 'child' && h.task === 'collect')).toBe(true);
  });

  it('цалин сар бүр; мөнгө хүрэхгүй бол айлаараа явна', () => {
    const sim = newSim(3);
    hireOne(sim, true);
    const wage = sim.state.helpers.list.reduce((s, h) => s + h.wage, 0) * cfg.helpers.payEveryDays;
    sim.state.money = wage + 1000;
    payWages(cfg, sim.state);
    expect(sim.state.money).toBe(1000);
    expect(sim.state.helpers.list.length).toBeGreaterThan(0);
    const ev = payWages(cfg, sim.state);
    expect(ev[0]?.type).toBe('helperQuit');
    expect(sim.state.helpers.list).toHaveLength(0);
  });

  it('цалинг малаар: мал туслахынх болж, зорилгын тоонд орохгүй, сүү ноос нь тоглогчийнх; явахдаа авч явна', () => {
    const sim = newSim(4);
    hireOne(sim, true);
    const h = sim.state.helpers.list.find((x) => x.kind === 'adult')!;
    const su0 = herdSheepUnits(sim.state, cfg.animals);
    const cow = sim.state.animals.find((a) => a.species === 'cow')!;
    expect(sim.command({ type: 'payWithAnimal', helper: h.id, animal: cow.id }).ok).toBe(true);
    expect(cow.ownerId).toBe(h.id);
    expect(h.prepaid).toBeGreaterThan(1_000_000);
    expect(herdSheepUnits(sim.state, cfg.animals)).toBeLessThan(su0);
    // Урьдчилж төлснөөс цалин хасагдана
    const m0 = sim.state.money;
    payWages(cfg, sim.state);
    expect(sim.state.money).toBe(m0);
    // Туслахын үнээний сүү тоглогчийнх: газарт үлдээнэ
    cow.sex = 'f'; cow.lactating = true; cow.milkTimer = 100;
    const n0 = sim.state.items.filter((i) => i.product === 'milk').length;
    morning(cfg, sim.state, new Rng(1));
    expect(sim.state.items.filter((i) => i.product === 'milk').length).toBeGreaterThan(n0);
    expect(sim.command({ type: 'fireHelper', helper: h.id }).ok).toBe(true);
    expect(sim.state.animals.includes(cow)).toBe(false);
  });

  it('хүүхэд цуглуулагч сүү, ноосыг агуулахад хийнэ', () => {
    const sim = newSim(5);
    hireOne(sim, true);
    sim.state.wolves.peaceful = true;
    steps(sim, DAY + 3 * 60);   // дараа өглөө 09:00
    expect(storage.used(sim.state)).toBeGreaterThan(4);
  });

  it('малчин сүрэгтэйгээ явж хамгаалалтын бүс өгнө; чонын нутагт орсон малыг эргүүлнэ', () => {
    const sim = newSim(6);
    hireOne(sim, true);
    sim.state.wolves.peaceful = true;
    const den = sim.state.wolves.dens[0]!;
    const sheep = sim.state.animals.filter((a) => a.species === 'sheep');
    const lost = sheep[0]!;
    lost.x = lost.tx = den.x;
    lost.z = lost.tz = den.z;
    steps(sim, 4 * 60);
    expect(Math.hypot(lost.x - den.x, lost.z - den.z)).toBeGreaterThan(den.r);
    const h = sim.state.helpers.list.find((x) => x.task === 'herd')!;
    const zones = protectionZones(cfg, sim.state);
    expect(zones.some((z) => z.kind === 'helper')).toBe(true);
    expect(isProtected(zones, h.x + 5, h.z)).toBe(true);
  });

  it('жолооч тэргээр сумын төв явж зараад мөнгө авчирна', () => {
    const sim = newSim(7);
    hireOne(sim, true);
    addVehicle(cfg, sim.state, 'horseCart');
    const h = sim.state.helpers.list.find((x) => x.kind === 'adult')!;
    expect(sim.command({ type: 'helperTask', helper: h.id, task: 'drive' }).ok).toBe(true);
    storage.add(cfg, sim.state, 'aaruul', 15);
    let income = 0;
    sim.on((e) => {
      if (e.type === 'helperTrip') income = e.income;
    });
    steps(sim, DAY);
    expect(income).toBe(15 * cfg.products.prices.aaruul);
    expect(h.trip).toBeNull();
  });

  it('отор: илүү майхангүй бол явуулахгүй; гэртэй бол хуучин майхнаараа мал өөр бууцанд бэлчиж, буцаахад ирнэ', () => {
    const sim = newSim(8);
    hireOne(sim, true);
    const h = sim.state.helpers.list.find((x) => x.kind === 'adult')!;
    const ids = sim.state.animals.filter((a) => a.species === 'sheep').slice(0, 5).map((a) => a.id);
    expect(sim.command({ type: 'sendOtor', helper: h.id, animalIds: ids, camp: 'valley' }).ok).toBe(false);
    sim.state.home = 'ger';
    const d0 = sim.state.camps.valley!.degrade;
    expect(sim.command({ type: 'sendOtor', helper: h.id, animalIds: ids, camp: 'valley' }).ok).toBe(true);
    expect(sim.state.animals.some((a) => ids.includes(a.id))).toBe(false);
    expect(spareTents(sim.state)).toBe(0);
    sim.state.helpers.otorTents = 1;
    expect(spareTents(sim.state)).toBe(1);
    steps(sim, DAY * 3);
    expect(sim.state.camps.valley!.degrade).toBeGreaterThan(d0);
    expect(sim.command({ type: 'recallOtor', helper: h.id }).ok).toBe(true);
    expect(sim.state.animals.filter((a) => ids.includes(a.id)).length).toBeGreaterThanOrEqual(4);
    expect(h.task).toBe('herd');
  });

  describe('Малчны хуваарь ба адуучин (B2, B3 — хэрэглэгчийн дүрэм 2026-11-14)', () => {
    const toMinute = (sim: Sim, m: number): void => {
      while (sim.state.time.minute !== m) sim.step();
    };

    it('малчин өглөө сүргээ тууж гаргаад гэртээ ирнэ, өдөр 1–2 удаа очно, орой тууж ирнэ', () => {
      const sim = newSim(11);
      hireOne(sim, true);
      sim.state.wolves.peaceful = true;
      const h = sim.state.helpers.list.find((x) => x.task === 'herd')!;
      h.herd = 'sheep';
      const S = cfg.helpers.herder.schedule;
      expect(herderPhase(cfg, h, 13 * 60, 1)).toBe('idle');
      expect(herderPhase(cfg, h, S.visitHours[0]! * 60 + 10, 1)).toBe('visit');
      expect(herderPhase(cfg, h, cfg.helpers.herder.homeHour * 60 + 5, 1)).toBe('evening');
      toMinute(sim, 13 * 60 + 30);   // өдөр — гэртээ
      expect(h.outDay).toBe(sim.state.time.day);
      const sheep = sim.state.animals.filter((a) => a.species === 'sheep');
      const ger = sim.state.helpers.dwellings.find((d) => d.familyId === h.familyId)!;
      expect(Math.hypot(h.x - ger.x, h.z - ger.z)).toBeLessThan(5);       // гэртээ (сүрэг дээрээ өдөржин биш)
      toMinute(sim, S.visitHours[1]! * 60 + 40);   // өдрийн 2 дахь эргэлт — сүрэг дээрээ
      const fx2 = sheep.reduce((t, a) => t + a.x, 0) / sheep.length, fz2 = sheep.reduce((t, a) => t + a.z, 0) / sheep.length;
      expect(Math.hypot(h.x - fx2, h.z - fz2)).toBeLessThan(cfg.helpers.herder.atFlockDistance + 8);
    });

    it('чонын нутагт ойртсон малыг чонын үүрнээс эсрэг тийш тууна', () => {
      const sim = newSim(12);
      hireOne(sim, true);
      sim.state.wolves.peaceful = true;
      const h = sim.state.helpers.list.find((x) => x.task === 'herd')!;
      h.herd = 'sheep';
      const den = sim.state.wolves.dens[0]!;
      const a = sim.state.animals.find((x) => x.species === 'sheep')!;
      const ux = -den.x / Math.hypot(den.x, den.z), uz = -den.z / Math.hypot(den.x, den.z);
      a.x = a.tx = den.x + ux * (den.r + 5);
      a.z = a.tz = den.z + uz * (den.r + 5);
      h.x = h.tx = a.x + 3;
      h.z = h.tz = a.z;
      steps(sim, 3 * 60);
      expect(Math.hypot(a.x - den.x, a.z - den.z)).toBeGreaterThan(den.r + cfg.helpers.herder.wolfAvoid);
    });

    it('адуучин уулын ойролцоо майхнаа барьж, орой адуугаа дөхүүлж манаж хононо', () => {
      const sim = newSim(13);
      hireOne(sim, true);
      sim.state.wolves.peaceful = true;
      const h = sim.state.helpers.list.find((x) => x.task === 'herd')!;
      expect(sim.command({ type: 'helperTask', helper: h.id, task: 'herd', herd: 'horse' }).ok).toBe(true);
      expect(sim.command({ type: 'debugAddAnimals', n: 0 }).ok).toBe(true);
      // Адуу нэмнэ (5)
      const base = sim.state.animals.find((a) => a.species === 'horse' && !a.riding) ?? sim.state.animals.find((a) => a.riding)!;
      for (let k = 0; k < 5; k++) sim.state.animals.push({ ...base, id: sim.state.nextId++, riding: false, x: 40 + k, z: 20, tx: 40 + k, tz: 20, mode: 'graze', ownerId: undefined });
      steps(sim, 20);
      const C = cfg.helpers.herder.horseCamp;
      const camp = sim.state.helpers.dwellings.find((d) => d.kind === 'horseCamp' && d.helperId === h.id)!;
      expect(camp).toBeTruthy();
      const r = Math.hypot(camp.x, camp.z);
      expect(r).toBeGreaterThanOrEqual(C.minR - 3);
      expect(r).toBeLessThanOrEqual(C.maxR + 3);
      for (const d of sim.state.wolves.dens) expect(Math.hypot(camp.x - d.x, camp.z - d.z)).toBeGreaterThan(d.r + C.denMargin - 4);
      toMinute(sim, cfg.time.sleepMinute + 60);   // шөнө
      const horses = sim.state.animals.filter((a) => a.species === 'horse' && !a.riding);
      const zones = protectionZones(cfg, sim.state);
      expect(Math.hypot(h.x - camp.x, h.z - camp.z)).toBeLessThan(5);
      const near = horses.filter((a) => Math.hypot(a.x - camp.x, a.z - camp.z) < C.nightGuardRadius && isProtected(zones, a.x, a.z));
      expect(near.length).toBeGreaterThanOrEqual(horses.length - 1);
    });
  });
});

describe('Туслахын байрны загвар (render/staff.ts → render/ger)', () => {
  it('айлын гэр, туслахын гэр — makeGer (туслахынх GER.helper), майхан — отрын/адуучны makeTent', async () => {
    const { makeDwelling } = await import('../src/render/staff');
    const { GER } = await import('../src/render/ger/config');
    const names = (b: { group: { traverse: (f: (o: { name: string }) => void) => void } }): string[] => { const n: string[] = []; b.group.traverse((o) => { if (o.name) n.push(o.name); }); return n; };
    const fam = makeDwelling({ kind: 'familyGer', x: 0, z: 0, familyId: 1 }, 'summer');
    const hg = makeDwelling({ kind: 'helperGer', x: 0, z: 0 }, 'winter');
    const ht = makeDwelling({ kind: 'helperTent', x: 0, z: 0 }, 'summer');
    const hc = makeDwelling({ kind: 'horseCamp', x: 0, z: 0 }, 'summer');
    expect(names(fam)).toContain('ger:body');
    expect(names(hg)).toContain('ger:body');
    expect(hg.dims.belts).toBe(GER.helper.belts);
    expect(names(ht)).toContain('tent:body');
    // адуучны майхан отрынхоос том
    expect(hc.door.width).toBeGreaterThan(ht.door.width);
    for (const b of [fam, hg, ht, hc]) { expect(b.stats.drawCalls).toBeLessThanOrEqual(3); b.dispose(); }
  });
});
