import { describe, expect, it } from 'vitest';
import { cfg, DAY, newSim, steps } from './helpers';
import { heightAt, riverZ, waterLevel } from '../src/sim/terrain';
import { nearestWater } from '../src/sim/systems/pasture';
import { ridingHorse } from '../src/sim/systems/herder';

describe('Газрын өндөр (M2)', () => {
  it('бууц бүрт хязгаартай, төв нь бараг тэгш', () => {
    for (const camp of Object.values(cfg.camps.camps)) {
      expect(Math.abs(heightAt(camp, 0, 0))).toBeLessThan(1.5);
      for (let i = 0; i < 200; i++) {
        const r = (i / 200) * cfg.player.worldRadius;
        const h = heightAt(camp, Math.cos(i) * r, Math.sin(i * 1.3) * r);
        expect(Number.isFinite(h)).toBe(true);
        expect(Math.abs(h)).toBeLessThan(80);
      }
    }
  });
  it('голын гольдрол эргээсээ нам, ус хамгийн ойрын голын цэг рүү явна', () => {
    const river = cfg.camps.camps.river!;
    const x = 20, rz = riverZ(river.waterShape, x);
    expect(heightAt(river, x, rz)).toBeLessThan(heightAt(river, x, rz + 12));
    expect(heightAt(river, x, rz)).toBeLessThan(waterLevel(river) + 0.5);
    const w = nearestWater(river.waterShape, x, 0);
    expect(w.z).toBeCloseTo(rz, 5);
  });
});

describe('Малчин, «Хөөе», морь (M2)', () => {
  it('«Хөөе» — ойрын мал малчнаас эсрэг зүг рүү бөөгнөрч явна', () => {
    const sim = newSim(7);
    const sheep = sim.state.animals.filter((a) => a.species === 'sheep');
    // Малчныг хонин сүргийн баруун талд тавина
    const cx = sheep.reduce((s, a) => s + a.x, 0) / sheep.length;
    const cz = sheep.reduce((s, a) => s + a.z, 0) / sheep.length;
    sim.command({ type: 'movePlayer', x: cx - 10, z: cz });
    const dist = (a: { x: number; z: number }) => Math.hypot(a.x - (cx - 10), a.z - cz);
    const near = sheep.filter((a) => dist(a) < cfg.player.shout.radius);
    expect(near.length).toBeGreaterThan(0);
    const before = near.map(dist);
    const r = sim.command({ type: 'shout' });
    expect(r.ok).toBe(true);
    steps(sim, 30);
    const moved = near.filter((a, i) => dist(a) > before[i]! + 5).length;
    expect(moved).toBe(near.length);
    // Бөөгнөрсөн: малчны баруун талд (эсрэг зүг) бүгд
    expect(near.every((a) => a.x > cx - 10)).toBe(true);
  });

  it('ойрхон мал байхгүй бол «Хөөе» амжилтгүй', () => {
    const sim = newSim(7);
    sim.command({ type: 'movePlayer', x: -150, z: -150 });
    expect(sim.command({ type: 'shout' }).ok).toBe(false);
  });

  it('уурга барьсан үед мал малчнаас айж холдоно', () => {
    const sim = newSim(8);
    expect(sim.state.player.holdingUurga).toBe(false);
    expect(sim.command({ type: 'toggleUurga' }).ok).toBe(true);
    expect(sim.state.player.holdingUurga).toBe(true);
    const a = sim.state.animals.find((x) => x.species === 'sheep')!;
    sim.command({ type: 'movePlayer', x: a.x + 2, z: a.z });
    steps(sim, 10);
    expect(Math.hypot(a.x - sim.state.player.x, a.z - sim.state.player.z)).toBeGreaterThan(cfg.player.animalFear.onFoot);
  });

  it('уураггүй үед мал малчнаас айхгүй, «Хөөе» л туух боломжтой', () => {
    const sim = newSim(8);
    const a = sim.state.animals.find((x) => x.species === 'sheep')!;
    sim.command({ type: 'movePlayer', x: a.x + 2, z: a.z });
    steps(sim, 1);
    expect(a.mode).not.toBe('driven');
    steps(sim, 9);
    expect(a.mode).not.toBe('driven');
    expect(sim.command({ type: 'shout' }).ok).toBe(true);
    expect(a.mode).toBe('driven');
  });

  it('морь хол бол унаж чадахгүй; дуудвал ирж, унасан морь малчныг дагана', () => {
    const sim = newSim(9);
    const p = sim.state.player;
    sim.command({ type: 'movePlayer', x: 60, z: 40 });
    expect(sim.command({ type: 'toggleMount' }).ok).toBe(false);
    sim.command({ type: 'callHorse' });
    steps(sim, 60);
    const horse = ridingHorse(sim.state)!;
    expect(Math.hypot(horse.x - p.x, horse.z - p.z)).toBeLessThan(cfg.player.mountRange);
    expect(sim.command({ type: 'toggleMount' }).ok).toBe(true);
    expect(p.mounted).toBe(true);
    sim.command({ type: 'movePlayer', x: 80, z: 50, heading: 1 });
    steps(sim, 1);
    expect(horse.x).toBe(80);
    expect(horse.z).toBe(50);
    expect(sim.command({ type: 'toggleMount' }).ok).toBe(true);
    expect(p.mounted).toBe(false);
  });
});

