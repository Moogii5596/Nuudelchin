/**
 * Хонь, ямааны толгой (хэрэглэгч баталсан H1 / G2): духан талдаа өргөн, хошуу руугаа нарийссан бөөрөнхий; нүд, чих, хамар, ам,
 * эвэр, сахал — жинхэнэ жижиг геометр. Бүгдийг нэг геометр болгож (чих унжсан байдлаар, нүд нээлттэй) толгойн хазайлтыг шингээнэ.
 * Өнгө: толгойн өнгө = instanceColor (slot 1), нүд/хамар/ам/эвэр/чихний дотор = тогтмол (slot 0).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { DLook, HeadLook } from './config';
import { animalLook } from './config';
import { ellipsoid, prep, smooth01 } from './geo';

export interface HeadQ { seg: number; rows: number; eyeSeg: number; noseSeg: number; tube: Pair2; ear: Pair2; innerSeg: number; horn: Pair2; beard: Pair2 }
type Pair2 = [number, number];
export const Q_DETAIL: HeadQ = { seg: 28, rows: 18, eyeSeg: 20, noseSeg: 8, tube: [6, 5], ear: [14, 10], innerSeg: 14, horn: [16, 10], beard: [10, 6] };
export const Q_LIGHT: HeadQ = { seg: 8, rows: 5, eyeSeg: 6, noseSeg: 4, tube: [2, 3], ear: [5, 3], innerSeg: 5, horn: [4, 3], beard: [5, 3] };

/** Алс мал: хамгийн бүдүүвч (far.ts) */
export const Q_FAR: HeadQ = { seg: 6, rows: 3, eyeSeg: 0, noseSeg: 3, tube: [1, 3], ear: [4, 2], innerSeg: 3, horn: [3, 3], beard: [3, 3] };

const pos = (g: THREE.BufferGeometry): THREE.BufferAttribute => g.attributes.position as THREE.BufferAttribute;
/** Хөндлөн огтлолын дөрвөлжин хэлбэр (superellipse); square байхгүй бол дугуй */
const sqK = (h: HeadLook, a: number): number => (h.square ? Math.pow(Math.pow(Math.abs(Math.cos(a)), h.square) + Math.pow(Math.abs(Math.sin(a)), h.square), -1 / h.square) : 1);
/** Хошууны оройн доошлолт (шаантаг профиль) */
const dropAt = (h: HeadLook, t: number): number => (h.drop ? h.drop * smooth01(0.25, 0.95, t) : 0);
const radAt = (h: HeadLook, t: number): number => {
  const tp = h.taperT ?? [0.28, 0.85], k = h.taperLin ? Math.min(1, Math.max(0, (t - tp[0]) / (tp[1] - tp[0]))) : smooth01(tp[0], tp[1], t);
  const base = h.rn + (h.r - h.rn) * (1 - k);
  const cap = t < 0.12 ? Math.sqrt(Math.max(0, 1 - Math.pow(1 - t / 0.12, 2))) : 1;
  const capF = t > 0.84 ? Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.84) / 0.16, 2))) : 1;
  return base * cap * capF;
};
function headSkull(h: HeadLook, seg: number, rows: number): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= rows; i++) { const t = (1 - Math.cos((Math.PI * i) / rows)) / 2; pts.push(new THREE.Vector2(radAt(h, t), t * h.L)); }
  const g = new THREE.LatheGeometry(pts, seg);
  g.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
  const p = pos(g);
  for (let i = 0; i < p.count; i++) {
    const k = sqK(h, Math.atan2(p.getY(i), p.getX(i))), x = p.getX(i) * k * h.hx, z = p.getZ(i);
    let y = p.getY(i) * k;
    if (h.bridge && y > 0) y += h.bridge * Math.sin(Math.PI * Math.min(1, Math.max(0, (z / h.L - 0.3) / 0.6))) * Math.min(1, y / (h.r * 0.5));
    y -= dropAt(h, z / h.L);
    p.setXYZ(i, x, y, z - h.zb * h.L);
  }
  g.computeVertexNormals();
  return g;
}
const surf = (h: HeadLook, t: number, phi: number, sx: number, out = 0): THREE.Vector3 => {
  const r = radAt(h, t) * sqK(h, phi) + out, y = Math.sin(phi) * r;
  return new THREE.Vector3(sx * Math.cos(phi) * r * h.hx, y - dropAt(h, t), t * h.L - h.zb * h.L);
};

