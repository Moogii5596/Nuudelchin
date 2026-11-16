import { m, type Msg } from '../msg';
﻿/**
 * V6.1: орж болдог барилга (sim талд). Three.js, DOM-гүй.
 *
 * Зарчим: барилга дотор орсон тоглогчийн `player.x/z/place` хаалганы гадна цэгт хөдөлгөөнгүй хэвээр,
 * дотор байрлал нь `player.interior` (өрөөний координат). Тиймээс худалдаа, цонх, нэр хүнд зэрэг
 * «хаалганы ойролцоо» шалгалт (nearTradeDoor, nearTownDoor, nearTeahouse) дотроос ч өөрчлөлтгүй ажиллана.
 * Хаалганы цэгийг sumtown.ts-ийн `sumDoors`/`doorPoint`-оос авна.
 */
import type { GameConfig } from '../config';
import type { GameState, InteriorState } from '../state';
import { allBuildings, facingOf, plotHouse, sumDoors, TRADE_ROLES, type Facing } from './sumtown';
import { extraDoorId, gerSizeOfDoor } from './ownGers';
import { houseRoom, clampToWalk, type WalkRect } from './houseLayout';
import { publicBlockers } from './publicLayout';
import { GATE_PHI } from './buildingSize';
import { gerBlockers, gerBoxes, gerDoorOffset, gerInnerRadius, pushOutOfBox, type LayoutBox } from './gerLayout';

// ======================= Тохиргооны төрөл (data/interiors.json) =======================

export interface InteriorSpot { id: string; kind: string; x: number; z: number; rot: number }
export interface RoomSpec {
  shape: 'round' | 'box';
  /** round: радиус */
  r?: number;
  /** box: өргөн (x), гүн (z) */
  w?: number;
  d?: number;
  /** ханын өндөр; round бол roofH — дээвэр (конус) */
  h: number;
  roofH?: number;
  floor: string;
  wall: string;
  trim: string;
  roof?: string;
  light: { color: string; intensity: number };
  /** Орох байрлал, хаалганы гарах цэг, лангуу (E → цонх) — өрөөний координат */
  entry: [number, number];
  exit: [number, number];
  counter: [number, number] | null;
  /** V6.2-ын тавилга байрлуулах цэгүүд */
  spots: InteriorSpot[];
  /** Гэр төрлийн өрөө: 'home' (тоглогчийн гэр) | 'helper' (туслахын гэр). r, entry, exit, obstacles нь data/ger.json-оос тооцогдоно */
  gerSize?: 'home' | 'helper';
  /** Өрөөний өөрийн камер (interiors.camera-г дарна; гэр жижиг тул ойрхон) */
  camera?: { dist?: number; minDist?: number; maxDist?: number; pitch?: number };
  /** Гарах хаалганы зай (өрөөний өөрийн; байхгүй бол interiors.exitR) */
  exitR?: number;
  /** Тавилгын саад (гэр: gerBoxes) — өрөөний координат */
  obstacles?: LayoutBox[];
  /** Мөргөлдөөнд (хананд тулсан тавилгыг хана руу сунгасан) */
  blockers?: LayoutBox[];
  /** V3.5 хашаа байшин: data/buildings.json interior түлхүүр (houseA|houseB|houseBf|houseC). w, d, h, entry, exit, counter, walk, blockers нь тооцогдоно (houseLayout.ts) */
  house?: string;
  /** V6.2 нийтийн барилгын дотор тал (school | temple) — render/building/publicInterior.ts; саад publicLayout.ts-ээс (blockers) */
  publicInterior?: string;
  /** Алхах талбай (биеийн төв): гол өрөө + амбаар + хаалганы завсар. Байхгүй бол w × d тэгш өнцөгт */
  walk?: WalkRect[];
}
export interface InteriorsConfig {
  enterR: number;
  exitR: number;
  counterR: number;
  bodyR: number;
  door: { w: number; h: number };
  campDoorOut: number;
  dwellingDoorOut: number;
  /** Туслахын/айлын гэрийн хуучин загварын радиус (render/staff.ts — S1-д шинэ загвар холбогдтол) */
  dwellingBaseRadius: number;
  dwellingScale: Record<string, number>;
  camera: { dist: number; minDist: number; maxDist: number; pitch: number };
  kindRoom: Record<string, string>;
  idRoom: Record<string, string>;
  gerRooms: Record<string, string>;
  rooms: Record<string, RoomSpec>;
}

