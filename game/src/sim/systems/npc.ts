/**
 * V6.3 Сумын төвийн NPC — өдрийн хуваарьтай, зорилготой хүмүүс (docs/plan/V.md «V6.3 санал»; data/npcs.json).
 * Three.js, DOM-гүй. Байрлал нь цаг, өдөр, seed-ийн ЦЭВЭР функц (`npcAt`) — төлөв хадгалахгүй, sim-д нөлөөлөхгүй
 * (хадгалалт, SAVE_VERSION өөрчлөгдөхгүй). Хаалганы цэг, барилгын хэмжээг data/sumcenter.json-оос авна.
 *
 * Хуваарь [цаг, байрлал]: тэр цагт ТЭНД ХҮРЧ ИРСЭН байна; өмнөх байрлалаасаа замын уртад тохирох хугацаагаар эрт гарна.
 * Тоглоомын 1 цаг = time.realSecondsPerGameHour бодит секунд тул NPC-ийн алхалт тоглоомын минутаар: м/мин = speed × rs/60.
 * Зам = барилгыг тойрсон тор дээрх A* (кэштэй), шулууны хүртээмжээр шулуунасан.
 */
import type { GameConfig } from '../config';
import type { GameState } from '../state';
import { allBuildings, doorPoint, plotHouse, type SumBuildingSpec } from './sumtown';
import { seasonOf } from './seasons';

// ======================= data/npcs.json-ийн төрөл =======================
export interface NpcLook { preset: string; colors?: { deel?: string; hem?: string }; figure?: { stature?: number } }
export interface NpcDef {
  id: string; name: string; age: number; sex: 'm' | 'f'; role: string;
  look: NpcLook;
  /** м/с (бодит секундээр) */
  speed: number;
  home: { x: number; z: number } | string;
  work: string | null;
  /** away: хаалганд «Айлд явсан» шошго гарах барилгын id */
  away?: string;
  /** town.relatives-ийн хамаатан (plot id): ажлын байранд нь ч бэлэг өгч болно */
  relative?: string;
  /** барилгын id → [x, z, чиглэл рад] өрөөний координат */
  inside: Record<string, [number, number, number]>;
  schedule: [string, string][];
  holiday?: [string, string][];
}
export interface NpcsConfig {
  version: number;
  jitterMin: number;
  maxLegMin: number;
  gridCell: number;
  calendar: { holiday: string[] };
  places: Record<string, { x: number; z: number }>;
  npcs: NpcDef[];
}

export type NpcMode = 'hidden' | 'away' | 'out' | 'in';
export interface NpcNow {
  id: string;
  mode: NpcMode;
  /** out: дэлхийн координат; in: өрөөний координат (ix, iz) */
  x: number; z: number; heading: number;
  moving: boolean;
  /** in: ямар барилгын дотор (+ өрөөний id) */
  building: string | null;
  room: string | null;
}

export const hhmm = (s: string): number => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};

// ======================= Дэлхий: торлосон зам =======================
interface Pt { x: number; z: number }
interface Stop { t: number; kind: 'home' | 'door' | 'in' | 'at' | 'away'; b: string | null; port: Pt | null; at: Pt | null; heading: number; ix: number; iz: number }
interface Seg { t0: number; t1: number; mode: NpcMode; kind: 'stay' | 'walk'; stop: Stop | null; path: Pt[] | null; cum: number[] | null; len: number }
interface Timeline { segs: Seg[]; late: number; longestLeg: number }
interface World {
  cell: number; x0: number; z0: number; nx: number; nz: number; blocked: Uint8Array;
  buildings: Map<string, SumBuildingSpec>;
  doorOf: (b: string) => Pt | null;
  paths: Map<string, { pts: Pt[]; cum: number[]; len: number }>;
  timelines: Map<string, Timeline>;
}
const worlds = new WeakMap<GameConfig, World>();

