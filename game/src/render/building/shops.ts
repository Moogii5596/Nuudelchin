// @ts-nocheck — лабораторийн (tools/character-lab/buildings/index.html) хэрэглэгчийн баталсан геометрийн кодыг өөрчлөлтгүй хуулсан. Тоо, өнгө зөвхөн data/buildings.json-оос.
import * as THREE from 'three';
import { Geo, rgb, mix } from '../ger/geo';
import { BUILDING_CONFIG } from './config';
import { sc, px2uv, bandV, wallQuad, slab, panel, shadeDown, signRect, hCyl, groundQuad } from './core';
import { roofHex } from './houses';
import { railRun } from './civic';
import { makePorter } from './yard';

export function buildShop(type, opts) {   // T.w/T.d: хэмжээ · T.flat: хавтгай дээвэр · T.winStyle: 'house' (айлын цонх) · T.canopy: false · T.goods: null
  const C = BUILDING_CONFIG, SH = C.shop, T = SH.types[type], P = C.palette, A = C.atlas, geo = new Geo(px2uv(...A.white)), winter = opts.season === 'winter';
  const w = T.w || SH.w, d = T.d || SH.d, hw = w / 2, hd = d / 2, wh = T.wallH || SH.wallH, ph = SH.plinthH, wall = rgb(T.wall), roofCol = rgb(roofHex(opts.roofColor || T.roof));
  const trimD = rgb('#9A9C98'), fascia = rgb(P.casing), under = rgb(P.woodDark), con = rgb(SH.apron.color), wm = { r: A.plaster, span: A.plasterSpan, vh: wh };
  if (T.apron !== false) geo.quad([[-hw - 0.4, 0.012, hd], [hw + 0.4, 0.012, hd], [hw + 0.4, 0.012, hd + SH.apron.d], [-hw - 0.4, 0.012, hd + SH.apron.d]], [0, 1, 0], sc(con, 0.95));   // урдах бетон талбай
  geo.box(0, ph / 2, 0, w + 0.08, ph, d + 0.08, rgb(P.plinth));
  wallQuad(geo, [-hw, hd], [hw, hd], ph, wh, [0, 0, 1], wall, wm); wallQuad(geo, [hw, -hd], [-hw, -hd], ph, wh, [0, 0, -1], wall, wm);
  wallQuad(geo, [hw, hd], [hw, -hd], ph, wh, [1, 0, 0], wall, wm); wallQuad(geo, [-hw, -hd], [-hw, hd], ph, wh, [-1, 0, 0], wall, wm);
  let ridgeY, roofY, eaveZ, gx;
  if (T.flat) { ridgeY = wh + 0.35; geo.box(0, wh + 0.12, 0, w + 0.3, 0.24, d + 0.3, roofCol);   // хавтгай дээвэр + хаяавч (парапет)
    for (const [x, z, sx, sz] of [[0, hd + 0.1, w + 0.3, 0.12], [0, -hd - 0.1, w + 0.3, 0.12], [hw + 0.1, 0, 0.12, d + 0.3], [-hw - 0.1, 0, 0.12, d + 0.3]]) geo.box(x, wh + 0.3, z, sx, 0.2, sz, sc(roofCol, 0.8)); }
  else { const apexY = wh + hd * SH.roofPitch; ridgeY = apexY + SH.roofLift; roofY = z => ridgeY - SH.roofPitch * Math.abs(z);
    for (const sx of [1, -1]) { const n = [sx, 0, 0], uv = (z, y) => [z / A.plasterSpan, bandV(A.plaster, Math.min(1, y / apexY))];
      geo.tri([sx * hw, wh, -hd], [sx * hw, wh, hd], [sx * hw, apexY, 0], n, n, n, wall, wall, wall, uv(-hd, wh), uv(hd, wh), uv(0, apexY)); }
    eaveZ = hd + SH.eave; gx = hw + SH.gableOut;
    for (const s of [1, -1]) slab(geo, -gx, gx, 0, ridgeY, s * eaveZ, roofY(eaveZ), SH.roofT, { top: roofCol, uv: A.roof, span: A.roofSpan, edge: fascia, under });
    geo.box(0, ridgeY + 0.015, 0, gx * 2 + 0.06, 0.09, 0.28, sc(roofCol, 0.85)); }
  const ch = SH.chimney, chx = Math.max(-hw + 0.6, ch.x), chz = Math.max(-hd + 0.6, ch.z), chB = T.flat ? wh : roofY(chz) - 0.3, chTop = ridgeY + ch.rise;
  if (!T.central) geo.box(chx, (chB + chTop) / 2, chz, ch.size, chTop - chB, ch.size, rgb(P.brick));   // central: нэгдсэн уурын зуухаас галладаг — янданггүй
  const D = SH.door, W = T.winStyle === 'house' ? { ...SH.sideWin, gap: 0.6, out: 0.05 } : SH.win, Sg = SH.sign, Sw = SH.sideWin, wTex = T.winStyle === 'house' ? A.window : A.shopWin;
  panel(geo, [0, ph + D.h / 2, hd], [0, 0, 1], D.w / 2, D.h / 2, D.out, A.shopDoor, trimD);
  const nWin = T.windows || 1, windows = [];
  for (const sx of [1, -1]) for (let k = 0; k < nWin; k++) { const x = sx * (D.w / 2 + W.gap + W.w / 2 + k * (W.w + 0.5)); if (Math.abs(x) + W.w / 2 > hw - 0.25) continue;
    panel(geo, [x, W.sill + W.h / 2, hd], [0, 0, 1], W.w / 2, W.h / 2, W.out, wTex, T.winStyle === 'house' ? rgb(P.trim, 0.7) : trimD); windows.push(new THREE.Vector3(x, W.sill + W.h / 2, hd)); }
  if (d > 4.5) for (const sx of [1, -1]) panel(geo, [sx * hw, Sw.sill + Sw.h / 2, -0.8 * d / 8], [sx, 0, 0], Sw.w / 2, Sw.h / 2, 0.05, A.window, rgb(P.trim, 0.7));
  const sgW = Math.min(Sg.w, w - 1.2), sgH = sgW < Sg.w ? Sg.h * 0.85 : Sg.h, sgY = Math.min(Sg.y, wh - sgH / 2 - 0.2), sr = signRect(type);
  geo.box(0, sgY, hd + Sg.out / 2, sgW + 0.1, sgH + 0.1, Sg.out, sc(rgb(T.signColor), 0.6));
  panel(geo, [0, sgY, hd + Sg.out], [0, 0, 1], sgW / 2, sgH / 2, 0.005, sr, sc(rgb(T.signColor), 0.6));
  const Cn = SH.canopy, hasCn = T.canopy !== false;
  if (hasCn) slab(geo, -Cn.w / 2, Cn.w / 2, hd, Cn.y + 0.12, hd + Cn.d, Cn.y, 0.06, { top: roofCol, uv: A.roof, span: A.roofSpan, edge: fascia, under });
  const Q = SH.porch, pz = hd + Q.d / 2; geo.box(0, ph / 2, pz, Q.w, ph, Q.d, con);
  for (let k = 1; k <= Q.steps; k++) { const h = ph * (1 - k / (Q.steps + 1)); geo.box(0, h / 2, hd + Q.d + (k - 0.5) * Q.stepD, Q.w - 1.0, h, Q.stepD, sc(con, 1 - k * 0.03)); }
  const iron = rgb(P.iron);
  for (const sx of [1, -1]) { const x = sx * (Q.w / 2 - 0.05), y0 = ph, y1 = ph + Q.rail;
    geo.beam([x, y0, hd + 0.05], [x, y1, hd + 0.05], 0.05, 0.05, iron); geo.beam([x, y0, hd + Q.d - 0.05], [x, y1, hd + Q.d - 0.05], 0.05, 0.05, iron);
    geo.beam([x, y1, hd + 0.05], [x, y1, hd + Q.d - 0.05], 0.05, 0.05, iron); }
  shadeDown(geo, wh);
  const wx0 = D.w / 2 + W.gap + W.w / 2;
  if (T.goods) goods(geo, T.goods, -wx0 - 0.7, hd + 1.0, winter);   // тавцангаас зүүн тийш, цонхны өмнө
  if (winter) { const o = { top: rgb(P.snow), edge: mix(P.snow, P.snowShade, 0.45) };
    if (T.flat) geo.box(0, wh + 0.27, 0, w + 0.06, 0.06, d + 0.06, rgb(P.snow));
    else { const zs = eaveZ - 0.28; for (const s of [1, -1]) slab(geo, -gx + 0.08, gx - 0.08, 0, ridgeY + 0.13, s * zs, roofY(zs) + 0.13, 0.135, o); }
    if (hasCn) slab(geo, -Cn.w / 2 + 0.05, Cn.w / 2 - 0.05, hd + 0.02, Cn.y + 0.22, hd + Cn.d - 0.08, Cn.y + 0.1, 0.09, o); }
  const zDoor = hd + Q.d + Q.steps * Q.stepD;
  return { geo, door: { position: new THREE.Vector3(0, 0, zDoor + C.doorStandOff), inward: new THREE.Vector3(0, 0, -1), width: D.w, height: D.h },
    dims: { w, d, wallH: wh, ridgeH: ridgeY }, interior: { main: { w: w - SH.wallT * 2, d: d - SH.wallT * 2, h: Math.min(SH.ceilingH, wh - 0.6) } }, windows, gameRole: T.gameRole,
    chimneyTop: T.central ? null : new THREE.Vector3(chx, chTop + 0.12, chz) };
}
export function goods(g, kind, ox, oz, winter) {   // ox, oz: үүдний барааны төв
  const box = (x, y, z, sx, sy, sz, c) => g.box(ox + x, y, oz + z, sx, sy, sz, rgb(c));
  if (kind === 'bench') { const wd = rgb('#9A7A55'); box(0.2, 0.72, 0, 1.4, 0.06, 0.7, '#9A7A55'); for (const sx of [-0.6, 0.6]) box(0.2 + sx, 0.36, 0, 0.06, 0.72, 0.6, '#6E5A44');   // ширээ, хоёр сандал
    for (const sz of [-0.62, 0.62]) { box(0.2, 0.42, sz, 1.4, 0.06, 0.32, '#9A7A55'); for (const sx of [-0.55, 0.55]) box(0.2 + sx, 0.21, sz, 0.06, 0.42, 0.28, '#6E5A44'); }
    g.lathe({ segs: 7, cx: ox + 0.05, cz: oz - 0.1, profile: [[0.09, 0.75], [0.11, 0.9], [0, 0.92]], color: rgb('#D9622B') }); }
  if (kind === 'crates') { box(0.7, 0.42, 0, 1.2, 0.84, 0.62, '#F4EEDF'); box(0.7, 0.86, 0, 1.12, 0.04, 0.54, '#9AA3A8');
    [['#B03A22', -0.5, 0.15], ['#2E5E9E', -0.5, 0.45], ['#D8A93A', -1.05, 0.15], ['#4E6B3A', -0.78, 0.75]].forEach(([c, x, y]) => box(x, y, 0, 0.52, 0.3, 0.38, c)); }
  if (kind === 'hay') { for (const [x, y] of [[-0.55, 0.2], [0.5, 0.2], [0, 0.6]]) box(x, y, -0.1, 1.0, 0.4, 0.5, '#C9A24E');
    for (const x of [-0.7, -0.15, 0.4]) box(x, 0.14, 0.55, 0.5, 0.28, 0.36, '#E8E0CC'); }   // тэжээлийн шуудай
  if (kind === 'cans') { const alu = '#B9BBB7'; for (const x of [-0.8, -0.35, 0.1]) g.lathe({ segs: 7, cx: ox + x, cz: oz, profile: [[0.17, 0.01], [0.17, 0.42], [0.12, 0.52], [0.12, 0.6], [0, 0.61]], colorAt: s => (s >= 2 ? rgb(alu, 0.85) : rgb(alu)) });
    for (const x of [0.6, 1.05]) g.lathe({ segs: 8, cx: ox + x, cz: oz, profile: [[0.24, 0.01], [0.24, 0.85], [0, 0.86]], color: rgb('#2E5E9E') }); }
  if (kind === 'felt') { for (const [x, y] of [[-0.3, 0.2], [0.15, 0.2], [-0.07, 0.56]]) {
      const r = new Geo(px2uv(...BUILDING_CONFIG.atlas.white)); r.lathe({ segs: 8, color: rgb('#DDD3BE'), profile: [[0, -0.75], [0.2, -0.75], [0.2, 0.75], [0, 0.75]], smooth: false });
      for (let i2 = 0; i2 < r.p.length; i2 += 3) { const px = r.p[i2], py = r.p[i2 + 1], nx = r.n[i2], ny = r.n[i2 + 1]; r.p[i2] = py + ox + x; r.p[i2 + 1] = -px + y; r.n[i2] = ny; r.n[i2 + 1] = -nx; /* Z тэнхлэгээр 90° эргүүлнэ */ r.p[i2 + 2] += oz + 0.15; }
      for (let i2 = 0; i2 < r.p.length; i2 += 3) { g.p.push(r.p[i2], r.p[i2 + 1], r.p[i2 + 2]); g.n.push(r.n[i2], r.n[i2 + 1], r.n[i2 + 2]); } for (const v of r.c) g.c.push(v); for (const v of r.u) g.u.push(v); }
    const lat = rgb('#D9622B'); for (let k = 0; k < 4; k++) { const x0 = ox - 1.2 + k * 0.36;   // хананд налуулсан
      g.beam([x0, 0.02, oz - 0.35], [x0 + 0.45, 1.5, oz - 0.75], 0.035, 0.035, lat); g.beam([x0 + 0.45, 0.02, oz - 0.35], [x0, 1.5, oz - 0.75], 0.035, 0.035, lat); } }
  if (kind === 'clothes') { const post = rgb('#4A4640'); for (const x of [-1.0, 1.0]) g.beam([ox + x, 0, oz], [ox + x, 1.7, oz], 0.05, 0.05, post); g.beam([ox - 1.0, 1.7, oz], [ox + 1.0, 1.7, oz], 0.04, 0.04, post);
    [['#2E5E9E', -0.65], ['#9A3B2E', -0.2], ['#4E6B3A', 0.25], ['#D8A93A', 0.68]].forEach(([c, x]) => { box(x, 1.12, 0, 0.42, 1.1, 0.12, c); box(x, 0.94, 0.065, 0.44, 0.07, 0.01, '#D9622B'); }); }
  if (kind === 'cages') { [[-0.6, 0.25, 0.7], [0.25, 0.22, 0.6], [-0.18, 0.69, 0.55]].forEach(([x, y, s]) => { box(x, y, 0, s, s * 0.7, s * 0.7, '#5F656B'); box(x, y, s * 0.35 + 0.004, s - 0.08, s * 0.7 - 0.08, 0.006, '#B0B6BB'); });
    box(1.0, 0.33, 0, 0.7, 0.66, 0.85, '#9A7A55'); box(1.0, 0.25, 0.43, 0.3, 0.36, 0.01, '#140F0C'); }
}


