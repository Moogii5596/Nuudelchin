/**
 * Сумын төвийн байршлаас (data/sumcenter.json) тоглоомын цэгүүдийг тооцно — Three.js, DOM-гүй (V3.3).
 * Дэлгүүр бүр өөр үүрэгтэй (gameRole): сүү/ноос хүлээн авах, малын зах, машин худалдаа, гэр/майхан,
 * тоног төхөөрөмж, малын тэжээл, тэжээвэр амьтан, цайны газар. Хаалганы цэгийг render ч ашиглана.
 */
import type { BuyOrder } from '../state';
import type { GameConfig } from '../config';
import type { GameState } from '../state';

// ---------- data/sumcenter.json-ийн төрөл (config.ts → GameConfig.sumcenter) ----------
/** V3.3: сумын төвийн 3D байршил (data/sumcenter.json). Нэгж м; z− = хойд, x+ = зүүн */
export type SumXZ = [number, number];
export interface SumRoofSpec { type: 'flat' | 'gable' | 'hip' | 'pagoda'; color: string }
export interface SumYardSpec { w: number; d: number; fence: string; dx?: number; dz?: number; animals?: number }
export interface SumBuildingSpec {
  id: string; name: string; kind: string;
  x: number; z: number; w: number; d: number;
  floors: number; h?: number; rot?: number;
  roof: SumRoofSpec; wall: string; trim?: string;
  yard?: SumYardSpec; chimney?: { dx: number; dz: number; h: number };
  /** Тоглогч дотор нь орж болно (интерьер тусдаа дүр зураг) */
  enterable?: boolean; interior?: string;
  /** Нүүрний чиглэл (хаалга). Өгөөгүй бол урагшаа ('s'). Тэнхлэг: z− = хойд, z+ = урд, x+ = зүүн, x− = баруун */
  front?: 'n' | 's' | 'e' | 'w';
  gameRole?: string;
}
export interface SumCompoundSpec {
  id: string; name: string; kind: string; gameRole?: string;
  /** Хашааны хаалга (өгөөгүй бол ойрын зам руу), gateOffset — хаалгыг төвөөс зөөх (м) */
  gate?: 'n' | 's' | 'e' | 'w'; gateOffset?: number; x: number; z: number; w: number; d: number; fence: string;
  buildings?: SumBuildingSpec[]; gers?: SumXZ[]; solar?: SumXZ[]; pens?: [number, number, number, number][]; animals?: number;
}
export interface SumFieldSpec { id: string; name: string; kind: 'football' | 'wrestling'; x: number; z: number; w?: number; d?: number; r?: number; track?: boolean }
export interface SumSpecialPlotSpec {
  id: string; role: 'forSale' | 'relative'; name: string; x: number; z: number; w: number; d: number;
  house: { w: number; d: number; floors: number; roof: string; wall: string }; ger?: boolean;
}
export interface SumZoneSpec { id: string; name: string; kind: 'khashaa'; x: number; z: number; w: number; d: number; fill: number }
export interface SumRoadSpec { id: string; name: string; width: number; points: SumXZ[] }
export interface SumPropSpec { kind: string; x: number; z: number; [k: string]: unknown }
export interface SumLayout {
  version: number; id: string; name: string;
  /** Газрын зургаас ирэх цэг; exit — замын үзүүр (хязгаар руу) */
  entry: { x: number; z: number; exit: SumXZ };
  floorHeight: number;
  terrain: {
    size: [number, number]; ground: string;
    mountain: { name: string; peak: number; ramp: number; color: string; polygon: SumXZ[] };
    lakes: { id: string; name: string; x: number; z: number; rx: number; rz: number; color: string }[];
    dryWash: { name: string; width: number; points: SumXZ[] };
  };
  roads: SumRoadSpec[];
  buildings: SumBuildingSpec[];
  compounds: SumCompoundSpec[];
  fields: SumFieldSpec[];
  zones: SumZoneSpec[];
  specialPlots?: SumSpecialPlotSpec[];
  props: SumPropSpec[];
}

export type Facing = 'n' | 's' | 'e' | 'w';

/** Арилжаа хийдэг үүргүүд ба тэнд авч/зарж болох зүйл */
export const TRADE_ROLES = ['buyer', 'livestock', 'vehicles', 'ger_tent', 'equipment', 'feed', 'pets'] as const;
export type TradeRole = (typeof TRADE_ROLES)[number];

