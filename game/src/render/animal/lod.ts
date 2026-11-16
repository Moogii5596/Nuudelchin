/**
 * Хонь, ямааны хоёр түвшин (LOD): хөнгөн (сүргийн хувилбар, ≤ 800 гурвалжин) ба дэлгэрэнгүй (ойрын цөөн мал, лабораторийн
 * дэлгэрэнгүй хуваалт). Хоёулаа төрөл тус бүрт цөөн InstancedMesh (хөнгөн/дэлгэрэнгүй: хонь 5, ямаа 6 хэсэг), НЭГ материал
 * (LMAT — оройн өнгө + instanceColor + алаг толбо + туслахын тэмдэг). Мал бүр = нэг instance (хөл 4 instance).
 * Зайтай (animalAnimationDistance) мал кэшлэсэн тайван байрлал (RestPoses) ашиглана — poseAnimal дуудахгүй.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { animalLook, type DLook, type LookSpecies } from './config';
import { bodyGeo, markGeo, neckGeo, patchK, prep, skirtGeo, smooth01, tailGeo, triOf } from './geo';
import { cowTailGeo, dewlapGeo, longTailGeo, maneGeo, patchCyl, ruffGeo, saddleGeo, udderGeo } from './shapes';
import { headGeo, Q_DETAIL, Q_LIGHT } from './head';
import { legLower, legUpper } from './legs';
import { makeRig, settle, type Action, type Rig } from './pose';

export type Level = 'light' | 'detail';
/** Мал бүрийн instance-ийн шинж (хэсгийн сонголт, өнгө) */
export interface Rec { male: boolean; ageIdx: number; patch: boolean; mark: boolean; /** үхэр: эвэргүй */ polled?: boolean; /** адуу: эмээлтэй */ saddle?: boolean }
export interface Colors { wool: number; head: number; leg: number; legLow: number; mane: number; tail: number }

export interface PartDef {
  name: string;
  geo: THREE.BufferGeometry;
  mult: number;
  node: (r: Rig) => THREE.Object3D[];
  col: (c: Colors) => number;
  use?: (r: Rec) => boolean;
  /** хуучин төрлийн хоёр дахь хувилбар (гурвалжин давхар тоологдохгүй) */
  alt?: boolean;
}

// ---------------------------------------------------------------- материал
const PC = new THREE.Color(animalLook.palette.patch), MC = new THREE.Color(animalLook.palette.mark);
const vec = (c: THREE.Color): string => `vec3( ${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)} )`;
export const LMAT = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });
LMAT.onBeforeCompile = (sh) => {      // three r187: vColor = vec4. aSlot: 0 тогтмол, 1 instanceColor, 1..2 алаг толбо (iPatch), 3 туслахын тэмдэг (iMark)
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nattribute float aSlot;\nattribute float iPatch;\nattribute float iMark;')
    .replace('#include <color_vertex>', [
      'vColor = vec4( 1.0 );', '#ifdef USE_COLOR', ' vColor.rgb *= color;', '#endif', '#ifdef USE_INSTANCING_COLOR',
      ' vec3 ic = instanceColor.rgb; vec3 base = mix( vec3( 1.0 ), ic, min( aSlot, 1.0 ) );',
      ` vec3 patched = mix( base, mix( ic, ${vec(PC)}, iPatch ), clamp( aSlot - 1.0, 0.0, 1.0 ) );`,
      ` vec3 marked = mix( ic, ${vec(MC)}, iMark );`,
      ' vColor.rgb *= mix( patched, marked, step( 2.5, aSlot ) );', '#endif',
    ].join('\n'));
};

