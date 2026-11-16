import { describe, expect, it } from 'vitest';
import { cfg, newSim, steps, DAY } from './helpers';
import { sumId } from '../src/sim/systems/travel';
import { bankLimit, plotDoors, townSeason, zdtgRepayable } from '../src/sim/systems/town';
import { sumDoors } from '../src/sim/systems/sumtown';
import type { Sim } from '../src/sim/sim';

function toSum(sim: Sim): void {
  const p = sim.state.player;
  sim.command({ type: 'quickMap' });
  sim.command({ type: 'mapGo', x: 0, z: 0, dest: sumId(cfg) });
  for (let i = 0; i < 2000 && p.place !== 'sum'; i++) sim.step();
}
function goTo(sim: Sim, pt: { x: number; z: number }): void {
  sim.state.player.x = pt.x;
  sim.state.player.z = pt.z;
}
const door = (role: string) => sumDoors(cfg).find((d) => d.role === role)!;
const plot = (role: string) => plotDoors(cfg).find((d) => d.role === role)!;

describe('Сумын төвийн амьдрал (V3.4)', () => {
  it('хашаа байшин авч түрээслүүлэхэд өдөр бүр түрээс орно; хүүхэд байлгах нь удахгүй', () => {
    const sim = newSim(11);
    toSum(sim);
    const st = sim.state;
    st.money = 100_000_000;
    const d = plot('house');
    goTo(sim, { x: 0, z: 300 });
    expect(sim.command({ type: 'buyHouse', plot: d.id }).ok).toBe(false);   // хол
    goTo(sim, d);
    expect(sim.command({ type: 'buyHouse', plot: d.id }).ok).toBe(true);
    expect(sim.command({ type: 'houseMode', plot: d.id, mode: 'child' }).ok).toBe(false);
    expect(sim.command({ type: 'houseMode', plot: d.id, mode: 'rent' }).ok).toBe(true);
    let rent = 0;
    sim.on((e) => {
      if (e.type === 'dayReport') rent += e.report.income.rent ?? 0;
    });
    steps(sim, DAY);
    expect(rent).toBe((cfg.town.houses as Record<string, { rentPerDay: number }>)[d.id]!.rentPerDay);
  });

  it('дуганд хандив өгвөл нэр хүнд өсч, Засаг даргаас малаар зээл авч, малаар буцаана', () => {
    const sim = newSim(12);
    toSum(sim);
    const st = sim.state;
    st.money = 5_000_000;
    goTo(sim, door('zdtg'));
    expect(sim.command({ type: 'zdtgLoan', pkg: 'sheep10' }).ok).toBe(false);   // нэр хүнд хүрэхгүй
    goTo(sim, door('temple'));
    const rep0 = st.town.reputation;
    expect(sim.command({ type: 'donate', amount: 100000 }).ok).toBe(true);
    expect(st.town.reputation).toBeCloseTo(rep0 + 10 * cfg.town.temple.reputationPer10k, 6);
    goTo(sim, door('zdtg'));
    const n0 = st.player.drove.length;
    expect(sim.command({ type: 'zdtgLoan', pkg: 'sheep10' }).ok).toBe(true);
    expect(st.player.drove.length).toBe(n0 + 10);
    expect(st.town.zdtgLoan?.n).toBe(10);
    // Тууж ирсэн мал сүрэгт нийлсэн гэж үзье — насанд хүрсэн 10 эм хонь буцаана
    st.animals.push(...st.player.drove.splice(0));
    expect(zdtgRepayable(cfg, st).length).toBeGreaterThanOrEqual(10);
    const before = st.animals.length;
    expect(sim.command({ type: 'zdtgRepay', mode: 'animals' }).ok).toBe(true);
    expect(st.animals.length).toBe(before - 10);
    expect(st.town.zdtgLoan).toBeNull();
  });

  it('банк: барьцааны хэмжээгээр зээлнэ, сар бүр хүү нэмэгдэнэ, хугацаа хэтэрвэл мал хураана', () => {
    const sim = newSim(13);
    toSum(sim);
    const st = sim.state;
    goTo(sim, door('bank'));
    const lim = bankLimit(cfg, st);
    expect(lim).toBeGreaterThan(cfg.town.bankLoan.minAmount);
    expect(sim.command({ type: 'bankLoan', amount: lim + 10000 }).ok).toBe(false);
    const amt = Math.max(cfg.town.bankLoan.minAmount, Math.floor(lim / 2 / 10000) * 10000);
    const m0 = st.money;
    expect(sim.command({ type: 'bankLoan', amount: amt }).ok).toBe(true);
    expect(st.money).toBe(m0 + amt);
    steps(sim, DAY * cfg.time.monthDays);
    expect(st.town.bankLoan!.owed).toBeGreaterThan(amt);
    const herd0 = st.animals.length;
    st.town.bankLoan!.dueDay = st.time.day - 1;
    steps(sim, DAY);
    expect(st.town.bankLoan).toBeNull();
    expect(st.animals.length).toBeLessThan(herd0);
  });

  it('хамаатанд бэлэг өгвөл дотно болж, зун хүүхэд нь туслахаар ирж, намар буцна; өвөл өвс авчирна', () => {
    const sim = newSim(14);
    toSum(sim);
    const st = sim.state;
    const d = plot('relative');
    goTo(sim, d);
    st.player.carry.push({ product: 'aaruul', amount: 20, age: 0 });
    const r0 = st.town.relatives[d.id]!.relation;
    expect(sim.command({ type: 'gift', relative: d.id, plan: { products: { aaruul: 20 }, animalIds: [] } }).ok).toBe(true);
    expect(st.town.relatives[d.id]!.relation).toBeGreaterThan(r0);
    st.town.relatives[d.id]!.relation = 80;
    // Зун эхлэх
    const summerDay = 1;
    st.time.day = summerDay;
    const ev = townSeason(cfg, st, () => st.helpers.nextId++);
    expect(ev.some((e) => e.msg.key === 'sim.the_relatives_child_came')).toBe(true);
    const kids = st.helpers.list.filter((h) => h.wage === 0 && h.kind === 'child');
    expect(kids.length).toBeGreaterThan(0);
    // Өвөл: хүүхдүүд буцаж, өвс авчирна
    st.time.day = 1 + cfg.seasons.days.summer + cfg.seasons.days.autumn;
    const hay0 = st.camps[st.campId]!.hay ?? 0;
    townSeason(cfg, st, () => st.helpers.nextId++);
    expect(st.helpers.list.filter((h) => h.wage === 0 && h.kind === 'child')).toHaveLength(0);
    expect(st.camps[st.campId]!.hay ?? 0).toBeGreaterThan(hay0);
  });

  it('дотно хамаатан хотонд айлчилбал тэр өдрийн хоол хүнсний зардал гарахгүй', () => {
    const sim = newSim(15);
    const st = sim.state;
    for (const r of Object.values(st.town.relatives)) r.relation = 100;
    let living = 0, visits = 0;
    sim.on((e) => {
      if (e.type === 'dayReport') living += e.report.expenses.living ?? 0;
      if (e.type === 'town' && e.msg.key === 'sim.relatives_visited_the_camp') visits++;
    });
    steps(sim, DAY * 6);
    expect(visits).toBeGreaterThan(0);
    expect(living).toBeLessThan(6 * cfg.economy.dailyLivingCost);
  });
});
