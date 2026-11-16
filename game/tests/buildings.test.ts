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
import { houseRoom, houseInteriorKeys } from '../src/sim/systems/houseLayout';
import { roomSpec, clampToRoom, validateInteriors } from '../src/sim/systems/interior';
import { makeInterior } from '../src/render/building';
import { houseInteriorData } from '../src/render/building/interiorData';
import houseJson from '../../data/house-interiors.json';
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

  it('сумын төвийн бүх барилга лабораторийн загвартай (resort, market_office орсон); id-гүй бол хуучин томьёо (2 м)', () => {
    for (const b of blds) expect(townEntry(b.id), b.id).not.toBeNull();
    expect(doorPoint({ x: 10, z: 20, w: 6, d: 4, front: 's' })).toEqual({ x: 10, z: 24 });
  });
});

describe('дотор өрөө (data/interiors.json) ⊂ барилгын дотор өрөө (interior.main)', () => {
  const rooms = cfg.interiors.rooms as Record<string, { w: number; d: number; h: number }>;
  const pairs: [string, string][] = [['school', 'school'], ['admin', 'zdtg'], ['bank', 'bank'], ['culture', 'culture'], ['kindergarten', 'kinder'],
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

describe('хашаа байшингийн дотор тал (V6.1/V6.2, лаборатори building-lab2)', () => {
  const keys = houseInteriorKeys();
  it('data/house-interiors.json лабораторийн makeInterior-той тэнцүү (шинэчлэх: cd game && npm run houses)', () => { expect(JSON.parse(JSON.stringify(houseInteriorData()))).toEqual(houseJson); });
  it('interiors.json өрөө алдаагүй (орох/гарах/лангуу өрөө дотор)', () => { expect(validateInteriors(cfg)).toEqual([]); });
  it('өрөөний хэмжээ = байшингийн interior.main (таазны өндөр 2.19 А)', () => {
    for (const k of ['houseA', 'houseB', 'houseC']) { const H = houseRoom(k, cfg.interiors.bodyR), m = makeBuilding(H.base, {}).interior!.main; expect([k, H.w, H.d, H.h]).toEqual([k, m.w, m.d, m.h]); }
    expect(houseRoom('houseA', 0.35).h).toBe(2.19);
    for (const id of ['houseA', 'houseB', 'houseBf', 'houseC']) { const r = roomSpec(cfg, id)!; expect(r.h).toBeLessThanOrEqual(makeBuilding(r.house === 'houseBf' ? 'houseB' : r.house!, {}).interior!.main.h + 1e-9); }
  });
  it('геометр: бүх хувилбар төгсгөлөг; Б хоосон < Б тавилгатай; mirror = ижил гурвалжин', () => {
    for (const k of keys) { const r = makeInterior(k)!; expect(r.geo.p.every(Number.isFinite), k).toBe(true); expect(r.geo.triangles).toBeGreaterThan(100); }
    expect(makeInterior('houseB')!.geo.triangles).toBeLessThan(makeInterior('houseBf')!.geo.triangles);
    expect(makeInterior('houseBf')!.empty).toBe(false); expect(makeInterior('houseB')!.empty).toBe(true);
  });
  it('орох цэгээс лангуу, тавилгыг тойрч явж болно (саадгүй зам), тавилганд орохгүй', () => {
    for (const id of ['houseA', 'houseB', 'houseBf', 'houseC']) {
      const room = roomSpec(cfg, id)!, step = 0.1, seen = new Set<string>(), key = (x: number, z: number): string => Math.round(x * 1000) + ',' + Math.round(z * 1000);
      const free = (x: number, z: number): boolean => { const c = clampToRoom(cfg, room, x, z); return Math.abs(c.x - x) < 1e-6 && Math.abs(c.z - z) < 1e-6; };
      expect(free(room.entry[0], room.entry[1]), id + ' entry').toBe(true);
      const q: [number, number][] = [[room.entry[0], room.entry[1]]]; seen.add(key(...q[0]!));
      while (q.length) { const [x, z] = q.pop()!; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) { const nx = x + dx * step, nz = z + dz * step, k = key(nx, nz); if (!seen.has(k) && free(nx, nz)) { seen.add(k); q.push([nx, nz]); } } }
      const near = (p: [number, number]): boolean => [...seen].some((s) => { const [a, b] = s.split(',').map(Number) as [number, number]; return Math.hypot(a / 1000 - p[0], b / 1000 - p[1]) < 0.3; });
      expect(near(room.counter!), id + ' counter хүрдэг').toBe(true);
      expect(near(room.exit), id + ' exit хүрдэг').toBe(true);
      expect(seen.size, id + ' талбай').toBeGreaterThan(150);
    }
  });
  it('зарах байшин: авахаас өмнө хоосон өрөө, авсны дараа тавилгатай; хамаатан тусдаа', () => {
    expect(cfg.interiors.idRoom.plot_sale_1).toBe('houseB'); expect(cfg.interiors.idRoom['plot_sale_1:owned']).toBe('houseBf');
    expect(houseRoom('houseB', 0.35).blockers.length).toBeLessThan(houseRoom('houseBf', 0.35).blockers.length);
  });
});

import { makePublicInterior } from '../src/render/building';

describe('нийтийн барилгын дотор тал (V6.2, S2 батлагдсан): сургуулийн анги, дуган', () => {
  const ids = ['school', 'temple'];
  it('geometr: шал, хана, тавилга; лабораторийн хэмжилттэй ойролцоо (анги ~5.7k, дуган ~4.6k гурвалжин)', () => {
    for (const [id, lim] of [['school', 6500], ['temple', 5300]] as const) {
      const room = roomSpec(cfg, id)!, it = makePublicInterior(id, room)!;
      const tri = it.shell.triangles + it.ceil.triangles + it.furn.triangles;
      expect(tri, id).toBeGreaterThan(3000); expect(tri, id).toBeLessThanOrEqual(lim);
      expect(it.shell.p.every(Number.isFinite) && it.furn.p.every(Number.isFinite), id).toBe(true);
      expect(it.lights.length).toBe(4);
    }
  });
  it('саад: орох цэгээс E лангуу, NPC-ийн ажлын цэг, гарах цэгт хүрч болно; өрөөний бүх spot хүрээнд', () => {
    expect(validateInteriors(cfg)).toEqual([]);
    for (const id of ids) {
      const room = roomSpec(cfg, id)!, step = 0.1, seen = new Set<string>(), key = (x: number, z: number): string => Math.round(x * 1000) + ',' + Math.round(z * 1000);
      const free = (x: number, z: number): boolean => { const c = clampToRoom(cfg, room, x, z); return Math.abs(c.x - x) < 1e-6 && Math.abs(c.z - z) < 1e-6; };
      expect(room.blockers!.length, id).toBeGreaterThan(5);
      expect(free(room.entry[0], room.entry[1]), id + ' entry').toBe(true);
      const q: [number, number][] = [[room.entry[0], room.entry[1]]]; seen.add(key(q[0]![0], q[0]![1]));
      while (q.length) { const [x, z] = q.pop()!; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) { const nx = x + dx * step, nz = z + dz * step, k = key(nx, nz); if (!seen.has(k) && free(nx, nz)) { seen.add(k); q.push([nx, nz]); } } }
      const near = (p: [number, number]): boolean => [...seen].some((s) => { const [a, b] = s.split(',').map(Number) as [number, number]; return Math.hypot(a / 1000 - p[0], b / 1000 - p[1]) < 0.3; });
      if (room.counter) expect(near(room.counter), id + ' counter').toBe(true);
      expect(near(room.exit), id + ' exit').toBe(true);
      for (const s of room.spots.filter((p) => ['teacher_board', 'pilgrim'].includes(p.id)))   // зогсох ажлын цэг (сандал, олбог — суудал)
        expect(near([s.x, s.z]), `${id} ${s.id} (NPC ажлын цэг)`).toBe(true);
    }
  });
  it('NPC-ийн дотор байрлал (npcs.json inside) тавилганд орохгүй', () => {
    for (const n of cfg.npcs.npcs) for (const id of ids) {
      const p = n.inside[id]; if (!p) continue;
      if (n.role === 'pupil') { expect(Math.abs(p[0]), n.id).toBeLessThan(7); continue; }   // сурагч сандал дээр сууна (саадтай хэсэг)
      const room = roomSpec(cfg, id)!, c = clampToRoom(cfg, room, p[0], p[1]);
      expect(Math.hypot(c.x - p[0], c.z - p[1]), `${n.id} ${id}`).toBeLessThan(0.45);   // зогсож байгаа тул бага зэрэг түлхэлтийг зөвшөөрнө
    }
  });
});

describe('нийтийн барилгын дотор тал (V6.2, S2 батлагдсан): ЗДТГ, банк, сүү/ноос хүлээн авах цэг', () => {
  const rooms = [['admin', 'zdtg', 2650, 4, 0], ['bank', 'bank', 2200, 4, 1], ['milk', 'buyer', 3800, 3, 0]] as const;   // [өрөө, барилгын id, гурвалжингийн дээд, чийдэн, шилний mesh]
  it('geometr: лабораторийн хэмжилттэй ойролцоо; банкны шил — тусдаа тунгалаг mesh (3 дахь draw call)', () => {
    for (const [id, , lim, lamps, glass] of rooms) {
      const room = roomSpec(cfg, id)!, it = makePublicInterior(id, room)!;
      const tri = it.shell.triangles + it.ceil.triangles + it.furn.triangles;
      expect(tri, id).toBeGreaterThan(1500); expect(tri, id).toBeLessThanOrEqual(lim);
      expect(it.shell.p.every(Number.isFinite) && it.furn.p.every(Number.isFinite), id).toBe(true);
      expect(it.lights.length, id).toBe(lamps);
      expect(it.glass.triangles > 0, id).toBe(glass === 1);
    }
  });
  it('idRoom: сүү, ноос хүлээн авах цэг → milk өрөө; өрөөний хэмжээ барилгын дотор өрөөнд багтана (validateInteriors)', () => {
    expect(cfg.interiors.idRoom.buyer).toBe('milk');
    expect(validateInteriors(cfg)).toEqual([]);
  });
  it('саад: орох цэгээс E лангуу, E зогсох цэг, гарах цэгт хүрч болно; лангууны ард орохгүй', () => {
    for (const [id] of rooms) {
      const room = roomSpec(cfg, id)!, step = 0.1, seen = new Set<string>(), key = (x: number, z: number): string => Math.round(x * 1000) + ',' + Math.round(z * 1000);
      const free = (x: number, z: number): boolean => { const c = clampToRoom(cfg, room, x, z); return Math.abs(c.x - x) < 1e-6 && Math.abs(c.z - z) < 1e-6; };
      expect(room.blockers!.length, id).toBeGreaterThan(4);
      expect(free(room.entry[0], room.entry[1]), id + ' entry').toBe(true);
      const q: [number, number][] = [[room.entry[0], room.entry[1]]]; seen.add(key(q[0]![0], q[0]![1]));
      while (q.length) { const [x, z] = q.pop()!; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) { const nx = x + dx * step, nz = z + dz * step, k = key(nx, nz); if (!seen.has(k) && free(nx, nz)) { seen.add(k); q.push([nx, nz]); } } }
      const near = (p: [number, number]): boolean => [...seen].some((s) => { const [a, b] = s.split(',').map(Number) as [number, number]; return Math.hypot(a / 1000 - p[0], b / 1000 - p[1]) < 0.3; });
      expect(near(room.counter!), id + ' counter').toBe(true);
      expect(near(room.exit), id + ' exit').toBe(true);
      for (const s of room.spots.filter((p) => ['visitor', 'customer', 'seller'].includes(p.id))) expect(near([s.x, s.z]), `${id} ${s.id}`).toBe(true);
      for (const s of room.spots.filter((p) => ['governor', 'clerk', 'police', 'teller_1', 'teller_2', 'receiver'].includes(p.id))) expect(near([s.x, s.z]), `${id} ${s.id} ажилтны тал`).toBe(false);   // ажилтны цэгт тоглогч орохгүй
    }
  });
  it('NPC-ийн дотор байрлал (npcs.json inside): засаг дарга, кассчин, хүлээн авагч өрөөний ажлын цэг дээр, өрөөний хүрээнд', () => {
    for (const [id, bld] of rooms) {
      const room = roomSpec(cfg, id)!, who = cfg.npcs.npcs.filter((n) => n.inside[bld]);
      expect(who.length, id).toBeGreaterThan(0);
      for (const n of who) {
        const p = n.inside[bld]!;
        expect(Math.abs(p[0]) <= room.w! / 2 && Math.abs(p[1]) <= room.d! / 2, `${n.id} ${id}`).toBe(true);
        if (n.role === 'governor' || n.role === 'teller' || n.role === 'police' || (n.role === 'buyer' && id === 'milk')) expect(room.spots.some((s) => s.kind === 'work' && Math.hypot(s.x - p[0], s.z - p[1]) < 0.12), `${n.id} ${id} ажлын цэг`).toBe(true);
      }
    }
  });
});
