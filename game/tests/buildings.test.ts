import { describe, expect, it } from 'vitest';
import { BUILDING_CONFIG, buildingConfigErrors, makeBuilding, makePlot } from '../src/render/building';

const C = BUILDING_CONFIG;
const HOUSES = Object.keys(C.house);
const SHOPS = Object.keys(C.shop.types);
const PUBLIC = Object.keys(C.public.kinds);
const COMPLEX = ['milkWool', 'carDealer', 'fuel', 'temple', 'market', 'stadium', 'wrestle'];
const SINGLE = ['toilet', 'woodshed', 'animalShed', 'greenhouse', 'kennel'];

describe('data/buildings.json шалгагч', () => {
  it('зөв тохиргоо алдаагүй', () => expect(buildingConfigErrors(C)).toEqual([]));
  it('буруу өнгө, дутуу түлхүүр, буруу town заана', () => {
    const bad = JSON.parse(JSON.stringify(C));
    bad.palette.wall = 'red'; delete bad.shop.types.grocery.sign; bad.town.byId.school.kind = 'nope'; bad.atlas.window = [0, 0, 9999, 9];
    const e = buildingConfigErrors(bad).join('\n');
    expect(e).toMatch(/palette\.wall/); expect(e).toMatch(/grocery\.sign/); expect(e).toMatch(/town\.byId\.school/); expect(e).toMatch(/atlas\.window/);
  });
});

describe('барилгын загвар (лабораторийн баталсан геометр)', () => {
  const tri = (k: string, season: 'summer' | 'winter' = 'summer') => makeBuilding(k, { season }).geo.triangles;
  it('байшин ≤ 400 гурвалжин (лабораторийн хязгаар)', () => { for (const k of HOUSES) expect(tri(k)).toBeLessThanOrEqual(400); });
  it('жижиг барилга ≤ 400, дэлгүүр ≤ 600', () => { for (const k of SINGLE) expect(tri(k)).toBeLessThanOrEqual(400); for (const k of SHOPS) expect(tri(k)).toBeLessThanOrEqual(600); });
  it('олон нийтийн барилга ≤ 600, нийлмэл талбайн гурвалжин лабораторийн хэмжилтээс хэтрэхгүй (нэг mesh)', () => {
    for (const k of PUBLIC) expect(tri(k)).toBeLessThanOrEqual(600);
    // лабораторийн хэмжилт (2026-11-16): сүү/ноос 624, машин 1634, колонк 500, дуган 2492 (гол барилга 746), зах 1476, цэнгэлдэх 994, бөх 2331
    const lab: Record<string, number> = { milkWool: 700, carDealer: 1700, fuel: 560, temple: 2600, market: 1560, stadium: 1050, wrestle: 2450 };
    for (const [k, lim] of Object.entries(lab)) expect(tri(k), k).toBeLessThanOrEqual(lim);
    expect(makeBuilding('temple', {}).stats!.office).toBeLessThanOrEqual(2000);
    expect(makeBuilding('temple', {}).wheels!.length).toBe(7);
  });
  it('бүх төрөл зун/өвөл төгсгөлөг, өвөл нь цасаар дүүрнэ', () => {
    for (const k of [...HOUSES, ...SINGLE, ...SHOPS, ...PUBLIC, ...COMPLEX]) for (const s of ['summer', 'winter'] as const) {
      const b = makeBuilding(k, { season: s });
      expect(b.geo.p.every(Number.isFinite), `${k} ${s} p`).toBe(true);
      expect(b.geo.n.every(Number.isFinite), `${k} ${s} n`).toBe(true);
      expect(b.geo.p.length).toBe(b.geo.n.length);
      expect(b.geo.u.length / 2).toBe(b.geo.p.length / 3);
      if (!['carDealer', 'fuel'].includes(k)) expect(b.door.position.z, `${k} door`).toBeGreaterThan(0);
    }
    expect(tri('houseA', 'winter')).toBeGreaterThan(tri('houseA', 'summer'));
  });
  it('нэг төрөл нэг тохиргоогоор үргэлж ижил геометр', () => {
    const a = makeBuilding('school', {}).geo, b = makeBuilding('school', {}).geo;
    expect(a.p).toEqual(b.p);
  });
  it('айлын хашаа: байшин + хашаа + жорлон, хаалгууд', () => {
    const r = makePlot({ kind: 'houseA', season: 'summer', seed: 5, extras: ['woodshed'], path: 'walk', trees: 'full', kennel: true });
    expect(r.house!.door.position.z).toBeGreaterThan(0);
    expect(r.yard.gate.width).toBeGreaterThan(2); expect(r.yard.wicket.width).toBeGreaterThan(0.5);
    expect(r.geo.triangles).toBeGreaterThan(r.house!.geo.triangles);
  });
});