/** Дотроос нээгдэх цонх: худалдаа, цайны газар, сумын амьдрал (дуган, ЗДТГ, банк, байшин, хамаатан) */
export type InteriorService = 'shop' | 'teahouse' | 'town';

export interface EnterDoor {
  id: string;
  room: string;
  place: 'camp' | 'sum';
  /** Хаалганы гадна цэг (place-ийн координат, м) */
  x: number;
  z: number;
  /** Гарахдаа харах чиглэл (рад, +z = 0) */
  outHeading: number;
  service: InteriorService | null;
}

const OUT_HEADING: Record<Facing, number> = { s: 0, n: Math.PI, e: Math.PI / 2, w: -Math.PI / 2 };
const SOON_ROLES = ['clothing', 'grocery', 'fuel'];

// ======================= Хаалгууд =======================

function serviceOf(role: string): InteriorService | null {
  if ((TRADE_ROLES as readonly string[]).includes(role)) return 'shop';
  if (role === 'teahouse') return 'teahouse';
  if (role === 'temple' || role === 'zdtg' || role === 'bank' || SOON_ROLES.includes(role)) return 'town';
  return null;
}

/** Сумын төвийн орж болох хаалганууд: барилгын (хашааны биш) хаалга + тусгай хашааны байшин. Төлөвөөс үл хамаарна */
export function sumEnterDoors(cfg: GameConfig): { door: EnterDoor; plot: string | null; role: string }[] {
  const I = cfg.interiors;
  const L = cfg.sumcenter;
  const byId = new Map(allBuildings(L).map((b) => [b.id, b]));
  const out: { door: EnterDoor; plot: string | null; role: string }[] = [];
  for (const d of sumDoors(cfg)) {
    const b = byId.get(d.id);
    if (!b || !(d.enterable || d.role)) continue;   // цогцолборын хаалга (мал зах г.м.) орохгүй
    const room = I.idRoom[d.id] ?? I.kindRoom[d.kind] ?? '';
    out.push({ door: { id: d.id, room, place: 'sum', x: d.x, z: d.z, outHeading: OUT_HEADING[facingOf(b)], service: serviceOf(d.role) }, plot: null, role: d.role });
  }
  // Тусгай хашааны байшин (зарах, хамаатан): хаалга нь town.ts-ийн plotDoors-той ижил (plotHouse)
  for (const sp of L.specialPlots ?? []) {
    const h = plotHouse(L, sp);
    const room = I.idRoom[sp.id] ?? I.kindRoom.house ?? '';
    const hk = I.rooms[room]?.house, hr = hk ? houseRoom(hk, I.bodyR) : null;
    const ph = GATE_PHI[h.gate], oc = hr ? { x: hr.out.x * Math.cos(ph) + hr.out.z * Math.sin(ph), z: -hr.out.x * Math.sin(ph) + hr.out.z * Math.cos(ph) } : null;   // гарах хаалганы гадна чиглэл (дэлхийд)
    out.push({ door: { id: sp.id, room, place: 'sum', x: h.door.x, z: h.door.z, outHeading: oc ? Math.atan2(oc.x, oc.z) : OUT_HEADING.s, service: 'town' }, plot: sp.id, role: sp.role === 'forSale' ? 'house' : 'relative' });
  }
  return out;
}