// ---------------------------------------------------------------- хэсгүүд
/** Төрөл бүрийн геометрийн хэсгүүд (model.ts дуудна). Бүтэц нь хөнгөн/дэлгэрэнгүйд ижил (кэш хоёуланд таарна) */
export function buildParts(species: LookSpecies, level: Level): PartDef[] {
  const sp = animalLook.species[species], d = sp.d, G = sp[level], Q = level === 'light' ? Q_LIGHT : Q_DETAIL, lite = level === 'light';
  const adultIdx = animalLook.age.adultIdx;
  const adultM = (r: Rec): boolean => r.male && r.ageIdx >= adultIdx;
  const bullLike = (r: Rec): boolean => !!sp.sexBody && adultM(r);
  const patchFn = sp.patchMap ? patchCyl(sp.patchMap, d.body.L) : (x: number, y: number, z: number): number => patchK(x, y, z, d.body.R / 0.285);
  // бие: сүүл (өөхөн/урт), туслахын тэмдэг. crest — бухын мөр, withers — адууны сэрвээ
  const mkTorso = (crest: DLook['crest'] | null, udder: boolean): THREE.BufferGeometry => {
    const body = prep(bodyGeo(d.body, G.bodySeg, G.bodyRows, 0, crest), 1);
    const bp = body.attributes.position as THREE.BufferAttribute, bs = body.attributes.aSlot as THREE.BufferAttribute;
    if (sp.patchMask) for (let i = 0; i < bp.count; i++) bs.setX(i, 1 + patchFn(bp.getX(i), bp.getY(i), bp.getZ(i)));
    const V0 = sp.variants[0]!;
    if (V0.back !== undefined && V0.belly !== undefined) {   // нуруу бараан, хэвлий цайвар (чоно): slot жин 1 − w → instanceColor, w → тогтмол
      const bc = body.attributes.color as THREE.BufferAttribute, B = new THREE.Color(V0.back), Lc = new THREE.Color(V0.belly);
      for (let i = 0; i < bp.count; i++) {
        const k = bp.getY(i) / d.body.R, wb = smooth01(0.3, 0.9, k), wl = smooth01(-0.15, -0.65, k), w = Math.max(wb, wl), T = wl > wb ? Lc : B;
        bs.setX(i, 1 - w); bc.setXYZ(i, 1 + w * (T.r - 1), 1 + w * (T.g - 1), 1 + w * (T.b - 1));
      }
    }
    const out: THREE.BufferGeometry[] = [body];
    if (!d.tailHorse && !d.tailBushy) {
      const tail = d.tailLong ? cowTailGeo(d, lite ? 4 : 10, lite) : tailGeo(d.tail, G.tail[0], G.tail[1]);
      tail.applyMatrix4(new THREE.Matrix4().makeRotationX(d.tailRaise));
      tail.translate(d.tailAt[0], d.tailAt[1] - d.bodyY, d.tailAt[2]);
      out.push(prep(tail, 1));
    }
    if (udder && d.udder) out.push(prep(udderGeo(d, lite ? 6 : 20, lite ? 4 : 14), 0, animalLook.palette.udder));
    out.push(prep(markGeo(d.body, lite ? 4 : 14, lite ? 2 : 8, crest ?? null), 3));
    const torso = mergeGeometries(out, false);
    if (!torso) throw new Error('buildParts: бие нэгтгэх амжилтгүй');
    out.forEach((g) => g.dispose());
    return torso;
  };
  const neckOf = (k: number): THREE.BufferGeometry => {
    const n = prep(neckGeo(d.neckLen, G.neck[0], G.neck[1], d.neckR * k, d.neckX ?? 1), 1);
    if (!d.dewlap) return n;
    const m = mergeGeometries([n, prep(dewlapGeo(d, lite ? 5 : 14, lite ? 3 : 10), 1)], false);
    if (!m) throw new Error('buildParts: хүзүү нэгтгэх амжилтгүй');
    return m;
  };
  const parts: PartDef[] = [];
  if (sp.sexBody && d.crest) {   // үхэр: бух (мөртэй), нас гүйцсэн үнээ (дэлэнтэй), бусад (тугал, өсвөр)
    parts.push(
      { name: 'бие+сүүл ♂ мөр', geo: mkTorso(d.crest, false), mult: 1, node: (r) => [r.shape], col: (c) => c.wool, use: (r) => bullLike(r) },
      { name: 'бие+сүүл ♀ дэлэн', geo: mkTorso(null, true), mult: 1, node: (r) => [r.shape], col: (c) => c.wool, use: (r) => !bullLike(r) && r.ageIdx >= adultIdx, alt: true },
      { name: 'бие+сүүл өсвөр', geo: mkTorso(null, false), mult: 1, node: (r) => [r.shape], col: (c) => c.wool, use: (r) => !bullLike(r) && r.ageIdx < adultIdx, alt: true },
    );
  } else parts.push({ name: 'бие+сүүл', geo: mkTorso(d.withers ?? null, false), mult: 1, node: (r) => [r.shape], col: (c) => c.wool });
  if (d.stallion && d.mane) {   // адуу: азаргын бүдүүн хүзүү, өтгөн дэл; дэл, сүүл — дэлний өнгөөр
    parts.push(
      { name: 'хүзүү ♂', geo: neckOf(d.stallion.neck), mult: 1, node: (r) => [r.neck], col: (c) => c.wool, use: adultM },
      { name: 'хүзүү', geo: neckOf(1), mult: 1, node: (r) => [r.neck], col: (c) => c.wool, use: (r) => !adultM(r), alt: true },
      { name: 'дэл ♂', geo: prep(maneGeo(d, d.neckR * d.stallion.neck, d.stallion.mane, ...(G.mane ?? [6, 2])), 1), mult: 1, node: (r) => [r.neck], col: (c) => c.mane, use: adultM },
      { name: 'дэл', geo: prep(maneGeo(d, d.neckR, 1, ...(G.mane ?? [6, 2])), 1), mult: 1, node: (r) => [r.neck], col: (c) => c.mane, use: (r) => !adultM(r), alt: true },
    );
  } else parts.push({ name: 'хүзүү', geo: neckOf(1), mult: 1, node: (r) => [r.neck], col: (c) => c.wool });
  if (d.ruff) parts.push({ name: 'хүзүүний үс', geo: prep(ruffGeo(d, lite ? 6 : 28, lite ? 2 : 7), 1), mult: 1, node: (r) => [r.neck], col: (c) => c.wool });
  const tl = d.tailHorse || d.tailBushy ? longTailGeo(d, lite) : null;
  if (tl) parts.push({ name: 'сүүл', geo: prep(tl, 1), mult: 1, node: (r) => [r.tail], col: (c) => c.tail });
  if (d.skirt && G.skirt) parts.push({ name: 'хормой', geo: prep(skirtGeo(d.body, d.skirt, G.skirt[0], G.skirt[1]), 1, 0xe6e0d8), mult: 1, node: (r) => [r.skirt], col: (c) => c.wool });
  // толгой: үхэр — эвэртэй/эвэргүй; ямаа — ♂ эвэр/♀; бусад — нэг
  const headOf = (hornK: number): THREE.BufferGeometry => headGeo(d, sp.head, Q, hornK, { detail: !lite });
  if (sp.polledOption && sp.head.horn) {
    parts.push(
      { name: 'толгой+эвэр', geo: headOf(1), mult: 1, node: (r) => [r.head], col: (c) => c.head, use: (r) => !r.polled && r.ageIdx >= 2 },
      { name: 'толгой эвэргүй', geo: headOf(0), mult: 1, node: (r) => [r.head], col: (c) => c.head, use: (r) => !!r.polled || r.ageIdx < 2, alt: true },
    );
  } else if (sp.head.horn) {
    parts.push(
      { name: 'толгой ♂+эвэр', geo: headOf(1), mult: 1, node: (r) => [r.head], col: (c) => c.head, use: adultM },
      { name: 'толгой ♀', geo: headOf(sp.head.horn.fk), mult: 1, node: (r) => [r.head], col: (c) => c.head, use: (r) => !adultM(r), alt: true },
    );
  } else parts.push({ name: 'толгой', geo: headOf(0), mult: 1, node: (r) => [r.head], col: (c) => c.head });
  parts.push(
    { name: 'хөл дээд ×4', geo: legUpper(d, level), mult: 4, node: (r) => r.legs.map((l) => l.up), col: (c) => c.leg },
    { name: 'хөл доод+туурай ×4', geo: legLower(d, level), mult: 4, node: (r) => r.legs.map((l) => l.low), col: (c) => c.legLow },
  );
  if (d.saddle) parts.push({ name: 'эмээл', geo: saddleGeo(d).geo, mult: 1, node: (r) => [r.saddle], col: () => 0xffffff, use: (r) => !!r.saddle, alt: true });
  return parts;
}

