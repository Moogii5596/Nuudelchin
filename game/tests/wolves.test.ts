import { describe, expect, it } from 'vitest';
import { cfg, newSim, steps } from './helpers';
import { isProtected, protectionZones } from '../src/sim/systems/wolves';
import type { GameState } from '../src/sim/state';

/** Нэг хонийг 1-р үүрний нутагт, бусдыг хотод тавина */
function baitAtDen(s: GameState): number {
  const den = s.wolves.dens[0]!;
  const bait = s.animals.find((a) => a.species === 'sheep')!;
  for (const a of s.animals) {
    if (a.riding) continue;
    a.x = a.tx = 20;
    a.z = a.tz = 4;
    a.thirst = 0;
  }
  bait.x = bait.tx = den.x + 4;
  bait.z = bait.tz = den.z;
  return bait.id;
}

describe('Чоно (M4)', () => {
  it('хамгаалалтын бүс: хашаа, майхан, малчин; сумын төв явсан малчинд бүс байхгүй', () => {
    const sim = newSim(31);
    const z = protectionZones(cfg, sim.state);
    const pen = cfg.camps.home.pen;
    expect(isProtected(z, pen.x + pen.r + 2, pen.z)).toBe(true);
    expect(isProtected(z, 0, cfg.wolves.protectRadius.tent - 0.5)).toBe(true);
    sim.command({ type: 'movePlayer', x: 100, z: 100 });
    expect(isProtected(protectionZones(cfg, sim.state), 100 + cfg.wolves.protectRadius.herder - 1, 100)).toBe(true);
    sim.state.player.away = true;
    expect(isProtected(protectionZones(cfg, sim.state), 100, 100)).toBe(false);
  });

  it('нутагт нь орсон хамгаалалтгүй малыг чоно барьж, үүр лүүгээ чирнэ', () => {
    const sim = newSim(32);
    const id = baitAtDen(sim.state);
    const kills: number[] = [];
    sim.on((e) => {
      if (e.type === 'wolfKill') kills.push(e.animalId);
    });
    for (let i = 0; i < 900 && !kills.length; i++) sim.step();
    expect(kills).toEqual([id]);
    expect(sim.state.animals.some((a) => a.id === id)).toBe(false);
    expect(sim.state.today.wolfKills.sheep).toBe(1);
    expect(sim.state.wolves.list.some((w) => w.mode === 'drag')).toBe(true);
  });

  it('малчин дэргэд нь байвал дайрахгүй', () => {
    const sim = newSim(32);
    const id = baitAtDen(sim.state);
    for (let i = 0; i < 900; i++) {
      const bait = sim.state.animals.find((a) => a.id === id)!;
      sim.command({ type: 'movePlayer', x: bait.x + 2, z: bait.z });
      sim.step();
    }
    expect(sim.state.animals.some((a) => a.id === id)).toBe(true);
    expect(sim.state.today.wolfKills.sheep ?? 0).toBe(0);
  });

  it('нохой хамгаалсан малд дайрахгүй, чоно нохойн бүс рүү орохгүй', () => {
    const sim = newSim(32);
    const id = baitAtDen(sim.state);
    const bait = sim.state.animals.find((a) => a.id === id)!;
    sim.command({ type: 'cheat', action: 'addDog' });
    sim.command({ type: 'movePlayer', x: bait.x, z: bait.z });
    sim.command({ type: 'dogOrder', dog: 'all', order: 'stay' });
    sim.command({ type: 'movePlayer', x: 0, z: 0 });
    const dog = sim.state.dogs[0]!;
    dog.x = bait.x;
    dog.z = bait.z;
    // Хонь нохойн дэргэд байна (туугдахгүй)
    let minD = Infinity;
    for (let i = 0; i < 900; i++) {
      bait.x = bait.tx = dog.x + 1;
      bait.z = bait.tz = dog.z;
      sim.step();
      // Айж зугтаж буй чоно үүр лүүгээ (нохойн хажуугаар ч) гүйж болно — бусад нь бүс рүү орохгүй
      for (const w of sim.state.wolves.list) if (w.mode !== 'flee') minD = Math.min(minD, Math.hypot(w.x - dog.x, w.z - dog.z));
    }
    expect(sim.state.animals.some((a) => a.id === id)).toBe(true);
    expect(minD).toBeGreaterThanOrEqual(cfg.wolves.protectRadius.dog - 0.01);
  });

  it('«Чоно үргээх» — ангуучилж буй чоно ангаа орхиж зугтана', () => {
    const sim = newSim(33);
    baitAtDen(sim.state);
    expect(sim.command({ type: 'cheat', action: 'wolfAttack' }).ok).toBe(true);
    const w = sim.state.wolves.list.find((o) => o.mode === 'hunt')!;
    expect(w).toBeDefined();
    sim.command({ type: 'movePlayer', x: w.x + 20, z: w.z });
    expect(sim.command({ type: 'scareWolves' }).ok).toBe(true);
    expect(w.mode).toBe('flee');
    expect(w.targetId).toBe(0);
  });

  it('дайралт унтраасан (cheat) үед чоно ан хийхгүй', () => {
    const sim = newSim(32);
    const id = baitAtDen(sim.state);
    sim.command({ type: 'cheat', action: 'wolvesPeaceful' });
    steps(sim, 900);
    expect(sim.state.animals.some((a) => a.id === id)).toBe(true);
  });
});