/** Гэрийн бууцны орж болох хаалганууд: өөрийн гэр (майхан биш), айлын ба туслахын гэр */
export function campEnterDoors(cfg: GameConfig, state: GameState): EnterDoor[] {
  const I = cfg.interiors;
  const out: EnterDoor[] = [];
  const home = cfg.camps.home;
  if (state.home === 'ger') {
    out.push({ id: 'home', room: I.gerRooms.home ?? '', place: 'camp', x: home.x, z: home.z + gerDoorOffset(cfg.ger, state.homeSize), outHeading: 0, service: null });
  }
  // M6.13: нэмэлт гэрүүд — хаалга хот (бууцны төв) руу, `ger|<i>`; дотор өрөөний хэмжээ гэр бүрийнх (gerSizeOfDoor)
  state.extraGers.forEach((g, i) => {
    const len = Math.hypot(g.x, g.z) || 1;
    const ux = -g.x / len, uz = -g.z / len, r = gerDoorOffset(cfg.ger, g.size);
    out.push({ id: extraDoorId(i), room: I.gerRooms.home ?? '', place: 'camp', x: g.x + ux * r, z: g.z + uz * r, outHeading: Math.atan2(ux, uz), service: null });
  });
  for (const d of state.helpers.dwellings) {
    const room = I.gerRooms[d.kind];
    if (!room) continue;   // майхан, адуучний майхан орохгүй
    const len = Math.hypot(d.x, d.z) || 1;
    const ux = -d.x / len, uz = -d.z / len;   // хаалга хот руу (render/staff.ts)
    const r = I.dwellingBaseRadius * (I.dwellingScale[d.kind] ?? 1) + I.dwellingDoorOut;
    out.push({ id: `${d.kind}|${d.x}|${d.z}`, room, place: 'camp', x: d.x + ux * r, z: d.z + uz * r, outHeading: Math.atan2(ux, uz), service: null });
  }
  return out;
}

/** Тоглогчийн одоогийн байрлалд орж болох хаалганууд */
export function enterDoors(cfg: GameConfig, state: GameState): EnterDoor[] {
  const p = state.player;
  if (p.place === 'camp') return campEnterDoors(cfg, state);
  if (p.place !== 'sum') return [];
  const owned = state.town.houses;
  return sumEnterDoors(cfg)
    .map((e) => (e.plot !== null && e.role === 'house' && owned[e.plot] && cfg.interiors.idRoom[`${e.plot}:owned`] ? { ...e.door, room: cfg.interiors.idRoom[`${e.plot}:owned`]! } : e.door));   // зарах байшин: авахаас өмнө хоосон, авсны дараа тавилгатай
}

/** Хамгийн ойрын орох хаалга (enterR дотор) */
export function nearEnterDoor(cfg: GameConfig, state: GameState): EnterDoor | null {
  const p = state.player;
  if (p.interior || p.driving || state.move) return null;
  let best: EnterDoor | null = null, bd = cfg.interiors.enterR;
  for (const d of enterDoors(cfg, state)) {
    const r = Math.hypot(p.x - d.x, p.z - d.z);
    if (r <= bd) {
      bd = r;
      best = d;
    }
  }
  return best;
}

// ======================= Өрөө =======================

const resolved = new WeakMap<GameConfig, Map<string, RoomSpec>>();

/** Өрөөний тодорхойлолт. Гэр төрлийн өрөөний хэмжээ, саад нь data/ger.json-оос тооцогдоно (кэштэй) */
export function roomSpec(cfg: GameConfig, id: string, homeSize: string = cfg.ger.home.size): RoomSpec | null {
  const raw = cfg.interiors.rooms[id];
  if (!raw) return null;
  if (!raw.gerSize && !raw.house && !raw.publicInterior) return raw;
  let m = resolved.get(cfg);
  if (!m) resolved.set(cfg, (m = new Map()));
  const ck = `${id}|${raw.gerSize === 'home' ? homeSize : ''}`;
  let r = m.get(ck);
  if (!r && raw.publicInterior) {
    r = { ...raw, blockers: publicBlockers(raw.publicInterior, raw) };
    m.set(ck, r);
  }
  if (!r && raw.house) {
    const H = houseRoom(raw.house, cfg.interiors.bodyR);
    r = { ...raw, shape: 'box', w: H.w, d: H.d, h: H.h, entry: H.entry, exit: H.exit, exitR: 0.9, counter: H.counter, spots: [], walk: H.walk, blockers: H.blockers };
    m.set(ck, r);
  }
  if (!r) {
    const key = raw.gerSize === 'home' ? homeSize : cfg.ger.helper.size;
    const Ri = gerInnerRadius(cfg.ger, key);
    r = { ...raw, shape: 'round', r: Ri, entry: [0, Ri - 0.55], exit: [0, Ri - cfg.interiors.bodyR - 0.05], exitR: 0.9, counter: null, spots: [], obstacles: gerBoxes(cfg.ger, key), blockers: gerBlockers(cfg.ger, key) };
    m.set(ck, r);
  }
  return r;
}

