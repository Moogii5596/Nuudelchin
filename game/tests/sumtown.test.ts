import { describe, expect, it } from 'vitest';
import { cfg, newSim } from './helpers';
import { sumId, fleetOf } from '../src/sim/systems/travel';
import { lotSlots, nearTradeDoor, sumDoors, sumHeight, TRADE_ROLES, worldLimit } from '../src/sim/systems/sumtown';
import type { Sim } from '../src/sim/sim';

/** Тоглогчийг морьтойгоор сумын төвд хүргэнэ */
function toSum(sim: Sim): void {
  const p = sim.state.player;
  sim.command({ type: 'quickMap' });
  sim.command({ type: 'mapGo', x: 0, z: 0, dest: sumId(cfg) });
  for (let i = 0; i < 2000 && p.place !== 'sum'; i++) sim.step();
}
const door = (role: string) => sumDoors(cfg).find((d) => d.role === role)!;

describe('Сумын төв: Могод сум (V3.3)', () => {
  it('арилжааны үүрэг бүрт дэлгүүр, нэг цайны газар бий; хаалга нь хязгаараас дотор', () => {
    for (const r of TRADE_ROLES) expect(door(r), r).toBeTruthy();
    expect(sumDoors(cfg).filter((d) => d.role === 'teahouse')).toHaveLength(1);
    for (const d of sumDoors(cfg)) expect(Math.hypot(d.x, d.z)).toBeLessThan(cfg.worldmap.sum3d.radius - 10);
    expect(worldLimit(cfg, 'sum')).toBe(cfg.worldmap.sum3d.radius);
    expect(worldLimit(cfg, 'camp')).toBe(cfg.player.worldRadius);
    expect(sumHeight(cfg.sumcenter, 0, 0)).toBe(0);                // төв нь тэгш
    expect(sumHeight(cfg.sumcenter, -260, -150)).toBeGreaterThan(10);   // баруун талын уул
  });

  it('цэцэрлэгийн зүүн талын замаар орж ирээд сумын төв рүү харна; хязгаар 420 м', () => {
    const sim = newSim(5);
    toSum(sim);
    const p = sim.state.player, e = cfg.sumcenter.entry;
    expect(p.place).toBe('sum');
    expect(Math.hypot(p.x - e.x, p.z - e.z)).toBeLessThan(1);
    expect(Math.sin(p.heading)).toBeLessThan(-0.9);   // баруун тийш (x−)
    // 158 м-ээс цааш явахад газрын зураг руу гарахгүй (сумын төв том)
    expect(sim.command({ type: 'movePlayer', x: 200, z: -25, heading: 0 }).ok).toBe(true);
    expect(p.place).toBe('sum');
  });

  it('дэлгүүр бүрт зөвхөн тэнд байдаг зүйл: тэжээлийн дэлгүүрт мал авахгүй, малын зах дээр авна', () => {
    const sim = newSim(6);
    toSum(sim);
    const st = sim.state, p = st.player;
    st.money = 5_000_000;
    const lamb = { kind: 'animal' as const, species: 'sheep' as const, sex: 'f' as const, age: 1 };
    p.x = door('feed').x;
    p.z = door('feed').z;
    expect(nearTradeDoor(cfg, st)?.role).toBe('feed');
    const r1 = sim.command({ type: 'trade', plan: { sell: {}, sellAnimalIds: [], buy: [lamb] } });
    expect(r1.ok).toBe(false);
    expect(sim.command({ type: 'trade', plan: { sell: {}, sellAnimalIds: [], buy: [{ kind: 'hay', n: 1 }] } }).ok).toBe(true);
    const m = door('livestock');
    p.x = m.x;
    p.z = m.z;
    expect(nearTradeDoor(cfg, st)?.role).toBe('livestock');
    expect(sim.command({ type: 'trade', plan: { sell: {}, sellAnimalIds: [], buy: [lamb] } }).ok).toBe(true);
    // Дэлгүүрээс хол бол арилжаа хийхгүй
    p.x = 0;
    p.z = 300;
    expect(sim.command({ type: 'trade', plan: { sell: {}, sellAnimalIds: [], buy: [{ kind: 'hay', n: 1 }] } }).ok).toBe(false);
  });

  it('машин худалдааны талбайгаас Портер авч шууд суугаад явна; сүүний машин удахгүй', () => {
    const sim = newSim(7);
    toSum(sim);
    const st = sim.state, p = st.player;
    st.money = 50_000_000;
    const slot = lotSlots(cfg).find((s) => s.vehicle === 'porter')!;
    p.x = slot.x + 1;
    p.z = slot.z;
    const before = st.money;
    const r = sim.command({ type: 'buyLotVehicle', slot: slot.id });
    expect(r.ok, r.msg).toBe(true);
    expect(st.vehicles).toContain('porter');
    expect(p.driving).toBe('porter');
    expect(p.mounted).toBe(false);
    const f = fleetOf(st, 'porter')!;
    expect(f.place).toBe('sum');
    expect(Math.hypot(f.x - slot.x, f.z - slot.z)).toBeLessThan(0.01);
    expect(st.money).toBe(before - cfg.vehicles.porter.price);
    // Дахин авахгүй
    sim.command({ type: 'toggleVehicle' });
    p.x = slot.x;
    p.z = slot.z;
    expect(sim.command({ type: 'buyLotVehicle', slot: slot.id }).ok).toBe(false);
    const milk = lotSlots(cfg).find((s) => s.display)!;
    p.x = milk.x;
    p.z = milk.z;
    expect(sim.command({ type: 'buyLotVehicle', slot: milk.id }).ok).toBe(false);
  });
});