function inRotRect(b: SumBuildingSpec, x: number, z: number, m: number): boolean {
  const r = b.rot ?? 0, c = Math.cos(r), s = Math.sin(r), dx = x - b.x, dz = z - b.z;
  const lx = dx * c - dz * s, lz = dx * s + dz * c;
  return Math.abs(lx) <= b.w / 2 + m && Math.abs(lz) <= b.d / 2 + m;
}

function worldOf(cfg: GameConfig): World {
  const hit = worlds.get(cfg);
  if (hit) return hit;
  const N = cfg.npcs, L = cfg.sumcenter, cell = N.gridCell;
  const blds = allBuildings(L), buildings = new Map(blds.map((b) => [b.id, b]));
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  const ext = (x: number, z: number): void => { x0 = Math.min(x0, x); z0 = Math.min(z0, z); x1 = Math.max(x1, x); z1 = Math.max(z1, z); };
  for (const b of blds) { ext(b.x - b.w, b.z - b.d); ext(b.x + b.w, b.z + b.d); }
  for (const p of Object.values(N.places)) ext(p.x, p.z);
  for (const n of N.npcs) if (typeof n.home === 'object') ext(n.home.x, n.home.z);
  x0 = Math.floor((x0 - 40) / cell) * cell; z0 = Math.floor((z0 - 40) / cell) * cell;
  const nx = Math.ceil((x1 + 40 - x0) / cell), nz = Math.ceil((z1 + 40 - z0) / cell);
  const blocked = new Uint8Array(nx * nz);
  for (const b of blds) {
    const R = Math.hypot(b.w, b.d) / 2 + 3, i0 = Math.max(0, Math.floor((b.x - R - x0) / cell)), i1 = Math.min(nx - 1, Math.ceil((b.x + R - x0) / cell));
    const j0 = Math.max(0, Math.floor((b.z - R - z0) / cell)), j1 = Math.min(nz - 1, Math.ceil((b.z + R - z0) / cell));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (inRotRect(b, x0 + (i + 0.5) * cell, z0 + (j + 0.5) * cell, 1.2)) blocked[j * nx + i] = 1;
  }
  for (const lk of L.terrain.lakes) {
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const dx = (x0 + (i + 0.5) * cell - lk.x) / (lk.rx + 2), dz = (z0 + (j + 0.5) * cell - lk.z) / (lk.rz + 2);
      if (dx * dx + dz * dz <= 1) blocked[j * nx + i] = 1;
    }
  }
  const w: World = { cell, x0, z0, nx, nz, blocked, buildings, doorOf: () => null, paths: new Map(), timelines: new Map() };
  w.doorOf = (id: string): Pt | null => {
    const b = buildings.get(id);
    return b ? doorPoint(b) : null;
  };
  worlds.set(cfg, w);
  return w;
}

const cellOf = (w: World, p: Pt): [number, number] => [Math.min(w.nx - 1, Math.max(0, Math.floor((p.x - w.x0) / w.cell))), Math.min(w.nz - 1, Math.max(0, Math.floor((p.z - w.z0) / w.cell)))];
const free = (w: World, i: number, j: number): boolean => i >= 0 && j >= 0 && i < w.nx && j < w.nz && !w.blocked[j * w.nx + i];

/** Шулуун хэсэг чөлөөтэй эсэх (торны сэлгэн шалгалт) */
function clearLine(w: World, a: Pt, b: Pt): boolean {
  const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (w.cell * 0.5)));
  for (let k = 0; k <= n; k++) {
    const [i, j] = cellOf(w, { x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n });
    if (!free(w, i, j)) return false;
  }
  return true;
}

function nearestFree(w: World, i: number, j: number): [number, number] {
  if (free(w, i, j)) return [i, j];
  for (let r = 1; r < 12; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    if (Math.max(Math.abs(di), Math.abs(dj)) === r && free(w, i + di, j + dj)) return [i + di, j + dj];
  }
  return [i, j];
}

