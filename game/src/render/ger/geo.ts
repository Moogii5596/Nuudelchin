/** Геометр угсрагч: бүх хөдөлгөөнгүй хэсэг нэг BufferGeometry (vertex color + нэг атлас). Эх: character-lab/ger.html */
import * as THREE from 'three';
import { GER } from './config';

export type V3 = [number, number, number];
export type V2 = [number, number];
type VecOrList<T> = T | T[];

const _col = new THREE.Color();
export const rgb = (hex: string, mul = 1): V3 => { _col.set(hex); return [_col.r * mul, _col.g * mul, _col.b * mul]; };
export const mix = (a: string, b: string, t: number): V3 => { const A = rgb(a), B = rgb(b); return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]; };
export const px2uv = (x: number, y: number): V2 => [x / GER.atlas.size, 1 - y / GER.atlas.size];

export interface LatheOpts {
  profile?: V2[];
  /** Өнцөг бүрт өөр профайл (t01 = 0..1) */
  profileFn?: (t01: number) => V2[];
  segs?: number;
  a0?: number; a1?: number; cx?: number; cz?: number;
  color?: V3;
  colorAt?: (seg: number, side: number, pi: number, j: number) => V3;
  smooth?: boolean;
  uv?: V2;
  uvAt?: (i: number, f: number) => V2;
  /** skipSeg(i): тэр хэсгийг зурахгүй (зөвхөн залгаасын нормальд оролцоно) */
  skipSeg?: (i: number) => boolean;
  /** Баганын өнцгүүдийг шууд өгнө (хоёр биеийн оройг давхцуулахад) */
  angles?: number[];
}
export interface LoftRow { y: number; w: number; d: number; cx?: number; cz?: number }
export interface LoftOpts {
  rows: LoftRow[];
  segs: number;
  color?: V3;
  colorAt?: (i: number, f: number) => V3;
  uvAt?: (i: number, f: number) => V2;
  /** radius үржүүлэгч (дөрвөлжин огтлол, хонхор, атираа) */
  mod?: (i: number, angle: number) => number;
}

