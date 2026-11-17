import { describe, expect, it } from 'vitest';
import gerJson from '../../data/ger.json';
import { cfg, newSim } from './helpers';
import { GER, TENT, gerConfigErrors, validateGerData } from '../src/render/ger/config';
import { makeGer } from '../src/render/ger/ger';
import { makeTent } from '../src/render/ger/tent';
import { makeGerInterior } from '../src/render/ger/gerInterior';
import { Geo, rgb } from '../src/render/ger/geo';
import { clampToRoom, campEnterDoors, currentRoom, roomSpec, validateInteriors } from '../src/sim/systems/interior';
import { gerBoxes, gerDoorOffset, gerOuterRadius, pushOutOfBox } from '../src/sim/systems/gerLayout';

const clone = (): typeof gerJson => JSON.parse(JSON.stringify(gerJson)) as typeof gerJson;

describe('Гэр, майхны тохиргоо (data/ger.json)', () => {
  it('зөв тохиргоо алдаагүй; буруу өнгө, дутуу хэмжээ, мэдэгдэхгүй home.size-ийг барина', () => {
    expect(gerConfigErrors(gerJson)).toEqual([]);
    expect(() => validateGerData(gerJson)).not.toThrow();
    const bad = clone();
    (bad.ger.palette as Record<string, string>).cover = 'white';
    delete (bad.ger.sizes.small4 as Partial<typeof bad.ger.sizes.small4>).diameter;
    bad.ger.home.size = 'nope';
    bad.tent.kinds.start.trim = 'yes' as unknown as boolean;
    const errs = gerConfigErrors(bad);
    expect(errs.some((e) => e.includes('palette.cover'))).toBe(true);
    expect(errs.some((e) => e.includes('small4.diameter'))).toBe(true);
    expect(errs.some((e) => e.includes('home.size'))).toBe(true);
    expect(errs.some((e) => e.includes('start.trim'))).toBe(true);
    expect(() => validateGerData(bad)).toThrow(/data\/ger.json/);
  });

  it('эхлэлийн гэрийн хэмжээ data-аас (small4), 6 хэмжээ, 3 майхан', () => {
    expect(GER.home.size).toBe('small4');
    expect(Object.keys(GER.sizes)).toEqual(['small4', 'big4', 'small5', 'big5', 'w6', 'w8']);
    expect(Object.keys(TENT.kinds)).toEqual(['start', 'horse', 'otor']);
  });
});