export function buildMilkWool(opts) {   // сүү, ноос хүлээн авах цэг: оффис + сүүний сав + ноосны агуулах + ноосны боодол + машины жин
  const C = BUILDING_CONFIG, M = C.milkWool, P = C.palette, A = C.atlas, geo = new Geo(px2uv(...A.white)), winter = opts.season === 'winter';
  const [LW, LD] = M.lot; groundQuad(geo, -LW / 2, -LD / 2, LW / 2, LD / 2, rgb(winter ? '#DDE4EC' : M.ground), 0.009);
  const off = buildShop('milkOffice', opts); geo.append(off.geo, 0, M.office.x, M.office.z);
  const T = M.tanks, tc = rgb(T.color);
  for (const k of [0, 1]) { const z = T.z + (k - 0.5) * T.gap, cy = T.legH + T.r;
    hCyl(geo, T.x, cy, z, T.r, T.L, 10, tc); for (const sx of [1, -1]) geo.box(T.x + sx * T.L * 0.32, T.legH / 2 + 0.2, z, 0.18, T.legH + 0.4, T.r * 1.4, rgb(P.iron));
    geo.box(T.x - T.L / 2 - 0.12, cy, z, 0.24, 0.24, 0.24, sc(tc, 0.8)); geo.box(T.x, cy + T.r + 0.08, z, 0.5, 0.16, 0.5, sc(tc, 0.85)); }   // хоолой, нүх
  if (winter) for (const k of [0, 1]) geo.box(T.x, T.legH + T.r * 2 + 0.05, T.z + (k - 0.5) * T.gap, T.L * 0.9, 0.08, T.r * 0.9, rgb(P.snow));
  const WS = buildWoolStore(opts), S = M.store, hd = S.d / 2, apex = WS.apex; geo.append(WS.geo, 0, S.x, S.z);
  const B = M.bales, [bx, by, bz] = B.size, bc = rgb(B.color);   // ноосны боодол: доод эгнээ 3, дээр 2
  for (let row = 0; row < B.n.length; row++) for (let k = 0; k < B.n[row]; k++) { const x = B.x + (k - (B.n[row] - 1) / 2) * (bx + 0.08), y = by / 2 + row * by;
    geo.box(x, y, B.z, bx, by, bz, sc(bc, 0.96 + 0.04 * ((k + row) % 2))); geo.box(x, y, B.z + bz / 2 + 0.005, bx + 0.01, 0.06, 0.01, rgb('#6E5A44')); }
  const Sc = M.scale; geo.box(Sc.x, 0.08, Sc.z, Sc.w, 0.16, Sc.L, rgb('#9AA3A8')); geo.box(Sc.x, 0.165, Sc.z, Sc.w - 0.2, 0.01, Sc.L - 0.2, rgb('#7E868C'));   // машины жин
  const odoor = off.door.position.clone().add(new THREE.Vector3(M.office.x, 0, M.office.z));
  return { geo, door: { ...off.door, position: odoor }, dims: { w: LW, d: LD, ridgeH: apex + 0.03 }, interior: off.interior, gameRole: 'milkWool', chimneyTop: off.chimneyTop.clone().add(new THREE.Vector3(M.office.x, 0, M.office.z)),
    points: [ { name: 'Сүү тушаах', position: new THREE.Vector3(T.x - T.L / 2 - 0.9, 0, T.z), inward: new THREE.Vector3(1, 0, 0) },
              { name: 'Ноос буулгах', position: new THREE.Vector3(S.x, 0, S.z + hd + 1.6), inward: new THREE.Vector3(0, 0, -1) },
              { name: 'Машины жин', position: new THREE.Vector3(Sc.x, 0, Sc.z + Sc.L / 2 + 1.5), inward: new THREE.Vector3(0, 0, -1) } ],
    stats: { office: off.geo.triangles } };
}

