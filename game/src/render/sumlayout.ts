/**
 * Сумын төвийн 3D бүтээгч (V3.3, Могод сум). data/sumcenter.json-ийг Three.js-ийн low-poly Group болгоно.
 * Логикгүй (render): тоглоомын цэгүүд (хаалга, зогсоол) sim/systems/sumtown.ts-д. Бүх статик зүйл vertex color-той
 * 1–2 merged mesh болно (draw call цөөн); худалдаанд байгаа тээвэр тусдаа mesh (зарагдахад нууна).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { doorPoint, plotHouse, sumHeight, type SumLayout, type SumBuildingSpec, type SumSpecialPlotSpec, type SumXZ } from '../sim/systems/sumtown';

import type { CamSolids } from './camclip';
import { wallRing, type WalkConfig, type WalkSolids } from '../sim/systems/sumwalk';
import { TOWN, BUILDING_CONFIG as BC, appendAt, makePlot } from './building';
import { TownBuilder, labModel, gerSlotLocal } from './building/town';
import { GER } from './ger/config';
import { visualStyle } from './style';
import { GATE_PHI, houseFootprint, houseSlot, labOrigin, rotLocal, type TownEntry } from '../sim/systems/buildingSize';

type XZ = SumXZ;
type BuildingSpec = SumBuildingSpec;
export interface Rect { id: string; x: number; z: number; w: number; d: number }
/** Худалдаанд гаргасан тээврийн зогсоол */
export interface VehicleSlotView { id: string; vehicle: string; x: number; y: number; z: number; rot: number }
/** Хашаа байшингийн гол байшингийн хаалга (нохой, оршин суугч байрлуулахад) */
export interface HomeDoor { x: number; y: number; z: number }
export interface SumPlotView { id: string; role: SumSpecialPlotSpec['role']; x: number; z: number; door: HomeDoor }
export interface SumGer { x: number; y: number; z: number; color: string; r: number }
export interface SumCenterBuild {
  group: THREE.Group;
  /** Газар (raycast) */
  ground: THREE.Mesh;
  /** Худалдаанд байгаа тээвэр — зогсоолын id → mesh */
  vehicles: Map<string, THREE.Object3D>;
  vehicleSlots: VehicleSlotView[];
  plots: SumPlotView[];
  homes: HomeDoor[];
  /** Айлын гэрийн байрлал (V3.5: render/ger-ээр sumcenter.ts зурна) — y газрын өндөр, r хананы радиус */
  gers: SumGer[];
  /** Гудамжны гэрлийн шонгийн суурь (y — газрын өндөр); шөнийн гэрлийг sumcenter.ts асаана */
  lamps: { x: number; y: number; z: number }[];
  colliders: Rect[];
  /** Камерын мөргөлдөөн (V4.5 R7): барилга, гэрийн хайрцаг/цилиндр */
  solids: CamSolids;
  /** Алхалтын саад: барилга, гэр, хашааны хана (тоглогч, NPC түлхэгдэнэ) */
  walk: WalkSolids;
  /** V3.5: лабораторийн барилгууд (улирлаар нэг mesh-д угсарна) */
  town: TownBuilder;
  heightAt: (x: number, z: number) => number;
  /** V3.5: газар, зам, цөөрмийн улирлын өнгө (бууцны terrain-тай ижил палитр: visuals.json). straw 0–1 хуурайшилт, winter 0–1 цас */
  setLook: (season: 'summer' | 'autumn' | 'winter' | 'spring', straw: number, winter: number) => void;
  dispose: () => void;
}

// ---------- Туслах ----------
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
function mat(x: number, y: number, z: number, rotY = 0, sx = 1, sy = 1, sz = 1) {
  _q.setFromEuler(_e.set(0, rotY, 0));
  return _m.compose(_v.set(x, y, z), _q, _s.set(sx, sy, sz));
}

/** Олон geometry-г vertex color-той нэг mesh болгоно. */
class Batch {
  private geos: THREE.BufferGeometry[] = [];
  add(g: THREE.BufferGeometry, color: string | THREE.Color, m: THREE.Matrix4) {
    const gg = g.index ? g.toNonIndexed() : g.clone();
    g.dispose();
    gg.applyMatrix4(m);
    if (gg.getAttribute('uv')) gg.deleteAttribute('uv');
    if (!gg.getAttribute('normal')) gg.computeVertexNormals();
    const c = color instanceof THREE.Color ? color : new THREE.Color(color);
    const n = gg.getAttribute('position').count;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
    gg.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    this.geos.push(gg);
  }
  box(w: number, h: number, d: number, x: number, y: number, z: number, rot: number, color: string) {
    this.add(new THREE.BoxGeometry(w, h, d), color, mat(x, y + h / 2, z, rot));
  }
  cyl(rTop: number, rBot: number, h: number, x: number, y: number, z: number, color: string, seg = 8, open = false) {
    this.add(new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open), color, mat(x, y + h / 2, z));
  }
  mesh(material: THREE.Material, name: string) {
    if (!this.geos.length) return null;
    const g = mergeGeometries(this.geos, false)!;
    this.geos.forEach(x => x.dispose());
    this.geos = [];
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, material);
    m.name = name;
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
}

/** Гурвалжин дээвэр (нуруу нь x тэнхлэгийн дагуу). */
function gableGeometry(w: number, d: number, rise: number) {
  const hw = w / 2, hd = d / 2;
  const A = [-hw, 0, -hd], B = [hw, 0, -hd], C = [hw, 0, hd], D = [-hw, 0, hd];
  const E = [-hw, rise, 0], F = [hw, rise, 0];
  const tris = [
    A, F, B, A, E, F, // хойд налуу
    D, C, F, D, F, E, // урд налуу
    A, D, E, // гэрэлтүүлэгч (зүүн)
    B, F, C, // баруун
  ];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(tris.flat(), 3));
  g.computeVertexNormals();
  return g;
}

function nearestOnPolyline(px: number, pz: number, pts: XZ[]): XZ {
  let best: XZ = pts[0]!, bd = Infinity;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!, b = pts[i + 1]!;
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((px - a[0]) * dx + (pz - a[1]) * dz) / l2));
    const q: XZ = [a[0] + t * dx, a[1] + t * dz];
    const d = Math.hypot(q[0] - px, q[1] - pz);
    if (d < bd) { bd = d; best = q; }
  }
  return best;
}
function rectsOverlap(a: Rect, b: Rect, margin = 0) {
  return Math.abs(a.x - b.x) * 2 < a.w + b.w + margin * 2 && Math.abs(a.z - b.z) * 2 < a.d + b.d + margin * 2;
}
function rectNearPolyline(r: Rect, pts: XZ[], clearance: number) {
  // тэгш өнцөгтийн төв ба 4 буланг шалгана + замын цэгүүд тэгш өнцөгт дотор байгаа эсэх
  const hw = r.w / 2 + clearance, hd = r.d / 2 + clearance;
  for (const [x, z] of pts) if (Math.abs(x - r.x) < hw && Math.abs(z - r.z) < hd) return true;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i]!, b = pts[i + 1]!;
    const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3);
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
      if (Math.abs(x - r.x) < hw && Math.abs(z - r.z) < hd) return true;
    }
  }
  return false;
}