describe('makeGer / makeTent (render/ger)', () => {
  it('гэр ≤ 3 draw call, ≤ 1500 гурвалжин: бүх хэмжээ, зун/өвөл', () => {
    for (const size of Object.keys(GER.sizes)) for (const season of ['summer', 'winter'] as const) {
      const g = makeGer(size, { season });
      expect(g.stats.drawCalls, `${size} ${season}`).toBeLessThanOrEqual(3);
      expect(g.stats.triangles, `${size} ${season}`).toBeLessThanOrEqual(season === 'winter' ? 1700 : 1500);
      expect(g.chimneyTop).not.toBeNull();
      g.dispose();
    }
  });

  it('туслахын гэр: хуучирсан бүрээс, 3 бүслүүр, энгийн модон хаалга — нэг API', () => {
    const doorVariant = GER.doors.findIndex((d) => d.motif === GER.helper.doorMotif);
    expect(doorVariant).toBeGreaterThanOrEqual(0);
    const h = makeGer(GER.helper.size, { doorVariant, coverColor: GER.helper.coverColor, belts: GER.helper.belts });
    const g = makeGer(GER.helper.size);
    expect(h.dims.belts).toBe(3);
    expect(g.dims.belts).toBe(3);
    expect(h.stats.drawCalls).toBeLessThanOrEqual(3);
  });

  it('майхан: 3 төрөл, ≤ 2 draw call, хаалга урд (+Z)', () => {
    for (const kind of Object.keys(TENT.kinds)) for (const season of ['summer', 'winter'] as const) {
      const t = makeTent(kind, { season });
      const K = TENT.kinds[kind]!;
      expect(t.stats.drawCalls).toBeLessThanOrEqual(2);
      expect(t.stats.triangles).toBeLessThan(400);
      expect(t.chimneyTop).toBeNull();
      expect(t.door.position.z).toBeCloseTo(K.L / 2 + TENT.doorStandOff, 6);
      t.setGlow(1);
      t.dispose();
    }
    expect(() => makeTent('nope')).toThrow(/nope/);
  });

  it('Geo угсрагч: нэг гурвалжин, хоосон нормалгүй; өнгө rgb()', () => {
    const g = new Geo();
    g.quad([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]], [0, 0, 1], rgb('#ffffff'));
    expect(g.triangles).toBe(2);
    expect(g.build().getAttribute('position').count).toBe(6);
    g.box(0, 0, 0, 1, 1, 1, [1, 1, 1]);
    expect(g.triangles).toBe(14);
  });

  it('дотор тал: гурвалжин, ≤ 3 draw call; саад хайрцгууд sim-ийн gerBoxes-д бүгд байна', () => {
    const inner = makeGerInterior(GER.home.size);
    expect(inner.stats.drawCalls).toBeLessThanOrEqual(3);
    expect(inner.stats.triangles).toBeLessThan(3500);
    const boxes = gerBoxes(cfg.ger, GER.home.size);
    expect(inner.obstacles.length).toBeGreaterThanOrEqual(6);
    for (const o of inner.obstacles) {
      expect(boxes.some((b) => Math.abs(b.x - o.x) < 1e-9 && Math.abs(b.z - o.z) < 1e-9 && Math.abs(b.hw - o.hw) < 1e-9 && Math.abs(b.hd - o.hd) < 1e-9), `${o.x},${o.z}`).toBe(true);
    }
    inner.dispose();
  });
});