export function makeMoto() {   // мотоцикл (тулгуур загвар), урд нь +Z
  const g = new Geo(px2uv(...BUILDING_CONFIG.atlas.white)), r = 0.3, n = 8, tire = rgb('#2A221C'), body = rgb('#9A3B2E'), dark = rgb('#4A4640');
  for (const cz of [0.65, -0.65]) for (let k = 0; k < n; k++) { const a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2, a = (a0 + a1) / 2;
    const p = (an, x) => [x, r + Math.sin(an) * r, cz + Math.cos(an) * r]; g.quad([p(a0, -0.05), p(a1, -0.05), p(a1, 0.05), p(a0, 0.05)], [0, Math.sin(a), Math.cos(a)], tire); }
  g.beam([0, r, -0.65], [0, 0.62, 0.0], 0.1, 0.1, dark); g.beam([0, r, 0.65], [0, 0.95, 0.42], 0.06, 0.06, dark);
  g.box(0, 0.7, 0.15, 0.26, 0.24, 0.5, body); g.box(0, 0.78, -0.3, 0.24, 0.1, 0.62, rgb('#2A221C')); g.beam([-0.33, 1.0, 0.42], [0.33, 1.0, 0.42], 0.04, 0.04, dark);
  g.box(0, 0.86, 0.58, 0.16, 0.12, 0.06, rgb('#F2C12E'));
  return g;
}
export function buildCarDealer(opts) {   // машин худалдаа: оффис + хашлагатай талбай + зарах машинуудын зогсоол (үнийн самбартай) + далбаат утас
  const C = BUILDING_CONFIG, M = C.carDealer, P = C.palette, A = C.atlas, geo = new Geo(px2uv(...A.white)), winter = opts.season === 'winter';
  const off = buildShop('carOffice', opts); geo.append(off.geo, 0, M.office.x, M.office.z);
  const Y = M.yard, hw = Y.w / 2, z0 = Y.z - Y.d / 2, z1 = Y.z + Y.d / 2; groundQuad(geo, -hw, z0, hw, z1, rgb(winter ? '#DDE4EC' : Y.color), 0.011);
  const R = M.rail, rc = rgb(R.color), post = (x, z) => geo.box(x, R.h / 2, z, 0.08, R.h, 0.08, rc);
  const railRun = (ax, az, bx, bz) => { const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / R.every));
    for (let i = 0; i <= n; i++) post(ax + (bx - ax) * i / n, az + (bz - az) * i / n); geo.beam([ax, R.h, az], [bx, R.h, bz], 0.06, 0.06, rc); geo.beam([ax, R.h * 0.5, az], [bx, R.h * 0.5, bz], 0.05, 0.05, sc(rc, 0.9)); };
  const poleH = 4.2, poles = [[-hw, z1], [-hw, z0], [hw, z0], [hw, z1]];   // далбаат утас
  for (const [x, z] of poles) geo.box(x, poleH / 2, z, 0.1, poleH, 0.1, rgb(P.iron));
  for (let i = 0; i < poles.length - 1; i++) { const [ax, az] = poles[i], [bx, bz] = poles[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.floor(L / 0.9);
    for (let k = 0; k < n; k++) { const t0 = (k + 0.15) / n, t1 = (k + 0.85) / n, tm = (k + 0.5) / n, sag = t => 0.6 * 4 * t * (1 - t), y0 = poleH - 0.1;
      const a = [ax + (bx - ax) * t0, y0 - sag(t0), az + (bz - az) * t0], b = [ax + (bx - ax) * t1, y0 - sag(t1), az + (bz - az) * t1], c = [ax + (bx - ax) * tm, y0 - sag(tm) - 0.32, az + (bz - az) * tm];
      const col = rgb(M.flags[(k + i) % M.flags.length]); geo.tri(a, b, c, [0, 0, 1], [0, 0, 1], [0, 0, 1], col, col, col); geo.tri(b, a, c, [0, 0, -1], [0, 0, -1], [0, 0, -1], col, col, col); } }
  const slots = [];
  for (const S of M.slots) { const v = S.item === 'moto' ? makeMoto() : makePorter(opts.season, { cab: S.cab, bed: S.bed }).geo; geo.append(v, S.phi, S.x, S.z);
    const bx = S.x + 1.3, bz = S.z + 2.6; geo.box(bx, 0.6, bz, 0.05, 1.2, 0.05, rgb(P.iron)); geo.box(bx, 1.25, bz, 0.8, 0.5, 0.04, rgb(P.casing)); geo.box(bx, 1.25, bz + 0.025, 0.6, 0.12, 0.01, rgb('#B03A22'));   // үнийн самбар
    slots.push({ item: S.item, position: new THREE.Vector3(S.x, 0, S.z), phi: S.phi, price: new THREE.Vector3(bx, 0, bz + 0.8) }); }
  shadeDown(geo, 1.2, off.geo.p.length);
  const od = off.door.position.clone().add(new THREE.Vector3(M.office.x, 0, M.office.z));
  return { geo, door: { ...off.door, position: od }, dims: { w: M.lot[0], d: M.lot[1], ridgeH: poleH }, interior: off.interior, gameRole: 'vehicles', chimneyTop: off.chimneyTop.clone().add(new THREE.Vector3(M.office.x, 0, M.office.z)),
    slots, points: slots.map(s => ({ name: 'Үнэ: ' + s.item, position: s.price, inward: new THREE.Vector3(0, 0, -1) })), stats: { office: off.geo.triangles } };
}

