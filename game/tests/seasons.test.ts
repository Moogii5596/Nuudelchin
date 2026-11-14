import { describe, expect, it } from 'vitest';
import { cfg, newSim } from './helpers';
import { birthYearDay, coldNight, dailySnow, feedHay, seasonOf, seasonStart, snowAccess, yearDay } from '../src/sim/systems/seasons';
import { atHome } from '../src/sim/systems/night';
import { refreshCandidates, sendOtor } from '../src/sim/systems/helpers';

describe('Улирал ба бууцнууд (M5.5)', () => {
  it('1 жил = 50 өдөр: зун → намар → өвөл → хавар → зун', () => {
    expect(seasonOf(cfg, 1)).toBe('summer');
    expect(seasonOf(cfg, 1 + seasonStart(cfg, 'autumn'))).toBe('autumn');
    expect(seasonOf(cfg, 1 + seasonStart(cfg, 'winter'))).toBe('winter');
    expect(seasonOf(cfg, 1 + seasonStart(cfg, 'spring'))).toBe('spring');
    expect(seasonOf(cfg, 1 + cfg.time.animalYearDays)).toBe('summer');
    expect(yearDay(cfg, 51)).toBe(0);
  });

  it('цас: өвөрт бэлчиж болно, энгэр дарагдана, арт удаан тогтож хавар хайлна', () => {
    const sim = newSim(3);
    const st = sim.state;
    const winterEnd = seasonStart(cfg, 'spring');   // жилийн өдөр
    const at: Record<string, number[]> = {};
    for (let d = 1; d <= cfg.time.animalYearDays; d++) {
      st.time.day = d;
      dailySnow(cfg, st);
      for (const [id, c] of Object.entries(st.camps)) (at[id] ??= []).push(c.snow);
    }
    const endWinter = (id: string) => at[id]![winterEnd - 1]!;
    expect(endWinter('southSlope')).toBeLessThan(10);
    expect(snowAccess(cfg, endWinter('southSlope'), 'southSlope')).toBeGreaterThan(0.6);
    expect(snowAccess(cfg, endWinter('valley'), 'foothill')).toBe(0);         // энгэр дарагдсан
    expect(endWinter('northSlope')).toBeGreaterThan(endWinter('river'));
    expect(snowAccess(cfg, endWinter('northSlope'), 'northSlope')).toBeGreaterThan(snowAccess(cfg, endWinter('northSlope'), 'foothill'));   // ойд цас нимгэн
    // Хаврын төгсгөлд ар хайлсан
    expect(at['northSlope']![cfg.time.animalYearDays - 1]!).toBeLessThan(3);
    // Зун цасгүй
    expect(Math.max(...Object.values(at).map((a) => a[5]!))).toBe(0);
  });

  it('төллөлт өвөл болохгүй, дийлэн нь хавар', () => {
    const count: Record<string, number> = {};
    for (let off = 0; off < 1000; off++) {
      const s = seasonOf(cfg, 1 + birthYearDay(cfg, off % cfg.time.animalYearDays + (off / 1000)));
      count[s] = (count[s] ?? 0) + 1;
    }
    expect(count.winter ?? 0).toBe(0);
    expect(count.spring!).toBeGreaterThan(600);
    // Бүтэн жилийн sim: өвөл төл гарахгүй
    const sim = newSim(5);
    const births: Record<string, number> = {};
    sim.state.wolves.peaceful = true;
    sim.on((e) => {
      if (e.type === 'dayReport') births[e.report.season] = (births[e.report.season] ?? 0) + e.report.births;
    });
    sim.runDays(cfg.time.animalYearDays);
    expect(births.winter ?? 0).toBe(0);
    expect(births.spring ?? 0).toBeGreaterThan(births.summer ?? 0);
  });

  it('хүйтэн: гадуур хоносон мал тарга алдана, саравчтай бууцны хашаанд алдахгүй', () => {
    const sim = newSim(2);
    const st = sim.state;
    st.time.day = 1 + seasonStart(cfg, 'winter');
    const pen = cfg.camps.home.pen;
    const [a, b] = st.animals.filter((x) => x.species === 'sheep');
    a!.x = pen.x; a!.z = pen.z;
    b!.x = -120; b!.z = 90;
    a!.condition = b!.condition = 0.5;
    st.campId = 'southSlope';   // саравчтай
    coldNight(cfg, st, (x) => atHome(cfg, x));
    expect(a!.condition).toBe(0.5);
    expect(b!.condition).toBeLessThan(0.5);
    st.campId = 'river';        // энгийн хашаа — хагас
    a!.condition = 0.5;
    coldNight(cfg, st, (x) => atHome(cfg, x));
    expect(a!.condition).toBeLessThan(0.5);
    expect(0.5 - a!.condition).toBeLessThan(0.5 - b!.condition + 1e-9);
  });

  it('боодол өвс: өвөл идэш дутсан малд өгнө, зун өгөхгүй', () => {
    const sim = newSim(4);
    const st = sim.state;
    st.camps[st.campId]!.hay = 5;
    for (const a of st.animals) a.gutFill = 0.2;
    expect(feedHay(cfg, st)).toBe(0);   // зун
    st.time.day = 1 + seasonStart(cfg, 'winter');
    const used = feedHay(cfg, st);
    expect(used).toBeGreaterThan(0);
    expect(st.camps[st.campId]!.hay).toBeCloseTo(5 - used, 6);
    expect(st.animals.filter((a) => !a.riding).some((a) => a.gutFill > 0.5)).toBe(true);
  });

  it('боодол өвс авах: морьтой 2 хүртэл, гэртээ ирэхэд бууцанд овоологдоно', () => {
    const sim = newSim(6);
    const st = sim.state;
    st.money = 1_000_000;
    expect(sim.command({ type: 'quickMap' }).ok).toBe(true);
    sim.command({ type: 'mapGo', x: 0, z: 0, dest: 'sum' });
    for (let i = 0; i < 3000 && st.player.place !== 'sum'; i++) sim.step();
    expect(st.player.place).toBe('sum');
    const r = sim.command({ type: 'trade', plan: { sell: {}, sellAnimalIds: [], buy: [{ kind: 'hay', n: 10 }] } }, false);
    expect(st.money).toBe(1_000_000 - 2 * cfg.seasons.hay.price);
    expect(r.ok || r.msg).toBeTruthy();
    sim.command({ type: 'quickMap' });
    sim.command({ type: 'mapGo', x: 0, z: 0, dest: st.campId });
    for (let i = 0; i < 3000 && st.player.place !== 'camp'; i++) sim.step();
    expect(st.camps[st.campId]!.hay).toBe(2);
  });

  it('отор: цуглуулагчтай бол сүү, ноос хуримтлагдаж, тоглогч очиж авна', () => {
    const sim = newSim(9);
    const s = sim.state;
    s.home = 'ger';
    s.money = 5_000_000;
    let fam = null;
    for (let k = 0; k < 40 && !fam; k++) {
      refreshCandidates(cfg, s);
      fam = s.helpers.candidates.find((c) => c.family) ?? null;
      if (!fam) { s.helpers.candidatesDay -= 100; s.time.day += 1; }
    }
    expect(sim.command({ type: 'hire', candidate: fam!.id }, false).ok).toBe(true);
    const adult = s.helpers.list.find((h) => h.kind === 'adult')!;
    const child = s.helpers.list.find((h) => h.kind === 'child')!;
    const ids = s.animals.filter((a) => !a.riding).map((a) => a.id);
    for (const a of s.animals) if (a.species === 'cow') { a.sex = 'f'; a.lactating = true; }
    expect(sendOtor(cfg, s, adult.id, ids, 'valley')).toBeNull();
    expect(sim.command({ type: 'otorCollector', helper: child.id, camp: 'valley' }, false).ok).toBe(true);
    s.wolves.peaceful = true;
    sim.runDays(3);
    const g = s.helpers.otor[0]!;
    expect((g.items ?? []).some((it) => it.product === 'milk' || it.product === 'tarag')).toBe(true);
    // Газрын зураг дээр тэр бууцанд очиж авна
    expect(sim.command({ type: 'takeOtor', camp: 'valley' }).ok).toBe(false);   // хол байна
    sim.command({ type: 'quickMap' });
    sim.command({ type: 'mapGo', x: 0, z: 0, dest: 'valley' });
    for (let i = 0; i < 3000 && Math.hypot(s.map.x - cfg.worldmap.locations.valley!.x, s.map.z - cfg.worldmap.locations.valley!.z) > 0.01; i++) sim.step();
    const r = sim.command({ type: 'takeOtor', camp: 'valley' });
    expect(r.ok, r.msg).toBe(true);
    expect(s.player.carry.reduce((a, c) => a + c.amount, 0)).toBeGreaterThan(0);
  });
});
