/**
 * Дүрслэлийн туслах функцууд. Чимэглэлийн (мод, чулуу) байрлал seed-тэй тул
 * нэг бууц үргэлж ижил харагдана. Энэ санамсаргүй тоо sim-д нөлөөлөхгүй.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export class VisualRng {
  private s: number;
  constructor(seed: number) {
    this.s = seed >>> 0;
  }
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }
}

export function strSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));

export function angDiff(a: number, b: number): number {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Нэг өнгөтэй, flatShading-тэй Lambert материал (кэштэй) */
const matCache = new Map<number, THREE.MeshLambertMaterial>();
export function mat(color: number): THREE.MeshLambertMaterial {
  let m = matCache.get(color);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color, flatShading: true });
    matCache.set(color, m);
  }
  return m;
}

/** Хайрцаг геометр (байрлал, эргэлттэй) */
export function boxGeo(w: number, h: number, d: number, x = 0, y = 0, z = 0, rx = 0, rz = 0): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  if (rx) g.rotateX(rx);
  if (rz) g.rotateZ(rz);
  g.translate(x, y, z);
  return g;
}

/** Хэд хэдэн геометрийг нэг болгоно (InstancedMesh-д нэг draw call) */
export function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const clean = parts.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k);
    return n;
  });
  const out = mergeGeometries(clean, false);
  if (!out) throw new Error('mergeGeometries амжилтгүй');
  out.computeVertexNormals();
  return out;
}

/** Энгийн mesh (сүүдэртэй) */
export function meshBox(w: number, h: number, d: number, color: number, x: number, y: number, z: number, parent?: THREE.Object3D): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  parent?.add(m);
  return m;
}

/** Хөл, гар: дээд үзүүрээрээ эргэдэг бүлэг */
export function limb(w: number, h: number, color: number, x: number, y: number, z: number, parent: THREE.Object3D): THREE.Group {
  const p = new THREE.Group();
  p.position.set(x, y, z);
  meshBox(w, h, w, color, 0, -h / 2, 0, p);
  parent.add(p);
  return p;
}

/**
 * Хөдөлгөөнгүй объектуудыг (мод, чулуу, хашаа) материалаар нь нэг mesh болгоно.
 * Mesh биш объект (шугам г.м.) хэвээр үлдэнэ.
 */
export function batchStatic(src: THREE.Group): THREE.Group {
  src.updateMatrixWorld(true);
  const byMat = new Map<THREE.Material, { geos: THREE.BufferGeometry[]; shadow: boolean }>();
  const out = new THREE.Group();
  const keep: THREE.Object3D[] = [];
  src.traverse((o) => {
    if (o instanceof THREE.Mesh && !(o instanceof THREE.InstancedMesh) && !Array.isArray(o.material)) {
      const g = (o.geometry as THREE.BufferGeometry).clone().applyMatrix4(o.matrixWorld);
      let e = byMat.get(o.material);
      if (!e) {
        e = { geos: [], shadow: false };
        byMat.set(o.material, e);
      }
      e.geos.push(g);
      e.shadow ||= o.castShadow;
    } else if (o instanceof THREE.Line) keep.push(o);
  });
  for (const [m, e] of byMat) {
    const mesh = new THREE.Mesh(merge(e.geos), m);
    mesh.castShadow = e.shadow;
    mesh.receiveShadow = true;
    out.add(mesh);
  }
  for (const o of keep) {
    o.removeFromParent();
    out.add(o);
  }
  return out;
}
