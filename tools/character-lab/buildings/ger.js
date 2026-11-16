/* Гэрийн лабораторийн (V3.5, батлагдсан) Geo угсрагч ба makeGer — өөрчлөлтгүй хуулбар.
   Тоглоомд render/ger.ts-ээс авна; энд зөвхөн гэртэй хашааг харуулахад хэрэглэнэ. */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export const GER_CONFIG = {
  palette: {
    cover:   '#F8F5EE', felt: '#DDD3BE', hayavch: '#C9BB99', rope: '#7A5C3A', tono: '#D9622B', iron: '#4A4640',
    snow:    '#F2F5F8', snowShade:'#B8C8E0', fire: '#FFB35C', interior:'#2B1F17', outline: '#1A130D',
  },
  sizes: {
    small4: { label: 'Бага 4 ханат', walls: 4, diameter: 4.4, wallH: 1.40, topH: 2.40, tonoD: 1.00, uni: 52,  belts: 3, doorW: 0.78, doorH: 1.15 },
    big4:   { label: 'Том 4 ханат',  walls: 4, diameter: 5.0, wallH: 1.45, topH: 2.35, tonoD: 1.10, uni: 60,  belts: 3, doorW: 0.80, doorH: 1.20},
    small5: { label: 'Бага 5 ханат', walls: 5, diameter: 5.6, wallH: 1.50, topH: 2.50, tonoD: 1.20, uni: 72,  belts: 3, doorW: 0.82, doorH: 1.25},
  },
  shape: {
    puff: 0.05, roofPuff: 0.10, beltPinch: 0.014,
    eaveDrop: 0.14,
    shoulderIn: 0.26, shoulderUp: 0.16,
    hayavchH: 0.28, hayavchOut: 0.03,
    beltOut: 0.05, beltH: 0.045, beltAt: [0.2, 0.5, 0.8],
    tonoRingW: 0.08, tonoRingH: 0.10, tonoRise: 0.045, tonoProud: 0.015, spokes: 8,
    spokeT: 0.045,
    urkhOut: 0.45, urkhRopeLean: 0,
    chimneyR: 0.055, chimneyH: 0.70, chimneyOffR: 0.31, chimneySector: -0.5,
    doorSill: 0.05, jambW: 0.055, lintelH: 0.055, frameOut: 0.008, leafT: 0.022,
    doorStandOff: 0.75,
    doorSwing: 1.85,
    knob: '#D9A93A',
    outlineW: 0.018,
  },
  winter: { extraR: 0.05, hayavchH: 0.42, hayavchOut: 0.07, puff: 0.07, roofPuff: 0.13,
            shoulderUp: 0.19, bankW: 0.55, bankH: 0.30, roofSnowTo: 0.55 },
  doors: [
    { label: 'Улбар шар · үүлэн хээ', base: '#E8641E', frame: '#B94A14', line: '#FFF6E0', accent: '#D8388A', motif: 'cloud', stile: 0.18 },
    { label: 'Энгийн модон', base: '#A9783F', frame: '#7A5228', line: '#7A5228', accent: '#8A6230', motif: 'plain' },
  ],
  atlas: { size: 512, door: [259, 3, 509, 253], white: [208, 48], glow: [208, 192], felt: [276, 492], feltRepeat: 4, feltSpan: 3.4 },
  shade: { wallBottom: 0.84 },
};

const _col = new THREE.Color();
export const rgb = (hex, mul = 1) => { _col.set(hex); return [_col.r * mul, _col.g * mul, _col.b * mul]; };
export const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]; };
const px2uv = (x, y) => [x / GER_CONFIG.atlas.size, 1 - y / GER_CONFIG.atlas.size];

