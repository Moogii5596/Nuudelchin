import { describe, expect, it } from 'vitest';
import { cfg } from './helpers';
import { awayBuildings, hhmm, isHoliday, npcAt, npcById, npcConfigErrors, npcTimelineStats, npcsAt, relativeAtBuilding } from '../src/sim/systems/npc';
import { nearTownDoor } from '../src/sim/systems/town';
import { createInitialState } from '../src/sim/state';
import { sumDoors } from '../src/sim/systems/sumtown';
import { seasonOf } from '../src/sim/systems/seasons';

const N = cfg.npcs;
const at = (id: string, hh: string, day = 1) => npcAt(cfg, npcById(cfg, id)!, day, hhmm(hh));
/** тухайн улиралд (summer, winter г.м.) таарах өдөр */
const dayOf = (season: string): number => { for (let d = 1; d < 800; d++) if (seasonOf(cfg, d) === season) return d; throw new Error(season); };

describe('V6.3 NPC — тохиргоо', () => {
  it('data/npcs.json шалгалтад тэнцнэ; 8 гол + 6 сурагч + 2 цэцэрлэг + 4 гудамж', () => {
    expect(npcConfigErrors(cfg)).toEqual([]);
    expect(N.npcs.length).toBe(20);
    expect(N.npcs.filter((n) => n.role === 'pupil').length).toBe(6);
    expect(N.npcs.filter((n) => n.role === 'kinder').length).toBe(2);
    const key = ['buyer', 'grocery', 'cook', 'vet', 'teacher', 'governor', 'fuel', 'lama'];
    for (const r of key) expect(N.npcs.some((n) => n.role === r)).toBe(true);
  });

  it('хуваарийн алдаа: хоцрол ≤ 45 мин, гэр/гэрээс алхах зам ≤ maxLegMin', () => {
    for (const n of N.npcs) for (const hol of [false, true]) {
      const s = npcTimelineStats(cfg, n, hol);
      expect(s.late, `${n.id}${hol ? ' (амралт)' : ''}: хоцрол`).toBeLessThanOrEqual(45);
      expect(s.longestLeg, `${n.id}: хамгийн урт алхалт`).toBeLessThanOrEqual(N.maxLegMin);
    }
  });

  it('алдаатай тохиргоог илрүүлнэ', () => {
    const bad = { ...cfg, npcs: { ...N, npcs: [{ ...N.npcs[0]!, schedule: [['08:00', 'home'], ['07:00', 'in:buyer']] as [string, string][] }, { ...N.npcs[1]!, work: 'nope' }] } };
    const e = npcConfigErrors(bad);
    expect(e.some((x) => x.includes('өсөх дараалал'))).toBe(true);
    expect(e.some((x) => x.includes('олдсонгүй'))).toBe(true);
  });
});