/** Хэсгүүдийн гурвалжин (alt-ыг тоолохгүй) */
export const trisOf = (parts: PartDef[]): number => parts.filter((p) => !p.alt).reduce((n, p) => n + triOf(p.geo) * p.mult, 0);

// ---------------------------------------------------------------- кэшлэсэн тайван байрлал
/** Хол малын байрлал: үйлдэл тус бүрийн (зогсох, бэлчих, хэвтэх) нодуудын матриц (root = нэгж). Хэсгийн дугаараар */
export class RestPoses {
  private readonly rig: Rig;
  private cache = new Map<Action, THREE.Matrix4[][]>();
  constructor(species: LookSpecies, private parts: PartDef[]) { this.rig = makeRig(species); }
  get(action: Action): THREE.Matrix4[][] {
    let hit = this.cache.get(action);
    if (!hit) {
      this.rig.root.position.set(0, 0, 0); this.rig.root.rotation.set(0, 0, 0);
      settle(this.rig, action, { speed: 0, fast: false, sc: 1, old: false, fat: 0.6, noStep: true });
      hit = this.parts.map((p) => p.node(this.rig).map((n) => n.matrixWorld.clone()));
      this.cache.set(action, hit);
    }
    return hit;
  }
}

// ---------------------------------------------------------------- instance-ийн цуглуулга
export class AnimalSet {
  readonly meshes: THREE.InstancedMesh[];
  private n: number[];
  private readonly cc = new THREE.Color();
  private readonly tmp = new THREE.Matrix4();
  readonly tris: number;
  /** Хамгийн их мал (instance тооны дээд хязгаар) */
  readonly cap: number;