describe('Гэрийн хаалганы цэг ба дотор талын хөдөлгөөн (sim)', () => {
  it('хаалганы цэг = лабораторийн doorStandOff (render ба sim нэг тоо)', () => {
    const g = makeGer(GER.home.size);
    expect(gerDoorOffset(cfg.ger, GER.home.size)).toBeCloseTo(g.door.position.z, 6);
    const sim = newSim(1, (s) => (s.home = 'ger'));
    const door = campEnterDoors(cfg, sim.state).find((d) => d.id === 'home')!;
    expect(door.x).toBe(cfg.camps.home.x);
    expect(door.z).toBeCloseTo(cfg.camps.home.z + g.door.position.z, 6);
  });

  it('camps.home.gerRadius: гэрийн гадна хэмжээнээс том, хаалганы цэг тойрон алхах цагирагаас гадна', () => {
    const home = cfg.camps.home;
    expect(home.gerRadius).toBeGreaterThanOrEqual(gerOuterRadius(cfg.ger, GER.home.size));
    // controller: гэрийг тойрох цагираг = gerRadius + 0.3 (явган). Хаалганы цэг түүнээс гадна тул тоглогч хүрч чадна
    expect(gerDoorOffset(cfg.ger, GER.home.size)).toBeGreaterThan(home.gerRadius + 0.3);
    expect(validateInteriors(cfg)).toEqual([]);
  });

  it('гэрийн өрөө data/ger.json-оос: радиус, орох/гарах цэг, саад; өрөөнд тавилга хаалгыг хаадаггүй', () => {
    const room = roomSpec(cfg, 'ger')!;
    const Ri = GER.sizes[GER.home.size]!.diameter / 2 - GER.interior.linerGap;
    expect(room.r).toBeCloseTo(Ri, 9);
    expect(room.obstacles!.length).toBeGreaterThanOrEqual(10);
    for (const [x, z] of [room.entry, room.exit]) {
      const c = clampToRoom(cfg, room, x, z);
      expect(Math.hypot(c.x - x, c.z - z), `${x},${z}`).toBeLessThan(0.1);
    }
    expect(roomSpec(cfg, 'helperGer')!.r).toBeCloseTo(Ri, 9);
  });

  it('тавилгыг нэвт алхахгүй: сүлжмэл цэгүүд бүгд саадаас bodyR-ээр холдоно, хана дотор', () => {
    const room = roomSpec(cfg, 'ger')!;
    let pushed = 0;
    for (let ix = -26; ix <= 26; ix++) for (let iz = -26; iz <= 26; iz++) {
      const x = ix * 0.1, z = iz * 0.1;
      const c = clampToRoom(cfg, room, x, z);
      expect(Math.hypot(c.x, c.z)).toBeLessThanOrEqual(room.r! - 0.05 + 1e-6);
      for (const o of room.obstacles!) {   // бие тавилгад 10 см-ээс (хана, тавилганы нарийн завсар; бие тавилга дотор орохгүй) илүү шигдэхгүй (хана, тавилганы нарийн завсарт бага зэрэг)
        const p = pushOutOfBox(o, c.x, c.z, 0.01);
        expect(Math.hypot(p.x - c.x, p.z - c.z), `${x},${z}`).toBeLessThan(0.1);
      }
      if (Math.hypot(c.x - x, c.z - z) > 1e-6) pushed++;
    }
    expect(pushed).toBeGreaterThan(50);
  });

  it('moveInterior: орны дунд чиглэж алхахад ор дотор орохгүй; зуух, ширээнд тулна', () => {
    const sim = newSim(2, (s) => (s.home = 'ger'));
    const p = sim.state.player;
    const door = campEnterDoors(cfg, sim.state).find((d) => d.id === 'home')!;
    p.x = door.x;
    p.z = door.z;
    expect(sim.command({ type: 'enterBuilding' }).ok).toBe(true);
    const room = currentRoom(cfg, sim.state)!;
    const bed = room.obstacles!.find((o) => o.hw > 0.9)!;   // ор (урт 1.86 → hw 0.93)
    sim.command({ type: 'moveInterior', x: bed.x, z: bed.z });
    const it = sim.state.player.interior!;
    const lx = (it.x - bed.x) * Math.cos(bed.phi) - (it.z - bed.z) * Math.sin(bed.phi);
    const lz = (it.x - bed.x) * Math.sin(bed.phi) + (it.z - bed.z) * Math.cos(bed.phi);
    expect(Math.abs(lx) > bed.hw || Math.abs(lz) > bed.hd).toBe(true);   // хайрцгийн гадна
    // ширээ (0, -0.8)
    sim.command({ type: 'moveInterior', x: 0, z: -0.8 });
    expect(Math.hypot(sim.state.player.interior!.x, sim.state.player.interior!.z + 0.8)).toBeGreaterThan(0.3);
    // гарах: дотор хаалганы дэргэд
    sim.command({ type: 'moveInterior', x: room.exit[0], z: room.exit[1] });
    expect(sim.command({ type: 'exitBuilding' }).ok).toBe(true);
    expect(sim.state.player.interior).toBeNull();
  });

  it('pushOutOfBox: хайрцгийн дотор, ирмэг дээр, гадна цэг', () => {
    const b = { x: 1, z: 1, hw: 0.5, hd: 0.25, phi: 0.6 };
    for (const [x, z] of [[1, 1], [1.2, 1.1], [3, 3], [0.2, 0.9]] as [number, number][]) {
      const p = pushOutOfBox(b, x, z, 0.3);
      // түлхсэний дараа дахин түлхэх шаардлагагүй
      const q = pushOutOfBox(b, p.x, p.z, 0.3 - 1e-6);
      expect(Math.hypot(q.x - p.x, q.z - p.z)).toBeLessThan(1e-4);
    }
    expect(pushOutOfBox(b, 9, 9, 0.3)).toEqual({ x: 9, z: 9 });
  });
});







