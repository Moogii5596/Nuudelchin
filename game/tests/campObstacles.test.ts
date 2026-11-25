/**
 * T-18 (M6.8 render): бууцны саад — малчин, тээвэр гэр/майхан, туслахын байрыг нэвтлэхгүй; малыг зурахдаа тойруулна.
 */
import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/sim/config';
import { createInitialState } from '../src/sim/state';
import { campObstacles, pushOutOfObstacles } from '../src/sim/systems/safety';
import { gerRadiusFor } from '../src/sim/systems/gerLayout';

const cfg = loadConfig();
const home = cfg.camps.home;

describe('бууцны саад (campObstacles)', () => {
  it('эхлэл: зөвхөн тоглогчийн гэр, радиус нь гэрийн хэмжээнээс', () => {
    const st = createInitialState(cfg, 3);
    const obs = campObstacles(cfg, st);
    expect(obs).toEqual([{ x: home.x, z: home.z, r: gerRadiusFor(cfg.ger, home.gerRadius, st.homeSize) }]);
  });

  it('майхантай бол tentRadius; том гэр илүү том саад', () => {
    const st = createInitialState(cfg, 3);
    st.home = 'tent';
    expect(campObstacles(cfg, st)[0]!.r).toBe(home.tentRadius);
    st.home = 'ger';
    const small = campObstacles(cfg, st)[0]!.r;
    const sizes = Object.keys(cfg.ger.sizes);
    st.homeSize = sizes[sizes.length - 1]!;
    expect(campObstacles(cfg, st)[0]!.r).toBeGreaterThan(small);
  });

  it('нэмэлт гэр, туслахын гэр/майхан, адуучны майхан бүгд саад', () => {
    const st = createInitialState(cfg, 3);
    st.extraGers.push({ x: 20, z: -10, size: st.homeSize } as (typeof st.extraGers)[number]);
    st.helpers.dwellings.push({ kind: 'familyGer', x: -30, z: 5 }, { kind: 'helperTent', x: -40, z: 5 }, { kind: 'horseCamp', x: 60, z: 60, helperId: 1, campId: st.campId });
    const obs = campObstacles(cfg, st);
    expect(obs).toHaveLength(5);
    expect(obs[2]).toEqual({ x: -30, z: 5, r: cfg.interiors.dwellingBaseRadius * cfg.interiors.dwellingScale.familyGer! });
    expect(obs[3]!.r).toBe(home.tentRadius);
    expect(obs.every((o) => o.r > 1)).toBe(true);
  });

  it('хаалганы цэг саадын гадна (орох боломжтой хэвээр)', async () => {
    const { campEnterDoors } = await import('../src/sim/systems/interior');
    const st = createInitialState(cfg, 3);
    st.helpers.dwellings.push({ kind: 'familyGer', x: -30, z: 5 });
    const obs = campObstacles(cfg, st);
    for (const d of campEnterDoors(cfg, st)) {
      const q = pushOutOfObstacles(obs, d.x, d.z, cfg.camps.home.solid.foot);
      expect(Math.hypot(q.x - d.x, q.z - d.z)).toBeLessThan(cfg.interiors.enterR);   // түлхэгдсэн ч хаалганд хүрэх зайд
    }
  });
});

describe('саадаас түлхэх (pushOutOfObstacles)', () => {
  const obs = [{ x: 0, z: 0, r: 3 }, { x: 10, z: 0, r: 2 }];
  it('гадна байвал хөдөлгөхгүй', () => {
    expect(pushOutOfObstacles(obs, 5, 5, 0.3)).toEqual({ x: 5, z: 5, hit: false });
  });
  it('дотор байвал ирмэг рүү (радиус + зай) радиаль чиглэлд', () => {
    const q = pushOutOfObstacles(obs, 1, 0, 0.5);
    expect(q.hit).toBe(true);
    expect(q.x).toBeCloseTo(3.5);
    expect(q.z).toBeCloseTo(0);
  });
  it('яг төвд байсан ч NaN гарахгүй', () => {
    const q = pushOutOfObstacles(obs, 0, 0, 0.5);
    expect(Number.isFinite(q.x) && Number.isFinite(q.z)).toBe(true);
    expect(Math.hypot(q.x, q.z)).toBeCloseTo(3.5);
  });
  it('түлхэгдсэний дараа аль ч саадын дотор үлдэхгүй', () => {
    const near = [{ x: 0, z: 0, r: 3 }, { x: 5, z: 0, r: 3 }];
    const q = pushOutOfObstacles(near, 2.6, 0.4, 0.3);
    for (const o of near) expect(Math.hypot(q.x - o.x, q.z - o.z)).toBeGreaterThanOrEqual(o.r + 0.3 - 0.35);
  });
});
