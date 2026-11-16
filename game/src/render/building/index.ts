/**
 * Барилгын загварын сан (V3.5). Эх: tools/character-lab/buildings/index.html (хэрэглэгч баталсан 5 бүлэг).
 * `makeBuilding(kind, opts)` → Geo (mesh биш) + хаалга, хэмжээ. Бүх барилгыг `appendAt`-аар нэг Geo-д нийлүүлж,
 * `makeBuildingMaterials()`-ийн нэг материал + бэхэн хүрээгээр зурна (нийт 2 draw call). Гэр — render/ger/ger.ts (тусдаа).
 */
import * as THREE from 'three';
import { Geo, outlineMaterial } from '../ger/geo';
import { BUILDING_CONFIG } from './config';
import { buildingAtlas, px2uv } from './core';
import { buildHouse, buildToilet, buildWoodshed, buildAnimalShed, buildGreenhouse, buildKennel } from './houses';
import { buildShop, buildMilkWool, buildCarDealer, buildFuel } from './shops';
import { buildPublic, buildTemple, buildMarket, buildStadium, buildWrestle } from './civic';
import { makeInterior, mirrorGeoX, mirroredHouse } from './interior';
import { buildKhashaa, makePlot as makePlotRaw } from './yard';
import type { GerBuilt } from '../ger/ger';

export { buildingAtlas, makeInterior, mirrorGeoX, mirroredHouse };
export { BUILDING_CONFIG, TOWN, buildingConfigErrors, validateBuildingData } from './config';

export interface BuildingDoor { position: THREE.Vector3; inward: THREE.Vector3; width: number; height: number }
export interface BuildingRoom { w: number; d: number; h: number }
export interface BuildingPoint { name: string; position: THREE.Vector3; inward: THREE.Vector3; spinDir?: number }
export interface BuildingWheel { geo: Geo; position: THREE.Vector3; radius: number; height: number; style: string }
export interface BuiltBuilding {
  geo: Geo;
  door: BuildingDoor;
  dims: { w: number; d: number; ridgeH: number; wallH?: number; floors?: number };
  /** V6.1 дотор талын хэмжээ (орж болох барилгад) */
  interior: { main: BuildingRoom; porch?: BuildingRoom; floors?: number } | null;
  gameRole?: string;
  chimneyTop?: THREE.Vector3 | null;
  windows?: THREE.Vector3[];
  points?: BuildingPoint[];
  /** Шөнийн гэрэлтүүлгийн цэгүүд (цэнгэлдэх, бөхийн талбай) */
  lamps?: THREE.Vector3[];
  /** Дуганы эргэдэг хүрд — тусдаа mesh (шөнө/өдөр ижил) */
  wheels?: BuildingWheel[];
  stats?: Record<string, number>;
}
export interface BuildOpts { season?: 'summer' | 'winter'; roofColor?: string; wallColor?: string }

/** Төрөл → барилга. kind: houseA|B|C, toilet, woodshed, animalShed, greenhouse, kennel, shop.types, milkWool, carDealer, fuel, public.kinds, temple, market, stadium, wrestle, khashaa */
export function makeBuilding(kind: string, opts: BuildOpts & Record<string, unknown> = {}): BuiltBuilding {
  return makeAny(kind, opts) as BuiltBuilding;
}
/** Хашаа (khashaa) — барилга биш: хаалга/жижиг хаалга/слотууд */
export interface Khashaa { geo: Geo; gate: BuildingDoor; wicket: BuildingDoor; animalGate: BuildingDoor | null; dims: { w: number; d: number; h: number; gateW: number; wicketW: number };
  houseSlot(w: number, d: number): THREE.Vector3; toiletSlot(): { pos: THREE.Vector3; phi: number }; extraSlot(kind: string): { pos: THREE.Vector3; phi: number } | undefined; gerSlot(r: number): THREE.Vector3 }
export function makeKhashaa(opts: { season?: string; seed?: number; w?: number; d?: number; fenceColor?: string; gateColor?: string; groundAt?: (x: number, z: number) => number; animalGate?: boolean } = {}): Khashaa {
  return buildKhashaa(opts) as Khashaa;
}