describe('Мал чоноос үргэж тарна (хэрэглэгчийн дүрэм)', () => {
  /** Хонин сүргийг (60, 60) орчим бөөгнүүлж, чоныг хажууд нь тавина */
  function setup(seed: number) {
    const sim = newSim(seed, (s) => {
      let k = 0;
      for (const a of s.animals) {
        if (a.riding) continue;
        a.x = a.tx = a.species === 'sheep' ? 60 + (k % 4) * 1.5 : -60;
        a.z = a.tz = a.species === 'sheep' ? 60 + Math.floor(k++ / 4) * 1.5 : -40;
        a.thirst = 0;
        a.mode = 'graze';
      }
      s.wolves.peaceful = true;   // зөвхөн айдсыг шалгана
      const w = s.wolves.list[0]!;
      w.x = w.tx = 48;
      w.z = w.tz = 62;
      for (const o of s.wolves.list.slice(1)) {
        o.x = o.tx = 300;
        o.z = o.tz = 300;
      }
    });
    return sim;
  }
  const sheepOf = (s: GameState) => s.animals.filter((a) => a.species === 'sheep');

  it('ойртсон (ангуучлаагүй) чоноос хонь үргэж, чоноос холдон тарж зугтана', () => {
    const sim = setup(51);
    const w = sim.state.wolves.list[0]!;
    const before = sheepOf(sim.state).map((a) => Math.hypot(a.x - 48, a.z - 62));
    steps(sim, 2);
    const sheep = sheepOf(sim.state);
    expect(sheep.filter((a) => a.mode === 'flee').length).toBeGreaterThanOrEqual(sheep.length - 1);
    // Зугтах чиглэлүүд нэг шугам биш — тарна
    const dirs = sheep.filter((a) => a.mode === 'flee').map((a) => Math.atan2(a.tx - a.x, a.tz - a.z));
    expect(Math.max(...dirs) - Math.min(...dirs)).toBeGreaterThan(0.6);
    w.x = w.tx = 300;   // чоно явсан
    steps(sim, 15);
    const after = sheepOf(sim.state).map((a) => Math.hypot(a.x - 48, a.z - 62));
    expect(after.reduce((t, d) => t + d, 0) / after.length).toBeGreaterThan(before.reduce((t, d) => t + d, 0) / before.length + 10);
  });

  it('малчны дэргэд (хамгаалалтын бүсэд) байгаа хонь үргэхгүй', () => {
    const sim = setup(52);
    sim.command({ type: 'movePlayer', x: 62, z: 62 });
    steps(sim, 4);
    expect(sheepOf(sim.state).some((a) => a.mode === 'flee')).toBe(false);
  });

  it('айж зугтаж буй (үргээсэн) чоноос мал үргэхгүй', () => {
    const sim = setup(53);
    sim.state.wolves.list[0]!.mode = 'flee';
    sim.state.wolves.list[0]!.scared = 999;
    sim.step();
    sim.step();
    expect(sheepOf(sim.state).some((a) => a.mode === 'flee')).toBe(false);
  });
});
