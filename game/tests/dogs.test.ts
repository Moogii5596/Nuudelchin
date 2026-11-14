import { AutoTrip } from '../src/sim/autotrip';
import { describe, expect, it } from 'vitest';
import { cfg, newSim, steps } from './helpers';

function withDog(seed = 41) {
  const sim = newSim(seed, (s) => {
    s.wolves.peaceful = true;
    for (const w of s.wolves.list) {
      w.x = w.tx = 300;   // туршилтад чоно саад болохгүй
      w.z = w.tz = 300;
    }
  });
  expect(sim.command({ type: 'cheat', action: 'addDog' }).ok).toBe(true);
  return sim;
}

describe('Нохой (M4, хэрэглэгчийн дүрэм: командууд)', () => {
  it('шинэ нохой анхдагчаар хотыг эргүүлнэ', () => {
    const sim = withDog();
    const d = sim.state.dogs[0]!;
    expect(d.order).toBe('patrolCamp');
    steps(sim, 120);
    const c = cfg.dogs.campPatrol;
    expect(Math.abs(Math.hypot(d.x - c.x, d.z - c.z) - c.r)).toBeLessThan(4);
  });

  it('«Намайг дага» — малчны араас дагана', () => {
    const sim = withDog();
    expect(sim.command({ type: 'dogOrder', dog: 'all', order: 'follow' }).ok).toBe(true);
    for (let i = 0; i < 60; i++) {
      sim.command({ type: 'movePlayer', x: i * 0.6, z: 10, heading: Math.PI / 2 });
      sim.step();
    }
    const d = sim.state.dogs[0]!;
    expect(Math.hypot(d.x - sim.state.player.x, d.z - sim.state.player.z)).toBeLessThan(6);
    expect(d.x).toBeLessThan(sim.state.player.x); // араас нь
  });

  it('«Энд зогс» — тушаасан газраа үлдэнэ', () => {
    const sim = withDog();
    sim.command({ type: 'movePlayer', x: 40, z: 30 });
    sim.command({ type: 'dogOrder', dog: 'all', order: 'stay' });
    sim.command({ type: 'movePlayer', x: -30, z: -10 });
    steps(sim, 80);
    const d = sim.state.dogs[0]!;
    expect(Math.hypot(d.x - 40, d.z - 30)).toBeLessThan(0.5);
  });

  it('«Энд эргүүл хий» — тушаасан газрыг тойрон эргүүлнэ', () => {
    const sim = withDog();
    sim.command({ type: 'movePlayer', x: 50, z: 40 });
    sim.command({ type: 'dogOrder', dog: 'all', order: 'patrol' });
    steps(sim, 60);
    const d = sim.state.dogs[0]!;
    const angles: number[] = [];
    for (let i = 0; i < 30; i++) {
      sim.step();
      expect(Math.abs(Math.hypot(d.x - 50, d.z - 40) - cfg.dogs.patrolRadius)).toBeLessThan(3);
      angles.push(Math.atan2(d.z - 40, d.x - 50));
    }
    expect(new Set(angles.map((a) => a.toFixed(1))).size).toBeGreaterThan(5);
  });

  it('«Сүргийг хамгаал» — хонин сүргийн дэргэд явна', () => {
    const sim = withDog();
    const sheep = sim.state.animals.filter((a) => a.species === 'sheep');
    sim.command({ type: 'movePlayer', x: sheep[0]!.x, z: sheep[0]!.z });
    sim.command({ type: 'dogOrder', dog: 'all', order: 'guardHerd', herd: 'sheep' });
    steps(sim, 120);
    const live = sim.state.animals.filter((a) => a.species === 'sheep');
    const cx = live.reduce((t, a) => t + a.x, 0) / live.length, cz = live.reduce((t, a) => t + a.z, 0) / live.length;
    const d = sim.state.dogs[0]!;
    expect(Math.hypot(d.x - cx, d.z - cz)).toBeLessThan(cfg.dogs.guardRadius + 8);
  });

  it('ойртсон чоныг хөөж, айлгаж үүр лүү нь буцаана', () => {
    const sim = withDog();
    sim.state.wolves.peaceful = false;
    sim.command({ type: 'movePlayer', x: 60, z: 60 });
    sim.command({ type: 'dogOrder', dog: 'all', order: 'stay' });
    const d = sim.state.dogs[0]!;
    d.x = 60;
    d.z = 60;
    const w = sim.state.wolves.list[0]!;
    w.x = w.tx = 75;
    w.z = w.tz = 60;
    let fled = false;
    for (let i = 0; i < 40 && !fled; i++) {
      sim.step();
      fled = w.mode === 'flee';
    }
    expect(fled).toBe(true);
  });

  it('сумын төвөөс нохой авч, өдөр бүр хоолны зардал гарна', () => {
    const sim = newSim(42);
    sim.state.money = 2_000_000;
    const t = AutoTrip.run(sim, { sell: {}, sellAnimalIds: [], buy: [{ kind: 'dog' }] });
    expect(t.phase).toBe('done');
    expect(sim.state.dogs).toHaveLength(1);
    let food = 0;
    sim.on((e) => {
      if (e.type === 'dayReport') food = e.report.expenses.dogFood ?? 0;
    });
    sim.command({ type: 'cheat', action: 'endDay' });
    expect(food).toBe(cfg.dogs.foodPerDay);
  });

  it('нохойгүй үед команд амжилтгүй', () => {
    const sim = newSim(43);
    expect(sim.command({ type: 'dogOrder', dog: 'all', order: 'follow' }).ok).toBe(false);
  });
});

describe('Туршилтын цэс ба нүүх (M4)', () => {
  it('cheat: мөнгө, шууд нүүх', () => {
    const sim = newSim(44);
    const m = sim.state.money;
    sim.command({ type: 'cheat', action: 'money' });
    expect(sim.state.money).toBe(m + 1_000_000);
    sim.command({ type: 'cheat', action: 'addDog' });
    sim.command({ type: 'cheat', action: 'camp:valley' });
    expect(sim.state.campId).toBe('valley');
    expect(sim.state.player.away).toBe(false);
    expect(sim.state.dogs[0]!.order).toBe('patrolCamp');
  });

  it('майхнаас хол байхад нүүж болохгүй', () => {
    const sim = newSim(45);
    sim.command({ type: 'movePlayer', x: 80, z: 80 });
    expect(sim.command({ type: 'moveCamp', to: 'valley' }).ok).toBe(false);
    sim.command({ type: 'movePlayer', x: 2, z: 4 });
    expect(sim.command({ type: 'moveCamp', to: 'valley' }).ok).toBe(true);
  });
});