/** Гэрийн хэмжээний түлхүүр (data/ger.json sizes) — гэр төрлийн өрөө биш бол null */
export function roomGerSize(cfg: GameConfig, room: RoomSpec, homeSize: string = cfg.ger.home.size): string | null {
  return room.gerSize ? (room.gerSize === 'home' ? homeSize : cfg.ger.helper.size) : null;
}

/** Тоглогч орсон өрөө (дотор биш бол null) */
export function currentRoom(cfg: GameConfig, state: GameState): RoomSpec | null {
  const it = state.player.interior;
  return it ? roomSpec(cfg, it.room, gerSizeOfDoor(state, it.door)) : null;
}

/** Өрөөний хэмжээнд байрлалыг хязгаарлана (хана, bodyR) */
export function clampToRoom(cfg: GameConfig, room: RoomSpec, x: number, z: number): { x: number; z: number } {
  const b = cfg.interiors.bodyR;
  if (room.shape === 'round') {
    const R = (room.r ?? 3) - b;
    let px = x, pz = z;
    const blk = room.blockers ?? room.obstacles;
    for (let pass = 0; pass < 6; pass++) {   // ханаас, тавилгаас ээлжлэн түлхэнэ
      const l = Math.hypot(px, pz);
      if (l > R) { px = (px / l) * R; pz = (pz / l) * R; }
      if (!blk) break;
      for (const o of blk) ({ x: px, z: pz } = pushOutOfBox(o, px, pz, b));
    }
    if (blk) {   // тавилганаас түлхсэн цэг ханын гадна гарвал (нарийн завсар) ханын дотор талд барина
      const hard = (room.r ?? 3) - 0.05, l = Math.hypot(px, pz);
      if (l > hard) { px = (px / l) * hard; pz = (pz / l) * hard; }
    }
    return { x: px, z: pz };
  }
  if (room.walk) {   // хашаа байшин: гол өрөө, амбаар, хаалганы завсар + тавилгын саад
    let p = clampToWalk(room.walk, x, z);
    for (let pass = 0; pass < 4; pass++) {
      for (const o of room.blockers ?? []) p = pushOutOfBox(o, p.x, p.z, b);
      const q = clampToWalk(room.walk, p.x, p.z);
      if (Math.abs(q.x - p.x) < 1e-9 && Math.abs(q.z - p.z) < 1e-9) break;
      p = q;
    }
    return p;
  }
  const hx = (room.w ?? 6) / 2 - b, hz = (room.d ?? 6) / 2 - b;
  let px = Math.max(-hx, Math.min(hx, x)), pz = Math.max(-hz, Math.min(hz, z));
  for (let pass = 0; room.blockers && pass < 4; pass++) {   // тавилгын саад (нийтийн барилга)
    for (const o of room.blockers) ({ x: px, z: pz } = pushOutOfBox(o, px, pz, b));
    const qx = Math.max(-hx, Math.min(hx, px)), qz = Math.max(-hz, Math.min(hz, pz));
    if (qx === px && qz === pz) break;
    px = qx; pz = qz;
  }
  return { x: px, z: pz };
}

// ======================= Орох, гарах, хөдлөх =======================

