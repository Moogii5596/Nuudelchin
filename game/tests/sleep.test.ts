import { describe, expect, it } from 'vitest';
import { cfg, newSim } from './helpers';
import { sumId } from '../src/sim/systems/travel';
import { plotDoors } from '../src/sim/systems/town';
import { minutesUntilWake, sleepHours, sleepPlace, wakeOptions } from '../src/sim/systems/sleep';
import { validateConfig } from '../src/sim/config';
import type { Sim } from '../src/sim/sim';
import type { DayReport } from '../src/sim/sim';

function toSum(sim: Sim): void {
  const p = sim.state.player;
  sim.command({ type: 'quickMap' });
  sim.command({ type: 'mapGo', x: 0, z: 0, dest: sumId(cfg) });
  for (let i = 0; i < 2000 && p.place !== 'sum'; i++) sim.step();
}
const rel = () => plotDoors(cfg).find((d) => d.role === 'relative')!;
/** Сумын төвд, хамаатны үүдэнд, өгсөн цагт */
function setup(minute: number, seed = 21): Sim {
  const sim = newSim(seed);
  toSum(sim);
  const st = sim.state;
  st.player.driving = null;
  st.player.x = rel().x;
  st.player.z = rel().z;
  st.time.minute = minute;
  return sim;
}
const W = (h: number, m = 0) => h * 60 + m;

describe('Хамаатны айлд унтах (2026-11-16)', () => {
  it('data/sleep.json: сэрэх цаг 04:00–10:00, 30 минутын алхам, анхдагч 06:00; config шалгагч ногоон', () => {
    const o = wakeOptions(cfg);
    expect(o[0]).toBe(W(4));
    expect(o.at(-1)).toBe(W(10));
    expect(o.length).toBe(13);
    expect(cfg.sleep.wakeDefault).toBe(W(6));
    expect(validateConfig(cfg).filter((e) => e.startsWith('sleep'))).toEqual([]);
  });

  it('унтах нөхцөл: зөвхөн 18:00–03:00, хамаатны үүдэнд; бусад үед амжилтгүй, цаг өөрчлөгдөхгүй', () => {
    const sim = setup(W(17, 59));
    const st = sim.state;
    expect(sleepPlace(cfg, st)).toBe(rel().id);
    expect(sleepHours(cfg, st)).toBe(false);
    expect(sim.command({ type: 'sleep', wake: W(6) }).ok).toBe(false);   // эрт
    st.time.minute = 24 * 60 + 3 * 60 + 1;
    expect(sim.command({ type: 'sleep', wake: W(6) }).ok).toBe(false);   // оройтсон
    st.time.minute = W(20);
    const t0 = { ...st.time };
    st.player.x = 0;
    st.player.z = 0;
    expect(sim.command({ type: 'sleep', wake: W(6) }).ok).toBe(false);   // хамаатнаас хол
    expect(st.time).toEqual(t0);
    st.player.x = rel().x;
    st.player.z = rel().z;
    expect(sim.command({ type: 'sleep', wake: W(3) }).ok).toBe(false);    // сэрэх цаг муу
    expect(sim.command({ type: 'sleep', wake: W(6, 10) }).ok).toBe(false);   // алхамд таараагүй
    expect(sim.command({ type: 'sleep', wake: W(10, 30) }).ok).toBe(false);
    st.player.place = 'map';
    expect(sim.command({ type: 'sleep', wake: W(6) }).ok).toBe(false);
  });

  it('сэрэх цаг: 06:00+ бол дараа өдрийн тэр цаг; 06:00-аас өмнө бол тухайн шөнө; тоглогч хамаатны үүдэнд', () => {
    for (const [now, wake, dayAdd, minute] of [
      [W(20), W(6), 1, W(6)],
      [W(20), W(10), 1, W(10)],
      [W(18), W(8, 30), 1, W(8, 30)],
      [W(22), W(4), 0, W(28)],         // 04:00 = 28:00 (тухайн өдрийн шөнө)
      [24 * 60 + 2 * 60, W(5, 30), 0, W(29, 30)],   // 02:00-д унтаад 05:30-д
    ] as const) {
      const sim = setup(now);
      const st = sim.state;
      const d0 = st.time.day;
      expect(minutesUntilWake(cfg, st, wake)).toBeGreaterThan(0);
      st.player.x = rel().x + 3;
      const r = sim.command({ type: 'sleep', wake });
      expect(r.ok, `now=${now} wake=${wake}`).toBe(true);
      expect(st.time.day).toBe(d0 + dayAdd);
      expect(st.time.minute).toBe(minute);
      expect(st.player.x).toBeCloseTo(rel().x, 6);
      expect(st.player.z).toBeCloseTo(rel().z, 6);
      expect(st.player.place).toBe('sum');
    }
  });

  it('унтахад өдөр шинэчлэгдэж, 20:00-ийн тайлан нэг л удаа гарна; 20:00-оос хойш унтвал дахин гарахгүй', () => {
    const sim = setup(W(19));
    const reports: DayReport[] = [];
    sim.on((e) => { if (e.type === 'dayReport') reports.push(e.report); });
    const d0 = sim.state.time.day;
    expect(sim.command({ type: 'sleep', wake: W(7) }).ok).toBe(true);
    expect(reports.length).toBe(1);
    expect(reports[0]!.day).toBe(d0);
    expect(sim.state.time.day).toBe(d0 + 1);
    expect(sim.state.today.income).toEqual({});   // шинэ өдөр цэвэр

    const late = setup(W(21), 22);
    let n = 0;
    late.on((e) => { if (e.type === 'dayReport') n++; });
    expect(late.command({ type: 'sleep', wake: W(6) }).ok).toBe(true);
    expect(n).toBe(0);
  });

  it('унтах нь ердийн sim: унтахгүй 1 өдөр гүйлгэсэнтэй мал, мөнгө, цаг ижил (сурга, шөнийн эрсдэл хэвээр)', () => {
    const a = setup(W(19), 23);
    const b = setup(W(19), 23);
    a.command({ type: 'sleep', wake: W(6) });
    const n = minutesUntilWake(cfg, b.state, W(6));
    for (let i = 0; i < n; i++) b.step();
    expect(a.state.step).toBe(b.state.step);
    expect(a.state.animals.length).toBe(b.state.animals.length);
    expect(a.state.money).toBe(b.state.money);
    expect(a.state.time).toEqual(b.state.time);
  });
});

describe('Унтах: морьтой, бууцны шөнийн эрсдэл', () => {
  it('морьтой тоглогч унтахад морноосоо буудаг', () => {
    const sim = setup(W(21), 24);
    sim.state.player.mounted = true;
    expect(sim.command({ type: 'sleep', wake: W(6) }).ok).toBe(true);
    expect(sim.state.player.mounted).toBe(false);
  });
});
