/**
 * Үхэр, адуу, нохой, чоногийн онцлог геометр (tools/character-lab/animals.html-ийн батлагдсан хэлбэр): дэл, адууны сүүл,
 * сэвсгэр сүүл, хүзүүний үс (чоно), үхрийн урт сүүл, сэмж, дэлэн, монгол эмээл. Бүгд биеийн/хүзүүний локал координатад.
 * Өнгө нь lod.ts-д `prep`-ээр тавигдана.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { animalLook, type DLook } from './config';
import { ellipsoid, neckCurve, neckGeo, prep } from './geo';

/** Хоёр талтай хавтан: урд, ар нүүрийг тусад нь (нормал эсрэг) */
export function twoFaced(pos: number[], idx: number[]): THREE.BufferGeometry {
  const n = pos.length / 3, g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...pos, ...pos], 3));
  const back: number[] = [];
  for (let i = 0; i < idx.length; i += 3) back.push(idx[i]! + n, idx[i + 2]! + n, idx[i + 1]! + n);
  g.setIndex([...idx, ...back]);
  g.computeVertexNormals();
  return g;
}

/** Дэл: хүзүүний орой дагуу (хүзүүний локал), нэг тал руу унжсан урт үс, үзүүр нь шүдлэг. mk — урт/өтгөний харьцаа (азарга) */
export function maneGeo(d: DLook, rk: number, mk: number, NZ: number, NJ: number): THREE.BufferGeometry {
  const M = d.mane!, xk = d.neckX ?? 1, pts = neckCurve(d.neckLen, rk).getPoints(40), zEnd = pts[pts.length - 1]!.y;
  const rAt = (z: number): number => {
    for (let i = 1; i < pts.length; i++) if (pts[i]!.y >= z) { const a = pts[i - 1]!, b = pts[i]!, t = (z - a.y) / (b.y - a.y || 1); return a.x + (b.x - a.x) * t; }
    return pts[pts.length - 1]!.x;
  };
  const pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= NZ; i++) {
    const t = i / NZ, z = zEnd * (M.z0 + (M.z1 - M.z0) * t), r = rAt(z);
    const dep = M.depth * mk * (0.7 + 0.3 * Math.sin(Math.PI * t)) * (i % 2 ? 1 : 0.8), aEnd = Math.min(1.9, dep / r);
    for (let j = 0; j <= NJ; j++) {
      const u = j / NJ, a = -0.35 + (aEnd + 0.35) * u, rad = r + 0.006 + M.lift * mk * Math.sin(Math.PI * Math.min(1, u * 1.25));
      pos.push(-Math.sin(a) * rad * xk, Math.cos(a) * rad, z);
    }
  }
  for (let i = 0; i < NZ; i++) for (let j = 0; j < NJ; j++) { const a = i * (NJ + 1) + j, b = a + 1, c = a + NJ + 1, e = c + 1; idx.push(a, b, c, b, e, c); }
  return twoFaced(pos, idx);
}

/** Адууны сүүл: өтгөн урт үс, үзүүрээ нарийссан (pivot = дээд, доош унжина) */
export function horseTailGeo(T: { len: number; r: number }, seg: number, lite: boolean): THREE.BufferGeometry {
  const L = T.len, r = T.r;
  const pts = (lite ? [[r * 0.7, 0], [r * 1.3, -L * 0.45], [r * 1.1, -L * 0.85], [0, -L]]
    : [[0, 0.01], [r * 0.7, -0.01], [r * 0.9, -0.1], [r * 1.25, -L * 0.4], [r * 1.35, -L * 0.7], [r * 0.95, -L * 0.92], [0, -L]]).map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(pts, seg);
  g.scale(0.72, 1, 1);
  g.computeVertexNormals();
  return g;
}