// ---------- Үндсэн бүтээгч ----------
export function buildSumCenter(L: SumLayout, opts: { seed?: number; quality?: 'low' | 'mid' | 'high'; walk: Pick<WalkConfig, 'fenceT' | 'plotGateW'> }): SumCenterBuild {
  const rand = rng(opts.seed ?? 1);
  const quality = opts.quality ?? 'high';
  const group = new THREE.Group();
  group.name = `sumcenter:${L.id}`;
  const homes: HomeDoor[] = [];
  const colliders: Rect[] = [];
  const solids: CamSolids = { boxes: [], cyls: [] };
  const walk: WalkSolids = { boxes: [], cyls: [] };
  const WK = opts.walk;   // data/worldmap.json sum3d.walk
  const disposables: { dispose(): void }[] = [];
  const FH = L.floorHeight;
  const roadPts = L.roads.map(r => ({ r, pts: r.points as XZ[] }));

  // --- Газрын өндөр (sim/systems/sumtown.ts — sim ба render нэг томьёо) ---
  const mt = L.terrain.mountain;
  const heightAt = (x: number, z: number): number => sumHeight(L, x, z);

  // --- Газар ---
  let terrainMesh!: THREE.Mesh;
  let paintTerrain: (season: 'summer' | 'autumn' | 'winter' | 'spring', straw: number, winter: number) => void = () => {};
  {
    const [W, D] = L.terrain.size;
    const seg = quality === 'low' ? 100 : 160;
    const g = new THREE.PlaneGeometry(W, D, seg, Math.round((seg * D) / W));
    g.rotateX(-Math.PI / 2);
    const pos = g.getAttribute('position');
    const col = new Float32Array(pos.count * 3);
    const cG = new THREE.Color(L.terrain.ground), cM = new THREE.Color(mt.color), cDry = new THREE.Color('#B7A57A');
    const tmp = new THREE.Color();
    const nz = new Float32Array(pos.count), hh = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = heightAt(x, z);
      pos.setY(i, h);
      hh[i] = h;
      nz[i] = 0.5 + 0.5 * Math.sin(x * 0.13 + z * 0.09) * Math.cos(z * 0.11 - x * 0.05);
    }
    const P = visualStyle.palette, cAutumn = new THREE.Color(P.autumnGrass), cSpring = new THREE.Color(P.dryGrass).lerp(new THREE.Color(P.dirt), 0.45), cSnow = new THREE.Color(P.snow), cShade = new THREE.Color(P.snowShadow);
    paintTerrain = (season, straw, winter) => {
      const cStraw = season === 'autumn' ? cAutumn : season === 'summer' ? cDry : cSpring;   // намар шаргал, хавар хүрэн
      for (let i = 0; i < pos.count; i++) {
        const h = hh[i]!;
        tmp.copy(cG).lerp(cDry, 0.12 * nz[i]!);
        tmp.lerp(cStraw, Math.min(1, straw) * 0.85);
        if (h > 0) tmp.lerp(cM, Math.min(1, h / (mt.peak * 0.5)));
        if (winter > 0) tmp.lerp(cSnow, Math.min(1, winter) * (h > 0 ? 0.9 : 0.94)).lerp(cShade, 0.06 * nz[i]! * winter);   // цас: талбай, уулын энгэр
        col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
      }
      (g.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    };
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    paintTerrain('summer', 0, 0);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    m.name = 'terrain';
    terrainMesh = m;
    m.receiveShadow = true;
    group.add(m);
    disposables.push(g, m.material as THREE.Material);
  }

  const B = new Batch();     // зам, хашлага, жижиг зүйл, хуучин хайрцаг барилга — нэг mesh
  const town = new TownBuilder();   // V3.5: лабораторийн барилга, хашаа байшин — улирал бүрт нэг mesh (render/building)
  const ribbon = (pts: XZ[], width: number, color: string, lift: number, T: Batch = B) => {
    const c = new THREE.Color(color);
    const verts: number[] = [];
    const dense: XZ[] = [];
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i]!, b = pts[i + 1]!;
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4));
      for (let s = 0; s < n; s++) dense.push([a[0] + ((b[0] - a[0]) * s) / n, a[1] + ((b[1] - a[1]) * s) / n]);
    }
    dense.push(pts[pts.length - 1]!);
    for (let i = 0; i + 1 < dense.length; i++) {
      const a = dense[i]!, b = dense[i + 1]!;
      const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1;
      const nx = (-dz / l) * width / 2, nz = (dx / l) * width / 2;
      const p = (x: number, z: number) => [x, heightAt(x, z) + lift, z];
      const a1 = p(a[0] + nx, a[1] + nz), a2 = p(a[0] - nx, a[1] - nz), b1 = p(b[0] + nx, b[1] + nz), b2 = p(b[0] - nx, b[1] - nz);
      verts.push(...a1, ...b2, ...a2, ...a1, ...b1, ...b2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.computeVertexNormals();
    T.add(g, c, mat(0, 0, 0));
  };

  // --- Зам, хуурай гол, нуур: улирлаар өнгө солигддог тул тусдаа mesh (setLook) ---
  const decalMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  disposables.push(decalMat);
  let decalMesh: THREE.Mesh | null = null, lookKey = '';
  const buildDecals = (straw: number, winter: number): void => {
    const D = new Batch(), P = visualStyle.palette, snow = new THREE.Color(P.snow);
    const tint = (hex: string, k: number): THREE.Color => new THREE.Color(hex).lerp(snow, Math.min(1, k));
    ribbon(L.terrain.dryWash.points, L.terrain.dryWash.width, '#B9AE96', 0.04, D);
    for (const r of L.roads) ribbon(r.points, r.width, '#' + tint('#8B6F55', winter * 0.62 + straw * 0.0).getHexString(), 0.08, D);
    for (const lk of L.terrain.lakes) {
      const shape = new THREE.Shape();
      shape.absellipse(0, 0, lk.rx, lk.rz, 0, Math.PI * 2, false, 0);
      const g = new THREE.ShapeGeometry(shape, 32);
      g.rotateX(-Math.PI / 2);
      D.add(g, tint(lk.color, winter * 0.7), mat(lk.x, 0.12, lk.z));   // өвөл мөстэнө
      const shore = new THREE.Shape();
      shore.absellipse(0, 0, lk.rx + 4, lk.rz + 3, 0, Math.PI * 2, false, 0);
      const gs = new THREE.ShapeGeometry(shore, 32);
      gs.rotateX(-Math.PI / 2);
      D.add(gs, tint('#C9C2A6', winter * 0.9), mat(lk.x, 0.06, lk.z));
    }
    if (decalMesh) { group.remove(decalMesh); decalMesh.geometry.dispose(); }
    decalMesh = D.mesh(decalMat, 'sumcenter-decals');
    if (decalMesh) { decalMesh.castShadow = false; group.add(decalMesh); }
  };
  const setLook = (season: 'summer' | 'autumn' | 'winter' | 'spring', straw: number, winter: number): void => {
    const key = season + Math.round(straw * 20) + '|' + Math.round(winter * 20);
    if (key === lookKey) return;
    lookKey = key;
    paintTerrain(season, straw, winter);
    buildDecals(straw, winter);
  };

  // --- Хашаа (банзан хашаа, хаалгатай) ---
  const fence = (x: number, z: number, w: number, d: number, color: string, h = 1.8, gateSide: 'n' | 's' | 'e' | 'w' = 's', gate = 4, gateOff = 0) => {
    const y = heightAt(x, z), t = 0.15;
    const side = (sx: number, sz: number, len: number, horiz: boolean, hasGate: boolean) => {
      if (!hasGate) {
        B.box(horiz ? len : t, h, horiz ? t : len, sx, y, sz, 0, color);
        return;
      }
      // хаалганы 2 талын хэсэг (gateOff — хаалгыг төвөөс зөөх)
      const a = (len - gate) / 2 + gateOff, b = (len - gate) / 2 - gateOff;
      const ca = -len / 2 + a / 2, cb = len / 2 - b / 2;
      if (horiz) { B.box(a, h, t, sx + ca, y, sz, 0, color); B.box(b, h, t, sx + cb, y, sz, 0, color); }
      else { B.box(t, h, a, sx, y, sz + ca, 0, color); B.box(t, h, b, sx, y, sz + cb, 0, color); }
    };
    wallRing(walk.boxes, x, z, w, d, gateSide, gate, gateOff, WK.fenceT);
    side(x, z - d / 2, w, true, gateSide === 'n');
    side(x, z + d / 2, w, true, gateSide === 's');
    side(x - w / 2, z, d, false, gateSide === 'w');
    side(x + w / 2, z, d, false, gateSide === 'e');
  };
  const faceTowardRoad = (x: number, z: number): 'n' | 's' | 'e' | 'w' => {
    let best: XZ = [x, z + 1], bd = Infinity;
    for (const { pts } of roadPts) {
      const q = nearestOnPolyline(x, z, pts);
      const d = Math.hypot(q[0] - x, q[1] - z);
      if (d < bd) { bd = d; best = q; }
    }
    const dx = best[0] - x, dz = best[1] - z;
    return Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'e' : 'w') : (dz > 0 ? 's' : 'n');
  };

  // --- Гэр ---
  const gers: SumGer[] = [];
  const ger = (x: number, z: number, color = '#F3EDE2', r = 3.2) => {
    gers.push({ x, y: heightAt(x, z), z, color, r });
    walk.cyls.push({ x, z, r: r + 0.2 });
    solids.cyls.push({ x, z, r: r + 0.3, y0: heightAt(x, z) - 2, y1: heightAt(x, z) + 3.4 });   // хаалга урагшаа (+z); загвар — sumcenter.ts (makeGer)
  };

  // --- V3.5 лабораторийн барилга ---
  const GER_R = GER.sizes.small4!.diameter / 2;
  const houseTop = (kind: string): number => { const K = BC.house[BC.special[kind]?.base ?? kind]; return K.wallH + (K.d / 2) * K.roofPitch + K.roofLift + K.chimney.rise + 0.4; };
  /** Нийлмэл талбай: (x, z)-д лабораторийн загвар, rot градус */
  const labAt = (e: TownEntry, x: number, z: number): { top: number } => {
    const phi = -((e.rot ?? 0) * Math.PI) / 180, y = heightAt(x, z), probe = labModel(e, 'summer');
    town.add((season, out, wheels) => {
      const m = labModel(e, season);
      appendAt(out, m.geo, phi, x, y, z);
      for (const w of m.wheels ?? []) { const r = rotLocal(w.position.x, w.position.z, e.rot ?? 0); wheels.push({ geo: w.geo, x: x + r.x, y: y + w.position.y, z: z + r.z, yaw: phi, style: w.style }); }
    });
    return { top: probe.dims.ridgeH };
  };
  const labBuilding = (b: BuildingSpec, e: TownEntry): HomeDoor => {
    const o = labOrigin(e, b), hw = b.w / 2, hd = b.d / 2;
    const hs = [heightAt(b.x - hw, b.z - hd), heightAt(b.x + hw, b.z - hd), heightAt(b.x - hw, b.z + hd), heightAt(b.x + hw, b.z + hd), heightAt(b.x, b.z)];
    const y0 = Math.max(...hs), yMin = Math.min(...hs);
    if (y0 - yMin > 0.02) B.box(b.w + 0.1, y0 - yMin + 0.6, b.d + 0.1, b.x, yMin - 0.6, b.z, 0, BC.palette.plinth);   // налуу газар: суурь
    const phi = -((e.rot ?? 0) * Math.PI) / 180, probe = labModel(e, 'summer');
    town.add((season, out, wheels) => {
      const m = labModel(e, season);
      appendAt(out, m.geo, phi, o.x, y0, o.z);
      for (const w of m.wheels ?? []) { const r = rotLocal(w.position.x, w.position.z, e.rot ?? 0); wheels.push({ geo: w.geo, x: o.x + r.x, y: y0 + w.position.y, z: o.z + r.z, yaw: phi, style: w.style }); }
    });
    colliders.push({ id: b.id, x: b.x, z: b.z, w: b.w, d: b.d });
    walk.boxes.push({ x: b.x, z: b.z, hw, hd });
    solids.boxes.push({ x: b.x, z: b.z, hw, hd, rot: 0, y0: yMin - 2, y1: y0 + probe.dims.ridgeH });
    if (b.yard) {
      const yx = b.x + (b.yard.dx ?? 0), yz = b.z + (b.yard.dz ?? 0);
      fence(yx, yz, b.yard.w, b.yard.d, b.yard.fence, 1.3, b.front ?? 's', 6);
      colliders.push({ id: b.id + ':yard', x: yx, z: yz, w: b.yard.w, d: b.yard.d });
    }
    const dp = doorPoint(b);
    return { x: dp.x, y: y0, z: dp.z };
  };
  /** Нэг айлын хашаа (лабораторийн makePlot): хашааны төв (x, z), хаалганы чиглэл gate. Орчуулга: хашааны локал нүүр +Z */
  const plotLab = (o: { x: number; z: number; w: number; d: number; gate: 'n' | 's' | 'e' | 'w'; kind: string; seed: number; roofColor?: string; extras?: string[];
    path?: 'walk' | 'dirt'; trees?: 'full' | 'bush'; kennel?: boolean; fenceColor: string; gateColor: string; gerColor?: string }): HomeDoor => {
    wallRing(walk.boxes, o.x, o.z, o.w, o.d, o.gate, WK.plotGateW, 0, WK.fenceT);   // айлын хашаа: хаалга төвд (building/yard.ts gateX = 0)
    const vertical = o.gate === 'e' || o.gate === 'w', lw = vertical ? o.d : o.w, ld = vertical ? o.w : o.d, phi = GATE_PHI[o.gate], y = heightAt(o.x, o.z);
    const c = Math.cos(phi), s = Math.sin(phi), toW = (lx: number, lz: number) => ({ x: o.x + lx * c + lz * s, z: o.z - lx * s + lz * c });
    town.add((season, out) => {
      const p = makePlot({ kind: o.kind, season, roofColor: o.roofColor, seed: o.seed, w: lw, d: ld, fenceColor: o.fenceColor, gateColor: o.gateColor, extras: o.extras, path: o.path, trees: o.trees, kennel: o.kennel, yard: true });
      appendAt(out, p.geo, phi, o.x, y, o.z);
      for (const g of p.gers) g.ger.dispose();   // гэр нь айлын гэрийн нэгдсэн mesh-ээр (sumcenter.ts buildGers)
    });
    if (o.kind === 'gerYard') {
      const gs = gerSlotLocal(lw, ld, GER_R), g = toW(gs.x, gs.z), dd = toW(gs.x, gs.z + GER_R + 1.4);
      ger(g.x, g.z, o.gerColor ?? '#F3EDE2', GER_R);
      return { x: dd.x, y, z: dd.z };
    }
    const base = BC.special[o.kind]?.base ?? o.kind, hf = houseFootprint(base), sl = houseSlot(lw, ld, hf.w, hf.d);
    const dw = toW(sl.x + hf.door.x, sl.z + hf.door.z), hc = toW(sl.x, sl.z);
    walk.boxes.push({ x: hc.x, z: hc.z, hw: (vertical ? hf.d : hf.w) / 2, hd: (vertical ? hf.w : hf.d) / 2 });
    solids.boxes.push({ x: hc.x, z: hc.z, hw: (vertical ? hf.d : hf.w) / 2, hd: (vertical ? hf.w : hf.d) / 2, rot: 0, y0: y - 2, y1: y + houseTop(o.kind) });
    return { x: dw.x, y, z: dw.z };
  };

  // --- Барилга ---
  /** Барилга зурна; хаалганы гаднах цэгийг буцаана (sim-ийн doorPoint-той ижил) */
  const building = (b: BuildingSpec): HomeDoor => {
    if (TOWN.skip.includes(b.id)) { const sp = doorPoint(b); return { x: sp.x, y: heightAt(sp.x, sp.z), z: sp.z }; }   // нийлмэл загварт орсон (market)
    const lab = TOWN.byId[b.id];
    if (lab) return labBuilding(b, lab);
    const rot = b.rot ?? 0;
    const h = b.h ?? b.floors * FH;
    const y0 = Math.max(heightAt(b.x - b.w / 2, b.z - b.d / 2), heightAt(b.x + b.w / 2, b.z + b.d / 2), heightAt(b.x, b.z));
    const yMin = Math.min(heightAt(b.x - b.w / 2, b.z - b.d / 2), heightAt(b.x + b.w / 2, b.z + b.d / 2));
    const plinth = 0.5 + (y0 - yMin);
    B.box(b.w + 0.3, plinth, b.d + 0.3, b.x, y0 - plinth + 0.5, b.z, rot, b.trim ?? '#9C8E7A');
    const base = y0 + 0.5;
    B.box(b.w, h, b.d, b.x, base, b.z, rot, b.wall);
    const top = base + h;
    const ov = 0.6;
    const rc = b.roof.color;
    if (b.roof.type === 'flat') {
      B.box(b.w + 0.4, 0.5, b.d + 0.4, b.x, top, b.z, rot, rc);
    } else if (b.roof.type === 'gable') {
      const along = b.w >= b.d;
      const g = gableGeometry(along ? b.w + ov : b.d + ov, along ? b.d + ov : b.w + ov, Math.min(b.w, b.d) * 0.38);
      B.add(g, rc, mat(b.x, top, b.z, rot + (along ? 0 : Math.PI / 2)));
    } else {
      // 4 талт конусыг 45° эргүүлж дөрвөлжин суурьтай болгоод, дараа нь w×d-д сунгана
      const cone = (w: number, d: number, hh: number, y: number) =>
        B.add(new THREE.ConeGeometry(Math.SQRT2, hh, 4).rotateY(Math.PI / 4), rc, mat(b.x, y + hh / 2, b.z, rot, (w + ov) / 2, 1, (d + ov) / 2));
      if (b.roof.type === 'hip') cone(b.w, b.d, Math.min(b.w, b.d) * 0.35, top);
      else { // pagoda: 2 давхар дээвэр + оргил
        cone(b.w * 1.25, b.d * 1.25, 2.2, top);
        B.box(b.w * 0.55, 1.6, b.d * 0.55, b.x, top + 1.2, b.z, rot, b.wall);
        cone(b.w * 0.8, b.d * 0.8, 2.4, top + 2.8);
        B.cyl(0.15, 0.3, 1.6, b.x, top + 5, b.z, '#D9A441', 6);
      }
    }
    // Цонх, хаалга
    const front = b.front ?? 's'; // монгол заншлаар нүүр нь урагшаа (өмнө зүг)
    const winColor = '#3D4F5C';
    const floors = b.floors;
    const along = (len: number) => Math.max(1, Math.floor((len - 2) / 3.6));
    const placeWin = (horiz: boolean, sign: number) => {
      const len = horiz ? b.w : b.d;
      const n = along(len);
      for (let f = 0; f < floors; f++) {
        const wy = base + f * (h / floors) + (h / floors) * 0.35;
        for (let i = 0; i < n; i++) {
          const t = ((i + 0.5) / n - 0.5) * (len - 2);
          if (horiz) B.box(1.2, 1.3, 0.12, b.x + t, wy, b.z + sign * (b.d / 2 + 0.03), 0, winColor);
          else B.box(0.12, 1.3, 1.2, b.x + sign * (b.w / 2 + 0.03), wy, b.z + t, 0, winColor);
        }
      }
    };
    if (b.w >= 6) { placeWin(true, 1); placeWin(true, -1); }
    if (b.d >= 10) { placeWin(false, 1); placeWin(false, -1); }
    const doorOff: XZ = { n: [0, -b.d / 2 - 0.08] as XZ, s: [0, b.d / 2 + 0.08] as XZ, e: [b.w / 2 + 0.08, 0] as XZ, w: [-b.w / 2 - 0.08, 0] as XZ }[front];
    const dx = b.x + doorOff[0], dz = b.z + doorOff[1];
    const horizDoor = front === 'n' || front === 's';
    B.box(horizDoor ? 1.6 : 0.16, 2.2, horizDoor ? 0.16 : 1.6, dx, base, dz, 0, '#5C3A24');
    if (b.chimney) B.cyl(0.8, 1.1, b.chimney.h, b.x + b.chimney.dx, base, b.z + b.chimney.dz, '#7A746C', 8);
    colliders.push({ id: b.id, x: b.x, z: b.z, w: b.w, d: b.d });
    walk.boxes.push({ x: b.x, z: b.z, hw: b.w / 2, hd: b.d / 2 });
    solids.boxes.push({ x: b.x, z: b.z, hw: b.w / 2, hd: b.d / 2, rot, y0: yMin - 2, y1: base + h + (b.roof.type === 'pagoda' ? 6 : b.roof.type === 'flat' ? 1 : Math.min(b.w, b.d) * 0.4) });
    const dp = doorPoint(b);
    const door: HomeDoor = { x: dp.x, y: base, z: dp.z };
    if (b.yard) {
      const yx = b.x + (b.yard.dx ?? 0), yz = b.z + (b.yard.dz ?? 0);
      fence(yx, yz, b.yard.w, b.yard.d, b.yard.fence, 1.3, front, 6);
      colliders.push({ id: b.id + ':yard', x: yx, z: yz, w: b.yard.w, d: b.yard.d });
      if (b.yard.animals) animals(yx, yz + b.yard.d * 0.25, b.yard.w * 0.6, b.yard.d * 0.25, b.yard.animals);
    }
    return door;
  };

  // --- Мал (энгийн low-poly) ---
  const animals = (cx: number, cz: number, w: number, d: number, n: number) => {
    for (let i = 0; i < n; i++) {
      const x = cx + (rand() - 0.5) * w, z = cz + (rand() - 0.5) * d, y = heightAt(x, z);
      const r = rand() * Math.PI * 2;
      const cow = rand() < 0.35;
      const col = cow ? (rand() < 0.5 ? '#5C3A24' : '#2B2B2B') : '#EDE8DC';
      const [bw, bh, bd] = cow ? [1.9, 0.9, 0.8] : [1.1, 0.6, 0.6];
      B.box(bw, bh, bd, x, y + (cow ? 0.6 : 0.35), z, r, col);
      B.box(bw * 0.3, bh * 0.6, bd * 0.7, x + Math.cos(r) * bw * 0.6, y + (cow ? 1.0 : 0.6), z - Math.sin(r) * bw * 0.6, r, cow ? col : '#3A3226');
    }
  };

  for (const b of L.buildings) building(b);

  // --- Хашаатай цогцолбор ---
  for (const c of L.compounds) {
    const gate = c.gate ?? faceTowardRoad(c.x, c.z);
    fence(c.x, c.z, c.w, c.d, c.fence, 1.6, gate, 6, c.gateOffset ?? 0);
    colliders.push({ id: c.id + ':yard', x: c.x, z: c.z, w: c.w, d: c.d });
    const lc = TOWN.compounds[c.id];
    if (lc) labAt(lc, c.x, c.z);   // малын зах: хороо, саравч, налуу (лаборатори)
    c.buildings?.forEach(building);
    c.gers?.forEach(([x, z]) => ger(x, z));
    c.solar?.forEach(([x, z]) => {
      const y = heightAt(x, z);
      B.box(0.15, 1, 0.15, x, y, z, 0, '#555');
      B.add(new THREE.BoxGeometry(4, 0.1, 2.2), '#2E3F66', mat(x, y + 1.2, z, 0).multiply(new THREE.Matrix4().makeRotationX(-0.5)));
    });
    c.pens?.forEach(([x, z, w, d]) => fence(x, z, w, d, '#7A5A3E', 1.1, 's', 3));
    if (c.animals) animals(c.x, c.z, c.w * 0.75, c.d * 0.6, c.animals);
  }

  // --- Талбай ---
  for (const f of L.fields) {
    const y = heightAt(f.x, f.z);
    const lf = TOWN.fields[f.id];
    if (lf) {   // V3.5: тоглоомын, бөхийн талбай — лабораторийн загвар
      labAt(lf, f.x, f.z);
      const lot = (BC[lf.type === 'stadium' ? 'stadium' : 'wrestle'].lot as [number, number]);
      if (f.kind === 'wrestling') colliders.push({ id: f.id, x: f.x, z: f.z, w: lot[0] * 0.5, d: lot[1] * 0.5 });
      continue;
    }
    if (f.kind === 'football') {
      const w = f.w!, d = f.d!;
      if (f.track) {
        const ring = new THREE.RingGeometry(0.78, 1, 40);
        ring.rotateX(-Math.PI / 2);
        B.add(ring, '#A0573E', mat(f.x, y + 0.1, f.z, 0, w * 0.62, 1, d * 0.75));
      }
      B.box(w * 0.82, 0.1, d * 0.85, f.x, y + 0.05, f.z, 0, '#6FA35A');
      B.box(0.25, 0.12, d * 0.85, f.x, y + 0.08, f.z, 0, '#F3EDE2');
      const ringC = new THREE.RingGeometry(4, 4.3, 24);
      ringC.rotateX(-Math.PI / 2);
      B.add(ringC, '#F3EDE2', mat(f.x, y + 0.2, f.z));
      for (const s of [-1, 1]) {
        B.box(0.2, 2.4, 7.3, f.x + s * w * 0.41, y, f.z, 0, '#F3EDE2');
      }
    } else {
      const r = f.r!;
      B.cyl(r, r, 0.15, f.x, y, f.z, '#D8C38E', 24);
      // тойрсон тавцан (2 шат)
      B.add(new THREE.CylinderGeometry(r + 4, r + 4, 1.6, 24, 1, true), '#8A2E2E', mat(f.x, y + 0.8, f.z));
      B.add(new THREE.CylinderGeometry(r + 7, r + 7, 3.2, 24, 1, true), '#A0522D', mat(f.x, y + 1.6, f.z));
      B.add(new THREE.RingGeometry(r + 4, r + 7, 24).rotateX(-Math.PI / 2), '#C9B998', mat(f.x, y + 1.6, f.z));
      B.add(new THREE.RingGeometry(r + 0.2, r + 4, 24).rotateX(-Math.PI / 2), '#B5A37C', mat(f.x, y + 0.6, f.z));
      colliders.push({ id: f.id, x: f.x, z: f.z, w: (r + 7) * 2, d: (r + 7) * 2 });
    }
  }

  // --- Тээврийн хэрэгсэл (low-poly). Тусдаа Batch → зарагдахад нуух боломжтой ---
  const vehicles = new Map<string, THREE.Object3D>();
  const vehicleSlots: VehicleSlotView[] = [];
  const vehMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  disposables.push(vehMat);
  const buildVehicle = (kind: string) => {
    const V = new Batch();
    const wheel = (x: number, z: number, r: number, w = 0.3) => {
      const g = new THREE.CylinderGeometry(r, r, w, 10);
      g.rotateX(Math.PI / 2);
      V.add(g, '#1E1E1E', mat(x, r, z));
    };
    if (kind === 'horseCart') {
      // морин тэрэг: тавцан, хоёр дугуй, туурга
      V.box(1.6, 0.25, 2.6, 0, 0.75, 0, 0, '#8A5A3A');
      V.box(0.08, 0.5, 2.6, -0.78, 1.0, 0, 0, '#6B4F3A');
      V.box(0.08, 0.5, 2.6, 0.78, 1.0, 0, 0, '#6B4F3A');
      V.box(0.08, 0.08, 2.2, -0.35, 0.8, -2.3, 0, '#6B4F3A');
      V.box(0.08, 0.08, 2.2, 0.35, 0.8, -2.3, 0, '#6B4F3A');
      const g = new THREE.CylinderGeometry(0.75, 0.75, 0.12, 12); g.rotateZ(Math.PI / 2);
      V.add(g, '#5C3A24', mat(-0.95, 0.75, 0.2));
      const g2 = new THREE.CylinderGeometry(0.75, 0.75, 0.12, 12); g2.rotateZ(Math.PI / 2);
      V.add(g2, '#5C3A24', mat(0.95, 0.75, 0.2));
    } else if (kind === 'milkTanker') {
      // сүүний машин: цагаан кабин, мөнгөлөг цилиндр сав, цэнхэр судал
      const len = 6.2, wid = 2.1;
      V.box(wid, 1.3, 1.7, 0, 0.6, -len / 2 + 0.85, 0, '#F2F2F0');
      V.box(wid * 0.98, 0.6, 1.4, 0, 1.9, -len / 2 + 0.9, 0, '#F2F2F0');
      V.box(wid * 0.9, 0.5, 0.06, 0, 1.95, -len / 2 + 0.18, 0, '#30404A');
      V.box(wid, 0.25, len - 1.8, 0, 0.6, 0.9, 0, '#3A3A3A');
      const tank = new THREE.CylinderGeometry(1.0, 1.0, len - 2.2, 14); tank.rotateX(Math.PI / 2);
      V.add(tank, '#D8DCDF', mat(0, 1.85, 0.95));
      const stripe = new THREE.CylinderGeometry(1.02, 1.02, 0.35, 14); stripe.rotateX(Math.PI / 2);
      V.add(stripe, '#2E6FB0', mat(0, 1.85, 0.95));
      V.box(0.5, 0.25, 0.5, 0, 2.9, 0.95, 0, '#B5B5B5');           // таг
      for (const sx of [-1, 1]) {
        wheel(sx * (wid / 2 - 0.15), -len / 2 + 1, 0.45);
        wheel(sx * (wid / 2 - 0.15), len / 2 - 1.3, 0.45);
        wheel(sx * (wid / 2 - 0.15), len / 2 - 0.4, 0.45);
      }
    } else {
      const porter = kind === 'porter';
      const cab = porter ? '#2E5C9A' : '#F2F2F0';
      const len = porter ? 5.0 : 4.4, wid = porter ? 1.75 : 1.65;
      // кабин урд (-z), тэвш ард
      V.box(wid, 1.15, 1.5, 0, 0.55, -len / 2 + 0.75, 0, cab);
      V.box(wid * 0.98, 0.55, 1.2, 0, 1.7, -len / 2 + 0.8, 0, cab);
      V.box(wid * 0.9, 0.45, 0.06, 0, 1.75, -len / 2 + 0.17, 0, '#30404A'); // салхины шил
      V.box(wid, 0.2, len - 1.6, 0, 0.6, 0.8, 0, '#3A3A3A');               // явах эд анги
      V.box(wid + 0.05, 0.45, len - 1.7, 0, 0.8, 0.85, 0, porter ? '#C9C9C9' : '#E6E6E2'); // тэвш
      V.box(wid * 0.96, 0.15, 0.05, 0, 0.65, -len / 2 - 0.01, 0, '#BBBBBB');
      for (const sx of [-1, 1]) {
        wheel(sx * (wid / 2 - 0.15), -len / 2 + 0.9, 0.38);
        wheel(sx * (wid / 2 - 0.15), len / 2 - 0.9, 0.38);
      }
    }
    return V.mesh(vehMat, `vehicle:${kind}`)!;
  };

  // --- Жижиг зүйлс ---
  const temple = L.buildings.find(b => b.id === 'temple'), templeEntry = temple ? TOWN.byId[temple.id] : undefined;
  const templeYard = temple && templeEntry ? { o: labOrigin(templeEntry, temple), w: BC.temple.yard[0] as number, d: BC.temple.yard[1] as number } : null;
  for (const p of L.props) {
    const y = heightAt(p.x, p.z);
    const n = (k: string, d = 0) => (p[k] as number) ?? d;
    if (templeYard && (p.kind === 'stupa' || p.kind === 'ger') && Math.abs(p.x - templeYard.o.x) < templeYard.w / 2 && Math.abs(p.z - templeYard.o.z) < templeYard.d / 2) {
      if (p.kind === 'ger') ger(templeYard.o.x + templeYard.w / 2 + 4.5, p.z, '#F3EDE2', 2.8);   // суварга лабораторийн дуганы хашаанд орсон; гэр хашааны гадна (S1-ийн гэр)
      continue;
    }
    const lp = TOWN.props[p.kind];
    if (lp) {   // V3.5: колонк — лабораторийн загвар (халхавч, түгээгүүр, касс, үнийн шон)
      labAt(lp, p.x, p.z);
      const K = BC.fuel.kiosk, kw = BC.shop.types.fuelKiosk;
      colliders.push({ id: (p.id as string) ?? 'fuel', x: p.x + K.x, z: p.z + K.z, w: kw.w, d: kw.d });
      walk.boxes.push({ x: p.x + K.x, z: p.z + K.z, hw: kw.w / 2, hd: kw.d / 2 });
      solids.boxes.push({ x: p.x + K.x, z: p.z + K.z, hw: kw.w / 2, hd: kw.d / 2, rot: 0, y0: y - 2, y1: y + kw.wallH + 1 });
      continue;
    }
    switch (p.kind) {
      case 'flagpole':
        B.cyl(0.08, 0.12, n('h', 10), p.x, y, p.z, '#C9C9C9', 6);
        B.box(2, 1.2, 0.05, p.x + 1, y + n('h', 10) - 1.4, p.z, 0, '#C8102E');
        break;
      case 'monument':
        B.box(2, 0.6, 2, p.x, y, p.z, 0, '#9C958A');
        B.box(1, 3, 1, p.x, y + 0.6, p.z, 0, '#B9B2A6');
        break;
      case 'plaza':
        B.box(n('w'), 0.12, n('d'), p.x, y, p.z, 0, (p.color as string) ?? '#9C958A');
        break;
      case 'gazebo': {
        const r = n('r', 3);
        B.cyl(r, r, 1, p.x, y, p.z, '#B5633F', 6, true);
        B.add(new THREE.ConeGeometry(r * 1.2, 1.6, 6), (p.color as string) ?? '#8A5A3A', mat(p.x, y + 2.8, p.z));
        for (let i = 0; i < 6; i++) B.cyl(0.1, 0.1, 2, p.x + Math.cos((i * Math.PI) / 3) * r, y, p.z + Math.sin((i * Math.PI) / 3) * r, '#5C3A24', 4);
        break;
      }
      case 'playground': {
        const w = n('w'), d = n('d');
        B.box(w, 0.06, d, p.x, y, p.z, 0, '#C9B998');
        B.box(1.2, 2, 3, p.x - w / 4, y, p.z - d / 4, 0, '#E04A2E'); // гулгуур
        B.box(3, 2.2, 0.15, p.x + w / 4, y, p.z, 0, '#3A5FB0');   // савлуур
        B.cyl(1.4, 1.4, 0.5, p.x, y, p.z + d / 4, '#E0C23A', 10); // элсэн тоглоом
        B.box(2, 0.6, 0.6, p.x - w / 4, y, p.z + d / 3, 0.6, '#3F9E6E');
        break;
      }
      case 'gardenBeds':
        for (let i = 0; i < 3; i++) B.box(n('w') / 3 - 1, 0.25, n('d'), p.x + (i - 1) * (n('w') / 3), y, p.z, 0, '#5E7A3C');
        break;
      case 'greenhouse': {
        const g = new THREE.CylinderGeometry(2, 2, n('len', 10), 10, 1, false, 0, Math.PI);
        g.rotateZ(Math.PI / 2);
        B.add(g, '#DDE6E8', mat(p.x, y, p.z, Math.PI / 2));
        break;
      }
      case 'stupa':
        B.box(3, 1, 3, p.x, y, p.z, 0, '#F3EDE2');
        B.cyl(1.1, 1.3, 1.6, p.x, y + 1, p.z, '#F3EDE2', 10);
        B.cyl(0.1, 0.6, 2.2, p.x, y + 2.6, p.z, '#D9A441', 8);
        break;
      case 'ger':
        ger(p.x, p.z, (p.color as string) ?? '#F3EDE2');
        break;
      case 'milkTanks':
        // сүүний хөргөх 2 сав (хэвтээ цилиндр) тавцан дээр
        B.box(7, 0.5, 3.4, p.x, y, p.z, 0, '#9C958A');
        for (const dx of [-1.7, 1.7]) {
          const g = new THREE.CylinderGeometry(0.9, 0.9, 2.8, 12); g.rotateX(Math.PI / 2);
          B.add(g, '#D8DCDF', mat(p.x + dx, y + 1.5, p.z));
          B.box(0.2, 1, 0.2, p.x + dx, y + 0.5, p.z - 0.9, 0, '#888'); B.box(0.2, 1, 0.2, p.x + dx, y + 0.5, p.z + 0.9, 0, '#888');
        }
        break;
      case 'truckScale':
        // ачааны машины жин
        B.box(3.4, 0.25, 9, p.x, y, p.z, 0, '#7A7A78');
        B.box(3.4, 0.05, 0.2, p.x, y + 0.25, p.z - 4.4, 0, '#E0C23A');
        B.box(3.4, 0.05, 0.2, p.x, y + 0.25, p.z + 4.4, 0, '#E0C23A');
        B.box(0.8, 1.2, 0.6, p.x + 2.4, y, p.z - 3.8, 0, '#3A5FB0'); // жингийн самбар
        break;
      case 'tent': {
        // майхан (A хэлбэр)
        B.add(gableGeometry(3.6, 2.6, 1.8), (p.color as string) ?? '#4A7A9C', mat(p.x, y, p.z, Math.PI / 2));
        B.box(0.05, 1.4, 0.8, p.x, y, p.z + 1.8, 0, '#2B3A44');
        break;
      }
      case 'coalPile':
        B.add(new THREE.ConeGeometry(n('r', 4), 2.5, 7), '#1F1F1F', mat(p.x, y + 1.25, p.z));
        break;
      case 'vehicleLot': {
        B.box(n('w'), 0.1, n('d'), p.x, y, p.z, 0, '#8E8A82');
        for (let i = 0; i <= 4; i++) B.box(0.12, 0.02, n('d') - 1, p.x - n('w') / 2 + (i * n('w')) / 4, y + 0.1, p.z, 0, '#F3EDE2');
        // «ЗАРНА» самбар
        B.cyl(0.08, 0.08, 3, p.x - n('w') / 2 + 0.5, y, p.z + n('d') / 2 - 0.3, '#888', 5);
        B.box(2.2, 0.9, 0.08, p.x - n('w') / 2 + 0.5, y + 2.6, p.z + n('d') / 2 - 0.3, 0, '#E0C23A');
        for (const s of (p.slots as { id: string; vehicle: string; x: number; z: number; rot: number }[]) ?? []) {
          const sy = heightAt(s.x, s.z) + 0.1;
          const v = buildVehicle(s.vehicle);
          v.position.set(s.x, sy, s.z);
          v.rotation.y = s.rot;
          v.name = `forSale:${s.id}`;
          group.add(v);
          disposables.push(v.geometry);
          vehicles.set(s.id, v);
          vehicleSlots.push({ id: s.id, vehicle: s.vehicle, x: s.x, y: sy, z: s.z, rot: s.rot });
        }
        break;
      }
      case 'woolBales':
        for (let i = 0; i < 6; i++) {
          const bx = p.x - n('w') / 2 + 1 + (i % 4) * 2.4, by = y + (i >= 4 ? 1 : 0), bz = p.z + (i >= 4 ? 0 : 0);
          B.box(2.1, 1, 1.4, bx + (i >= 4 ? 1.2 : 0), by, bz, (i % 2) * 0.1, i % 3 ? '#EDE6D2' : '#D8CDB2');
        }
        break;
      case 'equipmentDisplay':
        B.box(n('w'), 0.6, n('d'), p.x, y, p.z, 0, '#9C8E7A');
        B.cyl(0.35, 0.45, 0.9, p.x - 2.5, y + 0.6, p.z, '#C9CDD0', 10); // сепаратор
        B.cyl(0.08, 0.08, 0.5, p.x - 2.5, y + 1.5, p.z, '#8A8A8A', 6);
        B.cyl(0.7, 0.55, 0.6, p.x, y + 0.6, p.z, '#5C5C5C', 12);       // тогоо
        B.cyl(0.4, 0.4, 0.8, p.x + 2.4, y + 0.6, p.z, '#B5B5B5', 10);  // сүүний сав
        break;
      case 'fuelStation': {
        // Бодит зургаас: цэнхэр халхавч + улбар шар хүрээ, доор нь жижиг улбар шар касс,
        // нэг түгээгүүрийн арал, бетон талбай; баруун талд хашаатай савны талбай, бетон хавтан
        const w = n('w'), d = n('d');
        const cx = p.x + 4, cz = p.z;                                   // халхавчийн төв
        B.box(w * 0.75, 0.15, d * 0.8, p.x + w * 0.12, y, p.z + 1, 0, '#A8A49A'); // бетон талбай
        for (const sx of [-1, 1]) for (const sz of [-1, 1]) B.box(0.45, 4.6, 0.45, cx + sx * 4.2, y, cz + sz * 2.6, 0, '#E8E4DA');
        B.box(11, 0.6, 7.4, cx, y + 4.6, cz, 0, '#D9622E');             // улбар шар хүрээ
        B.box(11.1, 0.12, 7.5, cx, y + 5.2, cz, 0, '#2F6FD0');           // цэнхэр дээвэр
        B.box(3.2, 0.12, 3.4, cx - 2.6, y + 5.25, cz - 1.8, 0, '#4A86E0'); // дээврийн хавтангийн хэсэг
        B.box(3.2, 0.12, 3.4, cx + 2.6, y + 5.25, cz + 1.8, 0, '#4A86E0');
        // түгээгүүрийн арал (нэг)
        B.box(1.2, 0.25, 3, cx - 1.5, y + 0.15, cz, 0, '#E8E4DA');
        B.box(0.7, 1.7, 1.1, cx - 1.5, y + 0.4, cz, 0, '#D9622E');
        B.box(0.72, 0.4, 1.12, cx - 1.5, y + 1.7, cz, 0, '#F3EDE2');
        // самбар (халхавчийн урд)
        B.cyl(0.12, 0.12, 4, cx + 6.5, y, cz + d * 0.38, '#888', 6);
        B.box(1.4, 1.6, 0.2, cx + 6.5, y + 4, cz + d * 0.38, 0, '#D9622E');
        // баруун талын хашаатай савны талбай + бетон хавтан
        const fx = p.x - w * 0.36 - 4, fz = p.z - 1;
        B.box(12, 0.06, 9, fx, y, fz, 0, '#7FA35E');
        fence(fx, fz, 12, 9, '#D8D4CA', 1.0, 'e', 2);
        B.cyl(0.9, 0.9, 2.2, fx - 2, y, fz, '#C9CDD0', 10);
        B.cyl(0.9, 0.9, 2.2, fx + 1, y, fz, '#C9CDD0', 10);
        B.box(6, 0.3, 7, fx - 10, y, fz - 1, 0, '#A8A49A');
        // талбайн урд захын шар-хар хашлага
        for (let i = 0; i < 10; i++) B.box(1.1, 0.25, 0.25, p.x + w * 0.12 - w * 0.375 + 1 + i * 2.25, y + 0.15, p.z + 1 + d * 0.4, 0, i % 2 ? '#2B2B2B' : '#E0C23A');
        // касс — халхавчийн доор, зүүн талд (улбар шар)
        building({ id: (p.id as string) ?? 'fuel', name: (p.name as string) ?? 'Колонк', kind: 'fuel_station', gameRole: p.gameRole as string,
          x: cx + 2.4, z: cz - 0.6, w: 4, d: 4, floors: 1, h: 3, roof: { type: 'flat', color: '#B5502A' }, wall: '#D9622E', trim: '#8A8072' });
        break;
      }
      case 'tank':
        B.cyl(n('r', 2), n('r', 2), n('h', 3), p.x, y, p.z, (p.color as string) ?? '#6FB3A8', 12);
        break;
    }
  }

  // --- Гудамжны гэрэл, цахилгааны шон (гол гудамжаар) ---
  const lamps: { x: number; y: number; z: number }[] = [];
  for (const r of L.roads) {
    if (r.width < 9) continue;
    const pts = r.points;
    let carry = 0;
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i]!, b = pts[i + 1]!;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const dx = (b[0] - a[0]) / len, dz = (b[1] - a[1]) / len;
      for (let s = 30 - carry; s < len; s += 30) {
        const x = a[0] + dx * s - dz * (r.width / 2 + 1.5), z = a[1] + dz * s + dx * (r.width / 2 + 1.5);
        const y = heightAt(x, z);
        B.cyl(0.1, 0.14, 7, x, y, z, '#BDBDBD', 5);
        B.box(1.2, 0.15, 0.3, x + dz * 0.6, y + 6.9, z - dx * 0.6, 0, '#E8E2C8');
        lamps.push({ x: x + dz * 0.6, y, z: z - dx * 0.6 });
        carry = len - s;
      }
    }
  }

  // --- Хашаа байшингийн бүс (процедураар) ---
  // --- Тусгай хашаа (зарагдах, хамаатны айл) ---
  const plots: SumPlotView[] = [];
  const gatePalette = ['#2E5E9E', '#D9622B', '#4E6B3A', '#9A3B2E', '#5E7A4A'];
  for (const sp of L.specialPlots ?? []) {
    const ph = plotHouse(L, sp);
    const gate = ph.gate;
    colliders.push({ id: `${sp.id}:plot`, x: sp.x, z: sp.z, w: sp.w, d: sp.d });
    const lab = TOWN.plots[sp.id]!;
    const kind = sp.role === 'relative' ? (lab.house === 'houseA' ? 'relative1' : 'relative2') : lab.house;   // хамаатны айл: айлын самбартай
    const door = plotLab({ x: sp.x, z: sp.z, w: sp.w, d: sp.d, gate, kind, seed: 11 + homes.length * 7, roofColor: lab.roofColor, extras: sp.role === 'relative' ? ['woodshed'] : [], path: 'walk', trees: 'full',
      fenceColor: sp.role === 'forSale' ? '#6B4F3A' : '#5E7A4A', gateColor: sp.role === 'forSale' ? '#2E5E9E' : '#5E7A4A' });
    homes.push(door);
    if (sp.ger) ger(sp.x + sp.w / 2 - 5, sp.z, '#F3EDE2', 2.8);
    const go: XZ = { n: [0, -sp.d / 2] as XZ, s: [0, sp.d / 2] as XZ, e: [sp.w / 2, 0] as XZ, w: [-sp.w / 2, 0] as XZ }[gate];
    const gx = sp.x + go[0], gz = sp.z + go[1];
    if (sp.role === 'forSale') {
      // «ЗАРНА» самбар хаалганы хажууд
      const sx = gx + 3.5, sz = gz + (gate === 's' ? 1 : -1);
      B.cyl(0.07, 0.07, 2.4, sx, heightAt(sx, sz), sz, '#6B4F3A', 5);
      B.box(1.6, 1, 0.08, sx, heightAt(sx, sz) + 1.8, sz, 0, '#E0C23A');
    }
    plots.push({ id: sp.id, role: sp.role, x: sp.x, z: sp.z, door });
  }

  const blocked: Rect[] = [
    ...colliders.map(c => ({ ...c, w: c.w + 8, d: c.d + 8 })),
    ...L.buildings.filter(b => b.yard).map(b => ({ id: b.id, x: b.x + (b.yard!.dx ?? 0), z: b.z + (b.yard!.dz ?? 0), w: b.yard!.w + 4, d: b.yard!.d + 4 })),
    ...L.fields.map(f => f.kind === 'football'
      ? { id: f.id, x: f.x, z: f.z, w: f.w! * (f.track ? 1.24 : 1) + 8, d: f.d! * (f.track ? 1.5 : 1) + 8 }
      : { id: f.id, x: f.x, z: f.z, w: f.r! * 2 + 22, d: f.r! * 2 + 22 }),
    ...L.props.filter(p => ['playground', 'gardenBeds', 'plaza', 'vehicleLot', 'woolBales', 'equipmentDisplay', 'fuelStation', 'milkTanks', 'truckScale'].includes(p.kind))
      .map(p => ({ id: p.kind, x: p.x, z: p.z, w: ((p.w as number) ?? 10) + 4, d: ((p.d as number) ?? 10) + 4 })),
    ...L.props.filter(p => ['greenhouse', 'stupa', 'ger', 'tent', 'gazebo', 'coalPile', 'tank', 'flagpole', 'monument'].includes(p.kind))
      .map(p => ({ id: p.kind, x: p.x, z: p.z, w: 14, d: 14 })),
  ];
  const fencePalette = ['#5C4430', '#6B4F3A', '#4A3A2C', '#5C4430', '#A23B2A', '#3F7A4A', '#2E5C8A'];
  const lanes = { plotW: 24, plotD: 28, laneEvery: 2, lane: 7 };
  for (const zn of L.zones) {
    const x0 = zn.x, z0 = zn.z, x1 = zn.x + zn.w, z1 = zn.z + zn.d;
    let row = 0;
    for (let z = z0 + lanes.plotD / 2; z + lanes.plotD / 2 <= z1; z += lanes.plotD + (++row % lanes.laneEvery === 0 ? lanes.lane : 0.4)) {
      for (let x = x0 + lanes.plotW / 2; x + lanes.plotW / 2 <= x1; x += lanes.plotW + 0.4) {
        const pw = lanes.plotW - rand() * 4, pd = lanes.plotD - rand() * 4;
        const r: Rect = { id: zn.id, x, z, w: pw, d: pd };
        if (rand() > zn.fill) continue;
        if (blocked.some(b => rectsOverlap(r, b))) continue;
        if (roadPts.some(({ r: road, pts }) => rectNearPolyline(r, pts, road.width / 2 + 2))) continue;
        if (rectNearPolyline(r, L.terrain.dryWash.points, L.terrain.dryWash.width / 2 + 2)) continue;
        if (L.terrain.lakes.some(lk => ((x - lk.x) / (lk.rx + 15)) ** 2 + ((z - lk.z) / (lk.rz + 15)) ** 2 < 1)) continue;
        if (heightAt(x, z) > 2) continue;
        const gate = faceTowardRoad(x, z);
        const fc = fencePalette[Math.floor(rand() * fencePalette.length)]!;
        colliders.push({ id: `${zn.id}:plot`, x, z, w: pw, d: pd });
        // V3.5: лабораторийн хашаа (банзан хашаа, хаалга), байшин эсвэл гэр, жорлон, нэмэлт барилга, зам, мод
        const isGer = rand() < 0.35, houseKinds = ['houseA', 'houseB', 'houseC'], roofKeys = Object.keys(BC.roofColors);
        const kind = isGer ? 'gerYard' : houseKinds[Math.floor(rand() * houseKinds.length)]!;
        const roofColor = roofKeys[Math.floor(rand() * roofKeys.length)]!;
        const extras: string[] = [], rich = quality !== 'low';
        if (rich) { if (rand() < 0.5) extras.push('woodshed'); if (rand() < 0.22) extras.push('greenhouse'); if (rand() < 0.25) extras.push('animalShed'); }
        const hd0 = plotLab({ x, z, w: pw, d: pd, gate, kind, seed: 1 + Math.floor(rand() * 997), roofColor, extras, path: rand() < 0.5 ? 'walk' : 'dirt',
          trees: rich ? (rand() < 0.5 ? 'full' : 'bush') : undefined, kennel: rich && rand() < 0.3, fenceColor: fc, gateColor: gatePalette[Math.floor(rand() * gatePalette.length)]!, gerColor: rand() < 0.15 ? '#E8DCC0' : '#F3EDE2' });
        homes.push(hd0);
      }
    }
  }

  // --- Мод (эмнэлэг, захиргаа, цэцэрлэгийн орчим) ---
  const trees: XZ[] = [[40, -88], [52, -86], [88, -112], [170, -50], [182, -48], [214, -52], [282, -46], [300, -40], [258, -38], [-10, -30], [100, -60], [220, 46], [240, 60]];
  for (const [x, z] of trees) {
    const y = heightAt(x, z);
    B.cyl(0.18, 0.25, 2, x, y, z, '#5C3A24', 5);
    B.add(new THREE.ConeGeometry(1.8, 4.5, 7), '#3E6B3A', mat(x, y + 4, z));
  }

  const mat1 = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const mesh = B.mesh(mat1, 'sumcenter-static');
  if (mesh) { group.add(mesh); disposables.push(mesh.geometry, mat1); }

  return {
    group,
    vehicles,
    vehicleSlots,
    plots,
    homes,
    gers,
    lamps,
    ground: terrainMesh,
    colliders,
    solids,
    walk,
    town,
    heightAt,
    setLook,
    dispose: () => { disposables.forEach(d => d.dispose()); decalMesh?.geometry.dispose(); },
  };
}