export class Geo {
  constructor(defaultUV) { this.p = []; this.n = []; this.c = []; this.u = []; this.w = defaultUV || [0.5, 0.5]; }
  _v(p, n, c, uv) { this.p.push(p[0], p[1], p[2]); this.n.push(n[0], n[1], n[2]); this.c.push(c[0], c[1], c[2]); const t = uv || this.w; this.u.push(t[0], t[1]); }
  tri(a, b, c, na, nb, nc, ca, cb, cc, ua, ub, uc) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
    if (Math.hypot(fx, fy, fz) < 1e-9) return;
    const d = fx * (na[0] + nb[0] + nc[0]) + fy * (na[1] + nb[1] + nc[1]) + fz * (na[2] + nb[2] + nc[2]);
    this._v(a, na, ca, ua);
    if (d >= 0) { this._v(b, nb, cb, ub); this._v(c, nc, cc, uc); } else { this._v(c, nc, cc, uc); this._v(b, nb, cb, ub); }
  }
  quad(P, N, C, U) {
    const n = i => (Array.isArray(N[0]) ? N[i] : N), c = i => (Array.isArray(C[0]) ? C[i] : C), u = i => (U ? U[i] : undefined);
    this.tri(P[0], P[1], P[2], n(0), n(1), n(2), c(0), c(1), c(2), u(0), u(1), u(2));
    this.tri(P[0], P[2], P[3], n(0), n(2), n(3), c(0), c(2), c(3), u(0), u(2), u(3));
  }
  lathe({ profile, profileFn, segs, a0 = 0, a1 = Math.PI * 2, cx = 0, cz = 0, color, colorAt, smooth = true, uv, uvAt, skipSeg, angles }) { if (angles) segs = angles.length - 1;
    const col = (seg, side, pi, j) => (colorAt ? colorAt(seg, side, pi, j) : color);
    const column = t01 => {
      const P = profileFn ? profileFn(t01) : profile, m = P.length - 1, sn = [];
      for (let i = 0; i < m; i++) { const dr = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1], l = Math.hypot(dr, dy) || 1; sn.push([dy / l, -dr / l]); }
      const pn = (pi, seg) => {
        if (!smooth) return sn[seg];
        const a = sn[Math.max(0, pi - 1)], b = sn[Math.min(m - 1, pi)], x = a[0] + b[0], y = a[1] + b[1], l = Math.hypot(x, y) || 1;
        return [x / l, y / l];
      };
      return { P, pn, m };
    };
    for (let j = 0; j < segs; j++) {
      const f0 = j / segs, f1 = (j + 1) / segs, t0 = angles ? angles[j] : a0 + (a1 - a0) * f0, t1 = angles ? angles[j + 1] : a0 + (a1 - a0) * f1;
      const A = column(f0), B = column(f1), s0 = Math.sin(t0), c0 = Math.cos(t0), s1 = Math.sin(t1), c1 = Math.cos(t1);
      const pos = (q, s, c) => [cx + q[0] * s, q[1], cz + q[0] * c], nor = (q, s, c) => [q[0] * s, q[1], q[0] * c];
      for (let i = 0; i < A.m; i++) {
        if (skipSeg && skipSeg(i)) continue;
        this.quad(
          [pos(A.P[i], s0, c0), pos(B.P[i], s1, c1), pos(B.P[i + 1], s1, c1), pos(A.P[i + 1], s0, c0)],
          [nor(A.pn(i, i), s0, c0), nor(B.pn(i, i), s1, c1), nor(B.pn(i + 1, i), s1, c1), nor(A.pn(i + 1, i), s0, c0)],
          [col(i, 0, i, j), col(i, 1, i, j), col(i, 1, i + 1, j), col(i, 0, i + 1, j)],
          uvAt ? [uvAt(i, f0), uvAt(i, f1), uvAt(i + 1, f1), uvAt(i + 1, f0)] : uv ? [uv, uv, uv, uv] : null);
      }
    }
  }
  obox(c, ax, ay, az, color) {
    const A = [ax, ay, az];
    for (let k = 0; k < 3; k++) for (const s of [1, -1]) {
      const K = A[k], U = A[(k + 1) % 3], V = A[(k + 2) % 3], l = Math.hypot(K[0], K[1], K[2]) || 1, n = [s * K[0] / l, s * K[1] / l, s * K[2] / l];
      const pt = (a, b) => [c[0] + s * K[0] + a * U[0] + b * V[0], c[1] + s * K[1] + a * U[1] + b * V[1], c[2] + s * K[2] + a * U[2] + b * V[2]];
      this.quad([pt(1, 1), pt(-1, 1), pt(-1, -1), pt(1, -1)], n, color);
    }
  }
  box(x, y, z, sx, sy, sz, color) { this.obox([x, y, z], [sx / 2, 0, 0], [0, sy / 2, 0], [0, 0, sz / 2], color); }
  beam(p0, p1, w, h, color) {
    const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], L = Math.hypot(d[0], d[1], d[2]) || 1, e = [d[0] / L, d[1] / L, d[2] / L];
    const ref = Math.abs(e[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0];
    let s = [e[1] * ref[2] - e[2] * ref[1], e[2] * ref[0] - e[0] * ref[2], e[0] * ref[1] - e[1] * ref[0]];
    const sl = Math.hypot(s[0], s[1], s[2]); s = [s[0] / sl, s[1] / sl, s[2] / sl];
    const t = [s[1] * e[2] - s[2] * e[1], s[2] * e[0] - s[0] * e[2], s[0] * e[1] - s[1] * e[0]];
    this.obox([(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2],
      [d[0] / 2, d[1] / 2, d[2] / 2], [t[0] * h / 2, t[1] * h / 2, t[2] * h / 2], [s[0] * w / 2, s[1] * w / 2, s[2] * w / 2], color);
  }
  append(o, phi = 0, tx = 0, tz = 0) {
    const cs = Math.cos(phi), sn = Math.sin(phi);
    for (let i = 0; i < o.p.length; i += 3) {
      this.p.push(o.p[i] * cs + o.p[i + 2] * sn + tx, o.p[i + 1], -o.p[i] * sn + o.p[i + 2] * cs + tz);
      this.n.push(o.n[i] * cs + o.n[i + 2] * sn, o.n[i + 1], -o.n[i] * sn + o.n[i + 2] * cs);
    }
    for (const v of o.c) this.c.push(v); for (const v of o.u) this.u.push(v);
  }
  get triangles() { return this.p.length / 9; }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    return g;
  }
}

