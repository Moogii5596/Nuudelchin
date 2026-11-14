import type { Season } from '../src/sim/config';
import { seasonStart } from '../src/sim/systems/seasons';
import { describe, expect, it } from 'vitest';
import { ACTIVE_DAY, cfg, DAY, newSim, steps } from './helpers';
import { atHome, dailyMilkLiters, intakeFactor } from '../src/sim/systems/night';
import { endRaid, nightRaid, protectionZones, isProtected } from '../src/sim/systems/wolves';

const T = cfg.time;
const toMinute = (sim: ReturnType<typeof newSim>, m: number): void => {
  while (sim.state.time.minute !== m) sim.step();
};

describe('Шөнө ба хотлолт (M4.5, хэрэглэгчийн дүрэм 2026-11-14)', () => {
  it('орой хонь хашаандаа, үхэр үхрийн хэвтэрт ирж, шөнө унтана; адуу хотод ирэхгүй', () => {
    const sim = newSim(3, (s) => {
      s.animals.push({ ...s.animals.find((a) => a.species === 'sheep')!, id: 900, species: 'horse', sex: 'f', x: 70, z: 30, tx: 70, tz: 30 });
    });
    toMinute(sim, T.sleepMinute + 1);
    const sheep = sim.state.animals.filter((a) => a.species === 'sheep');
    const cows = sim.state.animals.filter((a) => a.species === 'cow');
    expect(sheep.filter((a) => atHome(cfg, a)).length).toBeGreaterThanOrEqual(sheep.length - 1);
    expect(cows.every((a) => atHome(cfg, a))).toBe(true);
    expect(sim.state.animals.filter((a) => !a.riding).every((a) => a.mode === 'sleep')).toBe(true);
    const horse = sim.state.animals.find((a) => a.id === 900)!;
    expect(Math.hypot(horse.x - cfg.camps.home.pen.x, horse.z - cfg.camps.home.pen.z)).toBeGreaterThan(cfg.camps.home.pen.r);
  });
  it('шөнө мал идэхгүй, цангахгүй, хөдлөхгүй', () => {
    const sim = newSim(3);
    toMinute(sim, T.sleepMinute + 5);
    const before = sim.state.animals.map((a) => ({ x: a.x, z: a.z, gut: a.gutFill, th: a.thirst }));
    steps(sim, 300);
    sim.state.animals.forEach((a, i) => {
      expect(a.x).toBeCloseTo(before[i]!.x, 5);
      expect(a.gutFill).toBe(before[i]!.gut);
      expect(a.thirst).toBe(before[i]!.th);
    });
  });
  it('хол байгаа мал хүрсэн газраа хоноглож, ноосоо тэнд үлдээнэ', () => {
    const sim = newSim(4, (s) => {
      for (const a of s.animals) if (a.species === 'sheep') {
        a.x = -150; a.z = 120; a.tx = a.x; a.tz = a.z;
        a.fiberDays = cfg.products.drops.wool.everyDays - 0.01;
        a.condition = 0.7;
      }
    });
    toMinute(sim, T.sleepMinute + 1);
    const sheep = sim.state.animals.filter((a) => a.species === 'sheep');
    expect(sheep.every((a) => !atHome(cfg, a))).toBe(true);   // 21:00 гэхэд хүрээгүй
    for (const a of sheep) a.lastGut = 1;
    sim.state.wolves.peaceful = true;
    toMinute(sim, T.dayStartMinute);   // өглөө
    const wool = sim.state.items.filter((i) => i.product === 'wool');
    expect(wool.length).toBeGreaterThan(5);
    const pen = cfg.camps.home.pen;
    for (const w of wool) expect(Math.hypot(w.x - pen.x, w.z - pen.z)).toBeGreaterThan(pen.r);
  });
  it('сүү, ноосны хэмжээ өчигдөр идсэн өвснөөс хамаарна', () => {
    expect(intakeFactor(cfg, 0.2)).toBe(0);
    expect(intakeFactor(cfg, 1)).toBe(1);
    const full = dailyMilkLiters(cfg, { condition: 0.6, lastGut: 1 });
    const half = dailyMilkLiters(cfg, { condition: 0.6, lastGut: 0.6 });
    expect(full).toBeGreaterThan(4.5);
    expect(half).toBeCloseTo(full / 2, 5);
    const sim = newSim(2);
    steps(sim, ACTIVE_DAY + 1);   // 20:01 — өдрийн тайлан өнгөрсөн
    for (const a of sim.state.animals) a.lastGut = 0.25;   // өлсгөлөн өдөр
    toMinute(sim, T.dayStartMinute);
    expect(sim.state.items.filter((i) => i.product === 'milk').length).toBe(0);
  });
  it('өглөө мал бэлчээрт гарна', () => {
    const sim = newSim(3);
    steps(sim, DAY + 120);   // 08:00
    expect(sim.state.animals.filter((a) => !a.riding && a.mode === 'sleep').length).toBe(0);
  });
});

describe('Шөнийн чоно (M4.5)', () => {
  it('хотод хоносон мал хамгаалалтын бүс дотор байна', () => {
    const sim = newSim(3);
    toMinute(sim, T.sleepMinute + 1);
    const zones = protectionZones(cfg, sim.state);
    const home = sim.state.animals.filter((a) => !a.riding && atHome(cfg, a));
    expect(home.length).toBeGreaterThan(5);
    for (const a of home) expect(isProtected(zones, a.x, a.z)).toBe(true);
  });
  it('зун цөөн, өвөл олон шөнө чоно ирнэ; нэг дор бүгд биш', () => {
    const count = (season: Season): number => {
      let raids = 0, maxN = 0;
      for (let seed = 1; seed <= 200; seed++) {
        const sim = newSim(seed);
        sim.state.time.day = seasonStart(cfg, season) + 1;
        const n = nightRaid(cfg, sim.state);
        if (n) raids++;
        maxN = Math.max(maxN, n);
        expect(n).toBeLessThan(sim.state.wolves.list.length + 1);
      }
      expect(maxN).toBeLessThanOrEqual((cfg.wolves.night.maxRaiders as Record<string, number>)[season]!);
      return raids;
    };
    const summer = count('summer');
    const winter = count('winter');
    expect(summer).toBeGreaterThan(0);
    expect(winter).toBeGreaterThan(summer * 1.8);
  });
  it('шөнө гадуур хоносон хонинд чоно дайрч, хашаан доторх хонь аюулгүй', () => {
    let outsideKills = 0, penKills = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const sim = newSim(seed);
      toMinute(sim, T.sleepMinute - 2);
      // Нэг хонийг хотоос 90 м зайд хоноглуулна
      const lone = sim.state.animals.find((a) => a.species === 'sheep')!;
      lone.x = 90; lone.z = -90; lone.tx = lone.x; lone.tz = lone.z; lone.mode = 'driven';
      const inPen = sim.state.animals.filter((a) => a.species === 'sheep' && a !== lone).map((a) => a.id);
      steps(sim, 3);
      // Энэ шөнө заавал нэг чоно ирнэ
      for (const o of sim.state.wolves.list) o.raid = false;
      sim.state.wolves.list[0]!.raid = true;
      steps(sim, 8 * 60);
      if (!sim.state.animals.includes(lone)) outsideKills++;
      penKills += inPen.filter((id) => !sim.state.animals.some((a) => a.id === id)).length;
      endRaid(sim.state);
    }
    expect(outsideKills).toBeGreaterThanOrEqual(4);
    expect(penKills).toBe(0);
  });
});
