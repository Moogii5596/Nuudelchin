/**
 * M6.5 Замын тэмдэг: үе шат бүр нэг удаа, ёслолын мөч (том гэр 5+ ханат + 40 хонин толгой), үргэлжлэх, хадгалалтад давтагдахгүй,
 * «анхны» мэдэгдлүүд, статистик, улирлын зөөлөн зорилт, migrate 15 → 16.
 */
import { describe, expect, it } from 'vitest';
import { cfg, newSim } from './helpers';
import type { SimEvent } from '../src/sim/sim';
import { deserialize, serialize, validateState } from '../src/sim/save';
import { MIGRATIONS, SAVE_VERSION } from '../src/sim/state';
import { checkMilestones, conditionMet, nextStage, seasonGoal, validateMilestones } from '../src/sim/systems/milestones';

const collect = (sim: ReturnType<typeof newSim>): SimEvent[] => {
  const ev: SimEvent[] = [];
  sim.on((e) => { if (e.type === 'milestone') ev.push(e); });
  return ev;
};

describe('Замын тэмдгийн тохиргоо', () => {
  it('data/milestones.json зөв; өмнөх шалгагч мэдэгдэхгүй нөхцөлийг барина', () => {
    expect(validateMilestones(cfg)).toEqual([]);
    const bad = { ...cfg, milestones: { ...cfg.milestones, stages: [{ id: 'x', cond: { nope: 1 } }] } };
    expect(validateMilestones(bad).some((m) => m.includes('nope'))).toBe(true);
  });
});

describe('Үе шат ба ёслол', () => {
  it('том 4 ханат + 80 хонь = ёслол үгүй; бага 5 ханат + 40 хонин толгой = homeowner ёслол, нэг л удаа, үргэлжилнэ', () => {
    const a = newSim(7, (s) => { s.homeSize = 'big4'; });
    a.command({ type: 'debugAddAnimals', n: 80 });
    a.runDays(1);
    expect(a.state.milestones.reached.homeowner).toBeUndefined();
    expect(a.state.milestones.ceremony).toBeNull();

    const sim = newSim(7, (s) => { s.homeSize = 'small5'; });
    const ev = collect(sim);
    sim.command({ type: 'debugAddAnimals', n: 80 });
    sim.runDays(1);
    expect(sim.state.milestones.reached.young).toBe(1);
    expect(sim.state.milestones.reached.homeowner).toBe(1);
    expect(sim.state.milestones.ceremony).toEqual({ id: 'homeowner', day: 1 });
    expect(ev.filter((e) => e.type === 'milestone' && e.id === 'homeowner')).toHaveLength(1);
    expect((ev.find((e) => e.type === 'milestone' && e.id === 'homeowner') as { ceremony: boolean }).ceremony).toBe(true);
    // «▶ Үргэлжлүүлэх»: ёслол хаагдаж, тоглоом үргэлжилнэ
    expect(sim.command({ type: 'ackCeremony' }).ok).toBe(true);
    expect(sim.state.milestones.ceremony).toBeNull();
    sim.runDays(3);
    expect(sim.state.milestones.ceremony).toBeNull();
    expect(ev.filter((e) => e.type === 'milestone' && e.id === 'homeowner')).toHaveLength(1);
    expect(sim.state.time.day).toBe(5);
  }, 60_000);

  it('хадгалж, ачаалахад үе шат, ёслол давтагдахгүй (ёслол хүлээгдэж буй бол хэвээр, баталгаажуулсан бол үгүй)', () => {
    const sim = newSim(8, (s) => { s.homeSize = 'w6'; });
    sim.command({ type: 'debugAddAnimals', n: 80 });
    sim.runDays(1);
    const pending = deserialize(cfg, serialize(sim.state));
    expect(pending.milestones.ceremony).toEqual({ id: 'homeowner', day: 1 });
    sim.command({ type: 'ackCeremony' });
    const back = deserialize(cfg, serialize(sim.state));
    expect(back.milestones.ceremony).toBeNull();
    expect(back.milestones.reached.homeowner).toBe(1);
    expect(checkMilestones(cfg, back, 9)).toEqual([]);   // дахин хүрсэн гэж тооцохгүй
    expect(validateState(cfg, back)).toEqual([]);
  }, 60_000);

  it('урт зам: fullHerd (100 хонин толгой, 3 төрөл), townOwner (300 + туслах), thousand (1000 мал) — тус бүр өөрийн нөхцөлөөр, нэг л удаа', () => {
    const sim = newSim(9, (s) => { s.homeSize = 'small5'; });
    sim.command({ type: 'debugAddAnimals', n: 160 });
    sim.runDays(1);
    expect(sim.state.milestones.reached.fullHerd).toBe(1);
    expect(sim.state.milestones.reached.townOwner).toBeUndefined();
    expect(sim.state.milestones.reached.thousand).toBeUndefined();
    expect(nextStage(cfg, sim.state)!.id).toBe('townOwner');
    sim.command({ type: 'debugAddAnimals', n: 1100 });
    sim.state.helpers.list.push({ id: 99 } as never);
    sim.runDays(1);
    expect(sim.state.milestones.reached.townOwner).toBe(2);
    expect(sim.state.milestones.reached.thousand).toBe(2);
    expect(nextStage(cfg, sim.state)).toBeNull();
  }, 120_000);
});