describe('V6.3 NPC — npcAt (цэвэр функц)', () => {
  it('ижил цаг, өдөр → ижил байрлал; өдөр бүр цаг ±jitter хазайна', () => {
    expect(at('ganbaatar', '09:30')).toEqual(at('ganbaatar', '09:30'));
    const a = npcAt(cfg, npcById(cfg, 'ganbaatar')!, 1, hhmm('08:36')).mode, b = npcAt(cfg, npcById(cfg, 'ganbaatar')!, 9, hhmm('08:36')).mode;
    expect(['hidden', 'out', 'in']).toContain(a);
    expect(['hidden', 'out', 'in']).toContain(b);
  });

  it('өглөө гэртээ (харагдахгүй), ажлын цагаар ажлын байранд, орой гэртээ', () => {
    expect(at('ganbaatar', '06:30').mode).toBe('hidden');
    const noon = at('ganbaatar', '09:45');
    expect(noon.mode).toBe('in');
    expect(noon.building).toBe('buyer');
    expect(noon.room).toBe('shop');
    expect(at('ganbaatar', '22:30').mode).toBe('hidden');
      });

  it('ажил руу явах замдаа гудамжаар алхана (out, moving), хаалганы өмнөх цэгт ирнэ', () => {
    const n = npcById(cfg, 'ganbaatar')!;
    let walked = 0, last: { x: number; z: number } | null = null, maxStep = 0;
    for (let m = hhmm('05:50'); m < hhmm('09:00'); m += 1) {
      const s = npcAt(cfg, n, 1, m);
      if (s.mode === 'out' && s.moving) {
        walked++;
        if (last) maxStep = Math.max(maxStep, Math.hypot(s.x - last.x, s.z - last.z));
        last = s;
      } else last = null;
    }
    expect(walked).toBeGreaterThan(20);        // тасралтгүй зам
    expect(maxStep).toBeLessThan(3);           // минут тутамд саадгүй, үсрэлтгүй
    expect(['out', 'in']).toContain(npcAt(cfg, n, 1, hhmm('10:35')).mode);
  });

  it('малын эмч айл тойрох үед харагдахгүй (away), хаалганд «Айлд явсан»', () => {
    expect(at('dorjpalam', '09:00').mode).toBe('out');
    expect(at('dorjpalam', '12:30').mode).toBe('away');
    expect(awayBuildings(cfg, 1, hhmm('12:30')).has('vet')).toBe(true);
    expect(awayBuildings(cfg, 1, hhmm('09:00')).has('vet')).toBe(false);
  });

  it('зун (амралт) хүүхдүүдээс 3 нь л үлдэнэ; хичээлийн улиралд 6 нь сургуульд', () => {
    const summer = dayOf('summer'), winter = dayOf('winter');
    expect(isHoliday(cfg, summer)).toBe(true);
    expect(isHoliday(cfg, winter)).toBe(false);
    const pupils = N.npcs.filter((n) => n.role === 'pupil');
    const vis = (day: number, hh: string): number => pupils.filter((p) => npcAt(cfg, p, day, hhmm(hh)).mode !== 'hidden').length;
    expect(vis(summer, '10:30')).toBe(3);
    expect(vis(winter, '10:30')).toBeGreaterThanOrEqual(5);
    expect(pupils.filter((p) => npcAt(cfg, p, winter, hhmm('11:30')).mode === 'in' && npcAt(cfg, p, winter, hhmm('11:30')).room === 'school').length).toBeGreaterThanOrEqual(5);
  });

  it('нэгэн зэрэг харагдах NPC ≤ 20 (өдрийн бүх минутад)', () => {
    let peak = 0;
    for (const day of [dayOf('summer'), dayOf('winter')]) for (let m = 360; m <= 1320; m += 5) peak = Math.max(peak, npcsAt(cfg, day, m).filter((s) => s.mode === 'out' || s.mode === 'in').length);
    expect(peak).toBeLessThanOrEqual(20);
    expect(peak).toBeGreaterThan(6);           // зорилготой хүмүүс сумын төвд харагдана
  });

  it('хүн бүр «яагаад тэнд байгаа» нь ойлгомжтой: ажлын цагт ажлын байранд, хоолны цагаар хоолондоо', () => {
    expect(at('oyuntsetseg', '12:00')).toMatchObject({ mode: 'in', building: 'teahouse' });
    expect(at('tsetsegmaa', '11:00', dayOf('winter'))).toMatchObject({ mode: 'in', building: 'school', room: 'school' });
    expect(at('batsukh', '14:00')).toMatchObject({ mode: 'in', building: 'zdtg', room: 'admin' });
    expect(at('luvsan', '10:00')).toMatchObject({ mode: 'in', building: 'temple', room: 'temple' });
    expect(['out']).toContain(at('lkhagvasuren', '10:00').mode);
  });
});

describe('V6.3 NPC — Сарангэрэл = plot_rel_1-ийн хамаатан', () => {
  it('ажлын цагт дэлгүүрт байхад хүнсний дэлгүүрийн хаалганаас бэлэг өгч болно (town.relatives)', () => {
    const st = createInitialState(cfg, 5);
    const door = sumDoors(cfg).find((d) => d.role === 'grocery')!;
    Object.assign(st.player, { place: 'sum', x: door.x, z: door.z });
    st.time.minute = hhmm('10:00');
    expect(relativeAtBuilding(cfg, st, door.id)).toBe('plot_rel_1');
    expect(nearTownDoor(cfg, st)).toEqual({ id: 'plot_rel_1', role: 'relative' });
    st.time.minute = hhmm('22:30');                // гэртээ — дэлгүүрт байхгүй
    expect(relativeAtBuilding(cfg, st, door.id)).toBeNull();
    expect(nearTownDoor(cfg, st)?.role).toBe('soon');
  });
});
