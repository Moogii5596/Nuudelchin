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

import { cfg } from './helpers';
import { allBuildings, doorPoint, plotHouse } from '../src/sim/systems/sumtown';
import { entryFootprint, labDoorPoint, labOrigin, rotLocal, townEntry, worldSize } from '../src/sim/systems/buildingSize';
import { TOWN } from '../src/render/building';
import { buildWoolStore } from '../src/render/building/shops';

describe('сумын төв ↔ лабораторийн барилга (sim хэмжээ, хаалга)', () => {
  const blds = allBuildings(cfg.sumcenter);
  const byId = new Map(blds.map((b) => [b.id, b]));
  const single = Object.entries(TOWN.byId);

  it('town.byId бүх id sumcenter.json-д бий', () => { for (const [id] of single) expect(byId.has(id), id).toBe(true); });

  it('sumcenter.json-ийн хэмжээ = лабораторийн хэмжээ (rot-оор эргүүлсэн)', () => {
    for (const [id, e] of single) {
      const b = byId.get(id)!, f = entryFootprint(e), s = worldSize(e, f);
      expect([id, b.w, b.d]).toEqual([id, s.w, s.d]);
    }
  });

  it('нүүр: rot → front (0 урагш, 90 баруун, 180 хойд)', () => {
    const want: Record<number, string> = { 0: 's', 90: 'w', 180: 'n' };
    for (const [id, e] of single) expect(byId.get(id)!.front ?? 's', id).toBe(want[e.rot ?? 0]);
  });

  it('sim-ийн doorPoint = лабораторийн геометрийн хаалга (дэлхийд)', () => {
    for (const [id, e] of single) {
      const b = byId.get(id)!;
      let door: { x: number; z: number };
      if (e.type === 'woolStore') door = buildWoolStore({}).door.position;
      else if (e.type === 'temple') door = makeBuilding('temple', {}).door.position;
      else { const m = makeBuilding(e.kind!, {}); door = (e.entrance ? m.points![e.entrance - 1]! : m.door).position; }
      const o = labOrigin(e, b), r = rotLocal(door.x, door.z, e.rot ?? 0), p = doorPoint(b);
      expect(p.x, `${id} x`).toBeCloseTo(o.x + r.x, 6);
      expect(p.z, `${id} z`).toBeCloseTo(o.z + r.z, 6);
      expect(labDoorPoint(b)).toEqual(p);
    }
  });

  it('хаалганы цэг барилгын хайрцагнаас гадна, rot 0 бол нүүрэн талд', () => {
    for (const [id, e] of single) {
      const b = byId.get(id)!, p = doorPoint(b);
      if (e.type === 'temple') continue;
      const inside = Math.abs(p.x - b.x) < b.w / 2 && Math.abs(p.z - b.z) < b.d / 2;
      expect(inside, id).toBe(false);
    }
  });

  it('лабораторийн бус барилга хуучин томьёогоор (2 м)', () => {
    const r = byId.get('resort_main')!;
    expect(townEntry(r.id)).toBeNull();
    expect(doorPoint(r)).toEqual({ x: r.x, z: r.z + r.d / 2 + 2 });
  });
});

describe('дотор өрөө (data/interiors.json) ⊂ барилгын дотор өрөө (interior.main)', () => {
  const rooms = cfg.interiors.rooms as Record<string, { w: number; d: number; h: number }>;
  const pairs: [string, string][] = [['house', 'houseA'], ['house', 'houseC'], ['school', 'school'], ['admin', 'zdtg'], ['bank', 'bank'], ['culture', 'culture'], ['kindergarten', 'kinder'],
    ['teahouse', 'teahouse'], ['temple', 'temple'], ...['grocery', 'feed', 'equipment', 'gertent', 'clothes', 'pets'].map((k): [string, string] => ['shop', k])];
  for (const [room, kind] of pairs) it(`${room} өрөө ≤ ${kind}`, () => {
    const r = rooms[room]!, m = makeBuilding(kind, {}).interior!.main;
    expect(r.w, 'w').toBeLessThanOrEqual(m.w + 1e-9); expect(r.d, 'd').toBeLessThanOrEqual(m.d + 1e-9); expect(r.h, 'h').toBeLessThanOrEqual(m.h + 1e-9);
  });
});

describe('тусгай хашааны байшин (plotHouse) = лабораторийн геометр', () => {
  it('хаалга байшингийн хашлагаас гадна, хашааны дотор', () => {
    for (const sp of cfg.sumcenter.specialPlots ?? []) {
      const ph = plotHouse(cfg.sumcenter, sp);
      expect(Math.abs(ph.door.x - sp.x)).toBeLessThan(sp.w / 2); expect(Math.abs(ph.door.z - sp.z)).toBeLessThan(sp.d / 2);
      const inside = Math.abs(ph.door.x - ph.house.x) < ph.house.w / 2 && Math.abs(ph.door.z - ph.house.z) < ph.house.d / 2;
      expect(inside, sp.id).toBe(false);
    }
  });
});