function hornGeo(h: HeadLook, sx: number, k: number, q: HeadQ): THREE.BufferGeometry {
  const H = h.horn!, len = H.len * k, root = surf(h, H.t, H.phi, sx, -0.012);
  const P = H.pts.map(([x, y, z]) => new THREE.Vector3(sx * x * len, y * len, z * len).add(root));
  const curve = new THREE.CatmullRomCurve3(P), n = q.horn[0], rad = q.horn[1], fr = curve.computeFrenetFrames(n, false);
  const ps: number[] = [], idx: number[] = [], r0 = H.r0 * (0.55 + 0.45 * Math.min(1, k));
  for (let i = 0; i <= n; i++) {
    const u = i / n, c = curve.getPoint(u), N = fr.normals[i]!, B = fr.binormals[i]!, r = r0 * (Math.pow(1 - u, 0.8) * 0.96 + 0.04);
    for (let j = 0; j < rad; j++) { const a = (j / rad) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a); ps.push(c.x + (N.x * ca + B.x * sa) * r, c.y + (N.y * ca + B.y * sa) * r, c.z + (N.z * ca + B.z * sa) * r); }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < rad; j++) {
    const a = i * rad + j, b = i * rad + ((j + 1) % rad), c2 = (i + 1) * rad + j, d = (i + 1) * rad + ((j + 1) % rad);
    idx.push(a, b, c2, b, d, c2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(ps, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
function beardGeo(h: HeadLook, q: HeadQ): THREE.BufferGeometry {
  const b = h.beard!, g = ellipsoid(b.w, b.len / 2, b.w * 0.8, [0, -b.len * 0.45, 0], q.beard[0], q.beard[1]), pp = pos(g);
  for (let i = 0; i < pp.count; i++) { const t = smooth01(0.2, 1, -pp.getY(i) / b.len), f = 1 - 0.5 * t; pp.setX(i, pp.getX(i) * f); pp.setZ(i, pp.getZ(i) * f); }
  g.applyMatrix4(new THREE.Matrix4().makeRotationX(-0.25));
  const at = surf(h, b.t, -Math.PI / 2, 1, -0.006);
  g.translate(0, at.y, at.z);
  return g;
}

/**
 * Толгойн нэг геометр (толгойн локал координат + хазайлт). hornK — эвэрийн хэмжээ (0 = эвэргүй); хөнгөн/дэлгэрэнгүй = q
 */
export interface HeadOpt { /** хошууны өнгө (null = байхгүй) */ tan?: number | null; /** дэлгэрэнгүй: хацрын үс, хялгас */ detail?: boolean }
export function headGeo(d: DLook, h: HeadLook, q: HeadQ, hornK: number, opt: HeadOpt = {}): THREE.BufferGeometry {
  const P = animalLook.palette, tipC = new THREE.Color(h.tip ?? P.muzzleTip);
  const parts: THREE.BufferGeometry[] = [];
  const skull = prep(headSkull(h, q.seg, q.rows), 1);
  {   // хошууны үзүүр (хамар), хошуу/хацрын өнгө: slot-ыг бууруулж оройн өнгийг тавина
    const p = pos(skull), col = skull.attributes.color as THREE.BufferAttribute, sl = skull.attributes.aSlot as THREE.BufferAttribute;
    const muz = h.muzzle ? new THREE.Color(opt.tan ?? h.muzzle.c) : null, tc = new THREE.Color(), tt = h.tipT ?? [0.72, 0.95];
    for (let i = 0; i < p.count; i++) {
      const tz = (p.getZ(i) + h.zb * h.L) / h.L, wt = smooth01(tt[0], tt[1], tz);
      const wm = muz && opt.tan !== null ? smooth01(h.muzzle!.t[0], h.muzzle!.t[1], tz) * (h.muzzle!.low ? smooth01(0.5, -0.2, p.getY(i) / h.r) : 1) : 0;
      const w = Math.max(wt, wm); tc.copy(muz && wm > wt ? muz : tipC);
      sl.setX(i, 1 - w);
      col.setXYZ(i, 1 + w * (tc.r - 1), 1 + w * (tc.g - 1), 1 + w * (tc.b - 1));
    }
  }
  parts.push(skull);
  const M = new THREE.Matrix4(), M2 = new THREE.Matrix4(), pk = h.pupil ?? [0.55, 0.7];
  const far = q.eyeSeg === 0;   // алс: нүд, хамар, ам, чихний дотор, толгойн жижиг тэмдэг байхгүй (бүдүүвч)
  for (const sx of [-1, 1]) {
    if (!far) {
    const phi = h.eyePhi ?? 0.38, at = surf(h, h.eyeT, phi, sx, 0.0015), tilt = new THREE.Matrix4().makeRotationZ(-(h.eyeTilt ?? 0));
    M.makeRotationZ(sx * phi).multiply(M2.makeRotationY((sx * Math.PI) / 2));
    const nrm = new THREE.Vector3(sx * Math.cos(phi), Math.sin(phi), 0);
    const cream = new THREE.CircleGeometry(1, q.eyeSeg); cream.scale(h.ea, h.eb, 1); cream.applyMatrix4(tilt); cream.applyMatrix4(M); cream.translate(at.x, at.y, at.z);
    const pupil = new THREE.CircleGeometry(1, q.eyeSeg); pupil.scale(h.ea * pk[0], h.eb * pk[1], 1); pupil.applyMatrix4(tilt); pupil.applyMatrix4(M);
    pupil.translate(nrm.x * 0.002 + at.x, nrm.y * 0.002 + at.y, h.ea * (h.pupilFwd ?? 0.22) + at.z);
    parts.push(prep(cream, 0, h.eyeC ?? P.eyeWhite), prep(pupil, 0, P.eyeInk));
    const nz = (1 - h.zb) * h.L - 0.0025, nose = new THREE.CircleGeometry(1, q.noseSeg);
    nose.scale(h.rn * 0.18, h.rn * 0.12, 1); nose.applyMatrix4(M2.makeRotationY(sx * 0.35)); nose.translate(sx * h.rn * 0.32, h.rn * 0.16 - dropAt(h, 1), nz);
    parts.push(prep(nose, 0, P.nose));
    const curve = new THREE.CatmullRomCurve3([0.965, 0.915, 0.86].map((t) => surf(h, t, -0.5, sx, 0.0015)));
    parts.push(prep(new THREE.TubeGeometry(curve, q.tube[0], 0.0035, q.tube[1], false), 0, P.nose));
    }
    const e = h.ear, ep = surf(h, e.t ?? 0.13, e.phi ?? 0.85, sx, -0.004);
    const outer = ellipsoid(0.011, e.l / 2, e.w / 2, [0, -e.l * 0.45, 0], q.ear[0], q.ear[1]), op = pos(outer);
    for (let i = 0; i < op.count; i++) { const u = -op.getY(i) / e.l; op.setZ(i, op.getZ(i) * (1 - (e.taper ?? 0.55) * smooth01(e.taper ? 0 : 0.3, 1.0, u))); }
    const inner = new THREE.CircleGeometry(1, Math.max(3, q.innerSeg)); inner.scale(e.w * 0.3, e.l * 0.34, 1);
    inner.applyMatrix4(M2.makeRotationY(-sx * Math.PI / 2)); inner.translate(-sx * 0.0125, -e.l * 0.45, 0);
    if (e.face) { const R = new THREE.Matrix4().makeRotationY(sx * e.face); outer.applyMatrix4(R); inner.applyMatrix4(R); }
    if (e.fwd) { const R = new THREE.Matrix4().makeRotationX(e.fwd); outer.applyMatrix4(R); inner.applyMatrix4(R); }
    for (const g of far ? [prep(outer, 1)] : [prep(outer, 1), prep(inner, 0, P.earInner)]) { g.applyMatrix4(new THREE.Matrix4().makeRotationZ(sx * e.droop)); g.translate(ep.x, ep.y, ep.z); parts.push(g); }
  }
  if (h.horn && hornK > 0.05) for (const sx of [-1, 1]) parts.push(prep(hornGeo(h, sx, hornK, q), 0, P.horn));
  if (h.beard) parts.push(prep(beardGeo(h, q), 1));
  if (h.noseBall && !far) parts.push(prep(ellipsoid(h.rn * 0.72, h.rn * 0.52, h.rn * 0.5, [0, h.rn * 0.3 - dropAt(h, 1), (1 - h.zb) * h.L - h.rn * 0.38], opt.detail ? 14 : 5, opt.detail ? 10 : 3), 0, h.tip ?? P.nose));
  if (h.cheek && opt.detail) for (const sx of [-1, 1]) {   // хацрын сэвсгэр үс (чоно)
    const C = h.cheek, at = surf(h, C.t, C.phi, sx, -0.01);
    parts.push(prep(ellipsoid(C.r[0], C.r[1], C.r[2], [at.x, at.y, at.z], q.ear[0] + 2, q.ear[1] + 2), 0, new THREE.Color(C.c).lerp(new THREE.Color(0x888888), 0.0).getHex()));
  }
  const browC = opt.tan === undefined ? h.brows?.c : opt.tan ?? undefined;
  if (h.brows && browC !== undefined && !far) for (const sx of [-1, 1]) {   // банхарын «дөрвөн нүд»: нүдний дээрх шар толбо
    const phi = (h.eyePhi ?? 0.38) + h.brows.dPhi, at = surf(h, h.eyeT - h.brows.dT, phi, sx, 0.0025);
    const c = new THREE.CircleGeometry(1, q.eyeSeg); c.scale(h.brows.r * 1.2, h.brows.r, 1);
    c.applyMatrix4(new THREE.Matrix4().makeRotationZ(sx * phi).multiply(new THREE.Matrix4().makeRotationY(sx * Math.PI / 2))); c.translate(at.x, at.y, at.z);
    parts.push(prep(c, 0, browC));
  }
  if (h.forelock && opt.detail) {   // хялгас (духан дээрх дэл): mane өнгөтэй тусдаа биш — толгойн өнгө
    const F = h.forelock, at = surf(h, 0.16, Math.PI / 2, 1, 0.004), fg = ellipsoid(F.w, 0.009, F.len / 2, [0, 0, F.len / 2], 12, 8);
    fg.applyMatrix4(new THREE.Matrix4().makeRotationX(0.12)); fg.translate(at.x, at.y, at.z);
    parts.push(prep(fg, 1));
  }
  const g = mergeGeometries(parts, false);
  if (!g) throw new Error('headGeo: mergeGeometries амжилтгүй');
  parts.forEach((x) => x.dispose());
  g.applyMatrix4(new THREE.Matrix4().makeRotationX(d.headTilt));
  return g;
}