const _atlasCache = new Map();
function doorAtlas(variant) {
  if (_atlasCache.has(variant)) return _atlasCache.get(variant);
  const D = GER_CONFIG.doors[variant], P = GER_CONFIG.palette, S = GER_CONFIG.atlas.size;
  const mk = () => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
  const cm = mk(), ce = mk(), g = cm.getContext('2d'), e = ce.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, S, S);
  g.fillStyle = P.interior; g.fillRect(160, 128, 96, 128);
  g.lineJoin = 'miter'; g.lineCap = 'butt';
  const panel = (x, y, w, h) => { g.strokeStyle = D.accent; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, h - 2); };
  const drawCloudDoor = () => {
    const WHITE = '#FFF6E0', INK = '#1E1510', PINK = '#D8388A', GREEN = '#2E9A4A', YEL = '#F2C12E', BLUE = '#2F62C8';
    g.fillStyle = D.base; g.fillRect(0, 0, 256, 256);
    const curl = (cx, cy, r, col, flip, lw) => { g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.beginPath();
      for (let t = 0; t <= 9.6; t += 0.3) { const q = r * (1 - t / 11), x = cx + flip * Math.cos(t) * q, y = cy + Math.sin(t) * q; t ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); };
    const cloud = (cx, cy, w, h, col, n = 4) => {
      for (const [c2, lw] of [[WHITE, 5.5], [col, 3]]) for (let i = 0; i < n; i++) { const t = (i + 0.5) / n - 0.5, r = w * (0.5 - 0.2 * Math.abs(t) * 2);
        curl(cx - r * 0.5, cy + t * h, r * 0.55, c2, 1, lw); curl(cx + r * 0.5, cy + t * h, r * 0.55, c2, -1, lw); }
      for (const sy of [-1, 1]) { g.fillStyle = col; g.beginPath(); g.moveTo(cx, cy + sy * (h / 2 + 6)); g.lineTo(cx - 4, cy + sy * (h / 2 - 2)); g.lineTo(cx + 4, cy + sy * (h / 2 - 2)); g.fill(); } };
    const band = (cx, cy, w, cols) => cols.forEach((col, i) => { const x = cx - w / 2 + (i + 0.5) * w / cols.length, f = i < cols.length / 2 ? 1 : -1;
      curl(x, cy, w / cols.length * 0.5, WHITE, f, 4.5); curl(x, cy, w / cols.length * 0.5, col, f, 2.5); });
    const frame2 = (x, y, w, h) => { g.strokeStyle = WHITE; g.lineWidth = 1.3; g.strokeRect(x, y, w, h); g.strokeRect(x + 3.5, y + 3.5, w - 7, h - 7); };
    const tri = (x, y) => { g.fillStyle = INK; g.beginPath(); g.moveTo(x - 4, y - 3); g.lineTo(x + 4, y - 3); g.lineTo(x, y + 4); g.fill(); };
    for (const sx of [0, 212]) { const cx = sx + 22;
      g.strokeStyle = 'rgba(120,40,0,.5)'; g.lineWidth = 2; g.strokeRect(sx + 8, 14, 28, 228);
      curl(cx - 4, 36, 7, BLUE, 1, 2.5); curl(cx + 4, 42, 7, PINK, -1, 2.5); curl(cx, 28, 5, YEL, 1, 2);
      cloud(cx, 128, 22, 70, BLUE, 3); curl(cx, 84, 7, YEL, 1, 2.5); curl(cx, 172, 7, YEL, -1, 2.5);
      curl(cx - 4, 222, 7, PINK, 1, 2.5); curl(cx + 4, 216, 7, GREEN, -1, 2.5);
      g.strokeStyle = INK; g.lineWidth = 2; for (const y of [48, 128, 208]) { g.beginPath(); g.arc(sx === 0 ? 6 : 250, y, 3.5, 0, 7); g.stroke(); } }
    g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(46, 0, 2, 256); g.fillRect(208, 0, 2, 256);
    frame2(54, 12, 148, 232);
    frame2(64, 24, 128, 34); band(128, 41, 112, [YEL, BLUE, PINK, PINK, BLUE, YEL]);
    frame2(64, 198, 128, 34); band(128, 215, 112, [PINK, GREEN, YEL, YEL, GREEN, PINK]);
    frame2(64, 68, 36, 120); cloud(82, 128, 24, 88, PINK);
    frame2(156, 68, 36, 120); cloud(174, 128, 24, 88, PINK);
    frame2(108, 68, 40, 56); cloud(128, 96, 22, 30, GREEN, 2);
    frame2(108, 132, 40, 56); cloud(128, 160, 22, 30, YEL, 2);
    for (const [x, y] of [[128, 62], [128, 194], [103, 128], [153, 128], [59, 62], [197, 62], [59, 194], [197, 194]]) tri(x, y);
  };
  g.save(); g.translate(256, 0);
  if (D.motif === 'cloud') drawCloudDoor();
  else {
    g.scale(2, 1); g.fillStyle = D.base; g.fillRect(0, 0, 128, 256);
    for (const x of [7, 67]) { panel(x, 8, 54, 52); panel(x, 68, 54, 118); panel(x, 194, 54, 54); }
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(63, 0, 2, 256);
  }
  g.restore();
  { let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let n = 0; n < 9000; n++) { const x = rnd() * S, y = 262 + rnd() * 244, w = 1 + rnd() * 2.2, h = 1 + rnd() * 2.2;
      g.fillStyle = `rgba(${rnd() < 0.5 ? '90,80,60' : '255,255,255'},${0.02 + rnd() * 0.045})`; g.fillRect(x, y, w, h); g.fillRect(x - S, y, w, h); } }
  e.fillStyle = '#000'; e.fillRect(0, 0, S, S);
  e.fillStyle = P.fire; e.fillRect(160, 128, 96, 128);
  e.save(); e.translate(256, 0);
  e.fillStyle = 'rgba(255,179,92,.10)'; e.fillRect(0, 0, 256, 256);
  e.shadowColor = P.fire; e.shadowBlur = 7; e.fillStyle = P.fire;
  if (D.motif === 'cloud') { e.fillRect(46, 6, 3, 246); e.fillRect(207, 6, 3, 246); e.fillRect(48, 250, 160, 3); }
  else { e.fillRect(126, 4, 4, 248); e.fillRect(6, 250, 244, 3); e.fillRect(6, 3, 244, 2); }
  e.restore();
  const tex = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; return t; };
  const out = { map: tex(cm), emissiveMap: tex(ce) };
  _atlasCache.set(variant, out);
  return out;
}