  constructor(readonly parts: PartDef[], parent: THREE.Object3D, cap = animalLook.lightCap) {
    this.cap = cap;
    this.n = parts.map(() => 0);
    this.tris = trisOf(parts);
    this.meshes = parts.map((p) => {
      const count = cap * p.mult;
      const m = new THREE.InstancedMesh(p.geo, LMAT, count);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.setColorAt(0, this.cc.set(0xffffff));
      p.geo.setAttribute('iPatch', new THREE.InstancedBufferAttribute(new Float32Array(count), 1));
      p.geo.setAttribute('iMark', new THREE.InstancedBufferAttribute(new Float32Array(count), 1));
      m.frustumCulled = false; m.castShadow = true; m.count = 0;
      parent.add(m);
      return m;
    });
  }

  begin(): void { this.n.fill(0); }

  /** matrices(pi, mi): хэсэг pi-ийн mi-р instance-ийн дэлхийн матриц */
  private put(rec: Rec, cols: Colors, get: (pi: number, mi: number) => THREE.Matrix4): void {
    this.parts.forEach((p, pi) => {
      if (p.use && !p.use(rec)) return;
      const mesh = this.meshes[pi]!, ip = mesh.geometry.attributes.iPatch as THREE.InstancedBufferAttribute, im = mesh.geometry.attributes.iMark as THREE.InstancedBufferAttribute;
      this.cc.set(p.col(cols));
      for (let m = 0; m < p.mult; m++) {
        const idx = this.n[pi]! * p.mult + m;
        if (idx >= this.cap * p.mult) return;
        mesh.setMatrixAt(idx, get(pi, m));
        mesh.setColorAt(idx, this.cc);
        ip.setX(idx, rec.patch ? 1 : 0);
        im.setX(idx, rec.mark ? 1 : 0);
      }
      this.n[pi]!++;
    });
  }
  /** Амьд араг (poseAnimal хийгдсэн, matrixWorld шинэчлэгдсэн) */
  push(rig: Rig, rec: Rec, cols: Colors): void {
    const nodes = this.parts.map((p) => p.node(rig));
    this.put(rec, cols, (pi, mi) => nodes[pi]![mi]!.matrixWorld);
  }
  /** Кэшлэсэн байрлал × root матриц */
  pushRest(root: THREE.Matrix4, rest: THREE.Matrix4[][], rec: Rec, cols: Colors): void {
    this.put(rec, cols, (pi, mi) => this.tmp.multiplyMatrices(root, rest[pi]![mi]!));
  }
  end(): void {
    this.meshes.forEach((m, i) => {
      m.count = this.n[i]! * this.parts[i]!.mult;
      m.visible = m.count > 0;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      (m.geometry.attributes.iPatch as THREE.BufferAttribute).needsUpdate = true;
      (m.geometry.attributes.iMark as THREE.BufferAttribute).needsUpdate = true;
      m.boundingSphere = null;
    });
  }
  get drawCalls(): number { return this.meshes.length; }
  dispose(): void { this.meshes.forEach((m) => { m.removeFromParent(); m.geometry.dispose(); m.dispose(); }); }
}
