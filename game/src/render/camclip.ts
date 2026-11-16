/**
 * Камерын мөргөлдөөн (V4.5 R7): камер барилга, гэрийн хананд орохгүй.
 * Дотор талын өрөөнүүд (V6.1) нь нэг талт ханатай «хайрцаг-хөндлөн огтлол» тул камер ханын гадна байх нь зориуд — тэнд мөргөлдөөн хэрэггүй.
 * Three.js, DOM-гүй цэвэр логик (тест хийхэд амар). Камер = «байнгын байрлал», зорилт = малчин.
 * Сегмент зорилт → камер дээр хамгийн ойр огтлолцлыг олж t ∈ [0, 1]-ээр буцаана (1 = чөлөөтэй).
 */

/** Y тэнхлэгээр rot радианаар эргэсэн дөрвөлжин хайрцаг (three-ийн rotateY-тай ижил чиглэл) */
export interface CamBox { x: number; z: number; hw: number; hd: number; rot: number; y0: number; y1: number }
/** Босоо цилиндр (гэр, майхан) */
export interface CamCyl { x: number; z: number; r: number; y0: number; y1: number }
export interface CamSolids { boxes: CamBox[]; cyls: CamCyl[] }

export type V3 = readonly [number, number, number];

/** Камерыг саадаас холдуулах зай (м) — ойр хавтгай (0.3) хананд орохоос хамгаална */
export const CAM_MARGIN = 0.7;
/** Малчин хананд ойр (CAM_MARGIN дотор) байхад хананд бодит ойртох зай */
const TIGHT = 0.2;

const INSIDE = -1;

/** Сегмент (a + d·t, t∈[0,1]) ба [-hx,hx]×[y0,y1]×[-hz,hz] хайрцагийн (локал) орох t; огтлолцохгүй бол null; эхлэл дотор бол INSIDE */
function slabHit(ax: number, ay: number, az: number, dx: number, dy: number, dz: number, hx: number, hz: number, y0: number, y1: number): number | null {
  let t0 = 0, t1 = 1;
  const axis = (a: number, d: number, lo: number, hi: number): boolean => {
    if (Math.abs(d) < 1e-9) return a >= lo && a <= hi;
    let u = (lo - a) / d, v = (hi - a) / d;
    if (u > v) [u, v] = [v, u];
    t0 = Math.max(t0, u); t1 = Math.min(t1, v);
    return t0 <= t1;
  };
  if (!axis(ax, dx, -hx, hx) || !axis(ay, dy, y0, y1) || !axis(az, dz, -hz, hz)) return null;
  const inside = ax >= -hx && ax <= hx && ay >= y0 && ay <= y1 && az >= -hz && az <= hz;
  return inside ? INSIDE : t0;
}

function boxHit(a: V3, b: V3, s: CamBox, m: number): number | null {
  const c = Math.cos(s.rot), sn = Math.sin(s.rot);
  // дэлхийн → локал: three rotateY(rot) = x' = x·c + z·s, z' = −x·s + z·c; урвуу нь доорх
  const lx = (x: number, z: number): number => (x - s.x) * c - (z - s.z) * sn;
  const lz = (x: number, z: number): number => (x - s.x) * sn + (z - s.z) * c;
  const ax = lx(a[0], a[2]), az = lz(a[0], a[2]);
  const dx = lx(b[0], b[2]) - ax, dz = lz(b[0], b[2]) - az;
  return slabHit(ax, a[1], az, dx, b[1] - a[1], dz, s.hw + m, s.hd + m, s.y0 - m, s.y1 + m);
}

function cylHit(a: V3, b: V3, s: CamCyl, m: number): number | null {
  const R = s.r + m, y0 = s.y0 - m, y1 = s.y1 + m;
  const px = a[0] - s.x, pz = a[2] - s.z, dx = b[0] - a[0], dz = b[2] - a[2], dy = b[1] - a[1];
  // y хэсгийн t завсар
  let t0 = 0, t1 = 1;
  if (Math.abs(dy) < 1e-9) { if (a[1] < y0 || a[1] > y1) return null; }
  else { let u = (y0 - a[1]) / dy, v = (y1 - a[1]) / dy; if (u > v) [u, v] = [v, u]; t0 = Math.max(t0, u); t1 = Math.min(t1, v); if (t0 > t1) return null; }
  // 2D тойрог: |p + d·t|² ≤ R²
  const A = dx * dx + dz * dz, B = 2 * (px * dx + pz * dz), C = px * px + pz * pz - R * R;
  if (A < 1e-12) { if (C > 0) return null; }
  else {
    const disc = B * B - 4 * A * C;
    if (disc < 0) return null;
    const sq = Math.sqrt(disc);
    t0 = Math.max(t0, (-B - sq) / (2 * A)); t1 = Math.min(t1, (-B + sq) / (2 * A));
    if (t0 > t1) return null;
  }
  const inside = C <= 0 && a[1] >= y0 && a[1] <= y1;
  return inside ? INSIDE : t0;
}

/** Сегмент (зорилт → камер) саадтай огтлолцох хамгийн бага t (1 = чөлөөтэй). Зорилт саадын зөөлөн зайд (m) орсон бол зөвхөн бодит ханыг (TIGHT) шалгана */
export function clipThroughSolids(a: V3, b: V3, s: CamSolids, m = CAM_MARGIN): number {
  let t = 1;
  const test = (hit: (mm: number) => number | null): void => {
    const e = hit(m);
    if (e === null) return;
    if (e !== INSIDE) { if (e < t) t = e; return; }
    const e2 = hit(TIGHT);
    if (e2 !== null && e2 !== INSIDE && e2 < t) t = e2;
  };
  for (const bx of s.boxes) test((mm) => boxHit(a, b, bx, mm));
  for (const c of s.cyls) test((mm) => cylHit(a, b, c, mm));
  return Math.max(0, t);
}