export interface SumDoor {
  id: string;
  role: string;          // gameRole эсвэл '' (зөвхөн орж болох барилга)
  kind: string;
  /** Хаалганы гадна талын цэг (м) — тоглогч энд ирж E дарна */
  x: number;
  z: number;
  enterable: boolean;
}

/** Машин худалдааны зогсоол. display — зөвхөн харуулах (vehicles.json-д хараахан байхгүй, 🙋) */
export interface LotSlot { id: string; vehicle: string; x: number; z: number; rot: number; display?: boolean }

/** Барилгын нүүрний чиглэл (анхдагч — урагшаа) */
export function facingOf(b: Pick<SumBuildingSpec, 'front'>): Facing {
  return b.front ?? 's';
}

/** Хаалганы гаднах цэг: нүүрэн хананаас `out` м */
export function doorPoint(b: Pick<SumBuildingSpec, 'x' | 'z' | 'w' | 'd' | 'front'>, out = 2): { x: number; z: number } {
  switch (facingOf(b)) {
    case 'n':
      return { x: b.x, z: b.z - b.d / 2 - out };
    case 's':
      return { x: b.x, z: b.z + b.d / 2 + out };
    case 'e':
      return { x: b.x + b.w / 2 + out, z: b.z };
    case 'w':
      return { x: b.x - b.w / 2 - out, z: b.z };
  }
}

/** Бүх барилга (цогцолбор доторхийг оруулаад) */
export function allBuildings(L: SumLayout): SumBuildingSpec[] {
  return [...L.buildings, ...L.compounds.flatMap((c) => c.buildings ?? [])];
}

/** Үүрэгтэй эсвэл орж болох барилгын хаалганууд + үүрэгтэй цогцолборын хаалга (~30 барилга — кэшгүй) */
export function sumDoors(cfg: GameConfig): SumDoor[] {
  const L = cfg.sumcenter;
  const out: SumDoor[] = [];
  for (const b of allBuildings(L)) {
    if (!b.gameRole && !b.enterable) continue;
    const p = doorPoint(b);
    out.push({ id: b.id, role: b.gameRole ?? '', kind: b.kind, x: p.x, z: p.z, enterable: !!b.enterable });
  }
  for (const c of L.compounds) {
    if (!c.gameRole) continue;
    const g = c.gate ?? 's', off = c.gateOffset ?? 0;
    const p = doorPoint({ x: c.x, z: c.z, w: c.w, d: c.d, front: g }, 2);
    const horiz = g === 'n' || g === 's';
    out.push({ id: c.id, role: c.gameRole, kind: c.kind, x: p.x + (horiz ? off : 0), z: p.z + (horiz ? 0 : off), enterable: false });
  }
  return out;
}

/** Машин худалдааны талбайн зогсоол */
export function lotSlots(cfg: GameConfig): LotSlot[] {
  return cfg.sumcenter.props.filter((p) => p.kind === 'vehicleLot').flatMap((p) => (p.slots as LotSlot[] | undefined) ?? []);
}

/** 3D-ийн хязгаар (м): сумын төв том тул тусдаа радиустай */
export function worldLimit(cfg: GameConfig, place: string): number {
  return place === 'sum' ? cfg.worldmap.sum3d.radius : cfg.player.worldRadius;
}

/** Тоглогчийн хамгийн ойрын арилжааны дэлгүүр (shopR дотор) */
export function nearTradeDoor(cfg: GameConfig, state: GameState): (SumDoor & { role: TradeRole }) | null {
  const p = state.player;
  if (p.place !== 'sum') return null;
  let best: SumDoor | null = null, bd = cfg.worldmap.sum3d.shopR;
  for (const d of sumDoors(cfg)) {
    if (!(TRADE_ROLES as readonly string[]).includes(d.role)) continue;
    const r = Math.hypot(p.x - d.x, p.z - d.z);
    if (r <= bd) {
      bd = r;
      best = d;
    }
  }
  return best as (SumDoor & { role: TradeRole }) | null;
}

/** Цайны газрын хаалга */
export function teahouseDoor(cfg: GameConfig): { x: number; z: number } {
  const d = sumDoors(cfg).find((x) => x.role === 'teahouse');
  return d ?? { x: 0, z: 0 };
}