/** Барилгад орно. doorId өгөөгүй бол ойрын хаалга. Алдаа бол тайлбар */
export function enterBuilding(cfg: GameConfig, state: GameState, doorId?: string): Msg | null {
  const p = state.player;
  if (p.interior) return m('sim.you_are_already_inside');
  if (p.place === 'map' || state.move) return m('sim.no_building_to_enter');
  if (p.driving) return m('sim.get_out_of_the_93');
  if (p.mounted) return m('sim.dismount');
  const door = doorId ? enterDoors(cfg, state).find((d) => d.id === doorId) : nearEnterDoor(cfg, state);
  if (!door) return m('sim.no_door_nearby_to');
  const room = roomSpec(cfg, door.room, gerSizeOfDoor(state, door.id));
  if (!room) return m('sim.the_interior_is_not');
  p.x = door.x;
  p.z = door.z;
  p.interior = { door: door.id, room: door.room, x: room.entry[0], z: room.entry[1], heading: Math.PI };
  p.heading = door.outHeading + Math.PI;
  return null;
}

/** Гарах хаалганы дэргэд байна уу */
export function atExit(cfg: GameConfig, state: GameState): boolean {
  const it = state.player.interior, room = currentRoom(cfg, state);
  return !!it && !!room && Math.hypot(it.x - room.exit[0], it.z - room.exit[1]) <= (room.exitR ?? cfg.interiors.exitR);
}

/** Барилгаас гарна (force — бот, тест, нүүх/газрын зураг гэх мэт өөр үйлдэл хаалганы дэргэд биш байхад). Алдаа бол тайлбар */
export function exitBuilding(cfg: GameConfig, state: GameState, force = false): Msg | null {
  const p = state.player, it = p.interior;
  if (!it) return m('sim.you_are_not_inside');
  if (!force && !atExit(cfg, state)) return m('sim.go_to_the_door');
  const door = enterDoors(cfg, state).find((d) => d.id === it.door);
  if (door) {
    p.x = door.x;
    p.z = door.z;
    p.heading = door.outHeading;
  }
  p.interior = null;
  return null;
}

/** Дотор алхах: өрөөний хана хүртэл */
export function moveInterior(cfg: GameConfig, state: GameState, x: number, z: number, heading?: number): Msg | null {
  const it = state.player.interior, room = currentRoom(cfg, state);
  if (!it || !room) return m('sim.you_are_not_inside');
  const c = clampToRoom(cfg, room, x, z);
  it.x = c.x;
  it.z = c.z;
  if (heading !== undefined) it.heading = heading;
  return null;
}

/** Лангууны дэргэд байна уу (энд E → цонх) */
export function atCounter(cfg: GameConfig, state: GameState): boolean {
  const it = state.player.interior, room = currentRoom(cfg, state);
  return !!it && !!room && !!room.counter && Math.hypot(it.x - room.counter[0], it.z - room.counter[1]) <= cfg.interiors.counterR;
}

/** Лангууны дэргэд байхад нээгдэх цонхны төрөл (үгүй бол null) */
export function interiorService(cfg: GameConfig, state: GameState): InteriorService | null {
  const it = state.player.interior;
  if (!it || !atCounter(cfg, state)) return null;
  return enterDoors(cfg, state).find((d) => d.id === it.door)?.service ?? null;
}

/** Хуучин хадгалалтын аюулгүй байдал: орсон хаалга байхгүй бол (хаалга зарагдсан г.м.) гаргана */
export function ensureInteriorValid(cfg: GameConfig, state: GameState): void {
  const it: InteriorState | null = state.player.interior;
  if (it && (!roomSpec(cfg, it.room) || !enterDoors(cfg, state).some((d) => d.id === it.door))) state.player.interior = null;
}

// ======================= Тохиргооны шалгалт =======================