/** Хүзүү, мөрний өтгөн үс (чоно): хүзүүнээс бүдүүн бүрхүүл, тойргийн дагуу шүдлэг, доод тал урт унжсан */
export function ruffGeo(d: DLook, seg: number, rows: number): THREE.BufferGeometry {
  const R = d.ruff!, g = neckGeo(d.neckLen * R.len, seg, rows, d.neckR * R.k, d.neckX ?? 1), p = g.attributes.position as THREE.BufferAttribute, nP = rows + 1;
  for (let i = 0; i < p.count; i++) {
    const s = Math.floor(i / nP), x = p.getX(i), y = p.getY(i), jag = 1 + R.jag * (s % 2 ? 1 : -1), hang = y < 0 ? 1 + R.hang * (-y / (0.12 * d.neckR * R.k)) : 1;
    p.setXYZ(i, x * jag, y * jag * hang, p.getZ(i) - (y < 0 ? R.back * -y : 0));
  }
  g.computeVertexNormals();
  return g;
}

/** Сэвсгэр сүүл (нохой, чоно): pts дагуу (pivot = үндэс, len-ээр масштаб), голдоо бүдүүн, үзүүрээ шовх */
export function bushyTailGeo(T: NonNullable<DLook['tailBushy']>, n: number, rad: number): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(T.pts.map(([x, y, z]) => new THREE.Vector3(x * T.len, y * T.len, z * T.len))), fr = curve.computeFrenetFrames(n, false);
  const pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, c = curve.getPoint(u), N = fr.normals[i]!, B = fr.binormals[i]!, r = T.r * Math.pow(Math.sin(Math.PI * (0.08 + 0.9 * u)), 0.6) + 0.002;
    for (let j = 0; j < rad; j++) { const a = (j / rad) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a); pos.push(c.x + (N.x * ca + B.x * sa) * r, c.y + (N.y * ca + B.y * sa) * r, c.z + (N.z * ca + B.z * sa) * r); }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < rad; j++) {
    const a = i * rad + j, b = i * rad + ((j + 1) % rad), c2 = (i + 1) * rad + j, d = (i + 1) * rad + ((j + 1) % rad);
    idx.push(a, b, c2, b, d, c2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Үхрийн урт сүүл: нарийн иш, үзүүртээ сэвсгэр (pivot = дээд) */
export function cowTailGeo(d: DLook, seg: number, lite: boolean): THREE.BufferGeometry {
  const T = d.tailLong!, L = T.len;
  const pts = (lite ? [[T.r, 0], [T.r * 0.8, -L * 0.62], [T.tuft, -L * 0.8], [0, -L]]
    : [[0, 0], [T.r * 1.1, -0.012], [T.r * 0.85, -L * 0.2], [T.r * 0.75, -L * 0.62], [T.tuft * 0.8, -L * 0.72], [T.tuft, -L * 0.82], [T.tuft * 0.6, -L * 0.95], [0, -L]]).map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(pts, seg);
  g.computeVertexNormals();
  return g;
}

/** Сүүлний геометр: адуу — үс, үхэр — урт, нохой/чоно — сэвсгэр; lite — хөнгөн. Ямаа, хонь — өөхөн сүүл (geo.tailGeo) */
export function longTailGeo(d: DLook, lite: boolean): THREE.BufferGeometry | null {
  if (d.tailHorse) return horseTailGeo(d.tailHorse, lite ? 5 : 14, lite);
  if (d.tailBushy) return bushyTailGeo(d.tailBushy, lite ? 4 : 16, lite ? 4 : 10);
  if (d.tailLong) return cowTailGeo(d, lite ? 4 : 10, lite);
  return null;
}

/** Сэмж: хүзүүний доор унжсан арьсан хавтан (хүзүүний локал) */
export function dewlapGeo(d: DLook, w: number, h: number): THREE.BufferGeometry {
  const k = d.neckLen / 0.26, e = d.dewlap!;
  return ellipsoid(e.r[0], e.r[1], e.r[2] * k, [0, -e.y * d.neckR, e.z * k], w, h);
}

/** Үнээний дэлэн (биеийн локал, shape-д) */
export function udderGeo(d: DLook, w: number, h: number): THREE.BufferGeometry {
  const u = d.udder!;
  return ellipsoid(u.r[0], u.r[1], u.r[2], [0, -d.body.R * u.y, u.z], w, h);
}

/** Монгол эмээл (нурууны орой = эх цэг): тохом, бүүрэг, мөнгөн товруу, олом, дөрөө. Нэг геометр, оройн өнгөтэй (slot 0). Буцаах: geo, seat, stir, side */
export function saddleGeo(d: DLook): { geo: THREE.BufferGeometry; seat: number; stir: number; side: number } {
  const R = d.body.R, W = d.body.wide, C = animalLook.saddle, parts: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, rgb: number): void => { parts.push(prep(g, 0, rgb)); };
  const sheet = (a0: number, a1: number, z0: number, z1: number, off: number, color: number): void => {
    const pos: number[] = [], idx: number[] = [], nA = 12, nZ = 4;
    for (let i = 0; i <= nA; i++) for (let j = 0; j <= nZ; j++) { const a = a0 + ((a1 - a0) * i) / nA, z = z0 + ((z1 - z0) * j) / nZ; pos.push(Math.sin(a) * (R * W + off), Math.cos(a) * (R + off) - R, z); }
    for (let i = 0; i < nA; i++) for (let j = 0; j < nZ; j++) { const a = i * (nZ + 1) + j, b = a + 1, c = a + nZ + 1, e = c + 1; idx.push(a, c, b, b, c, e); }
    add(twoFaced(pos, idx), color);
  };
  sheet(-1.15, 1.15, -0.3, 0.3, 0.012, C.felt);
  sheet(-0.95, 0.95, -0.24, 0.24, 0.022, C.pad);
  add(ellipsoid(0.13, 0.035, 0.16, [0, 0.05, 0], 14, 8), C.seat);
  add(ellipsoid(0.12, 0.1, 0.032, [0, 0.11, 0.17], 14, 8), C.wood);
  add(ellipsoid(0.12, 0.08, 0.032, [0, 0.09, -0.16], 14, 8), C.wood);
  for (const x of [-0.06, 0, 0.06]) add(ellipsoid(0.018, 0.018, 0.01, [x, 0.13 - Math.abs(x) * 0.4, 0.2], 6, 4), C.metal);
  const girth = new THREE.TorusGeometry(1, 0.012, 6, 36);
  girth.scale(R * W + 0.016, R + 0.016, 1); girth.translate(0, -R, 0.02);
  add(girth, C.strap);
  const side = R * W + 0.035, drop = d.saddle!.drop;
  for (const sx of [-1, 1]) {
    const strap = new THREE.BoxGeometry(0.008, drop, 0.03); strap.translate(sx * side, -drop / 2 + 0.02, 0.03); add(strap, C.strap);
    const ring = new THREE.TorusGeometry(0.055, 0.01, 6, 16); ring.translate(sx * side, -drop - 0.035, 0.03); add(ring, C.metal);
    const tread = new THREE.BoxGeometry(0.05, 0.012, 0.09); tread.translate(sx * side, -drop - 0.085, 0.03); add(tread, C.metal);
  }
  const geo = mergeGeometries(parts.map((p) => { const q = p.index ? p : p; return q; }), false);
  if (!geo) throw new Error('saddleGeo: mergeGeometries амжилтгүй');
  parts.forEach((p) => p.dispose());
  return { geo, seat: 0.085, stir: -drop - 0.085, side };
}

/** Патчийн цилиндр координат (үхэр, адуу): θ — тойргийн өнцөг, u — урт −1…1 */
export function patchCyl(map: [number, number, number, number][], L: number): (x: number, y: number, z: number) => number {
  return (x, y, z) => {
    const th = Math.atan2(y, x), u = z / (L / 2);
    let v = 0;
    for (const [t0, u0, rt, ru] of map) { const dt = Math.atan2(Math.sin(th - t0), Math.cos(th - t0)); v += Math.exp(-((dt / rt) ** 2 + ((u - u0) / ru) ** 2)); }
    const t = Math.min(1, Math.max(0, (v - 0.42) / 0.2));
    return t * t * (3 - 2 * t);
  };
}