describe('Чоно (M2)', () => {
  it('бууц бүрт 3 үүр, хотоос 120–145 м, нэг seed → ижил байрлал', () => {
    const a = newSim(11).state.wolves, b = newSim(11).state.wolves;
    expect(a.dens.length).toBe(cfg.wolves.densPerCamp);
    for (const d of a.dens) {
      const r = Math.hypot(d.x, d.z);
      expect(r).toBeGreaterThanOrEqual(120);
      expect(r).toBeLessThanOrEqual(145);
    }
    expect(a.dens).toEqual(b.dens);
  });

  it('чоно нутгаасаа гарахгүй; «Чоно үргээх» — ойрын чоно үүр лүүгээ зугтана', () => {
    const sim = newSim(12);
    steps(sim, DAY);
    const ws = sim.state.wolves;
    for (const w of ws.list) {
      const d = ws.dens[w.den]!;
      expect(Math.hypot(w.x - d.x, w.z - d.z)).toBeLessThanOrEqual(d.r + 1);
    }
    const w = ws.list[0]!;
    // Малчин чонын хажууд, үүрнээс холдсон байдалтай
    w.x = ws.dens[w.den]!.x + 15;
    w.z = ws.dens[w.den]!.z;
    sim.command({ type: 'movePlayer', x: w.x + 10, z: w.z });
    const r = sim.command({ type: 'scareWolves' });
    expect(r.ok).toBe(true);
    expect(w.mode).toBe('flee');
    expect(w.scared).toBeGreaterThan(0);
    steps(sim, 7);
    expect(Math.hypot(w.x - ws.dens[w.den]!.x, w.z - ws.dens[w.den]!.z)).toBeLessThan(1);
  });

  it('чоно бэлчээрлэлтийн санамсаргүй дарааллыг өөрчлөхгүй (тэнцвэр хэвээр)', () => {
    const a = newSim(13), b = newSim(13);
    b.state.wolves.list = [];
    steps(a, 300);
    steps(b, 300);
    expect(a.state.animals.map((x) => x.x)).toEqual(b.state.animals.map((x) => x.x));
  });
});

describe('Гүйцэтгэл (M2)', () => {
  // 4× хурдаар секундэд 24 алхам. 1 өдөр = 840 алхам < 300 мс бол нэг кадрт < 1 мс sim зарцуулна (60 FPS-д хангалттай).
  it('300 малтай 1 өдөр 3D-гүйгээр < 300 мс', () => {
    const sim = newSim(14);
    sim.command({ type: 'debugAddAnimals', n: 300 - sim.state.animals.length });
    expect(sim.state.animals.length).toBe(300);
    sim.runDays(1); // халаалт
    const t0 = performance.now();
    sim.runDays(1);
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(300);
  });
});
