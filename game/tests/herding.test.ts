/**
 * M6.9 Туух ба амьд мал: татах (уураггүй алхахад 6 м доторх мал дагана), сүргийн удирдагч (ахмад эм мал; үхэх/зарагдахад солигдоно, туухад
 * дагагчид удирдагчийг дагана), унаа морь (буухад 15 м дотор бэлчинэ, H-аар ирнэ), нохой мал хариулахгүй.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { cfg, newSim, steps } from './helpers';
import { leaderOf, refreshLeaders } from '../src/sim/systems/herding';
import { ridingHorse } from '../src/sim/systems/herder';
import { deserialize, serialize } from '../src/sim/save';

type S = ReturnType<typeof newSim>;

function setup(seed: number): { sim: S; flock: number[] } {
  const sim = newSim(seed);
  sim.command({ type: 'debugAddAnimals', n: 40, x: 0, z: 0 });
  const st = sim.state;
  st.wolves.peaceful = true;
  st.player.x = 0; st.player.z = 0; st.player.heading = 0;
  const sheep = st.animals.filter((a) => a.species === 'sheep' && !a.riding).slice(0, 20);
  sheep.forEach((a, i) => { const ang = (i / sheep.length) * Math.PI * 2; a.x = Math.sin(ang) * 4; a.z = Math.cos(ang) * 4; a.mode = 'graze'; a.tx = a.x; a.tz = a.z; });
  return { sim, flock: sheep.map((a) => a.id) };
}

/** Малчин дараалан z тэнхлэгээр n м алхана (1 м = 3 алхам) */
function walk(sim: S, meters: number): void {
  for (let i = 0; i < meters; i++) {
    sim.command({ type: 'movePlayer', x: sim.state.player.x, z: sim.state.player.z + 1, heading: 0 });
    steps(sim, 3);
  }
}

describe('Татах', () => {
  it('малчин уураггүй 20 м алхахад ойрын малын ≥ 80% дагасан', () => {
    const { sim, flock } = setup(1);
    sim.state.player.holdingUurga = false;
    walk(sim, 20);
    steps(sim, 5);
    const p = sim.state.player;
    const near = flock.filter((id) => { const a = sim.state.animals.find((x) => x.id === id)!; return Math.hypot(a.x - p.x, a.z - p.z) <= 8; });
    expect(near.length / flock.length).toBeGreaterThanOrEqual(0.8);
  });

  it('уурга барьсан, морьтой, эсвэл зогсож байвал татахгүй', () => {
    const a1 = setup(2);
    a1.sim.state.player.holdingUurga = true;
    walk(a1.sim, 20);
    const p1 = a1.sim.state.player;
    const near1 = a1.flock.filter((id) => { const a = a1.sim.state.animals.find((x) => x.id === id)!; return Math.hypot(a.x - p1.x, a.z - p1.z) <= 8; });
    expect(near1.length / a1.flock.length).toBeLessThan(0.5);   // уурга барьсан үед мал айж холдоно
    const a2 = setup(3);
    a2.sim.state.player.holdingUurga = false;
    steps(a2.sim, 30);   // зогсож байна
    expect(a2.flock.every((id) => a2.sim.state.animals.find((x) => x.id === id)!.mode !== 'driven')).toBe(true);
  });
});

describe('Сүргийн удирдагч', () => {
  it('сүрэг бүрт ахмад эм мал; үхэх/зарагдахад дараагийнх нь болно; хадгалалтад үлдэнэ', () => {
    const sim = newSim(4);
    const st = sim.state;
    refreshLeaders(cfg, st);
    const lead = leaderOf(st, 'sheep')!;
    expect(lead).toBeTruthy();
    const adults = st.animals.filter((a) => a.species === 'sheep' && !a.riding && a.age >= cfg.animals.species.sheep.adultAge);
    const fem = adults.filter((a) => a.sex === 'f');
    expect(lead.age).toBe(Math.max(...(fem.length ? fem : adults).map((a) => a.age)));
    if (fem.length) expect(lead.sex).toBe('f');
    expect(st.leaders.cow).toBeDefined();
    // удирдагч алга болно (үхсэн/зарагдсан)
    st.animals = st.animals.filter((a) => a.id !== lead.id);
    expect(refreshLeaders(cfg, st)).toBeGreaterThanOrEqual(1);
    const next = leaderOf(st, 'sheep')!;
    expect(next.id).not.toBe(lead.id);
    expect(deserialize(cfg, serialize(st)).leaders).toEqual(st.leaders);
  });

  it('туухад (Хөөе!) дагагчид удирдагчийн зорилтыг дагана', () => {
    const { sim } = setup(5);
    const st = sim.state;
    refreshLeaders(cfg, st);
    const lead = leaderOf(st, 'sheep')!;
    lead.x = 0; lead.z = 2;
    sim.command({ type: 'shout' });
    sim.step();
    expect(lead.mode).toBe('driven');
    const followers = st.animals.filter((a) => a !== lead && a.species === 'sheep' && !a.riding && a.mode === 'driven' && Math.hypot(a.x - lead.x, a.z - lead.z) < 40);
    expect(followers.length).toBeGreaterThan(5);
    for (const a of followers) {
      const off = Math.hypot(a.tx - lead.tx, a.tz - lead.tz);
      expect(off, `дагагч ${a.id}`).toBeLessThanOrEqual(Math.hypot(a.x - lead.x, a.z - lead.z) * cfg.player.follow.leaderSpread + 2);   // +2: нэг алхмын хөдөлгөөн
    }
  });
});

describe('Унаа морь', () => {
  it('буухад уяагүй: буусан газраасаа 15 м дотор бэлчинэ; H-аар ирнэ', () => {
    const sim = newSim(6);
    const st = sim.state;
    st.wolves.peaceful = true;
    st.player.x = 5; st.player.z = 5;
    const horse = ridingHorse(st)!;
    horse.x = 5; horse.z = 5;
    expect(sim.command({ type: 'toggleMount' }).ok).toBe(true);
    expect(sim.command({ type: 'toggleMount' }).ok).toBe(true);   // буулаа
    expect(st.player.mounted).toBe(false);
    const ax = horse.hx!, az = horse.hz!;
    st.player.x = ax + 30; st.player.z = az;   // малчин холдоно — морь бэлчинэ (дэргэд байвал зогсоно)
    let maxD = 0, moved = 0;
    for (let i = 0; i < 400; i++) {
      const px = horse.x, pz = horse.z;
      sim.step();
      maxD = Math.max(maxD, Math.hypot(horse.x - ax, horse.z - az));
      moved += Math.hypot(horse.x - px, horse.z - pz);
    }
    expect(maxD).toBeLessThanOrEqual(cfg.player.horseGraze.radius + 0.5);
    expect(moved).toBeGreaterThan(5);   // алхаж бэлчсэн
    // H: дуудахад малчин руу ирнэ
    sim.command({ type: 'callHorse' });
    steps(sim, 200);
    expect(Math.hypot(horse.x - st.player.x, horse.z - st.player.z)).toBeLessThan(cfg.player.mountRange);
  });
});

describe('Нохой мал хариулахгүй', () => {
  it('dogs.ts мал руу зорилт/«туугдсан» горим өгдөггүй (зөвхөн хамгаална)', () => {
    const src = readFileSync(new URL('../src/sim/systems/dogs.ts', import.meta.url), 'utf8');
    expect(src).not.toMatch(/mode\s*=\s*'driven'/);
    expect(src).not.toMatch(/\.tx\s*=/);
  });
});
