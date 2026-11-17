import { describe, expect, it } from 'vitest';
import { newSim, steps } from './helpers';
import { ridingHorse, horseInScene } from '../src/sim/systems/herder';
import { syncAway } from '../src/sim/systems/travel';
import { SAVE_VERSION } from '../src/sim/state';

/** Тоглогчийг сумын төвд (place='sum') байрлуулна */
function toSum(sim: ReturnType<typeof newSim>, x = 300, z = 300): void {
  const p = sim.state.player;
  p.place = 'sum';
  p.x = x;
  p.z = z;
  syncAway(sim.state);
}

describe('Морь дуудах same-scene (T-03)', () => {
  it('гэрийн бууцнаас дуудна', () => {
    const sim = newSim(3);
    sim.state.player.x = 40;
    sim.state.player.z = 40;
    const r = sim.command({ type: 'callHorse' });
    expect(r.ok).toBe(true);
    expect(sim.state.player.horseCalled).toBe(true);
    const horse = ridingHorse(sim.state)!;
    const d0 = Math.hypot(horse.x - 40, horse.z - 40);
    steps(sim, 5);
    expect(Math.hypot(horse.x - 40, horse.z - 40)).toBeLessThan(d0);
  });

  it('сумын төвд машинаар ирээд бууцны морийг дуудахгүй', () => {
    const sim = newSim(3);
    toSum(sim);
    expect(horseInScene(sim.state)).toBe(false);
    const horse = ridingHorse(sim.state)!;
    const before = { x: horse.x, z: horse.z };
    const r = sim.command({ type: 'callHorse' });
    expect(r.ok).toBe(false);
    expect(sim.state.player.horseCalled).toBe(false);
    steps(sim, 5);
    expect(horse.x).toBe(before.x);   // teleport/давхилт байхгүй
    expect(horse.z).toBe(before.z);
  });

  it('морьтой ирсэн (буусан) бол сумын төвд дуудна', () => {
    const sim = newSim(3);
    const horse = ridingHorse(sim.state)!;
    sim.state.player.mounted = true;
    toSum(sim, 300, 300);
    horse.x = horse.tx = 300;
    horse.z = horse.tz = 300;
    expect(sim.command({ type: 'toggleMount' }).ok).toBe(true);   // буулаа
    expect(horse.place).toBe('sum');
    sim.state.player.x = 340;
    sim.state.player.z = 300;
    expect(sim.command({ type: 'callHorse' }).ok).toBe(true);
    const d0 = Math.hypot(horse.x - 340, horse.z - 300);
    steps(sim, 5);
    expect(Math.hypot(horse.x - 340, horse.z - 300)).toBeLessThan(d0);
  });

  it('SAVE_VERSION өөрчлөгдөөгүй, place талбар заавал биш', () => {
    expect(SAVE_VERSION).toBe(newSim(1).state.version);
    expect(ridingHorse(newSim(1).state)!.place).toBeUndefined();
  });
});