/** Зарагдаж буй тээврийн ойрын зогсоол (lotR дотор) */
export function nearLotSlot(cfg: GameConfig, state: GameState): LotSlot | null {
  const p = state.player;
  if (p.place !== 'sum') return null;
  let best: LotSlot | null = null, bd = cfg.worldmap.sum3d.lotR;
  for (const s of lotSlots(cfg)) {
    const r = Math.hypot(p.x - s.x, p.z - s.z);
    if (r <= bd) {
      bd = r;
      best = s;
    }
  }
  return best;
}

/** Энэ дэлгүүрт энэ захиалга хийж болох эсэх */
export function orderAllowed(role: TradeRole, o: BuyOrder): boolean {
  switch (o.kind) {
    case 'animal':
      return role === 'livestock';
    case 'hay':
      return role === 'feed';
    case 'processor':
    case 'storage':
      return role === 'equipment';
    case 'ger':
    case 'helperTent':
    case 'helperGer':
    case 'otorTent':
      return role === 'ger_tent';
    case 'dog':
      return role === 'pets';
    case 'vehicle':
      return role === 'vehicles';
  }
}

/** Бүтээгдэхүүн (сүү, ноос, ...) зөвхөн хүлээн авах цэгт, мал зөвхөн малын зах дээр зарагдана */
export function canSellProducts(role: TradeRole): boolean {
  return role === 'buyer';
}
export function canSellAnimals(role: TradeRole): boolean {
  return role === 'livestock';
}

function pointInPoly(x: number, z: number, poly: SumXZ[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i]!, [xj, zj] = poly[j]!;
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
function distSeg(px: number, pz: number, a: SumXZ, b: SumXZ): number {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / l2));
  return Math.hypot(a[0] + t * dx - px, a[1] + t * dz - pz);
}

/** Сумын төвийн газрын өндөр (м): тэгш тал + баруун талын уул (захаасаа зөөлөн өгсөнө) */
export function sumHeight(L: SumLayout, x: number, z: number): number {
  const mt = L.terrain.mountain;
  if (!pointInPoly(x, z, mt.polygon)) return 0;
  let d = Infinity;
  for (let i = 0; i < mt.polygon.length; i++) d = Math.min(d, distSeg(x, z, mt.polygon[i]!, mt.polygon[(i + 1) % mt.polygon.length]!));
  const bump = 1 + 0.08 * Math.sin(x * 0.07) * Math.cos(z * 0.05);
  const t = Math.min(1, d / mt.ramp);
  return mt.peak * t * t * (3 - 2 * t) * bump;
}

function nearestOnPolyline(px: number, pz: number, pts: SumXZ[]): SumXZ {
  let best: SumXZ = pts[0]!, bd = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!, b = pts[i + 1]!;
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / l2));
    const q: SumXZ = [a[0] + t * dx, a[1] + t * dz];
    const d = Math.hypot(q[0] - px, q[1] - pz);
    if (d < bd) {
      bd = d;
      best = q;
    }
  }
  return best;
}

/** Хамгийн ойрын зам руу харсан тал (хашааны хаалга) */
export function faceTowardRoad(L: SumLayout, x: number, z: number): Facing {
  let best: SumXZ = [x, z + 1], bd = Infinity;
  for (const r of L.roads) {
    const q = nearestOnPolyline(x, z, r.points);
    const d = Math.hypot(q[0] - x, q[1] - z);
    if (d < bd) {
      bd = d;
      best = q;
    }
  }
  const dx = best[0] - x, dz = best[1] - z;
  return Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'e' : 'w') : dz > 0 ? 's' : 'n';
}

/** Тусгай хашааны гол байшин: хашааны хойд хэсэгт, нүүр урагшаа; хаалга хойд талд бол хажуу тийш */
export function plotHouse(L: SumLayout, sp: SumSpecialPlotSpec): { gate: Facing; house: { x: number; z: number; w: number; d: number }; door: { x: number; z: number } } {
  const gate = faceTowardRoad(L, sp.x, sp.z);
  const h = sp.house;
  const hxOff = gate === 'n' ? -(sp.w / 2 - h.w / 2 - 1.5) : -2;
  const house = { x: sp.x + hxOff, z: sp.z - sp.d / 2 + h.d / 2 + 3, w: h.w, d: h.d };
  return { gate, house, door: doorPoint({ ...house, front: 's' }) };
}
