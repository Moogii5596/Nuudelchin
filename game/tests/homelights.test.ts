import { describe, expect, it } from 'vitest';
import { cfg } from './helpers';
import { getHomeState, homeLights, idHash } from '../src/render/homeLights';
import { SpeedSmoother } from '../src/render/character/talk';
import { characters } from '../src/render/character/spec';
import { hhmm } from '../src/sim/systems/npc';

describe('айлын гэрэл (homeLights)', () => {
  it('idHash: тогтмол, [0,1), id бүрд өөр', () => {
    expect(idHash('plot_rel_1', 1)).toBe(idHash('plot_rel_1', 1));
    const hs = Array.from({ length: 40 }, (_, i) => idHash(`zone#${i}`, 1));
    for (const h of hs) { expect(h).toBeGreaterThanOrEqual(0); expect(h).toBeLessThan(1); }
    expect(new Set(hs.map((h) => h.toFixed(3))).size).toBeGreaterThan(30);
  });

  it('NPC-ийн айл: гэртээ байхад л хүнтэй (npcs.json home: plot:plot_rel_1)', () => {
    const states = [hhmm('03:00'), hhmm('11:00'), hhmm('21:00')].map((m) => getHomeState(cfg, 1, m, 'plot_rel_1'));
    expect(states.every((s) => s.known)).toBe(true);
    expect(states[0]!.occupied).toBe(true);   // шөнө дунд гэртээ
    expect(states.some((s) => !s.occupied)).toBe(true);   // өдөр хаа нэгтээ яваа цаг бий
  });

  it('stub: хуваарьгүй айл өглөө, орой хүнтэй; өдөр хоосон', () => {
    expect(getHomeState(cfg, 1, hhmm('19:00'), 'zone#1')).toEqual({ occupied: true, known: false });
    expect(getHomeState(cfg, 1, hhmm('12:00'), 'zone#1').occupied).toBe(false);
  });

  it('тохиргоо: хазайлт ≥ 0, stub мужууд 0–1440', () => {
    expect(homeLights.jitterMin).toBeGreaterThan(0);
    for (const [a, b] of homeLights.stub.awakeMinutes) { expect(a).toBeGreaterThanOrEqual(0); expect(b).toBeLessThanOrEqual(1440); }
  });
});

describe('SpeedSmoother — гаднах ба барилга доторх нэг механизм', () => {
  it('ганц кадрын үсрэлт зогсолтыг анивчуулахгүй, зогссоны дараа босгоос доош буурна', () => {
    const s = new SpeedSmoother();
    s.step(0, 0, 0.016);
    for (let i = 0; i < 30; i++) s.step(i * 0.1, 0, 0.016);   // алхаж байна (6 м/с, 9-өөр хязгаарлагдана)
    expect(s.still(false)).toBe(false);
    s.step(3, 0, 0.016);
    expect(s.speed).toBeGreaterThan(characters.talk.stillSpeed);   // нэг кадрын зогсолтоор «зогссонд» тооцохгүй
    for (let i = 0; i < 120; i++) s.step(3, 0, 0.016);
    expect(s.still(false)).toBe(true);
  });

  it('hysteresis: ярилцаж байхад босго exitScale дахин өндөр', () => {
    const s = new SpeedSmoother();
    s.speed = characters.talk.stillSpeed * (1 + characters.talk.exitScale) / 2;
    expect(s.still(false)).toBe(false);
    expect(s.still(true)).toBe(true);
  });

  it('reset: орчин солигдоход эхний кадрын үсрэлт хурд болохгүй', () => {
    const s = new SpeedSmoother();
    s.step(0, 0, 0.016); s.reset(); s.step(500, 500, 0.016);
    expect(s.speed).toBe(0);
  });
});

describe('оршин суугчийн шөнийн нуугдалт (characters.json crowd.night)', () => {
  it('from > to: шөнө дундыг гатална; jitter < 24 цаг', () => {
    const N = characters.crowd.night;
    expect(N.from).toBeGreaterThan(N.to);
    expect(N.jitterMin).toBeLessThan(240);
  });
});