describe('«Анхны» мэдэгдлүүд, статистик', () => {
  it('анхны борлуулалт/төл/нүүдэл/туслах/20 хонин толгой нөхцөлөөр; статистик өдөр бүр', () => {
    const sim = newSim(10);
    expect(conditionMet(cfg, sim.state, { stat: { name: 'births', min: 1 } })).toBe(false);
    sim.state.stats.salesIncome = 5;
    sim.state.stats.moves = 1;
    sim.runDays(2);
    const r = sim.state.milestones.reached;
    expect(r.firstSale).toBeDefined();
    expect(r.firstMove).toBeDefined();
    expect(r.cart).toBeUndefined();
    expect(sim.state.stats.daily.map((d) => d.day)).toEqual([1, 2]);
    expect(sim.state.stats.daily[1]!.sheepUnits).toBeGreaterThan(0);
    expect(sim.state.stats.income).toBeGreaterThanOrEqual(0);
  }, 30_000);

  it('улирлын зөөлөн зорилт: намар — боодол өвс + саравчтай бууц (заавал биш, мэдэгдэл үүсгэхгүй)', () => {
    const sim = newSim(11);
    const autumnDay = 1 + cfg.seasons.days.summer;
    sim.state.time.day = autumnDay;
    const g = seasonGoal(cfg, sim.state)!;
    expect(g.season).toBe('autumn');
    expect(g.items.map((i) => i.key)).toEqual(['hay', 'shed']);
    expect(g.items.every((i) => !i.done)).toBe(true);
    sim.state.camps[sim.state.campId]!.hay = 12;
    expect(seasonGoal(cfg, sim.state)!.items[0]!.done).toBe(true);
  });
});

describe('Хадгалалт: migrate 15 → 16', () => {
  it('v15 хадгалалт ачаалагдаж, stats/milestones хоосноор нөхөгдөнө', () => {
    expect(SAVE_VERSION).toBe(16);
    const sim = newSim(12);
    const old = JSON.parse(JSON.stringify(sim.state)) as Record<string, unknown> & { settings: Record<string, unknown>; version: number };
    delete old.stats; delete old.milestones; delete old.settings.showMilestones;
    old.version = 15;
    const st = deserialize(cfg, JSON.stringify(old));
    expect(st.stats.daily).toEqual([]);
    expect(st.milestones).toEqual({ reached: {}, ceremony: null });
    expect(st.settings.showMilestones).toBe(true);
    expect(MIGRATIONS[15]).toBeTypeOf('function');
  });
});
