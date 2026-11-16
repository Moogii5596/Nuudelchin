/**
 * Хонь, ямааны геометрийн нийтлэг угсралт (tools/character-lab/animals.html-ийн батлагдсан хэлбэр): гөлгөр Lambert, эргэлтийн биет,
 * шинжилгээний нормал. Дэлгэрэнгүй ба хөнгөн хувилбар ижил функцийг өөр хуваалтаар (seg/rows) дууддаг.
 * Өнгөний тухай: оройн өнгө (color) + aSlot — 0 тогтмол өнгө (нүд, туурай), 1 = instanceColor-оор үржинэ,
 * 1..2 = алаг толбо (iPatch = 1 бол бараан), 3 = туслахын тэмдэг (iMark = 1 бол хөх). render/animal/lod.ts-ийн shader.
 */
import * as THREE from 'three';
import type { BodyLook, DLook, SkirtLook } from './config';

export const smooth01 = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const pos = (g: THREE.BufferGeometry): THREE.BufferAttribute => g.attributes.position as THREE.BufferAttribute;
export const triOf = (g: THREE.BufferGeometry): number => (g.index ? g.index.count : g.attributes.position!.count) / 3;

/** Эллипсоид (шинжилгээний гөлгөр нормалтай) */
export function ellipsoid(rx: number, ry: number, rz: number, at: [number, number, number] = [0, 0, 0], w = 24, h = 16): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, w, h);
  const p = pos(g), n = g.attributes.normal as THREE.BufferAttribute, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    v.set(x / rx, y / ry, z / rz).normalize();
    n.setXYZ(i, v.x, v.y, v.z);
    p.setXYZ(i, x * rx + at[0], y * ry + at[1], z * rz + at[2]);
  }
  return g;
}

/** Бие: нэг цэвэр торх (superellipse профайлтай lathe, урт нь z тэнхлэгт); шинжилгээний нормал — цөөн хуваалттай ч бөөрөнхий */
export function bodyGeo({ L, R, wide, p }: BodyLook, seg: number, rows: number, sag = 0): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= rows; i++) {
    const t = -Math.cos((Math.PI * i) / rows);
    pts.push(new THREE.Vector2(R * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), p)), 1 / p), (t * L) / 2));
  }
  const g = new THREE.LatheGeometry(pts, seg);
  g.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
  const ps = pos(g), an: number[] = [];
  for (let i = 0; i < ps.count; i++) {
    const X = ps.getX(i), Y = ps.getY(i), Z = ps.getZ(i), r = Math.hypot(X, Y) || 1e-6, a = r / R, u = Z / (L / 2);
    const k = Math.pow(a, p - 1) / R, nx = (k * (X / r)) / wide, ny = k * (Y / r), nz = (Math.sign(u) * Math.pow(Math.abs(u), p - 1)) / (L / 2);
    const m = Math.hypot(nx, ny, nz) || 1;
    an.push(nx / m, ny / m, nz / m);
    ps.setX(i, X * wide);
    if (sag) { const y = ps.getY(i), uu = ps.getZ(i) / (L / 2); if (y > 0) ps.setY(i, y - sag * (1 - uu * uu) * (y / R)); }   // хөгшин: нуруу бага зэрэг хонхойно
  }
  g.setAttribute('normal', new THREE.Float32BufferAttribute(an, 3));
  return g;
}

/** Хүзүү: богино бүдүүн хоолой (+z руу), урт нь len */
const NECK_PROF: [number, number][] = [[0.12, -0.02], [0.125, 0.05], [0.104, 0.17], [0.082, 0.27]];
export function neckGeo(len: number, seg: number, rows: number, rk: number): THREE.BufferGeometry {
  const curve = new THREE.SplineCurve(NECK_PROF.map(([r, y]) => new THREE.Vector2(r * rk, y * (len / 0.26))));
  const g = new THREE.LatheGeometry(curve.getPoints(rows), seg);
  g.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
  g.computeVertexNormals();
  return g;
}

