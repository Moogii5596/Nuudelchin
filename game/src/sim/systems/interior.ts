/**
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
    out.push({ door: { id: sp.id, room, place: 'sum', x: h.door.x, z: h.door.z, outHeading: OUT_HEADING.s, service: 'town' }, plot: sp.id, role: sp.role === 'forSale' ? 'house' : 'relative' });
  }
  return out;
}

/** Гэрийн бууцны орж болох хаалганууд: өөрийн гэр (майхан биш), айлын ба туслахын гэр */
export function campEnterDoors(cfg: GameConfig, state: GameState): EnterDoor[] {
  const I = cfg.interiors;
  const out: EnterDoor[] = [];
  const home = cfg.camps.home;
  if (state.home === 'ger') {
    out.push({ id: 'home', room: I.gerRooms.home ?? '', place: 'camp', x: home.x, z: home.z + gerDoorOffset(cfg.ger, cfg.ger.home.size), outHeading: 0, service: null });
  }
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
    .filter((e) => e.plot === null || e.role === 'relative' || !!owned[e.plot])   // зарагдаагүй байшинд орохгүй
    .map((e) => e.door);
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
export function roomSpec(cfg: GameConfig, id: string): RoomSpec | null {
  const raw = cfg.interiors.rooms[id];
  if (!raw) return null;
  if (!raw.gerSize) return raw;
  let m = resolved.get(cfg);
  if (!m) resolved.set(cfg, (m = new Map()));
  let r = m.get(id);
  if (!r) {
    const key = raw.gerSize === 'home' ? cfg.ger.home.size : cfg.ger.helper.size;
    const Ri = gerInnerRadius(cfg.ger, key);
    r = { ...raw, shape: 'round', r: Ri, entry: [0, Ri - 0.55], exit: [0, Ri - cfg.interiors.bodyR - 0.05], exitR: 0.9, counter: null, spots: [], obstacles: gerBoxes(cfg.ger, key), blockers: gerBlockers(cfg.ger, key) };
    m.set(id, r);
  }
  return r;
}

/** Гэрийн хэмжээний түлхүүр (data/ger.json sizes) — гэр төрлийн өрөө биш бол null */
export function roomGerSize(cfg: GameConfig, room: RoomSpec): string | null {
  return room.gerSize ? (room.gerSize === 'home' ? cfg.ger.home.size : cfg.ger.helper.size) : null;
}

/** Тоглогч орсон өрөө (дотор биш бол null) */
export function currentRoom(cfg: GameConfig, state: GameState): RoomSpec | null {
  const it = state.player.interior;
  return it ? roomSpec(cfg, it.room) : null;
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
  const hx = (room.w ?? 6) / 2 - b, hz = (room.d ?? 6) / 2 - b;
  return { x: Math.max(-hx, Math.min(hx, x)), z: Math.max(-hz, Math.min(hz, z)) };
}

// ======================= Орох, гарах, хөдлөх =======================

/** Барилгад орно. doorId өгөөгүй бол ойрын хаалга. Алдаа бол тайлбар */
export function enterBuilding(cfg: GameConfig, state: GameState, doorId?: string): string | null {
  const p = state.player;
  if (p.interior) return 'Аль хэдийн дотор байна';
  if (p.place === 'map' || state.move) return 'Энд орох барилга алга';
  if (p.driving) return 'Тээвэрээсээ буу';
  if (p.mounted) return 'Мориноосоо буу';
  const door = doorId ? enterDoors(cfg, state).find((d) => d.id === doorId) : nearEnterDoor(cfg, state);
  if (!door) return 'Ойролцоо орох хаалга алга';
  const room = roomSpec(cfg, door.room);
  if (!room) return 'Дотор тал бэлэн биш';
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
export function exitBuilding(cfg: GameConfig, state: GameState, force = false): string | null {
  const p = state.player, it = p.interior;
  if (!it) return 'Барилга дотор биш байна';
  if (!force && !atExit(cfg, state)) return 'Хаалганы дэргэд очно уу';
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
export function moveInterior(cfg: GameConfig, state: GameState, x: number, z: number, heading?: number): string | null {
  const it = state.player.interior, room = currentRoom(cfg, state);
  if (!it || !room) return 'Барилга дотор биш байна';
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
      if (!inside(s.x, s.z)) e.push(`${w}.spots.${s.id}: өрөөнөөс гарсан`);
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

