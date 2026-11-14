import { describe, expect, it } from 'vitest';
import { cfg, newSim, steps } from './helpers';
import { hungerStage, isProtected, protectionZones } from '../src/sim/systems/wolves';
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
  for (const o of s.wolves.list) o.hunger = 2;   // өлссөн (B6): нутагтаа орсон малд дайрна
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

  it('ангуучилж буй чоно айж зугтаж буй хонийг гүйцэж барьж, үүр лүүгээ чирнэ', () => {
    const sim = newSim(32);
    const id = baitAtDen(sim.state);
    const bait = sim.state.animals.find((a) => a.id === id)!;
    const w = sim.state.wolves.list.find((o) => o.den === 0)!;
    w.x = w.tx = bait.x - 6;
    w.z = w.tz = bait.z;
    w.mode = 'hunt';
    w.targetId = id;
    const kills: number[] = [];
    sim.on((e) => {
      if (e.type === 'wolfKill') kills.push(e.animalId);
    });
    let fled = false;
    for (let i = 0; i < 60 && !kills.length; i++) {
      sim.step();
      fled ||= bait.mode === 'flee';
    }
    expect(fled).toBe(true);           // хонь айж зугтсан
    expect(kills).toEqual([id]);       // гэвч чоно хурдан
    expect(sim.state.animals.some((a) => a.id === id)).toBe(false);
    expect(sim.state.today.wolfKills.sheep).toBe(1);
    expect(w.mode).toBe('drag');
  });

  it('нутагт нь байнга бэлчдэг хамгаалалтгүй хонийг чоно эцэст нь барина', () => {
    const sim = newSim(32);
    const id = baitAtDen(sim.state);
    const den = sim.state.wolves.dens[0]!;
    const kills: number[] = [];
    sim.on((e) => {
      if (e.type === 'wolfKill') kills.push(e.animalId);
    });
    for (let i = 0; i < 1500 && !kills.length; i++) {
      // Хонь үргэж зугтсан ч сайн өвс рүүгээ буцаж ирдэг (30 минут тутам)
      const bait = sim.state.animals.find((a) => a.id === id);
      if (bait && i % 30 === 0 && Math.hypot(bait.x - den.x, bait.z - den.z) > den.r) {
        bait.x = bait.tx = den.x + 4;
        bait.z = bait.tz = den.z;
        bait.mode = 'graze';
      }
      sim.step();
    }
    expect(kills).toEqual([id]);
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
      w.x = w.tx = 55;
      w.z = w.tz = 62;
      for (const o of s.wolves.list.slice(1)) {
        o.x = o.tx = 300;
        o.z = o.tz = 300;
      }
    });
    return sim;
  }
  const sheepOf = (s: GameState) => s.animals.filter((a) => a.species === 'sheep');

  it('ойртсон (тэнэж яваа) чоноос хонь үргэж, чоноос холдон тарж зугтана', () => {
    const sim = setup(51);
    const w = sim.state.wolves.list[0]!;
    const before = sheepOf(sim.state).map((a) => Math.hypot(a.x - 55, a.z - 62));
    steps(sim, 2);
    const sheep = sheepOf(sim.state);
    // Ойрын хонь шууд, бусад нь дагаж цугтана
    expect(sheep.filter((a) => a.mode === 'flee').length).toBeGreaterThanOrEqual(Math.ceil(sheep.length / 2));
    // Зугтах чиглэлүүд нэг шугам биш — тарна
    const dirs = sheep.filter((a) => a.mode === 'flee').map((a) => Math.atan2(a.tx - a.x, a.tz - a.z));
    expect(Math.max(...dirs) - Math.min(...dirs)).toBeGreaterThan(0.6);
    w.x = w.tx = 300;   // чоно явсан
    steps(sim, 15);
    const after = sheepOf(sim.state).map((a) => Math.hypot(a.x - 55, a.z - 62));
    expect(after.reduce((t, d) => t + d, 0) / after.length).toBeGreaterThan(before.reduce((t, d) => t + d, 0) / before.length + 10);
  });

  it('дайрч буй чоноос хол (22 м) байгаа хонь ч үргэнэ, тэнэж яваа чоноос үргэхгүй', () => {
    const sim = setup(54);
    const w = sim.state.wolves.list[0]!;
    w.x = w.tx = 42;   // хамгийн ойр хонь ~18 м
    w.z = w.tz = 62;
    steps(sim, 2);
    expect(sheepOf(sim.state).some((a) => a.mode === 'flee')).toBe(false);
    w.mode = 'hunt';
    w.forced = true;   // үүрнээсээ хол — туршилтад нутгийн хязгаарыг үл тооно
    w.targetId = sheepOf(sim.state)[0]!.id;
    w.x = w.tx = 42;
    w.z = w.tz = 62;
    sim.state.wolves.peaceful = false;
    steps(sim, 2);
    expect(sheepOf(sim.state).filter((a) => a.mode === 'flee').length).toBeGreaterThan(3);
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

  describe('Өлсгөлөн (B6, хэрэглэгчийн дүрэм 2026-11-14)', () => {
    it('цадсан чоно үүрэндээ орж, нутагт нь орсон малд дайрахгүй', () => {
      const sim = newSim(32);
      baitAtDen(sim.state);
      for (const o of sim.state.wolves.list) o.hunger = 0;
      let hunts = 0;
      sim.on((e) => {
        if (e.type === 'wolfHunt') hunts++;
      });
      steps(sim, 8 * 60);
      expect(hunts).toBe(0);
      const den = sim.state.wolves.dens[0]!;
      for (const o of sim.state.wolves.list.filter((x) => x.den === 0)) {
        expect(o.mode).toBe('den');
        expect(Math.hypot(o.x - den.x, o.z - den.z)).toBeLessThan(1);
      }
    });

    it('өлсгөлөн цаг өнгөрөх тусам нэмэгдэж, цадсан → өлссөн → маш өлссөн болно', () => {
      const sim = newSim(33);
      sim.state.wolves.peaceful = true;
      const o = sim.state.wolves.list[0]!;
      o.hunger = 0;
      expect(hungerStage(cfg, o)).toBe('fed');
      o.hunger = cfg.wolves.hunger.hungryAtDays;
      expect(hungerStage(cfg, o)).toBe('hungry');
      o.hunger = cfg.wolves.hunger.starvingAtDays;
      expect(hungerStage(cfg, o)).toBe('starving');
    });

    it('маш өлссөн чоно өөр үүр рүү аялж, замдаа таарсан малд шууд дайрна', () => {
      const sim = newSim(34);
      const ws = sim.state.wolves;
      expect(ws.dens.length).toBeGreaterThan(1);
      for (const a of sim.state.animals) if (!a.riding) {
        a.x = a.tx = 20;
        a.z = a.tz = 4;
      }
      const o = ws.list.find((x) => x.den === 0)!;
      for (const x of ws.list) x.hunger = x === o ? cfg.wolves.hunger.starvingAtDays + 1 : 0;
      steps(sim, 3);
      expect(o.travel).not.toBeUndefined();
      expect(o.travel).not.toBe(0);
      // Замд нь (чонын урд) хамгаалалтгүй хонь тавина
      const bait = sim.state.animals.find((a) => a.species === 'sheep')!;
      const td = ws.dens[o.travel!]!;
      const ux = td.x - o.x, uz = td.z - o.z, l = Math.hypot(ux, uz);
      bait.x = bait.tx = o.x + (ux / l) * 15;
      bait.z = bait.tz = o.z + (uz / l) * 15;
      let hunted = 0;
      sim.on((e) => {
        if (e.type === 'wolfHunt' && e.animalId === bait.id) hunted++;
      });
      steps(sim, 6);
      expect(hunted).toBe(1);
    });

    it('барьсан малын мах үүрний нөөцөд орж, тэр үүрний чоно тэнцүү хувааж иднэ; том мал олон хоног', () => {
      const sim = newSim(35);
      sim.state.wolves.peaceful = true;
      const ws = sim.state.wolves;
      const den = ws.dens[0]!;
      const pack = ws.list.filter((x) => x.den === 0);
      ws.list = ws.list.filter((x) => x.den === 0);
      for (const x of pack) {
        x.x = x.tx = den.x;
        x.z = x.tz = den.z;
        x.hunger = 2;
      }
      den.food = 200;   // жишээ нь үхэр барьсан
      steps(sim, 6 * 60);
      const h = pack.map((x) => x.hunger!);
      expect(Math.max(...h) - Math.min(...h)).toBeLessThan(0.05);   // тэнцүү
      expect(Math.max(...h)).toBeLessThan(0.5);
      const eatenPerWolf = (200 - den.food!) / pack.length;
      expect(eatenPerWolf).toBeGreaterThan(4);
      // Үлдсэн нөөц олон хоногт хүрнэ (өдөрт dailyKg × чонын тоо)
      expect(den.food! / (cfg.wolves.hunger.dailyKg * pack.length)).toBeGreaterThan(5);
    });
  });
});
