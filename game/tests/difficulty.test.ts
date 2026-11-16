/**
 * M6.10 Тайван тохиргооны гулсуурууд: ×1 = одоогийн тоглолт, чоно ×0 → дайралтгүй, «мал чонод үхэхгүй» → барилтгүй,
 * бүтээгдэхүүн ×0.5–2, setDifficulty хүрээ, хадгалалт/migrate.
 */
import { describe, expect, it } from 'vitest';
import { cfg, newSim, DAY } from './helpers';
import type { Sim } from '../src/sim/sim';
import { createInitialState, MIGRATIONS, SAVE_VERSION } from '../src/sim/state';
import { defaultDifficulty, validateDifficultyConfig } from '../src/sim/systems/difficulty';
import { deserialize, serialize, SaveError } from '../src/sim/save';

interface Tally { kills: number; raids: number; milkWool: number; deaths: number }

function play(seed: number, days: number, patch: Parameters<typeof newSim>[1]): Tally {
  const sim = newSim(seed, patch);
  const t: Tally = { kills: 0, raids: 0, milkWool: 0, deaths: 0 };
  sim.on((e) => {
    if (e.type === 'wolfRaid') t.raids += e.n;
    if (e.type === 'dayReport') {
      t.kills += Object.values(e.report.wolfKills).reduce((s, n) => s + (n ?? 0), 0);
      t.milkWool += (e.report.dropped.milk ?? 0) + (e.report.dropped.wool ?? 0) + (e.report.dropped.cashmere ?? 0);
      t.deaths += e.report.deaths;
    }
  });
  sim.runDays(days);
  return t;
}

describe('Гулсууруудын тохиргоо ба анхдагч', () => {
  it('data/difficulty.json зөв, анхдагч нь migrate-ийн ×1-тэй ижил', () => {
    expect(validateDifficultyConfig(cfg)).toEqual([]);
    const st = createInitialState(cfg, 1);
    expect(st.settings.difficulty).toEqual({ wolves: 1, animalsDie: true, products: 1, timeSpeed: 1 });
    expect(defaultDifficulty(cfg)).toEqual(st.settings.difficulty);
    const old = JSON.parse(JSON.stringify(st)) as Record<string, unknown>;
    delete old.settings;
    old.version = 13;
    MIGRATIONS[13]!(old as never);
    expect((old as { settings: unknown }).settings).toEqual(st.settings);
  });

  it('setDifficulty: хүрээнд оруулна, алхамд тааруулна, буруу утгыг үл тооно', () => {
    const sim = newSim(1);
    const d = () => sim.state.settings.difficulty;
    sim.command({ type: 'setDifficulty', patch: { wolves: 9, products: -3, timeSpeed: 1.26 } });
    expect(d()).toMatchObject({ wolves: 1.5, products: 0.5, timeSpeed: 1.3 });
    sim.command({ type: 'setDifficulty', patch: { wolves: Number.NaN, animalsDie: false } });
    expect(d()).toMatchObject({ wolves: 1.5, animalsDie: false });
    sim.command({ type: 'setDifficulty', patch: { wolves: 0 } });
    expect(d().wolves).toBe(0);
  });
});

describe('Гулсууруудын нөлөө', () => {
  it('чоно ×0: 50 өдөрт дайралт, барилт 0; ×1-д ижил seed-үүдэд дайралт гардаг', () => {
    let control = 0;
    for (const seed of [1, 2]) {
      const off = play(seed, 50, (s) => { s.settings.difficulty.wolves = 0; });
      expect(off.raids, `seed ${seed}`).toBe(0);
      expect(off.kills, `seed ${seed}`).toBe(0);
      const on = play(seed, 50, undefined);
      control += on.raids + on.kills;
    }
    expect(control).toBeGreaterThan(0);
  }, 120_000);

  it('мал чонод үхэхгүй: барилт 0 (ийм тохиргоотой чоно ×1.5), ×1-д барьдаг', () => {
    let control = 0;
    for (const seed of [1, 2, 3]) {
      const safe = play(seed, 60, (s) => { s.settings.difficulty.animalsDie = false; s.settings.difficulty.wolves = 1.5; });
      expect(safe.kills, `seed ${seed}`).toBe(0);
      control += play(seed, 60, (s) => { s.settings.difficulty.wolves = 1.5; }).kills;
    }
    expect(control).toBeGreaterThan(0);
  }, 180_000);

  it('бүтээгдэхүүн ×2 > ×1 > ×0.5 (сүү, ноос)', () => {
    const m = (k: number): number => play(3, 8, (s) => { s.settings.difficulty.products = k; }).milkWool;
    const [lo, mid, hi] = [m(0.5), m(1), m(2)];
    expect(mid).toBeGreaterThan(0);
    expect(hi).toBeGreaterThan(mid * 1.5);
    expect(lo).toBeLessThan(mid * 0.75);
  }, 60_000);
});

describe('Хадгалалт', () => {
  it('гулсуур хадгалагдаж ачаалагдана; хүрээнээс гарсан утгыг татгалзана', () => {
    const sim: Sim = newSim(4);
    sim.command({ type: 'setDifficulty', patch: { wolves: 0.4, animalsDie: false, products: 1.8, timeSpeed: 0.7 } });
    sim.runDays(1);
    const back = deserialize(cfg, serialize(sim.state));
    expect(back.settings.difficulty).toEqual({ wolves: 0.4, animalsDie: false, products: 1.8, timeSpeed: 0.7 });
    expect(back.version).toBe(SAVE_VERSION);
    const bad = JSON.parse(serialize(sim.state)) as { state: { settings: { difficulty: { wolves: number } } } };
    bad.state.settings.difficulty.wolves = 5;
    expect(() => deserialize(cfg, JSON.stringify(bad))).toThrow(SaveError);
    expect(DAY).toBeGreaterThan(0);
  }, 30_000);
});