/** Хоёр цэгийн хоорондох зам (шулууны хүртээмжээр шулуунасан), кэштэй */
function pathBetween(w: World, a: Pt, b: Pt): { pts: Pt[]; cum: number[]; len: number } {
  const key = `${a.x.toFixed(1)},${a.z.toFixed(1)}>${b.x.toFixed(1)},${b.z.toFixed(1)}`;
  const hit = w.paths.get(key);
  if (hit) return hit;
  let pts: Pt[];
  if (clearLine(w, a, b)) pts = [a, b];
  else {
    const [si, sj] = nearestFree(w, ...cellOf(w, a)), [gi, gj] = nearestFree(w, ...cellOf(w, b));
    const idx = (i: number, j: number): number => j * w.nx + i;
    const g = new Float32Array(w.nx * w.nz).fill(Infinity), prev = new Int32Array(w.nx * w.nz).fill(-1), done = new Uint8Array(w.nx * w.nz);
    const open: [number, number][] = [];                           // [f, idx] — жижиг толгой
    const h = (i: number, j: number): number => { const dx = Math.abs(i - gi), dz = Math.abs(j - gj); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
    const push = (f: number, id: number): void => { open.push([f, id]); let c = open.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (open[p]![0] <= open[c]![0]) break; [open[p], open[c]] = [open[c]!, open[p]!]; c = p; } };
    const pop = (): [number, number] => { const top = open[0]!, last = open.pop()!; if (open.length) { open[0] = last; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; if (l < open.length && open[l]![0] < open[m]![0]) m = l; if (r < open.length && open[r]![0] < open[m]![0]) m = r; if (m === c) break; [open[m], open[c]] = [open[c]!, open[m]!]; c = m; } } return top; };
    g[idx(si, sj)] = 0; push(h(si, sj), idx(si, sj));
    let found = false;
    while (open.length) {
      const [, cur] = pop();
      if (done[cur]) continue;
      done[cur] = 1;
      const ci = cur % w.nx, cj = (cur - ci) / w.nx;
      if (ci === gi && cj === gj) { found = true; break; }
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const ni = ci + di, nj = cj + dj;
        if (!free(w, ni, nj)) continue;
        if (di && dj && (!free(w, ci + di, cj) || !free(w, ci, cj + dj))) continue;   // булан огтлохгүй
        const nid = idx(ni, nj), cost = g[cur]! + (di && dj ? 1.414 : 1);
        if (cost < g[nid]!) { g[nid] = cost; prev[nid] = cur; push(cost + h(ni, nj), nid); }
      }
    }
    pts = [a];
    if (found) {
      const chain: Pt[] = [];
      for (let c = idx(gi, gj); c >= 0; c = prev[c]!) chain.push({ x: w.x0 + ((c % w.nx) + 0.5) * w.cell, z: w.z0 + (Math.floor(c / w.nx) + 0.5) * w.cell });
      chain.reverse();
      // шулуунасан зам: боломжит хамгийн хол цэг рүү шууд
      let cur: Pt = a, k = 0;
      while (k < chain.length) {
        let far = k;
        for (let q = chain.length - 1; q >= k; q--) if (clearLine(w, cur, chain[q]!)) { far = q; break; }
        cur = chain[far]!; pts.push(cur); k = far + 1;
      }
    }
    pts.push(b);
  }
  const cum = [0];
  for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1]! + Math.hypot(pts[k]!.x - pts[k - 1]!.x, pts[k]!.z - pts[k - 1]!.z));
  const res = { pts, cum, len: cum[cum.length - 1]! };
  w.paths.set(key, res);
  return res;
}

// ======================= Байрлал, хуваарь =======================
const hash = (s: string): number => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };

export function npcById(cfg: GameConfig, id: string): NpcDef | undefined { return cfg.npcs.npcs.find((n) => n.id === id); }

/** Барилгын өрөөний id (data/interiors.json): sumcenter-ийн interior, эсвэл kind-ээр; байхгүй бол null */
export function roomOfBuilding(cfg: GameConfig, b: string): string | null {
  const spec = allBuildings(cfg.sumcenter).find((x) => x.id === b);
  if (!spec) return null;
  const I = cfg.interiors;
  return I.idRoom[spec.id] ?? (spec.interior && I.rooms[spec.interior] ? spec.interior : null) ?? (I.kindRoom[spec.kind] && I.rooms[I.kindRoom[spec.kind]!] ? I.kindRoom[spec.kind]! : null);
}

