/**
 * Дүрийн геометрийн ерөнхий хэрэгсэл: профайл, эргэлтийн бие (lathe), хоолой, loft, сэвсгэр үс.
 * `makeKit(lod)` — нарийвчлалаар (1 = үндсэн дүр, бага = олон хүн) хуваалтыг үржүүлсэн багаж.
 */
import * as THREE from 'three';
import { flat } from './materials';

export type Pt = readonly [number, number];
/** loft-ийн огтлол: [z, y, хагас өргөн, хагас өндөр] */
export type Section = [number, number, number, number];
export interface LatheOpt {
  rows?: number;
  segs?: number;
  capBottom?: boolean;
  phiStart?: number;
  phiLength?: number;
  /** [дээд, доод] гэрэлтэлт (оройн өнгө) */
  grad?: readonly [number, number];
  /** даавууны нугалаа: доошлох тусам радиус долгиолно (утга — нугалаа бүрэн гарах гүн) */
  folds?: number;
}

export const mix = (a: number, b: number, k: number): number => a + (b - a) * k;
export const foldK = (phi: number, t: number): number => 1 + 0.045 * t * t * Math.sin(7 * phi + 1);
/** Бэхэн хүрээ тавихгүй гэж тэмдэглэнэ */
export function noOut<T extends THREE.Object3D>(m: T): T { m.userData.noOutline = true; return m; }

export function profile(ctrl: readonly Pt[], rows: number): THREE.Vector2[] {
  const curve = new THREE.SplineCurve(ctrl.map(([r, y]) => new THREE.Vector2(r, y)));
  return curve.getPoints(rows).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y));
}
/** Тойрог дээрх цэгүүд (axis 'x' — YZ хавтгай, 'y' — XZ хавтгай) */
export const ring = (cx: number, cy: number, cz: number, rad: number, axis: 'x' | 'y', n = 28, a0 = 0, a1 = Math.PI * 2): THREE.Vector3[] =>
  Array.from({ length: n + 1 }, (_, q) => {
    const a = a0 + ((a1 - a0) * q) / n, c = Math.cos(a) * rad, d = Math.sin(a) * rad;
    return axis === 'x' ? new THREE.Vector3(cx, cy + c, cz + d) : new THREE.Vector3(cx + d, cy, cz + c);
  });

let fluffGeo: THREE.SphereGeometry | null = null;

export type Detail = 'full' | 'npc';

export interface Kit {
  readonly lod: number;
  /** full — тоглогч; npc — туслах, ойрын NPC (бээлий гар, хоолой үс, нэгтгэсэн давхарга) */
  readonly detail: Detail;
  /** хуваалтын тоо нарийвчлалаар: max(min, round(n × lod)) */
  q(n: number, min: number): number;
  /** Эргэлтийн бие: ctrl = [[радиус, y], ...] доороос дээш. depthK = зузаан/өргөн (зууван огтлол) */
  lathe(ctrl: readonly Pt[], depthK: number, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D, opt?: LatheOpt): THREE.Mesh;
  cyl(rTop: number, rBot: number, h: number, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D): THREE.Mesh;
  sball(r: number, material: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D): THREE.Mesh;
  box(w: number, h: number, d: number, color: number, x: number, y: number, z: number, parent: THREE.Object3D): THREE.Mesh;
  /** Муруйн дагуух нарийн хоолой (хүрээгүй) */
  tube(pts: THREE.Vector3[], rad: number, material: THREE.Material, parent: THREE.Object3D, tension?: number): THREE.Mesh;
  /** Нурууны шугамын дагуу зууван огтлолуудыг холбосон бие. shape = [дээд, доод] хэлбэрийн зэрэг (2 = зууван, их — дөрвөлжин) */
  loft(st: Section[], material: THREE.Material, parent: THREE.Object3D, shape?: readonly [number, number], segs?: number): THREE.Mesh;
  /** Сэвсгэр үс: шугамын дагуу бөмбөлгүүд (нэг InstancedMesh); npc — нэг хоолой (bake-д нийлнэ) */
  fluff(points: THREE.Vector3[], r: number, material: THREE.Material, parent: THREE.Object3D, seed?: number): THREE.Mesh;
}

