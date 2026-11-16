import { describe, expect, it } from 'vitest';
import { cfg, newSim } from './helpers';
import { birthYearDay, yearDay } from '../src/sim/systems/seasons';
import { birthForecast } from '../src/sim/systems/breeding';
import type { Sim } from '../src/sim/sim';

const until = (sim: Sim, day: number, minute: number): void => {
  while (sim.state.time.day < day || sim.state.time.minute < minute) sim.step();
};

describe('Өдрийн тайлангийн дэлгэрэнгүй (1f) — симуляцийн бодит бүртгэлээс', () => {
  it('нэг өдөр: үнээ гадуур хоносон, чоно халдсан, төл төрсөн → бүтээгдэхүүн, чоно, малын хөдөлгөөн, ирэх төллөлт бүгд бүртгэгдэнэ', () => {
    const sim = newSim(61);
    const s = sim.state;
    sim.command({ type: 'cheat', action: 'wolvesPeaceful' });
    // 1-р өдрийн шөнө: нэг сүүтэй үнээг хотноос хол хоноглуулна (сүү нь тэнд үлдэнэ)
    until(sim, 1, cfg.time.sleepMinute + 30);
    const cows = s.animals.filter((a) => a.species === 'cow' && a.sex === 'f');
    expect(cows.length).toBeGreaterThanOrEqual(2);
    for (const c of cows) { c.lactating = true; c.lastGut = 1; c.condition = 0.8; c.milkTimer = 0; }
    const out = cows[0]!;
    out.x = out.tx = cfg.camps.home.cowYard.x + 90;
    out.z = out.tz = cfg.camps.home.cowYard.z;
    out.mode = 'sleep';
    cows[1]!.lastGut = 0;   // өчигдөр өвс идээгүй үнээ — сүү гарахгүй
    until(sim, 2, cfg.time.dayStartMinute + 5);
    expect(s.today.yield?.cow).toMatchObject({ outside: 1, lowGut: 1 });
    expect(s.today.yield!.cow!.gave).toBeGreaterThanOrEqual(1);
    expect(s.items.some((it) => it.product === 'milk' && Math.hypot(it.x - out.x, it.z - out.z) < 8)).toBe(true);

    // 2-р өдөр: чоно дуудна (cheat) — үүрний нутагт үлдсэн хонь
    const bait = s.animals.find((a) => a.species === 'sheep' && a.sex === 'f')!;   // хуцыг биш (төллөлтөд хэрэгтэй)
    const den = s.wolves.dens[0]!;
    bait.x = bait.tx = den.x + 3;
    bait.z = bait.tz = den.z;
    sim.command({ type: 'cheat', action: 'wolfAttack' });
    const n0 = s.animals.length;
    for (let i = 0; i < 240 && s.animals.length === n0; i++) { bait.tx = bait.x; bait.tz = bait.z; sim.step(); }
    expect(s.animals.length).toBe(n0 - 1);
    sim.command({ type: 'cheat', action: 'wolvesPeaceful' });

    // Төрөлтийг ойртуулна: нэг эм хонины мөчлөгийг өнөөдөр болгоно
    const yd = yearDay(cfg, s.time.day);
    const ewes = s.animals.filter((a) => a.species === 'sheep' && a.sex === 'f' && a.id !== bait.id);
    let today = 0;
    for (let off = 0; off < cfg.time.animalYearDays; off++) if (birthYearDay(cfg, off) === yd) { today = off; break; }
    expect(birthYearDay(cfg, today)).toBe(yd);
    for (const e of ewes) { e.cycleOffset = today; e.condition = 1; e.age = Math.max(e.age, cfg.animals.species.sheep.breedAge); }
    const rams = s.animals.filter((a) => a.species === 'sheep' && a.sex === 'm');
    for (const r of rams) r.age = Math.max(r.age, cfg.animals.species.sheep.breedAge);

    until(sim, 2, cfg.time.dayEndMinute + 1);
    const r = s.journal.reports.at(-1)!;
    expect(r.day).toBe(2);
    expect(r.yield?.cow).toMatchObject({ outside: 1, lowGut: 1 });
    expect(r.wolfAttacks).toBeGreaterThanOrEqual(1);
    expect(r.wolfKills.sheep).toBe(1);
    expect(r.wolfWhere).toEqual({ den: 1 });
    expect(r.births).toBeGreaterThan(0);
    expect(r.births + r.deaths).toBe(Object.values(r.deathCauses ?? {}).reduce((a, n) => a + (n ?? 0), 0) + r.births);
    expect(r.animalsStart).toBeDefined();
    expect(r.animals - r.animalsStart!).toBe(r.births - r.deaths - 1);   // чонод 1
    // Ирэх төллөлт: одоогийн сүргийн мөчлөгөөс
    expect(r.forecast!.length).toBeGreaterThan(0);
    for (const f of r.forecast!) {
      expect(f.inDays).toBeGreaterThanOrEqual(1);
      expect(f.day).toBe(r.day + f.inDays);
      expect(f.females).toBeGreaterThanOrEqual(1);
    }
    expect(birthForecast(cfg, s)).toEqual(r.forecast);
  });

  it('ирэх төллөлт: хамгийн ойрын өдөр яг тэр өдөр төллөх ээлжтэй эм малтай таарна', () => {
    const sim = newSim(62);
    const s = sim.state;
    const Y = cfg.time.animalYearDays;
    for (const f of birthForecast(cfg, s)) {
      const due = s.animals.filter((a) => a.species === f.species && a.sex === 'f' && !a.riding && a.age >= cfg.animals.species[f.species].breedAge && birthYearDay(cfg, a.cycleOffset) === yearDay(cfg, s.time.day + f.inDays));
      expect(due.length).toBeGreaterThan(0);
      expect(f.inDays).toBeLessThanOrEqual(Y);
    }
  });
});
