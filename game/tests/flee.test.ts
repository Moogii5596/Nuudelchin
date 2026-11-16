/**
 * M6.8 Аюул руу гүйхгүй: чоноос үргэсэн мал чонын үүр, гүн ус руу зугтахгүй (чиглэл эргэнэ); аюулгүй үед анхны чиглэл хэвээр.
 */
import { describe, expect, it } from 'vitest';
import { cfg, newSim } from './helpers';
import { Rng } from '../src/sim/rng';
import { spookAnimals } from '../src/sim/systems/wolves';
import { isWalkable, nearDen, nearestWalkable, safeFleeTarget, waterDepthAt } from '../src/sim/systems/safety';
import type { Wolf } from '../src/sim/systems/wolves';

const deepCfg = cfg.pasture.grazing.stuck.deepWater;

function findBank(sim: ReturnType<typeof newSim>): { x: number; z: number; sx: number; sz: number } {
  // x тэнхлэг дээрх гүн усны цэг ба түүний гадна талын (эрэг) цэг; sz — голоос холдох чиглэл
  const st = sim.state;
  for (let x = -50; x <= 50; x += 2) for (let z = -90; z <= -30; z += 0.5) {
    if (waterDepthAt(cfg, st.campId, x, z) > deepCfg + 0.2) {
      const sz = z >= 0 ? 1 : -1;
      return { x, z, sx: 0, sz };
    }
  }
  throw new Error('гүн ус олдсонгүй');
}

const hunter = (id: number, x: number, z: number): Wolf => ({ id, den: 0, x, z, tx: x, tz: z, heading: 0, mode: 'hunt', scared: 0, targetId: 0, fed: 0, hunger: 1, sex: 'm', age: 4, life: 10 });

describe('Үргэсэн мал аюул руу гүйхгүй', () => {
  it('гүн ус руу зугтах чиглэлд ч зорилт нь гүн усгүй; хоёр талын дундаж 200 оролдлого', () => {
    const sim = newSim(11);
    const st = sim.state;
    const b = findBank(sim);
    // мал гүн усны ЭРГЭЭР (өөрийн чөлөөтэй цэг), чоно түүний ард (мал гүн ус руу зугтах чиглэл)
    const a = st.animals.find((x) => x.species === 'sheep' && !x.riding)!;
    const edge = nearestWalkable(cfg, st, b.x, b.z);
    const ax = edge.x, az = edge.z;
    const dl = Math.hypot(b.x - ax, b.z - az) || 1;
    const ux = (b.x - ax) / dl, uz = (b.z - az) / dl;   // усны зүг
    let toward = 0;
    for (let i = 0; i < 200; i++) {
      a.x = ax; a.z = az; a.mode = 'graze';
      st.wolves.list = [hunter(1, ax - ux * 6, az - uz * 6)];   // чоно далд талд → мал усны зүг гүйнэ
      st.wolves.dens = [];
      spookAnimals(cfg, st, [], new Rng(1000 + i));
      expect(a.mode).toBe('flee');
      expect(isWalkable(cfg, st, a.tx, a.tz), `trial ${i}: ${a.tx},${a.tz}`).toBe(true);
      expect(waterDepthAt(cfg, st.campId, (a.x + a.tx) / 2, (a.z + a.tz) / 2)).toBeLessThanOrEqual(deepCfg);
      if ((a.tx - ax) * ux + (a.tz - az) * uz > 3) toward++;
    }
    expect(toward).toBeLessThan(200);   // чиглэл зарим үед голын зүг, зарим үед эргэсэн (хамгаалалт ажилласан)
  });

  it('чонын үүрний нутаг руу зугтахгүй', () => {
    const sim = newSim(12);
    const st = sim.state;
    const a = st.animals.find((x) => x.species === 'sheep' && !x.riding)!;
    a.x = 0; a.z = 0;
    // чоно баруун талд, үүр зүүн талд (мал зүүн зүг гүйнэ)
    st.wolves.dens = [{ x: -24, z: 0, r: 8 }];
    for (let i = 0; i < 200; i++) {
      a.x = 0; a.z = 0; a.mode = 'graze';
      st.wolves.list = [hunter(1, 6, 0)];
      spookAnimals(cfg, st, [], new Rng(2000 + i));
      expect(nearDen(cfg, st, a.tx, a.tz), `trial ${i}: ${a.tx},${a.tz}`).toBe(false);
    }
  });

  it('аюулгүй үед зорилт анхны чиглэл, зайтай ижил (RNG, тэнцвэр өөрчлөгдөөгүй)', () => {
    const sim = newSim(13);
    const st = sim.state;
    st.wolves.dens = [];
    const t = safeFleeTarget(cfg, st, 0, 0, 1.0, 20);
    expect(t.tx).toBeCloseTo(Math.sin(1.0) * 20, 9);
    expect(t.tz).toBeCloseTo(Math.cos(1.0) * 20, 9);
  });

  it('бүх чиглэл аюултай бол байрандаа (зорилт = одоогийн байрлал)', () => {
    const sim = newSim(14);
    const st = sim.state;
    st.wolves.dens = [{ x: 0, z: 0, r: 500 }];   // бүх цэг үүрний нутагт
    const t = safeFleeTarget(cfg, st, 5, 5, 0.3, 20);
    expect(t).toEqual({ tx: 5, tz: 5 });
  });
});