export function buildFuel(opts) {   // колонк: халхавч + 2 түгээгүүр + касс + үнийн шон
  const C = BUILDING_CONFIG, F = C.fuel, P = C.palette, A = C.atlas, geo = new Geo(px2uv(...A.white)), winter = opts.season === 'winter';
  const [LW, LD] = F.lot; groundQuad(geo, -LW / 2, -LD / 2, LW / 2, LD / 2, rgb(winter ? '#DDE4EC' : F.ground), 0.009);
  const Cn = F.canopy, cc = rgb(Cn.color), sr = signRect('fuelCanopy'), sCol = rgb(C.shop.extraSigns.fuelCanopy.signColor);
  for (const x of [-Cn.w / 4, Cn.w / 4]) geo.box(x, Cn.h / 2, 0, F.pillars, Cn.h, F.pillars, sc(cc, 0.9));
  geo.box(0, Cn.h + Cn.t / 2 + 0.08, 0, Cn.w, Cn.t - 0.16, Cn.d, sCol); geo.box(0, Cn.h + 0.08, 0, Cn.w + 0.02, 0.16, Cn.d + 0.02, rgb(F.stripe));   // халхавч: улбар шар, доороо улаан зураас
  geo.quad([[-Cn.w / 2, Cn.h - 0.001, Cn.d / 2], [Cn.w / 2, Cn.h - 0.001, Cn.d / 2], [Cn.w / 2, Cn.h - 0.001, -Cn.d / 2], [-Cn.w / 2, Cn.h - 0.001, -Cn.d / 2]], [0, -1, 0], cc);
  for (const sz of [1, -1]) panel(geo, [0, Cn.h + Cn.t / 2, sz * (Cn.d / 2)], [0, 0, sz], Cn.w * 0.42, Cn.t * 0.4, 0.01, sr, sCol);
  if (winter) geo.box(0, Cn.h + Cn.t + 0.04, 0, Cn.w - 0.1, 0.08, Cn.d - 0.1, rgb(P.snow));
  const I = F.island; geo.box(0, 0.1, 0, I.w, 0.2, I.d, rgb('#9AA3A8'));
  for (const x of F.pumps) { geo.box(x, 0.2 + 0.75, 0, 0.62, 1.5, 0.42, rgb('#F4EEDF')); geo.box(x, 1.55, 0, 0.66, 0.14, 0.46, sCol);
    for (const sz of [1, -1]) { geo.box(x, 1.15, sz * 0.215, 0.36, 0.22, 0.01, rgb('#2A3440')); geo.box(x + 0.22, 0.85, sz * 0.24, 0.08, 0.3, 0.06, rgb(P.iron)); } }   // дэлгэц, хошуу
  const k = buildShop('fuelKiosk', opts); geo.append(k.geo, 0, F.kiosk.x, F.kiosk.z);
  const Y = F.pylon, R = A.pylon, y0 = 0.3, hw2 = Y.w / 2;   // босоо үнийн самбар: улаан их бие, хоёр нүүрт зураг, бетон суурь
  geo.box(Y.x, 0.15, Y.z, Y.w + 0.3, 0.3, Y.d + 0.3, rgb(Y.base)); geo.box(Y.x, (y0 + Y.h) / 2, Y.z, Y.w, Y.h - y0, Y.d, rgb(Y.side));
  geo.box(Y.x + hw2 * 0.55, Y.h + 0.12, Y.z, Y.w * 0.45, 0.24, Y.d, rgb(Y.side));   // орой нь налуу шат маягтай
  for (const sz of [1, -1]) { const z = Y.z + sz * (Y.d / 2 + 0.006), xl = Y.x - sz * hw2, xr = Y.x + sz * hw2;
    geo.quad([[xl, y0, z], [xr, y0, z], [xr, Y.h, z], [xl, Y.h, z]], [0, 0, sz], [1, 1, 1], [px2uv(R[2], R[3]), px2uv(R[2], R[1]), px2uv(R[0], R[1]), px2uv(R[0], R[3])]); }
  shadeDown(geo, 1.6);
  const kd = k.door.position.clone().add(new THREE.Vector3(F.kiosk.x, 0, F.kiosk.z));
  return { geo, door: { ...k.door, position: kd }, dims: { w: LW, d: LD, ridgeH: Cn.h + Cn.t }, interior: k.interior, gameRole: 'fuel', chimneyTop: k.chimneyTop.clone().add(new THREE.Vector3(F.kiosk.x, 0, F.kiosk.z)),
    points: F.pumps.flatMap(x => [1, -1].map(sz => ({ name: 'Шатахуун цэнэглэх', position: new THREE.Vector3(x, 0, sz * 1.9), inward: new THREE.Vector3(0, 0, -sz) }))),
    stats: { office: k.geo.triangles } };
}