export class Geo {
  p: number[] = [];
  n: number[] = [];
  c: number[] = [];
  u: number[] = [];
  private w: V2;
  constructor(defaultUV?: V2) { this.w = defaultUV || [0.5, 0.5]; }
  _v(p: V3, n: V3, c: V3, uv?: V2): void { this.p.push(p[0], p[1], p[2]); this.n.push(n[0], n[1], n[2]); this.c.push(c[0], c[1], c[2]); const t = uv || this.w; this.u.push(t[0], t[1]); }
  tri(a: V3, b: V3, c: V3, na: V3, nb: V3, nc: V3, ca: V3, cb: V3, cc: V3, ua?: V2, ub?: V2, uc?: V2): void {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    if (Math.hypot(fx, fy, fz) < 1e-9) return;
    const d = fx * (na[0] + nb[0] + nc[0]) + fy * (na[1] + nb[1] + nc[1]) + fz * (na[2] + nb[2] + nc[2]);
    this._v(a, na, ca, ua);
    if (d >= 0) { this._v(b, nb, cb, ub); this._v(c, nc, cc, uc); } else { this._v(c, nc, cc, uc); this._v(b, nb, cb, ub); }
  }
  /** P: 4 цэг тойруулж; N, C: 4 эсвэл нэг; U: 4 эсвэл хоосон */
  quad(P: V3[], N: VecOrList<V3>, C: VecOrList<V3>, U?: V2[] | null): void {
    const n = (i: number): V3 => (Array.isArray(N[0]) ? (N as V3[])[i]! : (N as V3));
    const c = (i: number): V3 => (Array.isArray(C[0]) ? (C as V3[])[i]! : (C as V3));
    const u = (i: number): V2 | undefined => (U ? U[i] : undefined);
    this.tri(P[0]!, P[1]!, P[2]!, n(0), n(1), n(2), c(0), c(1), c(2), u(0), u(1), u(2));
    this.tri(P[0]!, P[2]!, P[3]!, n(0), n(2), n(3), c(0), c(2), c(3), u(0), u(2), u(3));
  }
  /* Эргэлтийн бие. profile: [[r,y],...] — гадна тал нь "баруун гар" талд байхаар доороос дээш/гаднаас дотогш.
     profileFn(t01) өгвөл өнцөг бүрт өөр профайл. colorAt(seg, side, pointIdx, j) → [r,g,b] */
  lathe(o: LatheOpts): void {
    const { profile, profileFn, a0 = 0, a1 = Math.PI * 2, cx = 0, cz = 0, color, colorAt, smooth = true, uv, uvAt, skipSeg, angles } = o;
    const segs = angles ? angles.length - 1 : o.segs!;
    const col = (seg: number, side: number, pi: number, j: number): V3 => (colorAt ? colorAt(seg, side, pi, j) : color!);
    const column = (t01: number) => {
      const P = profileFn ? profileFn(t01) : profile!, m = P.length - 1, sn: V2[] = [];
      for (let i = 0; i < m; i++) { const dr = P[i + 1]![0] - P[i]![0], dy = P[i + 1]![1] - P[i]![1], l = Math.hypot(dr, dy) || 1; sn.push([dy / l, -dr / l]); }
      const pn = (pi: number, seg: number): V2 => {
        if (!smooth) return sn[seg]!;
        const a = sn[Math.max(0, pi - 1)]!, b = sn[Math.min(m - 1, pi)]!, x = a[0] + b[0], y = a[1] + b[1], l = Math.hypot(x, y) || 1;
        return [x / l, y / l];
      };
      return { P, pn, m };
    };
    for (let j = 0; j < segs; j++) {
      const f0 = j / segs, f1 = (j + 1) / segs, t0 = angles ? angles[j]! : a0 + (a1 - a0) * f0, t1 = angles ? angles[j + 1]! : a0 + (a1 - a0) * f1;
      const A = column(f0), B = column(f1), s0 = Math.sin(t0), c0 = Math.cos(t0), s1 = Math.sin(t1), c1 = Math.cos(t1);
      const pos = (q: V2, s: number, c: number): V3 => [cx + q[0] * s, q[1], cz + q[0] * c];
      const nor = (q: V2, s: number, c: number): V3 => [q[0] * s, q[1], q[0] * c];
      for (let i = 0; i < A.m; i++) {
        if (skipSeg && skipSeg(i)) continue;
        this.quad(
          [pos(A.P[i]!, s0, c0), pos(B.P[i]!, s1, c1), pos(B.P[i + 1]!, s1, c1), pos(A.P[i + 1]!, s0, c0)],
          [nor(A.pn(i, i), s0, c0), nor(B.pn(i, i), s1, c1), nor(B.pn(i + 1, i), s1, c1), nor(A.pn(i + 1, i), s0, c0)],
          [col(i, 0, i, j), col(i, 1, i, j), col(i, 1, i + 1, j), col(i, 0, i + 1, j)],
          uvAt ? [uvAt(i, f0), uvAt(i, f1), uvAt(i + 1, f1), uvAt(i + 1, f0)] : uv ? [uv, uv, uv, uv] : null);
      }
    }
  }
  /* Эллипс огтлолуудыг холбосон гөлгөр бие (уут, арьсан сав). rows: [{y, w, d, cx, cz}]; uvAt(rowIdx, 0..1) */
  loft(o: LoftOpts): void {
    const { rows, segs, color, colorAt, uvAt, mod } = o;
    const A = (j: number): number => (j / segs) * Math.PI * 2, last = rows.length - 1;
    const pt = (i: number, j: number): V3 => { const r = rows[i]!, a = A(j), m = mod ? mod(i, a) : 1; return [(r.cx || 0) + r.w * m * Math.sin(a), r.y, (r.cz || 0) + r.d * m * Math.cos(a)]; };
    const nr = (i: number, j: number): V3 => {
      const a = A(j), u0 = pt(i, j - 1), u1 = pt(i, j + 1), v0 = pt(Math.max(0, i - 1), j), v1 = pt(Math.min(last, i + 1), j);
      const tu = [u1[0] - u0[0], u1[1] - u0[1], u1[2] - u0[2]] as V3, tv = [v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]] as V3;
      const n = [tu[1] * tv[2] - tu[2] * tv[1], tu[2] * tv[0] - tu[0] * tv[2], tu[0] * tv[1] - tu[1] * tv[0]] as V3, l = Math.hypot(n[0], n[1], n[2]) || 1;
      const s = (n[0] * Math.sin(a) + n[2] * Math.cos(a)) < 0 ? -1 / l : 1 / l; return [n[0] * s, n[1] * s, n[2] * s];
    };
    const col = (i: number, j: number): V3 => (colorAt ? colorAt(i, j / segs) : color!);
    for (let i = 0; i < rows.length - 1; i++) for (let j = 0; j < segs; j++)
      this.quad([pt(i, j), pt(i, j + 1), pt(i + 1, j + 1), pt(i + 1, j)], [nr(i, j), nr(i, j + 1), nr(i + 1, j + 1), nr(i + 1, j)],
        [col(i, j), col(i, j + 1), col(i + 1, j + 1), col(i + 1, j)], uvAt ? [uvAt(i, j / segs), uvAt(i, (j + 1) / segs), uvAt(i + 1, (j + 1) / segs), uvAt(i + 1, j / segs)] : null);
  }
  /** төв + гурван хагас тэнхлэг */
  obox(c: V3, ax: V3, ay: V3, az: V3, color: V3): void {
    const A = [ax, ay, az];
    for (let k = 0; k < 3; k++) for (const s of [1, -1]) {
      const K = A[k]!, U = A[(k + 1) % 3]!, V = A[(k + 2) % 3]!, l = Math.hypot(K[0], K[1], K[2]) || 1, n: V3 = [s * K[0] / l, s * K[1] / l, s * K[2] / l];
      const pt = (a: number, b: number): V3 => [c[0] + s * K[0] + a * U[0] + b * V[0], c[1] + s * K[1] + a * U[1] + b * V[1], c[2] + s * K[2] + a * U[2] + b * V[2]];
      this.quad([pt(1, 1), pt(-1, 1), pt(-1, -1), pt(1, -1)], n, color);
    }
  }
  box(x: number, y: number, z: number, sx: number, sy: number, sz: number, color: V3): void { this.obox([x, y, z], [sx / 2, 0, 0], [0, sy / 2, 0], [0, 0, sz / 2], color); }
  /** хоёр цэгийн хоорондох дөрвөлжин мод/оосор */
  beam(p0: V3, p1: V3, w: number, h: number, color: V3): void {
    const d: V3 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], L = Math.hypot(d[0], d[1], d[2]) || 1, e: V3 = [d[0] / L, d[1] / L, d[2] / L];
    const ref: V3 = Math.abs(e[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0];
    let s: V3 = [e[1] * ref[2] - e[2] * ref[1], e[2] * ref[0] - e[0] * ref[2], e[0] * ref[1] - e[1] * ref[0]];
    const sl = Math.hypot(s[0], s[1], s[2]); s = [s[0] / sl, s[1] / sl, s[2] / sl];
    const t: V3 = [s[1] * e[2] - s[2] * e[1], s[2] * e[0] - s[0] * e[2], s[0] * e[1] - s[1] * e[0]];
    this.obox([(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2],
      [d[0] / 2, d[1] / 2, d[2] / 2], [t[0] * h / 2, t[1] * h / 2, t[2] * h / 2], [s[0] * w / 2, s[1] * w / 2, s[2] * w / 2], color);
  }
  /** өөр Geo-г Y тэнхлэгээр phi эргүүлж (tx, tz)-д нэмнэ */
  append(o: Geo, phi = 0, tx = 0, tz = 0): void {
    const cs = Math.cos(phi), sn = Math.sin(phi);
    for (let i = 0; i < o.p.length; i += 3) {
      this.p.push(o.p[i]! * cs + o.p[i + 2]! * sn + tx, o.p[i + 1]!, -o.p[i]! * sn + o.p[i + 2]! * cs + tz);
      this.n.push(o.n[i]! * cs + o.n[i + 2]! * sn, o.n[i + 1]!, -o.n[i]! * sn + o.n[i + 2]! * cs);
    }
    for (const v of o.c) this.c.push(v);
    for (const v of o.u) this.u.push(v);
  }
  get triangles(): number { return this.p.length / 9; }
  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    return g;
  }
}

/** Бэхэн хүрээ: нормалийн дагуу томруулсан арын тал (гол дүр, гэртэй ижил) */
export function outlineMaterial(color: string, width: number): THREE.MeshBasicMaterial {
  const om = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  om.onBeforeCompile = (s) => { s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normal * ${width.toFixed(4)};`); };
  return om;
}