function makeAny(kind: string, opts: Record<string, unknown>): unknown {
  const C = BUILDING_CONFIG;
  switch (kind) {
    case 'khashaa': return buildKhashaa(opts);
    case 'toilet': return buildToilet(opts);
    case 'woodshed': return buildWoodshed(opts);
    case 'animalShed': return buildAnimalShed(opts);
    case 'greenhouse': return buildGreenhouse(opts);
    case 'kennel': return buildKennel(opts);
    case 'milkWool': return buildMilkWool(opts);
    case 'carDealer': return buildCarDealer(opts);
    case 'fuel': return buildFuel(opts);
    case 'temple': return buildTemple(opts);
    case 'market': return buildMarket(opts);
    case 'stadium': return buildStadium(opts);
    case 'wrestle': return buildWrestle(opts);
  }
  if (C.shop.types[kind]) return buildShop(kind, opts);
  if (C.public.kinds[kind]) return buildPublic(kind, opts);
  const K = C.house[kind];
  if (!K) throw new Error('makeBuilding: тодорхойгүй төрөл ' + kind);
  return buildHouse(K, opts);
}

/** `src`-ийг Y тэнхлэгээр phi эргүүлж (x, y, z)-д `dst`-д нэмнэ (Geo.append нь y зөөдөггүй) */
export function appendAt(dst: Geo, src: Geo, phi: number, x: number, y: number, z: number): void {
  const i0 = dst.p.length;
  dst.append(src, phi, x, z);
  if (y !== 0) for (let i = i0 + 1; i < dst.p.length; i += 3) dst.p[i]! += y;
}

export interface BuildingMaterials {
  mat: THREE.MeshLambertMaterial;
  outlineMat: THREE.Material;
  /** 0 = өдөр … ~1.6 = шөнө (цонх, хаягийн самбар гэрэлтэнэ) */
  setGlow(k: number): void;
  dispose(): void;
}
/** Бүх барилгад нэг материал (атлас + vertex color + шөнийн emissive) + бэхэн хүрээ. DOM шаардана */
export function makeBuildingMaterials(): BuildingMaterials {
  const tex = buildingAtlas();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, map: tex.map, emissive: 0xffffff, emissiveMap: tex.emissiveMap, emissiveIntensity: 0 });
  const outlineMat = outlineMaterial(BUILDING_CONFIG.palette.outline, BUILDING_CONFIG.outlineW);
  return { mat, outlineMat, setGlow: (k) => { mat.emissiveIntensity = k; }, dispose: () => { mat.dispose(); outlineMat.dispose(); } };
}

export const emptyGeo = (): Geo => new Geo(px2uv(BUILDING_CONFIG.atlas.white[0], BUILDING_CONFIG.atlas.white[1]) as [number, number]);

export interface PlotSpec {
  /** houseA|houseB|houseC|gerYard|grandparents|relative1|relative2 */
  kind: string; season?: 'summer' | 'winter'; roofColor?: string; seed?: number; w?: number; d?: number; fenceColor?: string; gateColor?: string;
  /** Хашааны нэмэлт барилга: woodshed | animalShed | greenhouse */
  extras?: string[]; path?: 'walk' | 'dirt'; trees?: 'full' | 'bush'; kennel?: boolean; yard?: boolean; gerSize?: string;
  /** Гудамж хүртэлх шороон зам (м) */
  drive?: number; outline?: boolean;
}
export interface Plot {
  /** Хашаа, байшин, жорлон, нэмэлт барилга, зам, мод — хашааны локал координатад (төв 0,0; нүүр +Z) */
  geo: Geo;
  yard: Khashaa;
  toilet: BuiltBuilding;
  toiletSlot: { pos: THREE.Vector3; phi: number };
  toiletDoor: { position: THREE.Vector3; inward: THREE.Vector3 };
  house?: BuiltBuilding;
  ger?: GerBuilt;
  gers: { ger: GerBuilt; pos: THREE.Vector3 }[];
  /** Гол байшин/гэрийн хаалганы цэг (хашааны локал) */
  door: THREE.Vector3;
  chimney: THREE.Vector3;
  slot: THREE.Vector3;
  window?: THREE.Vector3;
  extras: { kind: string; b: BuiltBuilding; pos: THREE.Vector3; phi: number }[];
  plants: { kind: string; x: number; z: number; triangles: number }[];
  kennel?: { x: number; z: number; b: BuiltBuilding };
  porter?: { pos: THREE.Vector3; triangles: number };
  enterable: boolean;
}
/** Нэг айлын хашаа: байшин/гэр + хашаа + жорлон (+ нэмэлт). Гэр нь тусдаа mesh (`plot.gers`) */
export function makePlot(spec: PlotSpec): Plot { return makePlotRaw(spec) as unknown as Plot; }