function homePoint(cfg: GameConfig, w: World, n: NpcDef): Pt {
  const h = n.home;
  if (typeof h === 'object') return h;
  if (h.startsWith('door:')) return w.doorOf(h.slice(5)) ?? { x: 0, z: 0 };
  if (h.startsWith('plot:')) {
    const sp = (cfg.sumcenter.specialPlots ?? []).find((p) => p.id === h.slice(5));
    return sp ? plotHouse(cfg.sumcenter, sp).door : { x: 0, z: 0 };
  }
  return { x: 0, z: 0 };
}

function stopOf(cfg: GameConfig, w: World, n: NpcDef, t: number, spec: string): Stop {
  const mk = (kind: Stop['kind'], b: string | null, port: Pt | null, at: Pt | null, heading = 0, ix = 0, iz = 0): Stop => ({ t, kind, b, port, at, heading, ix, iz });
  if (spec === 'home') return mk('home', null, homePoint(cfg, w, n), null);
  if (spec === 'away') return mk('away', n.away ?? null, null, null);
  const [k, id] = spec.split(':') as [string, string];
  if (k === 'door') {
    const d = w.doorOf(id), b = w.buildings.get(id);
    const heading = d && b ? Math.atan2(b.x - d.x, b.z - d.z) : 0;
    return mk('door', id, d, d, heading);
  }
  if (k === 'in') {
    const d = w.doorOf(id), ins = n.inside[id] ?? [0, 0, 0];
    return mk('in', id, d, null, ins[2], ins[0], ins[1]);
  }
  if (k === 'at') {
    const p = cfg.npcs.places[id] ?? null;
    return mk('at', id, p, p, hash(n.id + id) * Math.PI * 2);
  }
  return mk('home', null, homePoint(cfg, w, n), null);
}

/** м/мин: speed (м/с, бодит) × бодит секунд / тоглоомын минут */
const metersPerMin = (cfg: GameConfig, n: NpcDef): number => (n.speed * cfg.time.realSecondsPerGameHour) / 60;

function buildTimeline(cfg: GameConfig, w: World, n: NpcDef, holiday: boolean): Timeline {
  const sched = (holiday && n.holiday ? n.holiday : n.schedule).map(([t, s]) => stopOf(cfg, w, n, hhmm(t), s));
  const vm = metersPerMin(cfg, n), segs: Seg[] = [];
  let late = 0, longestLeg = 0;
  const modeOf = (s: Stop): NpcMode => (s.kind === 'in' ? 'in' : s.kind === 'away' ? 'away' : s.kind === 'home' ? 'hidden' : 'out');
  let cur = sched[0]!, tStart = cur.t;
  for (let i = 1; i < sched.length; i++) {
    const nxt = sched[i]!;
    let dur = 0, path: ReturnType<typeof pathBetween> | null = null;
    if (cur.port && nxt.port) {
      const same = Math.hypot(cur.port.x - nxt.port.x, cur.port.z - nxt.port.z) < 0.5;
      if (!same) { path = pathBetween(w, cur.port, nxt.port); dur = path.len / vm; }
    }
    const depart = Math.max(tStart, nxt.t - dur), arrive = depart + dur;
    late = Math.max(late, arrive - nxt.t);
    longestLeg = Math.max(longestLeg, dur);
    segs.push({ t0: tStart, t1: depart, mode: modeOf(cur), kind: 'stay', stop: cur, path: null, cum: null, len: 0 });
    if (path && dur > 0) segs.push({ t0: depart, t1: arrive, mode: 'out', kind: 'walk', stop: nxt, path: path.pts, cum: path.cum, len: path.len });
    cur = nxt; tStart = arrive;
  }
  segs.push({ t0: tStart, t1: Infinity, mode: modeOf(cur), kind: 'stay', stop: cur, path: null, cum: null, len: 0 });
  return { segs, late, longestLeg };
}