/** Өөхөн/богино сүүл: хавтгайдуу эллипсоид, оройгоороо тулгууртай (pivot = дээд) */
export function tailGeo({ w, h, d }: DLook['tail'], sw: number, sh: number): THREE.BufferGeometry {
  const g = ellipsoid(w, h, d, [0, 0, 0], sw, sh), p = pos(g);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), t = smooth01(0, -h, y);
    p.setXYZ(i, x * (1 - 0.22 * t), y - h, z * (1 - 0.12 * t) - d * 0.2);
  }
  return g;
}

/** Хормой (ноолууран ямаа): биеийн хажуугаас хэвлий, хөлийн дээд хэсгийг даган унжих урт үс; ирмэг нь шүдлэг (биеийн локал координат) */
export function skirtGeo(body: BodyLook, S: SkirtLook, NZ: number, NJ: number): THREE.BufferGeometry {
  const { L, R, wide, p } = body, ps: number[] = [], idx: number[] = [];
  for (const sx of [1, -1]) {
    const base = ps.length / 3;
    for (let i = 0; i <= NZ; i++) {
      const t = -0.94 + (1.88 * i) / NZ, f = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(t), p)), 1 / p), z = (t * L) / 2;
      const hem = -R * f - S.hair * Math.sqrt(f) + (i % 2 ? S.amp * f : 0);                // сондгой багана = шүдний үзүүр
      const xk = wide * R * Math.cos(S.knee) * f + S.off * Math.min(1, f * 3), yk = R * Math.sin(S.knee) * f;
      for (let j = 0; j <= NJ; j++) {
        const u = j / NJ;
        let x: number, y: number;
        if (u <= 0.5) { const a = S.attach + (S.knee - S.attach) * (u / 0.5); x = wide * R * Math.cos(a) * f + (0.004 + (S.off - 0.004) * (u / 0.5)) * Math.min(1, f * 3); y = R * Math.sin(a) * f; }
        else { const q = (u - 0.5) / 0.5; x = xk + S.flare * q * f; y = yk + (hem - yk) * q; }
        ps.push(sx * x, y, z);
      }
    }
    for (let i = 0; i < NZ; i++) for (let j = 0; j < NJ; j++) {
      const a = base + i * (NJ + 1) + j, b = a + 1, c = a + (NJ + 1), e = c + 1;
      if (sx > 0) idx.push(a, c, b, b, c, e); else idx.push(a, b, c, b, e, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(ps, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Алаг зүсний толбо: бие дээрх гөлгөр толбо (биеийн локал координат, м; sc — биеийн хэмжээ / 0.285) */
const PATCH: [number, number, number, number][] = [[-0.13, 0.06, 0.24, 0.16], [-0.14, -0.04, -0.04, 0.17], [-0.1, 0.1, -0.3, 0.15], [-0.12, -0.1, 0.36, 0.1], [0.13, 0.08, 0.1, 0.18], [0.14, -0.06, -0.26, 0.16], [0.1, 0.1, 0.34, 0.12]];
export const patchK = (x0: number, y0: number, z0: number, sc = 1): number => {
  const x = x0 / sc, y = y0 / sc, z = z0 / sc;
  let v = 0;
  for (const [bx, by, bz, r] of PATCH) v += Math.exp(-((x - bx) ** 2 + (y - by) ** 2 * 0.8 + (z - bz) ** 2) / (r * r));
  return smooth01(0.58, 0.68, v);
};

/** Туслахын тэмдэг: нурууны будаг — биеийн орой дээр хавтгай эллипс (aSlot 3) */
export function markGeo(body: BodyLook, seg: number, rows: number): THREE.BufferGeometry {
  return ellipsoid(body.R * 0.32, 0.03, body.L * 0.15, [0, body.R * 0.98, body.L * 0.05], seg, rows);
}

/** Геометрт оройн өнгө ба aSlot тавина (uv-гүй) */
export function prep(g: THREE.BufferGeometry, slot: number, rgb = 0xffffff): THREE.BufferGeometry {
  g.deleteAttribute('uv');
  const n = g.attributes.position!.count, c = new THREE.Color(rgb), col = new Float32Array(n * 3), sl = new Float32Array(n).fill(slot);
  for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSlot', new THREE.BufferAttribute(sl, 1));
  return g;
}