const SEG = 24;

export function makeKit(lod: number, detail: Detail = 'full'): Kit {
  const q = (n: number, min: number): number => Math.max(min, Math.round(n * lod));
  const place = <T extends THREE.Mesh>(m: T, x: number, y: number, z: number, parent: THREE.Object3D): T => {
    m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
  };
  return {
    lod,
    detail,
    q,
    lathe(ctrl, depthK, material, x, y, z, parent, opt = {}) {
      const pts = ctrl.length < 3 ? ctrl.map(([r, yy]) => new THREE.Vector2(r, yy)) : profile(ctrl, q(opt.rows ?? 10, 4));
      if (opt.capBottom) pts.unshift(new THREE.Vector2(0, pts[0]!.y));
      const geo = new THREE.LatheGeometry(pts, q(opt.segs ?? SEG, 6), opt.phiStart ?? 0, opt.phiLength ?? Math.PI * 2);
      if (opt.grad) {
        geo.computeBoundingBox();
        const bb = geo.boundingBox!, y0 = bb.min.y, h = bb.max.y - y0 || 1;
        const pos = geo.attributes.position!, col: number[] = [];
        for (let i = 0; i < pos.count; i++) {
          const v = opt.grad[1] + (opt.grad[0] - opt.grad[1]) * ((pos.getY(i) - y0) / h);
          col.push(v, v, v);
        }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      }
      if (opt.folds) {
        const pos = geo.attributes.position!;
        for (let i = 0; i < pos.count; i++) {
          const px = pos.getX(i), pz = pos.getZ(i);
          const k = foldK(Math.atan2(px, pz), Math.min(1, Math.max(0, -pos.getY(i) / opt.folds)));
          pos.setX(i, px * k); pos.setZ(i, pz * k);
        }
        geo.computeVertexNormals();
      }
      const m = place(new THREE.Mesh(geo, material), x, y, z, parent);
      m.scale.z = depthK;
      return m;
    },
    cyl: (rTop, rBot, h, material, x, y, z, parent) => place(new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, q(16, 5)), material), x, y, z, parent),
    sball: (r, material, x, y, z, parent) =>
      place(new THREE.Mesh(new THREE.SphereGeometry(r, r < 0.035 ? q(8, 4) : q(16, 6), r < 0.035 ? q(6, 3) : q(12, 4)), material), x, y, z, parent),
    box: (w, h, d, color, x, y, z, parent) => place(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), flat(color)), x, y, z, parent),
    tube(pts, rad, material, parent, tension = 0.5) {
      const m = noOut(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', tension), q(64, 12), rad, q(6, 4)), material));
      parent.add(m);
      return m;
    },
    loft(st0, material, parent, shape = [2, 2], segs0 = 20) {
      const segs = q(segs0, 8);
      // огтлолуудын хооронд муруйгаар нягтруулна — хошуу, өсгий талтай биш, жигд муруй болно
      const c1 = new THREE.CatmullRomCurve3(st0.map(([z, y, rx]) => new THREE.Vector3(z, y, rx)), false, 'catmullrom', 0.5);
      const c2 = new THREE.CatmullRomCurve3(st0.map(([, , , ry]) => new THREE.Vector3(ry, 0, 0)), false, 'catmullrom', 0.5);
      const n = (st0.length - 1) * 4;
      const st: Section[] = Array.from({ length: n + 1 }, (_, k) => {
        const a1 = c1.getPoint(k / n), a2 = c2.getPoint(k / n);
        return [a1.x, a1.y, Math.max(0.002, a1.z), Math.max(0.002, a2.x)];
      });
      const first = st[0]!, last = st[st.length - 1]!;
      const cz = (first[0] + last[0]) / 2, cy = st[Math.floor(st.length / 2)]![1];
      const pos: number[] = [], idx: number[] = [];
      st.forEach(([z, y, rx, ry], i) => {
        const a = st[Math.max(0, i - 1)]!, b = st[Math.min(st.length - 1, i + 1)]!;
        let tz = b[0] - a[0], ty = b[1] - a[1];
        const tl = Math.hypot(tz, ty) || 1; tz /= tl; ty /= tl;
        for (let k = 0; k < segs; k++) {                       // огтлол нурууны шугамд перпендикуляр
          const ang = (k / segs) * Math.PI * 2, cs = Math.cos(ang), sn = Math.sin(ang), e = 2 / (sn >= 0 ? shape[0] : shape[1]);
          const u = Math.sign(cs) * Math.pow(Math.abs(cs), e) * rx, v = Math.sign(sn) * Math.pow(Math.abs(sn), e) * ry;
          pos.push(u, y - cy + v * tz, z - cz - v * ty);
        }
      });
      for (let i = 0; i < st.length - 1; i++) for (let k = 0; k < segs; k++) {
        const a = i * segs + k, b = i * segs + ((k + 1) % segs), c = a + segs, d = b + segs;
        idx.push(a, b, c, b, d, c);   // гадагш харсан тал
      }
      // Хоёр үзүүрийг таглана (нүх үлдээхгүй)
      const n0 = pos.length / 3, lastRow = (st.length - 1) * segs;
      pos.push(0, first[1] - cy, first[0] - cz, 0, last[1] - cy, last[0] - cz);
      for (let k = 0; k < segs; k++) {
        idx.push(n0, (k + 1) % segs, k);
        idx.push(n0 + 1, lastRow + k, lastRow + ((k + 1) % segs));
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      return place(new THREE.Mesh(geo, material), 0, cy, cz, parent);
    },
    fluff(points, r, material, parent, seed = 3) {
      if (detail === 'npc') {   // хоолой: зузаан нь бөмбөлгүүдийн дундаж, гадаргуу нь үсний текстур
        const closed = points.length > 2 && points[0]!.distanceTo(points[points.length - 1]!) < r;
        const curve = new THREE.CatmullRomCurve3(closed ? points.slice(0, -1) : points, closed);
        const m = noOut(new THREE.Mesh(new THREE.TubeGeometry(curve, q(Math.ceil(curve.getLength() / (r * 0.6)), 8), r * 0.95, q(8, 5), closed), material));
        m.castShadow = true;
        parent.add(m);
        return m;
      }
      const rnd = (): number => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const pts: THREE.Vector3[] = [];
      for (let n = 1; n < points.length; n++) {                 // алхмыг r·0.5 болгож нягтруулна
        const a = points[n - 1]!, b = points[n]!, steps = Math.max(1, Math.ceil(a.distanceTo(b) / (r * 0.5)));
        for (let k = 0; k < steps; k++) pts.push(a.clone().lerp(b, k / steps));
      }
      pts.push(points[points.length - 1]!);
      const m = new THREE.InstancedMesh((fluffGeo ??= new THREE.SphereGeometry(1, 8, 6)), material, pts.length);
      const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
      pts.forEach((pt, n) => {
        const k = r * (0.88 + rnd() * 0.28);
        S.set(k * (0.9 + rnd() * 0.25), k * (0.9 + rnd() * 0.25), k * (0.9 + rnd() * 0.25));
        Q.setFromEuler(new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6));
        M.compose(new THREE.Vector3(pt.x + (rnd() - 0.5) * r * 0.35, pt.y + (rnd() - 0.5) * r * 0.35, pt.z + (rnd() - 0.5) * r * 0.35), Q, S);
        m.setMatrixAt(n, M);
      });
      m.castShadow = true;
      noOut(m);
      parent.add(m);
      return m;
    },
  };
}