/* makeGer(sizeKey, opts) → { group, door, chimneyTop, dims, stats, setGlow, dispose } — гэрийн лабораторийнхтой ижил */
export function makeGer(sizeKey, opts = {}) {
  const C = GER_CONFIG, Z = C.sizes[sizeKey], S = C.shape, P = C.palette, W = C.winter;
  const winter = opts.season === 'winter', D = C.doors[opts.doorVariant || 0], A = C.atlas;
  const geo = new Geo(px2uv(...A.white));

  const R = Z.diameter / 2 + (winter ? W.extraR : 0);
  const N = Math.min(27, Math.max(20, Math.round(Z.uni / 2)));
  const wallH = Z.wallH, topH = Z.topH, tonoR = Z.tonoD / 2;
  const hayH = winter ? W.hayavchH : S.hayavchH, hayR = R + (winter ? W.hayavchOut : S.hayavchOut);
  const cover = rgb(opts.coverColor || P.cover), felt = rgb(P.felt), rope = rgb(P.rope);

  const feltLathe = o => {
    const P = o.profile, len = [0]; for (let i = 1; i < P.length; i++) len.push(len[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    geo.lathe({ ...o, uvAt: (pi, f) => [f * A.feltRepeat * (o.uScale || 1), 1 - (A.felt[1] - Math.min(1, ((o.v0 || 0) + len[pi]) / A.feltSpan) * (A.felt[1] - A.felt[0])) / A.size] }); };
  const aGap = Math.asin((Z.doorW / 2 + 0.01) / R), wallArc = { a0: aGap, a1: Math.PI * 2 - aGap };
  const lipY = wallH - S.eaveDrop, puff = winter ? W.puff : S.puff;
  const nBelts = opts.belts || Z.belts, beltYs = (nBelts === 2 ? [0.3, 0.7] : S.beltAt.slice(0, nBelts)).map(f => hayH + (lipY - hayH) * f);
  const sh = [R - S.shoulderIn, wallH + (winter ? W.shoulderUp : S.shoulderUp)], E = [R + puff * 0.9, wallH - S.eaveDrop + 0.02];
  const roofEnd = [tonoR + S.tonoRingW * 0.75, topH - S.tonoProud];
  const rl = Math.hypot(roofEnd[0] - sh[0], roofEnd[1] - sh[1]), rp = winter ? W.roofPuff : S.roofPuff;
  const bulge = t => [sh[0] + (roofEnd[0] - sh[0]) * t + (roofEnd[1] - sh[1]) / rl * rp * 4 * t * (1 - t), sh[1] + (roofEnd[1] - sh[1]) * t - (roofEnd[0] - sh[0]) / rl * rp * 4 * t * (1 - t)];
  const m1 = bulge(0.3), m2 = bulge(0.68), roofPts = [sh, m1, m2, roofEnd];
  const roofY = r => { for (let i = 0; i < 3; i++) { const a = roofPts[i], b = roofPts[i + 1]; if (r >= b[0] || i === 2) return a[1] + (b[1] - a[1]) * (a[0] - r) / (a[0] - b[0]); } };
  { const ys = [hayH, ...beltYs], last = [R, ys[ys.length - 1]];
    const wallProf = k => { const p = [[R + (hayR - R) * (0.2 + 0.8 * k), 0], [R + (hayR - R) * (0.2 + 0.8 * k), hayH]];
      for (let i = 0; i < ys.length - 1; i++) { if (i) p.push([R, ys[i]]); p.push([R + puff * k, (ys[i] + ys[i + 1]) / 2]); }
      p.push(last, [R + (E[0] - R) * k, E[1]], sh); return p; };
    const taper = j => Math.min(1, Math.min(j, N - j) / 2), prof = wallProf(1);
    const nW = prof.length - 1; let v0 = 0; for (let i = 1; i < nW; i++) v0 += Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]);
    feltLathe({ ...wallArc, segs: N, profile: prof, profileFn: f => wallProf(taper(Math.round(f * N))), skipSeg: i => i === nW - 1, colorAt: seg => (seg < 1 ? rgb(P.hayavch) : cover) });
    const ang = []; for (let k = 0; k <= N; k++) ang.push(aGap + k * (Math.PI * 2 - 2 * aGap) / N); ang.push(Math.PI * 2 + aGap);
    feltLathe({ angles: ang, profile: [last, E, sh, m1, m2, roofEnd], skipSeg: i => i === 0,
      profileFn: f => { const j = Math.round(f * (N + 1)), k = j > N ? 0 : taper(j); return [last, [R + (E[0] - R) * k, E[1]], sh, m1, m2, roofEnd]; }, v0: v0 - Math.hypot(E[0] - last[0], E[1] - last[1]),
      color: cover }); }

  for (const y of beltYs) geo.lathe({ ...wallArc, segs: N, smooth: false, color: rope, profile: [[R + S.beltPinch, y - S.beltH / 2], [R + S.beltPinch, y + S.beltH / 2]] });

  const ro = tonoR + S.tonoRingW * 0.6, ri = tonoR - S.tonoRingW * 0.4, ty0 = topH - S.tonoRingH, ty1 = topH, tono = rgb(P.tono);
  geo.lathe({ segs: 12, smooth: false, color: tono, profile: [[ro, ty0], [ro, ty1], [ri, ty1], [ri, ty0]] });
  geo.lathe({ segs: 12, color: [1, 1, 1], uv: px2uv(...A.glow), profile: [[ri + 0.01, ty0 + 0.01], [0, ty0 + 0.01]] });
  const hubY = ty1 + S.tonoRise;
  for (let k = 0; k < S.spokes; k++) {
    const a = k * Math.PI * 2 / S.spokes;
    geo.beam([Math.sin(a) * (ri + 0.02), ty1 - 0.02, Math.cos(a) * (ri + 0.02)], [0, hubY, 0], S.spokeT, S.spokeT, tono);
  }

  const uR = tonoR + S.urkhOut, urkhCol = mix(P.felt, P.cover, 0.35);
  const uProf = [[uR, roofY(uR) + 0.03], [ro + 0.03, ty1 + 0.02], [tonoR * 0.55, hubY + 0.03], [0, hubY + 0.08]];
  feltLathe({ segs: 6, a0: Math.PI / 2, a1: Math.PI * 1.5, color: urkhCol, profile: uProf, uScale: 0.5 });
  for (const sx of [1, -1]) for (let i = 0; i < uProf.length - 1; i++) {
    const a = uProf[i], b = uProf[i + 1];
    geo.quad([[sx * a[0], a[1], 0], [sx * b[0], b[1], 0], [sx * b[0], b[1] - 0.06, 0], [sx * a[0], a[1] - 0.06, 0]], [0, 0, 1], rgb(P.felt, 0.85));
  }
  const beltMid = beltYs[Math.floor((beltYs.length - 1) / 2)];
  for (const [a0, a1, yEnd] of [[Math.PI, Math.PI, beltMid], [Math.PI / 2, Math.PI / 2 - S.urkhRopeLean, beltYs[0]], [-Math.PI / 2, -Math.PI / 2 + S.urkhRopeLean, beltYs[0]]]) {
    const at = (r, y, k) => { const a = a0 + (a1 - a0) * k; return [Math.sin(a) * r, y, Math.cos(a) * r]; };
    const p = [at(uR, roofY(uR) + 0.03, 0), at(m2[0], m2[1] + 0.022, 0.3), at(m1[0], m1[1] + 0.022, 0.7), at(sh[0] + 0.01, sh[1] + 0.025, 1), at(E[0] + 0.02, E[1], 1), at(R + S.beltPinch + 0.012, yEnd, 1)];
    for (let i = 0; i < 5; i++) geo.beam(p[i], p[i + 1], 0.025, 0.02, rope);
  }

  const chTop = topH + S.chimneyH, chA = S.chimneySector * 2 * Math.PI / S.spokes, cx = Math.sin(chA) * S.chimneyOffR, cz = Math.cos(chA) * S.chimneyOffR, iron = rgb(P.iron);
  geo.lathe({ segs: 8, cx, cz, color: iron, profile: [[S.chimneyR, ty0 + 0.02], [S.chimneyR, chTop]] });
  geo.lathe({ segs: 8, cx, cz, color: rgb(P.iron, 0.35), smooth: false, profile: [[S.chimneyR, chTop], [0, chTop - 0.03]] });

  const dw = Z.doorW, dh = Z.doorH, y0 = S.doorSill, zf = R + S.frameOut, frame = rgb(D.frame);
  for (const sx of [1, -1]) geo.box(sx * (dw / 2 + S.jambW / 2), (y0 + dh) / 2, zf - 0.05, S.jambW, y0 + dh, 0.10, frame);
  geo.box(0, y0 + dh + S.lintelH / 2, zf - 0.047, dw + S.jambW * 2 + 0.02, S.lintelH, 0.106, frame);
  geo.box(0, y0 / 2, zf - 0.05, dw + S.jambW * 2, y0, 0.11, rgb(D.frame, 0.8));
  const [dx0, dy0, dx1, dy1] = A.door, pz = zf - 0.008, sf = D.stile || 0, sw = dw * sf, lw = dw - sw * 2, du = (dx1 - dx0) * sf;
  const dquad = (q, xa, xb, ua, ub, z) => q.quad([[xa, y0, z], [xb, y0, z], [xb, y0 + dh, z], [xa, y0 + dh, z]], [0, 0, 1], [1, 1, 1],
    [px2uv(ua, dy1), px2uv(ub, dy1), px2uv(ub, dy0), px2uv(ua, dy0)]);
  if (sf) for (const sx of [1, -1]) { geo.box(sx * (dw / 2 - sw / 2), y0 + dh / 2, pz - S.leafT / 2 - 0.001, sw, dh, S.leafT, rgb(D.base, 0.8));
    if (sx < 0) dquad(geo, -dw / 2, -dw / 2 + sw, dx0, dx0 + du, pz); else dquad(geo, dw / 2 - sw, dw / 2, dx1 - du, dx1, pz); }
  { const gu = px2uv(...A.glow), zb = R - 0.115;
    geo.quad([[-dw / 2, y0, zb], [dw / 2, y0, zb], [dw / 2, y0 + dh, zb], [-dw / 2, y0 + dh, zb]], [0, 0, 1], [1, 1, 1], [gu, gu, gu, gu]); }
  for (const y of beltYs) for (const sx of [1, -1]) geo.box(sx * (dw / 2 + S.jambW / 2), y, zf + 0.006, 0.035, 0.035, 0.02, rgb(S.knob));
  const leaf = new Geo(px2uv(...A.white));
  leaf.box(lw / 2, y0 + dh / 2, -S.leafT / 2 - 0.001, lw, dh - 0.01, S.leafT, rgb(D.base, 0.8)); dquad(leaf, 0, lw, dx0 + du, dx1 - du, 0);

  for (let i = 0; i < geo.p.length; i += 3) { const y = geo.p[i + 1]; if (y < wallH) { const k = C.shade.wallBottom + (1 - C.shade.wallBottom) * (y / wallH); geo.c[i] *= k; geo.c[i + 1] *= k; geo.c[i + 2] *= k; } }
  if (winter) {
    const gap = Math.asin((dw / 2 + S.jambW + 0.22) / R), snow = rgb(P.snow), shade = mix(P.snow, P.snowShade, 0.45), ground = rgb('#EEF2F6');
    geo.lathe({ segs: Math.round(N * 0.32), a0: gap, a1: Math.PI * 2 - gap,
      profileFn: t => { const k = Math.min(1, Math.min(t, 1 - t) / 0.1), s = k * k * (3 - 2 * k);
        return [[hayR + 0.04 + W.bankW * s, 0.005], [hayR + 0.04 + W.bankW * 0.45 * s, W.bankH * 0.55 * s], [hayR - 0.02, W.bankH * s + 0.01]]; },
      colorAt: (seg, side, pi) => (pi === 0 ? ground : pi === 1 ? shade : snow) });
    const sr = sh[0] - (sh[0] - roofEnd[0]) * W.roofSnowTo;
    geo.lathe({ segs: Math.round(N * 0.19), a0: Math.PI * 0.45, a1: Math.PI * 1.55, color: snow,
      profileFn: t => { const k = Math.min(1, Math.min(t, 1 - t) / 0.25), r = sh[0] - (sh[0] - sr) * k; return [[E[0] + 0.015, E[1] + 0.01], [sh[0] + 0.012, sh[1] + 0.025], [r, roofY(r) + 0.025]]; } });
    geo.beam([-dw / 2 - 0.04, y0 + dh + S.lintelH + 0.07, zf], [dw / 2 + 0.04, y0 + dh + S.lintelH + 0.07, zf], 0.15, 0.14, felt);
  }

  const tex = doorAtlas(opts.doorVariant || 0);
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, map: tex.map, emissive: 0xffffff, emissiveMap: tex.emissiveMap, emissiveIntensity: opts.glow || 0 });
  const geometry = geo.build(), group = new THREE.Group();
  const body = new THREE.Mesh(geometry, mat); body.castShadow = true; body.receiveShadow = true; body.name = 'ger:body';
  const leafGeo = leaf.build(), leafMesh = new THREE.Mesh(leafGeo, mat); leafMesh.name = 'ger:door'; leafMesh.castShadow = true;
  leafMesh.position.set(-lw / 2, 0, pz);
  group.add(body, leafMesh);
  let outlineMat = null;
  if (opts.outline !== false) {
    outlineMat = new THREE.MeshBasicMaterial({ color: P.outline, side: THREE.BackSide });
    outlineMat.onBeforeCompile = s => { s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', `vec3 transformed = position + normal * ${S.outlineW.toFixed(4)};`); };
    const o = new THREE.Mesh(geometry, outlineMat); o.name = 'ger:outline'; group.add(o);
  }
  return {
    group,
    door: { position: new THREE.Vector3(0, 0, zf + S.doorStandOff), inward: new THREE.Vector3(0, 0, -1), width: dw, height: dh },
    chimneyTop: new THREE.Vector3(cx, chTop + 0.04, cz),
    dims: { diameter: R * 2, topH: hubY, wallH, uni: Z.uni, belts: nBelts },
    stats: { triangles: geo.triangles + leaf.triangles, drawCalls: group.children.length },
    setGlow(k) { mat.emissiveIntensity = k; },
    dispose() { geometry.dispose(); leafGeo.dispose(); mat.dispose(); if (outlineMat) outlineMat.dispose(); },
  };
}