function timelineOf(cfg: GameConfig, n: NpcDef, holiday: boolean): Timeline {
  const w = worldOf(cfg), key = n.id + (holiday ? ':h' : '');
  let tl = w.timelines.get(key);
  if (!tl) { tl = buildTimeline(cfg, w, n, holiday); w.timelines.set(key, tl); }
  return tl;
}

/** Хуваарь, замын шалгалтад: хоцрол (мин), хамгийн урт алхалт (мин) */
export function npcTimelineStats(cfg: GameConfig, n: NpcDef, holiday: boolean): { late: number; longestLeg: number } {
  const t = timelineOf(cfg, n, holiday);
  return { late: t.late, longestLeg: t.longestLeg };
}

export const isHoliday = (cfg: GameConfig, day: number): boolean => cfg.npcs.calendar.holiday.includes(seasonOf(cfg, day));

/** Тухайн өдөр, минутад NPC хаана, юу хийж байна (цэвэр функц) */
export function npcAt(cfg: GameConfig, n: NpcDef, day: number, minute: number): NpcNow {
  const tl = timelineOf(cfg, n, isHoliday(cfg, day));
  const jit = Math.round((hash(n.id + ':' + day) * 2 - 1) * cfg.npcs.jitterMin);
  const m = minute - jit;
  const seg = tl.segs.find((s) => m >= s.t0 && m < s.t1) ?? tl.segs[tl.segs.length - 1]!;
  const out = (mode: NpcMode, x: number, z: number, heading: number, moving: boolean, b: string | null = null): NpcNow => ({
    id: n.id, mode, x, z, heading, moving, building: b, room: b && mode === 'in' ? roomOfBuilding(cfg, b) : null,
  });
  const s = seg.stop!;
  if (seg.kind === 'walk' && seg.path && seg.cum) {
    const f = Math.min(1, Math.max(0, (m - seg.t0) / Math.max(1e-6, seg.t1 - seg.t0))), d = f * seg.len;
    let k = 1;
    while (k < seg.cum.length - 1 && seg.cum[k]! < d) k++;
    const a = seg.path[k - 1]!, b = seg.path[k]!, span = Math.max(1e-6, seg.cum[k]! - seg.cum[k - 1]!), u = Math.min(1, Math.max(0, (d - seg.cum[k - 1]!) / span));
    // зорилт нь «дотор»/«гэр» бол ирмэгц алга болно (mode out хэвээр, ирмэгц stay seg)
    return out('out', a.x + (b.x - a.x) * u, a.z + (b.z - a.z) * u, Math.atan2(b.x - a.x, b.z - a.z), true);
  }
  if (seg.mode === 'hidden') return out('hidden', 0, 0, 0, false);
  if (seg.mode === 'away') return out('away', 0, 0, 0, false, s.b);
  if (seg.mode === 'in') return out('in', s.ix, s.iz, s.heading, false, s.b);
  return out('out', s.at!.x, s.at!.z, s.heading, false);
}

export function npcsAt(cfg: GameConfig, day: number, minute: number): NpcNow[] {
  return cfg.npcs.npcs.map((n) => npcAt(cfg, n, day, minute));
}

/** Малын эмч гэх мэт «Айлд явсан» шошготой барилгууд (ямар барилга, одоо хэн алга) */
export function awayBuildings(cfg: GameConfig, day: number, minute: number): Set<string> {
  const s = new Set<string>();
  for (const n of cfg.npcs.npcs) if (n.away && npcAt(cfg, n, day, minute).mode === 'away') s.add(n.away);
  return s;
}