/** Ноосны агуулах (төмөр, налуу дээвэр) — milkWool талбайн хэсэг; сумын төвд ганцаараа ч ашиглана. Төв нь (0,0), нүүр +Z */
export function buildWoolStore(opts) {
  const C = BUILDING_CONFIG, M = C.milkWool, P = C.palette, A = C.atlas, winter = opts.season === 'winter';
  const S = M.store, hw = S.w / 2, hd = S.d / 2, wcol = rgb(S.color), mm = { r: A.roof, span: A.roofSpan * 0.6, vh: S.wallH }, sg = new Geo(px2uv(...A.white));
  wallQuad(sg, [-hw, hd], [hw, hd], 0, S.wallH, [0, 0, 1], wcol, mm); wallQuad(sg, [hw, -hd], [-hw, -hd], 0, S.wallH, [0, 0, -1], wcol, mm);
  wallQuad(sg, [hw, hd], [hw, -hd], 0, S.wallH, [1, 0, 0], wcol, mm); wallQuad(sg, [-hw, -hd], [-hw, hd], 0, S.wallH, [-1, 0, 0], wcol, mm);
  const apex = S.wallH + hd * S.pitch, rc = rgb(S.roof);
  for (const sx of [1, -1]) { const n = [sx, 0, 0]; sg.tri([sx * hw, S.wallH, -hd], [sx * hw, S.wallH, hd], [sx * hw, apex, 0], n, n, n, wcol, wcol, wcol); }
  for (const s2 of [1, -1]) slab(sg, -hw - 0.25, hw + 0.25, 0, apex + 0.03, s2 * (hd + 0.35), apex - S.pitch * (hd + 0.35), 0.06, { top: winter ? rgb(P.snow) : rc, uv: winter ? null : A.roof, span: A.roofSpan, edge: sc(rc, 0.7), under: rgb(P.woodDark) });
  sg.quad([[-S.doorW / 2, 0.02, hd + 0.01], [S.doorW / 2, 0.02, hd + 0.01], [S.doorW / 2, S.doorH, hd + 0.01], [-S.doorW / 2, S.doorH, hd + 0.01]], [0, 0, 1], [0.1, 0.08, 0.06]);   // онгорхой том хаалга
  sg.box(S.doorW * 0.75, S.doorH / 2 + 0.05, hd + 0.06, S.doorW * 0.5, S.doorH + 0.1, 0.06, sc(wcol, 0.85));   // гулсдаг хаалганы хавтас
  sg.box(0, S.doorH + 0.2, hd + 0.08, S.doorW * 1.9, 0.12, 0.1, rgb(P.iron));                                      // хаалганы төмөр зам
  shadeDown(sg, S.wallH);
  return { geo: sg, dims: { w: S.w, d: S.d, ridgeH: apex + 0.03 }, apex, door: { position: new THREE.Vector3(0, 0, hd + 1.6), inward: new THREE.Vector3(0, 0, -1), width: S.doorW, height: S.doorH } };
}