export function validateInteriors(cfg: GameConfig): string[] {
  const e: string[] = [];
  const I = cfg.interiors;
  if (!I) return ['data/interiors.json хэрэгтэй'];
  const hex = /^#[0-9a-f]{6}$/i;
  for (const k of ['enterR', 'exitR', 'counterR', 'bodyR'] as const) if (!(I[k] > 0)) e.push(`interiors.${k}: > 0`);
  if (!(I.door.w > 0 && I.door.h > 0)) e.push('interiors.door: w, h > 0');
  if (!(I.camera.minDist > 0 && I.camera.minDist <= I.camera.dist && I.camera.dist <= I.camera.maxDist)) e.push('interiors.camera: minDist ≤ dist ≤ maxDist');
  for (const [k, id] of [...Object.entries(I.kindRoom), ...Object.entries(I.idRoom), ...Object.entries(I.gerRooms)]) if (!I.rooms[id]) e.push(`interiors: "${k}" → өрөө "${id}" алга`);
  for (const [id, raw] of Object.entries(I.rooms)) {
    const w = `interiors.rooms.${id}`;
    if (raw.gerSize && !(raw.gerSize === 'home' || raw.gerSize === 'helper')) e.push(`${w}.gerSize: home | helper`);
    if (raw.gerSize && !cfg.ger.sizes[raw.gerSize === 'home' ? cfg.ger.home.size : cfg.ger.helper.size]) { e.push(`${w}: гэрийн хэмжээ data/ger.json-д алга`); continue; }
    const r = roomSpec(cfg, id) ?? raw;
    if (r.shape !== 'round' && r.shape !== 'box') {
      e.push(`${w}.shape: round | box`);
      continue;
    }
    if (r.shape === 'round' ? !(r.r! > 0 && r.roofH! > 0) : !(r.w! > 0 && r.d! > 0)) e.push(`${w}: хэмжээ буруу (round: r, roofH; box: w, d)`);
    if (!(r.h > 0)) e.push(`${w}.h: > 0`);
    for (const c of [r.floor, r.wall, r.trim, r.light.color, ...(r.shape === 'round' ? [r.roof ?? ''] : [])]) if (!hex.test(c)) e.push(`${w}: өнгө "${c}" #rrggbb биш`);
    if (!(r.light.intensity > 0)) e.push(`${w}.light.intensity: > 0`);
    const inside = (x: number, z: number): boolean => {
      const c = clampToRoom(cfg, r, x, z);
      return Math.abs(c.x - x) < 1e-6 && Math.abs(c.z - z) < 1e-6;
    };
    // Гарах цэг хана дэргэд байж болно (хаалга), бусад нь дотор
    if (!inside(r.entry[0], r.entry[1])) e.push(`${w}.entry: өрөөнөөс гарсан`);
    if (Math.hypot(r.entry[0] - r.exit[0], r.entry[1] - r.exit[1]) > I.exitR + 1.5) e.push(`${w}: entry exit-ээс хэт хол`);
    if (r.counter && !inside(r.counter[0], r.counter[1])) e.push(`${w}.counter: өрөөнөөс гарсан`);
    const ids = new Set<string>();
    for (const s of r.spots) {
      if (ids.has(s.id)) e.push(`${w}.spots: "${s.id}" давхардсан`);
      ids.add(s.id);
      if (r.shape === 'box' && r.publicInterior ? Math.abs(s.x) > (r.w ?? 0) / 2 || Math.abs(s.z) > (r.d ?? 0) / 2 : !inside(s.x, s.z)) e.push(`${w}.spots.${s.id}: өрөөнөөс гарсан`);   // нийтийн барилгын spot: тавилга, ханан дээрх зүйл — зөвхөн өрөөний хүрээ
    }
  }
  const seen = new Set<string>();
  for (const { door, role } of sumEnterDoors(cfg)) {
    if (seen.has(door.id)) e.push(`interiors: хаалга "${door.id}" давхардсан`);
    seen.add(door.id);
    if (!I.rooms[door.room]) e.push(`interiors: "${door.id}" (kind/үүрэг "${role}") барилгад өрөө алга (kindRoom/idRoom)`);
    else if (door.service && !I.rooms[door.room]!.counter) e.push(`interiors.rooms.${door.room}: "${door.id}" үйлчилгээтэй барилгад counter хэрэгтэй`);
  }
  return e;
}