/** Хамаатан NPC (town.relatives) ажлын байрандаа ажиллаж байвал: тухайн барилгын хаалганаас бэлэг өгч болно (plot id) */
export function relativeAtBuilding(cfg: GameConfig, state: GameState, building: string): string | null {
  for (const n of cfg.npcs.npcs) {
    if (!n.relative || n.work !== building) continue;
    const now = npcAt(cfg, n, state.time.day, state.time.minute);
    const door = worldOf(cfg).doorOf(building);
    if ((now.mode === 'in' && now.building === building) || (now.mode === 'out' && door && Math.hypot(now.x - door.x, now.z - door.z) < 6)) return n.relative;
  }
  return null;
}

// ======================= Тохиргооны шалгалт =======================
export function npcConfigErrors(cfg: GameConfig): string[] {
  const e: string[] = [];
  const N = cfg.npcs;
  if (!N || !Array.isArray(N.npcs)) return ['data/npcs.json: npcs хэрэгтэй'];
  const ids = new Set<string>();
  const blds = new Map(allBuildings(cfg.sumcenter).map((b) => [b.id, b]));
  const plots = new Set((cfg.sumcenter.specialPlots ?? []).map((p) => p.id));
  const checkSpec = (n: NpcDef, spec: string): void => {
    if (spec === 'home' || spec === 'away') return;
    const [k, id] = spec.split(':');
    if (k === 'door' || k === 'in') { if (!id || !blds.has(id)) e.push(`npcs.${n.id}: "${spec}" барилга олдсонгүй`); if (k === 'in' && id && !n.inside[id]) e.push(`npcs.${n.id}: inside.${id} байхгүй`); if (k === 'in' && id && !roomOfBuilding(cfg, id)) e.push(`npcs.${n.id}: "${id}" барилгад өрөө (interiors) алга`); }
    else if (k === 'at') { if (!id || !N.places[id]) e.push(`npcs.${n.id}: "${spec}" places-д алга`); }
    else e.push(`npcs.${n.id}: байрлал "${spec}" буруу`);
  };
  for (const n of N.npcs) {
    if (ids.has(n.id)) e.push(`npcs: id "${n.id}" давхардсан`);
    ids.add(n.id);
    if (!(n.speed > 0.5 && n.speed < 8)) e.push(`npcs.${n.id}: speed 0.5–8 м/с`);
    if (typeof n.home === 'string' && !(n.home.startsWith('door:') && blds.has(n.home.slice(5))) && !(n.home.startsWith('plot:') && plots.has(n.home.slice(5)))) e.push(`npcs.${n.id}: home "${n.home}" буруу`);
    if (n.work && !blds.has(n.work) && !N.places[n.work]) e.push(`npcs.${n.id}: work "${n.work}" олдсонгүй`);
    if (n.away && !blds.has(n.away)) e.push(`npcs.${n.id}: away "${n.away}" барилга биш`);
    for (const [name, sched] of [['schedule', n.schedule], ['holiday', n.holiday]] as const) {
      if (!sched) continue;
      let prev = -1;
      if (!sched.length || sched[0]![1] !== 'home' && sched[0]![1].split(':')[0] !== 'in') e.push(`npcs.${n.id}.${name}: эхний байрлал home (эсвэл in:) байх ёстой`);
      for (const [t, s] of sched) {
        const m = hhmm(t);
        if (!(m >= 360 && m <= 1320)) e.push(`npcs.${n.id}.${name}: цаг "${t}" 06:00–22:00 дотор байх ёстой`);
        if (m <= prev) e.push(`npcs.${n.id}.${name}: цаг "${t}" өсөх дараалалтай байх ёстой`);
        prev = m;
        checkSpec(n, s);
      }
      const last = sched[sched.length - 1]![1];
      if (last !== 'home' && name === 'schedule') e.push(`npcs.${n.id}.${name}: сүүлийн байрлал home байх ёстой`);
    }
    if (n.relative && !plots.has(n.relative)) e.push(`npcs.${n.id}: relative "${n.relative}" specialPlots-д алга`);
  }
  for (const p of Object.keys(N.places)) if (!Number.isFinite(N.places[p]!.x)) e.push(`npcs.places.${p}: x, z`);
  return e;
}
