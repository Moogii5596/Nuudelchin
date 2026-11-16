// @ts-nocheck — лабораторийн (tools/character-lab/buildings/index.html) хэрэглэгчийн баталсан геометрийн кодыг өөрчлөлтгүй хуулсан. Тоо, өнгө зөвхөн data/buildings.json-оос.
import * as THREE from 'three';
import { Geo, rgb, mix } from '../ger/geo';
import { BUILDING_CONFIG } from './config';
import { sc, px2uv, bandV, slab, panel, shadeDown, signDef, signRect, groundQuad } from './core';
import { leanTo, roofHex } from './houses';
import { buildKhashaa } from './yard';

export function hipRoof(g, x0, x1, z0, z1, y, rise, col, under, uvBand, span) {   // дөрвөн налуутай дээвэр (ЗДТГ)
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, hx = (x1 - x0) / 2, hz = (z1 - z0) / 2, r = Math.min(hx, hz), top = y + rise, rx = hx - r;
  const A = [x0, y, z1], B = [x1, y, z1], Cc = [x1, y, z0], D = [x0, y, z0], R1 = [cx - rx, top, cz], R2 = [cx + rx, top, cz];
  const nz = [0, r, rise], nx = [r, rise, 0], uv = (p) => uvBand ? [p[0] / span, bandV(uvBand, (p[1] - y) / rise)] : undefined;
  const q4 = (a, b, c, d, n) => g.quad([a, b, c, d], n, col, uvBand ? [uv(a), uv(b), uv(c), uv(d)] : null);
  q4(A, B, R2, R1, [0, rise, r]); q4(Cc, D, R1, R2, [0, rise, -r]);
  g.tri(B, Cc, R2, [rise, r, 0], [rise, r, 0], [rise, r, 0], col, col, col); g.tri(D, A, R1, [-rise, r, 0], [-rise, r, 0], [-rise, r, 0], col, col, col);
  g.quad([A, D, Cc, B], [0, -1, 0], under);
  return top;
}
export function buildPublic(kind, opts) {
  const C = BUILDING_CONFIG, PB = C.public, T = PB.kinds[kind], P = C.palette, A = C.atlas, geo = new Geo(px2uv(...A.white)), winter = opts.season === 'winter';
  const w = T.w, d = T.d, hw = w / 2, hd = d / 2, fh = T.floorH || PB.floorH, nf = T.floors, ph = PB.plinth, wh = ph + fh * nf;
  const wall = rgb(T.wall), trim = rgb(T.trim), roofCol = rgb(roofHex(opts.roofColor || T.roofColor)), fascia = rgb(P.casing), under = rgb(P.woodDark), con = rgb(C.shop.apron.color);
  const [b0, b1] = A.winBand, bay = PB.bay;
  geo.box(0, ph / 2, 0, w + 0.1, ph, d + 0.1, sc(trim, 0.85));   // суурь
  // давхар бүрийн хана: нэг quad, цонхны зурвас давтагдана (u = урт / (4 bay)). Өндөр давхарт (соёлын төв) цонх сунана
  const sides = [[[-hw, hd], [hw, hd], [0, 0, 1]], [[hw, -hd], [-hw, -hd], [0, 0, -1]], [[hw, hd], [hw, -hd], [1, 0, 0]], [[-hw, -hd], [-hw, hd], [-1, 0, 0]]];
  for (let f = 0; f < nf; f++) { const y0 = ph + f * fh, y1 = y0 + fh;
    for (const [a, b, n] of sides) { const L = Math.hypot(b[0] - a[0], b[1] - a[1]), nb = Math.max(1, Math.round(L / bay)), u1 = nb / 4, off = (nb % 2) ? 0 : 0.125;
      const vb = 1 - b1 / A.h, vt = 1 - b0 / A.h, plain = T.noWin;
      geo.quad([[a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]]], n, wall, plain ? null : [[off, vb], [u1 + off, vb], [u1 + off, vt], [off, vt]]); }
    if (f < nf - 1) geo.box(0, y1, 0, w + 0.12, PB.belt, d + 0.12, trim); }   // давхар хоорондын бүс
  if (T.stripe) for (let k = 0; k < Math.round(w / 3); k++) geo.box(-hw + 1.5 + k * 3, ph + fh - 0.32, hd + 0.03, 2.6, 0.22, 0.04, rgb(T.stripe[k % T.stripe.length]));   // цэцэрлэгийн өнгөт зурвас
  // дээвэр
  let topY = wh;
  if (T.roof === 'flat') { geo.box(0, wh + 0.1, 0, w + 0.2, 0.2, d + 0.2, roofCol);
    for (const [x, z, sx, sz] of [[0, hd + 0.05, w + 0.2, 0.15], [0, -hd - 0.05, w + 0.2, 0.15], [hw + 0.05, 0, 0.15, d + 0.2], [-hw - 0.05, 0, 0.15, d + 0.2]]) geo.box(x, wh + PB.parapet / 2 + 0.1, z, sx, PB.parapet, sz, sc(trim, 0.9));
    topY = wh + PB.parapet + 0.1; if (winter) geo.box(0, wh + 0.23, 0, w, 0.06, d, rgb(P.snow)); }
  else if (T.roof === 'hip') { topY = hipRoof(geo, -hw - PB.eave, hw + PB.eave, -hd - PB.eave, hd + PB.eave, wh, (hd + PB.eave) * PB.pitch * 1.4, winter ? rgb(P.snow) : roofCol, under, winter ? null : A.roof, A.roofSpan); }
  else { const apex = wh + hd * PB.pitch, ridge = apex + 0.03, ry = z => ridge - PB.pitch * Math.abs(z), ez = hd + PB.eave, gx = hw + 0.35;
    for (const sx of [1, -1]) { const n = [sx, 0, 0]; geo.tri([sx * hw, wh, -hd], [sx * hw, wh, hd], [sx * hw, apex, 0], n, n, n, wall, wall, wall); }
    for (const s2 of [1, -1]) slab(geo, -gx, gx, 0, ridge, s2 * ez, ry(ez), 0.07, { top: roofCol, uv: A.roof, span: A.roofSpan, edge: fascia, under });
    if (winter) { const zs = ez - 0.3; for (const s2 of [1, -1]) slab(geo, -gx + 0.1, gx - 0.1, 0, ridge + 0.13, s2 * zs, ry(zs) + 0.13, 0.13, { top: rgb(P.snow), edge: mix(P.snow, P.snowShade, 0.45) }); }
    topY = ridge; }
  // гол самбар: нүүрний дээд хэсэгт
  const sgKey = kind, sgW = Math.min(w * 0.7, 3.2 + signDef(sgKey).sign.length * 0.38), sgH = 0.75, sgY = wh - 0.55, sCol = rgb(signDef(sgKey).signColor);
  geo.box(0, sgY, hd + 0.06, sgW + 0.1, sgH + 0.1, 0.12, sc(sCol, 0.6)); panel(geo, [0, sgY, hd + 0.12], [0, 0, 1], sgW / 2, sgH / 2, 0.005, signRect(sgKey), sc(sCol, 0.6));
  // орцууд
  const D = { w: 1.8, h: 2.4 }, points = []; let mainDoor = null;
  for (const E of T.entrances) { const ew = E.w || D.w, x = E.x;
    if (E.garage) { geo.box(x, 1.9, hd + 0.03, 4.2, 3.8, 0.06, rgb('#6E6A64')); for (let k = 1; k < 8; k++) geo.box(x, k * 0.47, hd + 0.065, 4.2, 0.03, 0.01, rgb('#4A4640'));   // том төмөр хаалга
      points.push({ name: 'Машины хаалга', position: new THREE.Vector3(x, 0, hd + 3), inward: new THREE.Vector3(0, 0, -1) }); continue; }
    geo.box(x, ph + D.h / 2 + 0.05, hd + 0.04, ew + 0.3, D.h + 0.3, 0.08, rgb(P.casing));   // хаалганы хүрээ
    panel(geo, [x, ph + D.h / 2, hd + 0.08], [0, 0, 1], ew / 2, D.h / 2, 0.02, A.pubDoor, sc(trim, 0.8));
    const pw = ew + 1.6, pd = 1.6; geo.box(x, ph / 2, hd + pd / 2, pw, ph, pd, con);   // тавцан, шат
    for (let k = 1; k <= 2; k++) geo.box(x, ph * (1 - k / 3) / 2, hd + pd + (k - 0.5) * 0.32, pw - 0.4, ph * (1 - k / 3), 0.32, sc(con, 1 - k * 0.03));
    if (E.canopy) { const cw = E.canopy, cy = ph + D.h + 0.45; geo.box(x, cy, hd + 1.0, cw, 0.18, 2.0, sc(trim, 0.95)); if (winter) geo.box(x, cy + 0.12, hd + 1.0, cw - 0.1, 0.06, 1.9, rgb(P.snow));
      if (E.columns) for (const sx of [1, -1]) geo.box(x + sx * (cw / 2 - 0.2), (ph + cy) / 2, hd + 1.8, 0.22, cy - ph, 0.22, rgb(P.casing)); }
    if (E.portico) { const cw = 10, cd = 3.2, ch = fh * 0.85, cy = ph + ch;   // баганат үүд, гурвалжин оройтой
      geo.box(x, ph / 2, hd + cd / 2, cw + 0.6, ph, cd + 0.4, con);
      for (let k = 0; k < 6; k++) geo.lathe({ segs: 8, cx: x - cw / 2 + 0.5 + k * (cw - 1) / 5, cz: hd + cd - 0.4, profile: [[0.26, ph], [0.22, cy - 0.2], [0.3, cy]], color: rgb(P.casing) });
      geo.box(x, cy + 0.2, hd + cd / 2, cw + 0.4, 0.4, cd + 0.2, sc(trim, 0.95));
      const pz = hd + cd + 0.1, py = cy + 0.4, n = [0, 0, 1], pc = rgb(T.wall); geo.tri([x - cw / 2 - 0.2, py, pz], [x + cw / 2 + 0.2, py, pz], [x, py + 1.6, pz], n, n, n, pc, pc, pc);
      for (const sx of [1, -1]) { const nn = [sx * 1.6, cw / 2, 0]; geo.quad([[x, py + 1.6, pz], [x, py + 1.6, hd], [x + sx * (cw / 2 + 0.2), py, hd], [x + sx * (cw / 2 + 0.2), py, pz]], nn, roofCol); } }
    if (E.sign) { const sr = signRect(E.sign), c2 = rgb(signDef(E.sign).signColor); panel(geo, [x, ph + D.h + 0.6, hd + 0.08], [0, 0, 1], 1.4, 0.3, 0.06, sr, sc(c2, 0.6)); }
    const dp = { name: E.sign ? signDef(E.sign).sign : 'Орц', position: new THREE.Vector3(x, 0, hd + 1.6 + 0.64 + C.doorStandOff + (E.portico ? 2.0 : 0)), inward: new THREE.Vector3(0, 0, -1), width: ew, height: D.h };
    if (!mainDoor) mainDoor = dp; else points.push(dp); }
  shadeDown(geo, ph + fh);
  // нэмэлт
  let chimneyTop = null; const ex = T.extras || [];
  const flag = (x, z, h) => { geo.box(x, h / 2, z, 0.1, h, 0.1, rgb('#B0B6BB')); [['#C4272F', 0], ['#015197', 0.5], ['#C4272F', 1]].forEach(([c, i]) => geo.box(x + 0.32 + i * 0.6, h - 0.5, z, 0.6, 0.9, 0.02, rgb(c))); };   // туг: улаан-хөх-улаан
  if (ex.includes('flag')) flag(T.entrances[0].x + 7, hd + 4.5, 9);
  if (ex.includes('flags3')) for (const dx of [-4, 0, 4]) flag(dx - 0.9, hd + 5.5, dx === 0 ? 10 : 8.5);
  if (ex.includes('atm')) { geo.box(T.entrances[0].x + 2.6, ph + 1.1, hd + 0.12, 0.8, 1.4, 0.24, rgb('#4A4640')); geo.box(T.entrances[0].x + 2.6, ph + 1.35, hd + 0.245, 0.5, 0.35, 0.01, rgb('#3D6A8E')); }   // бэлэн мөнгөний машин
  if (ex.includes('cross')) { const x = T.entrances[0].x, y = wh - 0.55; geo.box(x + 6.5, y, hd + 0.08, 1.1, 1.1, 0.1, rgb('#FFFFFF')); geo.box(x + 6.5, y, hd + 0.14, 0.8, 0.26, 0.02, rgb('#B03A22')); geo.box(x + 6.5, y, hd + 0.14, 0.26, 0.8, 0.02, rgb('#B03A22')); }
  if (ex.includes('playground')) { const cz = hd + 8, rail = rgb('#2E5E9E');   // дүүжин, гулгуур, элсний хайрцаг
    for (const sx of [-1, 1]) { geo.beam([-8 + sx * 1.6, 0, cz - 0.8], [-8 + sx * 1.6, 2.4, cz], 0.08, 0.08, rail); geo.beam([-8 + sx * 1.6, 0, cz + 0.8], [-8 + sx * 1.6, 2.4, cz], 0.08, 0.08, rail); }
    geo.beam([-9.7, 2.4, cz], [-6.3, 2.4, cz], 0.08, 0.08, rail); for (const sx of [-0.7, 0.7]) { geo.beam([-8 + sx - 0.2, 2.4, cz], [-8 + sx - 0.2, 0.55, cz], 0.02, 0.02, rgb(P.iron)); geo.beam([-8 + sx + 0.2, 2.4, cz], [-8 + sx + 0.2, 0.55, cz], 0.02, 0.02, rgb(P.iron)); geo.box(-8 + sx, 0.53, cz, 0.5, 0.05, 0.25, rgb('#D9622B')); }
    geo.box(2, 0.75, cz, 1.2, 1.5, 1.2, rgb('#D8A93A')); geo.obox([2, 0.75, cz + 1.8], [0.45, 0, 0], [0, 0.8, 1.15], [0, 0.05, -0.02], rgb('#B03A22'));
    geo.box(8, 0.12, cz, 3, 0.24, 3, rgb('#9A7A55')); geo.box(8, 0.2, cz, 2.7, 0.04, 2.7, rgb(winter ? P.snow : '#E3CC93')); }
  if (ex.includes('pen')) { const x0 = hw + 1.5, x1 = hw + 9.5, z0 = -hd + 0.5, z1 = hd + 2, rc = rgb('#7A6448');   // малын хороо, шахуурга
    const rails = (a, b) => { for (const y of [0.4, 0.85, 1.3]) geo.beam([a[0], y, a[1]], [b[0], y, b[1]], 0.07, 0.07, rc); };
    for (const [x, z] of [[x0, z0], [x1, z0], [x1, z1], [x0 + 3, z1], [x1, (z0 + z1) / 2], [x0 + 4, z0]]) geo.box(x, 0.75, z, 0.16, 1.5, 0.16, sc(rc, 0.8));
    rails([x0, z0], [x1, z0]); rails([x1, z0], [x1, z1]); rails([x0 + 3, z1], [x1, z1]);
    points.push({ name: 'Хорооны хаалга', position: new THREE.Vector3(x0 + 1.5, 0, z1 + 1.2), inward: new THREE.Vector3(0, 0, -1) }); }
  if (ex.includes('stack')) { const sx = hw + 3, sz = -hd + 3, H = 26, n = 6;   // улаан-цагаан судалтай өндөр яндан
    geo.lathe({ segs: 10, cx: sx, cz: sz, profile: Array.from({ length: n + 1 }, (_, i) => [1.1 - 0.45 * i / n, i * H / n]), colorAt: seg => rgb(seg % 2 ? '#F4EEDF' : '#B03A22') });
    geo.box(sx, 0.6, sz, 2.8, 1.2, 2.8, rgb('#8C8478')); geo.beam([hw, wh - 1.5, sz], [sx - 0.8, 3.5, sz], 0.5, 0.5, rgb('#6E6A64'));
    chimneyTop = new THREE.Vector3(sx, H + 0.3, sz); }
  if (ex.includes('coal')) geo.lathe({ segs: 8, cx: -hw - 5.5, cz: hd + 2, profile: [[4.0, 0.01], [2.6, 1.6], [0.6, 2.4], [0, 2.45]], color: rgb(winter ? '#C8D0DA' : '#2A2622') });   // нүүрсний овоо
  if (!T.central && (ex.includes('chimney') || T.roof !== 'flat' && !chimneyTop)) { const cx = -hw + 1.5, cz = -1, base = wh, top = topY + 0.7;
    geo.box(cx, (base + top) / 2, cz, 0.5, top - base, 0.5, rgb(P.brick)); chimneyTop = new THREE.Vector3(cx, top + 0.15, cz); }
  if (!chimneyTop && !T.central) chimneyTop = new THREE.Vector3(-hw + 2, topY + 0.6, -2);
  return { geo, door: mainDoor, points, dims: { w, d, ridgeH: Math.max(topY, chimneyTop ? chimneyTop.y - 0.3 : 0), floors: nf }, interior: { main: { w: w - 0.6, d: d - 0.6, h: fh - 0.3 }, floors: nf },
    gameRole: T.gameRole, chimneyTop, windows: [new THREE.Vector3(-bay, ph + 1.6, hd)] };
}

export function bandQuad(g, a, b, y0, y1, n, band, span, col = [1, 1, 1]) {   // давтагдах зурвасан хавтан (v нь 0…1 доороос дээш)
  const u1 = Math.hypot(b[0] - a[0], b[1] - a[1]) / span, vb = bandV(band, 0), vt = bandV(band, 1);
  g.quad([[a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]]], n, col, [[0, vb], [u1, vb], [u1, vt], [0, vt]]);
}
export function flares(g, x0, x1, z0, z1, y, f, col, bw = 0.42) {   // дээврийн дөрвөн булангийн дээш эргэсэн үзүүр
  for (const [x, z, sx, sz] of [[x0, z0, -1, -1], [x1, z0, 1, -1], [x0, z1, -1, 1], [x1, z1, 1, 1]]) g.beam([x - sx * 0.6, y + 0.02, z - sz * 0.6], [x + sx * f * 0.7, y + f * 0.65, z + sz * f * 0.7], bw, bw * 0.38, col);
}
export function buildTemple(opts) {
  const C = BUILDING_CONFIG, T = C.temple, P = C.palette, A = C.atlas, geo = new Geo(px2uv(...A.white)), winter = opts.season === 'winter';
  const [YW, YD] = T.yard, yard = buildKhashaa({ season: opts.season, w: YW, d: YD, seed: 9, fenceColor: T.fence, gateColor: T.gate }); geo.append(yard.geo);
  const H = T.hall, hw = H.w / 2, hd = H.d / 2, zc = T.hallZ, pl = T.plat, y0 = pl.h, wt = y0 + H.h, red = rgb(H.red), gold = rgb(H.gold), wall = rgb(H.wall);
  const roofC = winter ? rgb(P.snow) : rgb(T.roof.color), under = rgb(T.roof.under), zf = zc + hd, zp = zf + T.porch.d;
  const hall = new Geo(px2uv(...A.white));
  hall.box(0, y0 / 2, zc + T.porch.d / 2, pl.w, y0, pl.d, rgb(pl.color));   // чулуун тавцан
  for (let k = 1; k <= 2; k++) hall.box(0, y0 * (1 - k / 3) / 2, zc + T.porch.d / 2 + pl.d / 2 + (k - 0.5) * 0.4, 4.4, y0 * (1 - k / 3), 0.4, sc(rgb(pl.color), 1 - k * 0.04));
  const sides = [[[-hw, zf], [hw, zf], [0, 0, 1]], [[hw, zc - hd], [-hw, zc - hd], [0, 0, -1]], [[hw, zf], [hw, zc - hd], [1, 0, 0]], [[-hw, zc - hd], [-hw, zf], [-1, 0, 0]]];
  for (const [a, b, n] of sides) { hall.quad([[a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], wt, b[1]], [a[0], wt, a[1]]], n, wall);
    const o = 0.02, ao = [a[0] + n[0] * o, a[1] + n[2] * o], bo = [b[0] + n[0] * o, b[1] + n[2] * o];
    hall.quad([[ao[0], y0, ao[1]], [bo[0], y0, bo[1]], [bo[0], y0 + 0.7, bo[1]], [ao[0], y0 + 0.7, ao[1]]], n, red);   // улаан хормой
    bandQuad(hall, ao, bo, wt - T.beamH, wt, n, A.templeBeam, 2.0); }                                               // будмал дам нуруу
  for (const sx of [1, -1]) for (const sz of [zc - hd, zf]) hall.box(sx * hw, (y0 + wt) / 2, sz, 0.36, H.h, 0.36, red);   // булангийн багана
  hall.box(0, y0 + 1.5, zf + 0.04, 2.2, 3.0, 0.1, gold); hall.box(0, y0 + 1.45, zf + 0.1, 1.9, 2.8, 0.04, red);            // алтан хүрээтэй улаан хаалга
  for (const y of [y0 + 0.7, y0 + 2.2]) hall.box(0, y, zf + 0.125, 1.9, 0.08, 0.01, gold); hall.box(0, y0 + 1.45, zf + 0.125, 0.05, 2.8, 0.01, sc(gold, 0.7));
  for (const sx of [1, -1]) { hall.box(sx * 3.2, y0 + 2.0, zf + 0.04, 1.3, 1.5, 0.08, red); hall.box(sx * 3.2, y0 + 2.0, zf + 0.085, 1.0, 1.2, 0.01, rgb('#3A2418'));   // торон цонх
    hall.box(sx * 3.2, y0 + 2.0, zf + 0.09, 1.0, 0.05, 0.01, gold); hall.box(sx * 3.2, y0 + 2.0, zf + 0.09, 0.05, 1.2, 0.01, gold); }
  for (const x of T.porch.cols) hall.lathe({ segs: 8, cx: x, cz: zp - 0.3, profile: [[0.28, y0], [T.porch.colR, y0 + 0.2], [T.porch.colR, wt - 0.1], [0.3, wt]], color: red });   // үүдний улаан багана
  bandQuad(hall, [-hw - 0.3, zp - 0.05], [hw + 0.3, zp - 0.05], wt - T.beamH, wt, [0, 0, 1], A.templeBeam, 2.0);                 // үүдний дам нуруу
  hall.box(0, wt - T.beamH / 2, zp - 0.3, H.w + 0.6, T.beamH, 0.42, red);
  // доод дээвэр (үүдийг хамарна) + дээш эргэсэн булан
  const R = T.roof, rx0 = -hw - R.eave, rx1 = hw + R.eave, rz0 = zc - hd - R.eave, rz1 = zp + R.eave * 0.6;
  hipRoof(hall, rx0, rx1, rz0, rz1, wt, R.rise, roofC, under, winter ? null : A.roof, A.roofSpan);
  flares(hall, rx0, rx1, rz0, rz1, wt, R.flare, roofC);
  // дээд давхар
  const U = T.upper, uw = U.w / 2, uz = zc + 0.6, ub = wt + 0.9, ut = ub + U.h;
  for (const [a, b, n] of [[[-uw, uz + uw], [uw, uz + uw], [0, 0, 1]], [[uw, uz - uw], [-uw, uz - uw], [0, 0, -1]], [[uw, uz + uw], [uw, uz - uw], [1, 0, 0]], [[-uw, uz - uw], [-uw, uz + uw], [-1, 0, 0]]]) {
    hall.quad([[a[0], ub, a[1]], [b[0], ub, b[1]], [b[0], ut, b[1]], [a[0], ut, a[1]]], n, wall); bandQuad(hall, [a[0] + n[0] * 0.02, a[1] + n[2] * 0.02], [b[0] + n[0] * 0.02, b[1] + n[2] * 0.02], ut - 0.5, ut, n, A.templeBeam, 2.0); }
  for (const sx of [1, -1]) for (const sz of [-1, 1]) hall.box(sx * uw, (ub + ut) / 2, uz + sz * uw, 0.3, U.h, 0.3, red);
  const top = hipRoof(hall, -uw - U.eave, uw + U.eave, uz - uw - U.eave, uz + uw + U.eave, ut, U.rise, roofC, under, winter ? null : A.roof, A.roofSpan);
  flares(hall, -uw - U.eave, uw + U.eave, uz - uw - U.eave, uz + uw + U.eave, ut, R.flare * 0.8, roofC);
  hall.lathe({ segs: 8, cx: 0, cz: uz, profile: [[0.38, top - 0.05], [0.3, top + 0.2], [0.44, top + 0.5], [0.26, top + 0.85], [0.12, top + 1.15], [0.17, top + 1.3], [0.03, top + 1.9], [0, top + 1.95]], color: gold });   // ганжир
  shadeDown(hall, wt); geo.append(hall);
  // хүрд: гурван төрөл (жишээ зургуудаар). Хүрд бүр тусдаа эргэх хэсэг → wheels[] (тоглоомд InstancedMesh, тоглогч очиж эргүүлнэ)
  const wheels = [], WH = T.wheels;
  const wheelGeo = (r, h, style) => { const g = new Geo(px2uv(...A.white)), [vb, vt] = [bandV(A.wheelBand, 0), bandV(A.wheelBand, 1)];
    if (style === 'white') { const R = A.wheelScript, u0 = R[0] / A.size, u1 = R[2] / A.size, v0 = 1 - R[3] / A.h, v1 = 1 - R[1] / A.h;
      g.lathe({ segs: 8, profile: [[r, 0], [r, h]], uvAt: (pi, f) => [u0 + (u1 - u0) * f, pi ? v1 : v0], color: [1, 1, 1] }); }
    else g.lathe({ segs: 8, profile: [[r, 0], [r, h]], uvAt: (pi, f) => [f * 1.5, pi ? vt : vb], color: style === 'brass' ? rgb('#C9A24E') : [1, 1, 1] });
    for (const y of [0, h]) g.lathe({ segs: 8, smooth: false, profile: y ? [[r + 0.025, y - 0.03], [r + 0.025, y + 0.03], [0, y + 0.05]] : [[0, y - 0.05], [r + 0.025, y - 0.03], [r + 0.025, y + 0.03]], color: rgb(style === 'white' ? '#D9622B' : '#B03A22') });
    return g; };
  const addWheel = (x, y, z, r, h, style, name, inward) => { wheels.push({ geo: wheelGeo(r, h, style), position: new THREE.Vector3(x, y, z), radius: r, height: h, style });
    points.push({ name, spinDir: -1, position: new THREE.Vector3(x + inward.x * -(r + 0.7), 0, z + inward.z * -(r + 0.7)), inward }); };
  const points = [];
  { // (1) улаан хүрээтэй эгнээ хүрд (3-р зураг): дуганы зүүн талд, хүрээ z тэнхлэгийн дагуу
    const F = WH.row, L = (F.n - 1) * F.gap + 1.2, x = F.x, z0 = zc - L / 2, red2 = rgb('#C0392B'), fg = new Geo(px2uv(...A.white));
    for (const z of [z0, z0 + L]) { fg.box(x, F.top / 2, z, 0.22, F.top, 0.22, red2); fg.box(x, 0.08, z, 0.9, 0.16, 0.3, red2); fg.beam([x - 0.4, 0.16, z], [x, 0.8, z], 0.12, 0.12, red2); fg.beam([x + 0.4, 0.16, z], [x, 0.8, z], 0.12, 0.12, red2); }
    fg.box(x, F.top, zc, 0.5, 0.16, L + 0.5, red2); fg.box(x, F.top - 0.06, zc, 0.42, 0.06, L + 0.4, sc(red2, 0.8));   // дээд хөндлөвч
    fg.box(x, F.mid, zc, 0.3, 0.12, L, red2);                                                                               // дунд хөндлөвч
    for (let i = 0; i < F.n; i++) { const z = z0 + 0.6 + i * F.gap; fg.beam([x, F.mid, z], [x, F.top, z], 0.03, 0.03, rgb(P.iron));
      fg.beam([x - 0.28, F.mid + 0.3, z], [x - 0.05, F.mid + 0.3, z], 0.03, 0.03, rgb(P.iron));   // бариул
      addWheel(x, F.mid + 0.09, z, F.r, F.h, 'gold', 'Хүрд эргүүлэх', new THREE.Vector3(1, 0, 0)); }
    shadeDown(fg, F.top); geo.append(fg); }
  { // (2) ногоон дээвэртэй ганц гуулин хүрд (4-р зураг): хашааны хаалганы зүүн талд
    const S1 = WH.single, x = S1.x, z = S1.z, red2 = rgb('#C0392B'), green = rgb('#3F8A6E'), sg = new Geo(px2uv(...A.white));
    for (const sx of [1, -1]) sg.box(x + sx * 0.55, 1.15, z, 0.16, 2.3, 0.16, red2);
    sg.box(x, 0.32, z, 1.4, 0.14, 0.32, green); sg.box(x, 1.95, z, 1.2, 0.1, 0.2, red2);
    for (const s2 of [1, -1]) slab(sg, x - 0.85, x + 0.85, z, 2.6, z + s2 * 0.62, 2.22, 0.06, { top: winter ? rgb(P.snow) : green, edge: sc(green, 0.7), under: sc(green, 0.6) });
    sg.beam([x, 0.39, z], [x, 1.9, z], 0.04, 0.04, rgb(P.iron));
    shadeDown(sg, 2.3); geo.append(sg);
    addWheel(x, 0.6, z, 0.3, 0.95, 'brass', 'Хүрд эргүүлэх', new THREE.Vector3(0, 0, -1)); }
  { // (3) дөрвөн баганатай асартай цагаан хүрд (5-р зураг): дуганы урд баруун талд
    const Pv = WH.pavilion, x = Pv.x, z = Pv.z, hw2 = Pv.w / 2, pg = new Geo(px2uv(...A.white)), red2 = rgb('#B5532A'), orange = rgb('#D9622B'), green = winter ? rgb(P.snow) : rgb('#2F8A55');
    pg.box(x, 0.06, z, Pv.w + 0.8, 0.12, Pv.w + 0.8, rgb('#9AA3A8')); pg.box(x, 0.13, z, Pv.w - 0.4, 0.02, Pv.w - 0.4, rgb('#B5633F'));   // хавтан, улаан тоосгон дэвсгэр
    for (const sx of [1, -1]) for (const sz of [1, -1]) pg.lathe({ segs: 8, cx: x + sx * hw2, cz: z + sz * hw2, profile: [[0.2, 0.12], [0.16, 0.4], [0.13, Pv.h], [0.17, Pv.h + 0.05]], color: red2 });
    for (const [a1, b1] of [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]]) pg.beam([x + a1[0] * hw2, Pv.h + 0.12, z + a1[1] * hw2], [x + b1[0] * hw2, Pv.h + 0.12, z + b1[1] * hw2], 0.2, 0.22, orange);
    const tp = hipRoof(pg, x - hw2 - 0.35, x + hw2 + 0.35, z - hw2 - 0.35, z + hw2 + 0.35, Pv.h + 0.24, 0.75, green, orange, null, 1);
    flares(pg, x - hw2 - 0.35, x + hw2 + 0.35, z - hw2 - 0.35, z + hw2 + 0.35, Pv.h + 0.24, 0.3, rgb(H.gold), 0.16);
    pg.lathe({ segs: 8, cx: x, cz: z, profile: [[0.14, tp - 0.05], [0.16, tp + 0.15], [0.1, tp + 0.4], [0.12, tp + 0.5], [0, tp + 0.62]], color: rgb(H.gold) });
    pg.box(x, 0.45, z, 0.62, 0.66, 0.62, rgb('#FFFFFF')); pg.lathe({ segs: 8, cx: x, cz: z, profile: [[0.1, 0.78], [0.1, 1.05]], color: rgb('#9AA3A8') });   // цагаан тавиур, багана
    pg.beam([x, 1.9, z], [x, Pv.h + 0.1, z], 0.03, 0.03, rgb(P.iron));
    shadeDown(pg, Pv.h); geo.append(pg);
    addWheel(x, 1.08, z, 0.33, 0.8, 'white', 'Хүрд эргүүлэх', new THREE.Vector3(0, 0, -1)); }
  // суварга (1–2-р зураг): өндөр цагаан тавцан, гурван шат, алтан хээтэй давхарга, хонх хэлбэрийн бумба (алтан хүрээтэй тахилын нүх), цагираг бүхий шовх, алтан шүхэр, алтан "далавч"
  const St = T.stupa, sx0 = St.x, sz0 = St.z, wht = rgb('#FFFFFF'), wht2 = rgb('#EEF0F0'), sg2 = new Geo(px2uv(...A.white)), gold2 = rgb(H.gold);
  const tier = (w, y, h, c = wht) => sg2.box(sx0, y + h / 2, sz0, w, h, w, c);
  const orn = (w, y, h) => { const O = A.ornament; for (const [n, ox, oz] of [[[0, 0, 1], 0, 1], [[0, 0, -1], 0, -1], [[1, 0, 0], 1, 0], [[-1, 0, 0], -1, 0]])
    panel(sg2, [sx0 + ox * (w / 2 + 0.005), y + h / 2, sz0 + oz * (w / 2 + 0.005)], n, w * 0.42, h * 0.38, 0.005, O, gold2); };
  tier(4.0, 0, 0.15, wht2); tier(3.6, 0.15, 2.3); tier(3.2, 2.45, 0.22); tier(2.95, 2.67, 0.2); tier(2.7, 2.87, 0.18);
  tier(2.3, 3.05, 0.6); orn(2.3, 3.05, 0.6); tier(2.6, 3.65, 0.16);                                // алтан хээтэй давхарга, хучилт
  for (let k = 0; k < 4; k++) { const w = 2.2 - k * 0.22; tier(w, 3.81 + k * 0.17, 0.17); sg2.box(sx0, 3.81 + k * 0.17 + 0.085, sz0 + w / 2 + 0.004, w * 0.86, 0.06, 0.01, gold2); }   // шатлал алтан зураастай
  const by = 4.5; sg2.lathe({ segs: 8, cx: sx0, cz: sz0, profile: [[0.82, by], [0.95, by + 0.25], [0.97, by + 0.85], [0.82, by + 1.2], [0.45, by + 1.38], [0, by + 1.4]], color: wht });   // бумба
  { const nz = sz0 + 0.96, ny = by + 0.62, N = A.niche; sg2.box(sx0, ny, nz - 0.04, 0.78, 0.98, 0.12, gold2); panel(sg2, [sx0, ny, nz + 0.02], [0, 0, 1], 0.3, 0.4, 0.005, N, gold2); }   // тахилын нүх
  sg2.box(sx0, by + 1.55, sz0, 0.62, 0.3, 0.62, wht);
  sg2.lathe({ segs: 6, cx: sx0, cz: sz0, profile: Array.from({ length: 7 }, (_, i) => [0.3 - i * 0.03 + (i % 2) * 0.025, by + 1.7 + i * 0.227]), color: wht });   // цагирагтай шовх
  const ty = by + 3.06; sg2.lathe({ segs: 8, cx: sx0, cz: sz0, smooth: false, profile: [[0.18, ty - 0.02], [0.62, ty + 0.08], [0.58, ty + 0.16], [0.12, ty + 0.22]], color: gold2 });   // шүхэр
  sg2.lathe({ segs: 6, cx: sx0, cz: sz0, profile: [[0.1, ty + 0.2], [0.17, ty + 0.35], [0.09, ty + 0.5], [0.13, ty + 0.62], [0, ty + 0.85]], color: gold2 });   // сар нар
  for (const s2 of [1, -1]) { sg2.beam([sx0 + s2 * 0.55, ty + 0.08, sz0], [sx0 + s2 * 1.05, by + 1.15, sz0], 0.2, 0.06, gold2); sg2.beam([sx0 + s2 * 1.05, by + 1.15, sz0], [sx0 + s2 * 1.3, by + 1.35, sz0], 0.2, 0.06, gold2); }   // далавч
  for (const dx of [-0.45, 0.35]) sg2.beam([sx0 + dx, 2.5, sz0 + 1.79], [sx0 + dx + 0.18, 1.55, sz0 + 1.84], 0.34, 0.02, rgb('#2E6FB8'));   // хадаг (тавцангийн захаас унжсан)
  shadeDown(sg2, 2.5); geo.append(sg2);
  points.push({ name: 'Суварга мөргөх', position: new THREE.Vector3(sx0, 0, sz0 + 2.9), inward: new THREE.Vector3(0, 0, -1) },
              { name: 'Суварга тойрох', direction: 'clockwise', position: new THREE.Vector3(sx0 + 2.9, 0, sz0), inward: new THREE.Vector3(-1, 0, 0) },
              { name: 'Хашааны хаалга', position: yard.gate.position.clone(), inward: yard.gate.inward });
  const door = { position: new THREE.Vector3(0, 0, zc + T.porch.d / 2 + pl.d / 2 + 0.8 + C.doorStandOff), inward: new THREE.Vector3(0, 0, -1), width: 1.9, height: 2.8 };
  return { geo, door, dims: { w: YW, d: YD, ridgeH: top + 1.95 }, interior: { main: { w: H.w - 0.6, d: H.d - 0.6, h: H.h - 0.3 } }, gameRole: 'temple', chimneyTop: null,
    points, wheels, stats: { office: hall.triangles, stupa: sg2.triangles, wheels: wheels.reduce((a2, w2) => a2 + w2.geo.triangles, 0) } };
}

export function railRun(g, a, b, M, col) {   // хөндлөвчтэй модон хашаа a → b (хөнгөн: багана 4 тал, хөндлөвч 3 тал)
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(L / (M.every || 4))), tx = (b[0] - a[0]) / L, tz = (b[1] - a[1]) / L, ox = -tz, oz = tx, pc = sc(col, 0.8), p = M.post / 2;
  for (let i = 0; i <= n; i++) { const x = a[0] + (b[0] - a[0]) * i / n, z = a[1] + (b[1] - a[1]) * i / n, q = (u, v, y) => [x + tx * u + ox * v, y, z + tz * u + oz * v];
    for (const [u0, v0, u1, v1, nn] of [[-p, p, p, p, [ox, 0, oz]], [p, -p, -p, -p, [-ox, 0, -oz]], [p, p, p, -p, [tx, 0, tz]], [-p, -p, -p, p, [-tx, 0, -tz]]])
      g.quad([q(u0, v0, 0), q(u1, v1, 0), q(u1, v1, M.postH || 1.5), q(u0, v0, M.postH || 1.5)], nn, pc); }
  const r = 0.04; for (const y of M.railH) { const A1 = [a[0], a[1]], B1 = [b[0], b[1]], q = (P2, v, yy) => [P2[0] + ox * v, yy, P2[1] + oz * v];
    g.quad([q(A1, r, y - r), q(B1, r, y - r), q(B1, r, y + r), q(A1, r, y + r)], [ox, 0, oz], col); g.quad([q(B1, -r, y - r), q(A1, -r, y - r), q(A1, -r, y + r), q(B1, -r, y + r)], [-ox, 0, -oz], col);  }
}
export function buildMarket(opts) {
  const C = BUILDING_CONFIG, M = C.market, P = C.palette, A = C.atlas, geo = new Geo(px2uv(...A.white)), winter = opts.season === 'winter', rc = rgb(M.rail);
  const [LW, LD] = M.lot, hw = LW / 2, hd = LD / 2; groundQuad(geo, -hw, -hd, hw, hd, rgb(winter ? '#DDE4EC' : M.ground), 0.009);
  // гадна хашаа: урд талын голд 6 м хаалга
  railRun(geo, [-hw, hd], [-3, hd], M, rc); railRun(geo, [3, hd], [hw, hd], M, rc); railRun(geo, [hw, hd], [hw, -hd], M, rc); railRun(geo, [hw, -hd], [-hw, -hd], M, rc); railRun(geo, [-hw, -hd], [-hw, hd], M, rc);
  for (const sx of [1, -1]) geo.box(sx * 3, 1.3, hd, 0.25, 2.6, 0.25, sc(rc, 0.7)); geo.beam([-3, 2.55, hd], [3, 2.55, hd], 0.18, 0.18, sc(rc, 0.7));
  // хороонууд: 2 эгнээ, хооронд нь гарц; хорооны хаалга гарц руу
  const Q = M.pens, points = [];
  for (let r = 0; r < Q.rows; r++) for (let c = 0; c < Q.cols; c++) {
    const x0 = Q.x0 + c * Q.w, z0 = Q.z0 + r * (Q.d + 4) , x1 = x0 + Q.w, z1 = z0 + Q.d, gz = r ? z0 : z1;
    railRun(geo, [x0, z0 + (r ? 0 : 0)], [x0, z1], M, rc); if (c === Q.cols - 1) railRun(geo, [x1, z0], [x1, z1], M, rc);
    railRun(geo, r ? [x0, z1] : [x0, z0], r ? [x1, z1] : [x1, z0], M, rc);                       // ар тал
    railRun(geo, [x0, gz], [x0 + Q.w / 2 - 0.9, gz], M, rc); railRun(geo, [x0 + Q.w / 2 + 0.9, gz], [x1, gz], M, rc);   // урд тал хаалгатай
    points.push({ name: 'Хороо ' + (r * Q.cols + c + 1), position: new THREE.Vector3(x0 + Q.w / 2, 0, gz + (r ? -1.2 : 1.2)), inward: new THREE.Vector3(0, 0, r ? 1 : -1) }); }
  // саравч (худалдааны), ачих тавцан, тэвш, өвс
  const S = M.shed, sg = new Geo(px2uv(...A.white)); const snowF = leanTo(sg, S.w, S.d, 2.6, 2.2, rgb('#8C7453'), rgb(roofHex('grey')), 0.3, winter); shadeDown(sg, 2.6); snowF(); geo.append(sg, 0, S.x, S.z);
  const R = M.ramp, rg = new Geo(px2uv(...A.white)), con = rgb('#9AA3A8');
  rg.box(0, R.h / 2, -R.L / 2 - 1, R.w, R.h, 2, con); rg.obox([0, R.h / 2 - 0.05, 0], [R.w / 2, 0, 0], [0, R.h / 2, R.L / 2 - 0.05], [0, 0.1, -0.02], sc(rc, 0.9));
  for (const sx of [1, -1]) rg.beam([sx * R.w / 2, R.h + 0.1, -R.L / 2 - 2], [sx * R.w / 2, 0.9, R.L / 2], 0.08, 0.08, rc);
  geo.append(rg, 0, R.x, R.z);
  const T = M.trough; geo.box(T.x, 0.3, T.z, 3, 0.5, 0.7, rgb('#6E6A64')); geo.box(T.x, 0.52, T.z, 2.8, 0.02, 0.5, rgb(winter ? '#DCE6EE' : '#4A6A8A'));
  for (const [x, z] of [[T.x + 3, T.z], [T.x + 4.1, T.z + 0.3], [T.x + 3.5, T.z + 0.2]]) geo.box(x, 0.25, z, 1.0, 0.5, 0.5, rgb('#C9A24E'));
  shadeDown(geo, 2.6);
  return { geo, door: { position: new THREE.Vector3(0, 0, hd + 1.5), inward: new THREE.Vector3(0, 0, -1), width: 6, height: 2.5 }, dims: { w: LW, d: LD, ridgeH: 2.7 }, interior: null, gameRole: 'livestockMarket', chimneyTop: null,
    points: [...points, { name: 'Мал буулгах тавцан', position: new THREE.Vector3(R.x, 0, R.z + R.L / 2 + 1.5), inward: new THREE.Vector3(0, 0, -1) }], stats: { office: 0 } };
}
export function floodlight(g, x, z, h, face) {   // гэрэлтүүлгийн шон: толгой нь face (x, z) чиглэлд, нүүр нь шөнө гэрэлтэнэ
  const C = BUILDING_CONFIG, A = C.atlas, iron = rgb(C.palette.iron), L = Math.hypot(face[0], face[1]), fx = face[0] / L, fz = face[1] / L;
  g.box(x, 0.3, z, 0.7, 0.6, 0.7, rgb('#9AA3A8')); g.beam([x, 0.6, z], [x, h, z], 0.22, 0.22, iron);
  const hx = x + fx * 0.3, hz = z + fz * 0.3; g.box(hx, h + 0.3, hz, 1.6 * Math.abs(fz) + 0.5 * Math.abs(fx), 1.0, 1.6 * Math.abs(fx) + 0.5 * Math.abs(fz), iron);
  const uv = px2uv(...A.lamp), c = [hx + fx * 0.27, h + 0.3, hz + fz * 0.27], u = [fz, 0, -fx], w2 = 0.7, h2 = 0.42, n = [fx, -0.3, fz];
  g.quad([[c[0] - u[0] * w2, c[1] - h2, c[2] - u[2] * w2], [c[0] + u[0] * w2, c[1] - h2, c[2] + u[2] * w2], [c[0] + u[0] * w2, c[1] + h2, c[2] + u[2] * w2], [c[0] - u[0] * w2, c[1] + h2, c[2] - u[2] * w2]], n, [1, 1, 1], [uv, uv, uv, uv]);
  return new THREE.Vector3(c[0] + fx * 1.5, c[1], c[2] + fz * 1.5);
}
export function buildStadium(opts) {
  const C = BUILDING_CONFIG, S = C.stadium, P = C.palette, A = C.atlas, geo = new Geo(px2uv(...A.white)), winter = opts.season === 'winter';
  const [LW, LD] = S.lot, line = rgb(winter ? '#C9D2DC' : S.line), Pt = S.pitch, px = Pt.x, hw = Pt.w / 2, hd = Pt.d / 2, y = 0.016;
  groundQuad(geo, -LW / 2, -LD / 2, LW / 2, LD / 2, rgb(winter ? '#E6ECF3' : S.grass), 0.008);
  const ln = (a, b, w = 0.12) => { const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), ox = -dz / L * w / 2, oz = dx / L * w / 2;
    geo.quad([[a[0] - ox, y, a[1] - oz], [b[0] - ox, y, b[1] - oz], [b[0] + ox, y, b[1] + oz], [a[0] + ox, y, a[1] + oz]], [0, 1, 0], line); };
  ln([px - hw, -hd], [px + hw, -hd]); ln([px + hw, -hd], [px + hw, hd]); ln([px + hw, hd], [px - hw, hd]); ln([px - hw, hd], [px - hw, -hd]); ln([px, -hd], [px, hd]);
  for (let k = 0; k < 16; k++) { const a0 = k / 16 * Math.PI * 2, a1 = (k + 1) / 16 * Math.PI * 2; ln([px + Math.cos(a0) * 5, Math.sin(a0) * 5], [px + Math.cos(a1) * 5, Math.sin(a1) * 5]); }
  for (const sx of [1, -1]) { const gx = px + sx * hw, w = S.goalW / 2, iron = rgb('#F4EEDF');
    ln([gx, -8], [gx - sx * 9, -8]); ln([gx - sx * 9, -8], [gx - sx * 9, 8]); ln([gx - sx * 9, 8], [gx, 8]);
    for (const z of [-w, w]) geo.beam([gx, 0, z], [gx, S.goalH, z], 0.1, 0.1, iron); geo.beam([gx, S.goalH, -w], [gx, S.goalH, w], 0.1, 0.1, iron);
    for (const z of [-w, w]) geo.beam([gx, S.goalH, z], [gx + sx * 1.5, 0, z], 0.05, 0.05, iron); }
  // хамгаалалтын тор: өндөр шон, 5 хэвтээ утас + доод самбар; урд талын голд хаалга
  const N = S.net, nx = hw + N.margin, nz = hd + N.margin, nc = rgb(N.color), M = { post: 0.12, postH: N.h, every: N.every, railH: [N.board + 0.4, 1.9, 2.9, 3.9, N.h - 0.05] };
  const run = (a, b) => { railRun(geo, a, b, M, nc); const L = Math.hypot(b[0] - a[0], b[1] - a[1]), dz = (b[1] - a[1]) / L, dx = (b[0] - a[0]) / L;
    for (const s2 of [1, -1]) geo.quad([[a[0] + dz * 0.03 * s2, 0, a[1] - dx * 0.03 * s2], [b[0] + dz * 0.03 * s2, 0, b[1] - dx * 0.03 * s2], [b[0] + dz * 0.03 * s2, N.board, b[1] - dx * 0.03 * s2], [a[0] + dz * 0.03 * s2, N.board, a[1] - dx * 0.03 * s2]], [-dz * s2, 0, dx * s2], sc(nc, 0.85)); };
  run([px - nx, nz], [px - N.gate / 2, nz]); run([px + N.gate / 2, nz], [px + nx, nz]); run([px + nx, nz], [px + nx, -nz]); run([px + nx, -nz], [px - nx, -nz]); run([px - nx, -nz], [px - nx, nz]);
  // цэнгэлдэх: торны гадна, ард
  const T = S.stand, wood = rgb('#9A7A55'), roofC = winter ? rgb(P.snow) : rgb(T.roof);
  for (let r = 0; r < T.rows; r++) { const z = T.z + r * -T.rowD, h = 0.4 + r * T.step; geo.box(T.x, h / 2, z, T.w, h, T.rowD, sc(rgb('#B9B2A4'), 1 - r * 0.03)); geo.box(T.x, h + 0.06, z + 0.15, T.w - 0.2, 0.08, 0.32, wood); }
  const zb = T.z - (T.rows - 0.5) * T.rowD, zf = T.z + 0.6, top = 0.4 + T.rows * T.step + 2.4;
  for (let k = 0; k <= 4; k++) { const x = T.x - T.w / 2 + k * T.w / 4; geo.box(x, top / 2, zb, 0.2, top, 0.2, rgb(P.iron)); geo.box(x, (top - 0.4) / 2, zf, 0.16, top - 0.4, 0.16, rgb(P.iron)); }
  slab(geo, T.x - T.w / 2 - 0.4, T.x + T.w / 2 + 0.4, zb - 0.4, top + 0.1, zf + 0.8, top - 0.5, 0.08, { top: roofC, uv: winter ? null : A.roof, span: A.roofSpan, edge: sc(rgb(T.roof), 0.7), under: rgb(P.woodDark) });
  shadeDown(geo, 2.0);
  // шөнийн гэрэлтүүлэг: дөрвөн буланд, талбайн төв рүү
  const lx = nx + S.lamps.inset, lz = nz + S.lamps.inset, lamps = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => floodlight(geo, px + sx * lx, sz * lz, S.lamps.h, [-sx, -sz]));
  return { geo, door: { position: new THREE.Vector3(px, 0, nz + 1.5), inward: new THREE.Vector3(0, 0, -1), width: N.gate, height: 2.2 }, dims: { w: LW, d: LD, ridgeH: S.lamps.h + 1 }, interior: null, gameRole: 'playfield', chimneyTop: null, lamps,
    points: [ { name: 'Цэнгэлдэх', position: new THREE.Vector3(T.x, 0, T.z + 2), inward: new THREE.Vector3(0, 0, -1) },
              { name: 'Талбайн хаалга', position: new THREE.Vector3(px, 0, nz + 1.5), inward: new THREE.Vector3(0, 0, -1) } ], stats: { office: 0 } };
}

export function buildWrestle(opts) {   // бөхийн талбай (жишээ зургаар): зууван зам, тоосгон багана-төмөр хашаа, гол тайз, дээвэртэй өнгийн суудлын эгнээ, сүлд
  const C = BUILDING_CONFIG, W = C.wrestle, P = C.palette, A = C.atlas, geo = new Geo(px2uv(...A.white)), winter = opts.season === 'winter';
  const [LW, LD] = W.lot, y = 0.014, grass = rgb(winter ? '#E6ECF3' : '#6E9A44'), white = rgb('#F4EEDF');
  groundQuad(geo, -LW / 2, -LD / 2, LW / 2, LD / 2, grass, 0.008);
  const ell = (rx, rz, t) => [Math.cos(t) * rx, Math.sin(t) * rz], NS = 22, Tr = W.track, tc = rgb(winter ? '#D9DEE6' : Tr.color);
  for (let k = 0; k < NS; k++) { const t0 = k / NS * Math.PI * 2, t1 = (k + 1) / NS * Math.PI * 2, [a0, b0] = ell(Tr.rx, Tr.rz, t0), [a1, b1] = ell(Tr.rx, Tr.rz, t1), [c0, d0] = ell(Tr.rx + Tr.w, Tr.rz + Tr.w, t0), [c1, d1] = ell(Tr.rx + Tr.w, Tr.rz + Tr.w, t1);
    geo.quad([[a0, y, b0], [c0, y, d0], [c1, y, d1], [a1, y, b1]], [0, 1, 0], tc);   // улаан гүйлтийн зам
    for (const f of [0, 1]) { const r = f ? Tr.w : 0, [e0, g0] = ell(Tr.rx + r, Tr.rz + r, t0), [e1, g1] = ell(Tr.rx + r, Tr.rz + r, t1), [h0, i0] = ell(Tr.rx + r + 0.12, Tr.rz + r + 0.12, t0), [h1, i1] = ell(Tr.rx + r + 0.12, Tr.rz + r + 0.12, t1);
      geo.quad([[e0, y + 0.002, g0], [h0, y + 0.002, i0], [h1, y + 0.002, i1], [e1, y + 0.002, g1]], [0, 1, 0], white); } }
  // хашаа: тоосгон багана + хар төмөр хашлага, урд талд хаалга
  const F = W.fence, brick = rgb(F.brick), iron = rgb(F.iron), per = Math.PI * (3 * (F.rx + F.rz) - Math.sqrt((3 * F.rx + F.rz) * (F.rx + 3 * F.rz))), nP = Math.round(per / F.every);
  for (let k = 0; k < nP; k++) { const t0 = (k + 0.5) / nP * Math.PI * 2, t1 = (k + 1.5) / nP * Math.PI * 2, [x0, z0] = ell(F.rx, F.rz, t0), [x1, z1] = ell(F.rx, F.rz, t1);
    geo.box(x0, 0.95, z0, 0.6, 1.9, 0.6, brick);
    if (Math.abs(t0 + (t1 - t0) / 2 - Math.PI / 2) < 0.05) continue;   // хаалга (урд, +Z)
    const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz), ox = -dz / L * 0.04, oz = dx / L * 0.04;
    for (const s2 of [1, -1]) { geo.quad([[x0 + ox * s2, 0, z0 + oz * s2], [x1 + ox * s2, 0, z1 + oz * s2], [x1 + ox * s2, 0.6, z1 + oz * s2], [x0 + ox * s2, 0.7, z0 + oz * s2]], [ox * s2, 0, oz * s2], sc(brick, 0.9));   // тоосгон доод хана
      for (const yy of [1.45]) geo.quad([[x0 + ox * s2, yy, z0 + oz * s2], [x1 + ox * s2, yy, z1 + oz * s2], [x1 + ox * s2, yy + 0.06, z1 + oz * s2], [x0 + ox * s2, yy + 0.06, z0 + oz * s2]], [ox * s2, 0, oz * s2], iron); } }
  // гол тайз: цагаан барилга, цэнхэр суудал, дээвэр
  const Tb = W.tribune, tw = Tb.w / 2, tz = Tb.z, blue = rgb('#2E5E9E'), tg = new Geo(px2uv(...A.white));
  tg.box(0, 0.25, tz, Tb.w + 6, 0.5, Tb.d + 2, rgb('#B9B2A4'));
  for (const sx of [1, -1]) tg.box(sx * (tw + 1.5), 1.8, tz - 0.5, 3, 3.6, Tb.d - 1, rgb('#F4F1EA'));   // хоёр талын өрөө
  for (let r = 0; r < 4; r++) { tg.box(0, 0.5 + r * 0.4 + 0.2, tz + 2.2 - r * 0.9, Tb.w, 0.4 + r * 0.4, 0.9, rgb('#D9D4C8')); tg.box(0, 0.5 + r * 0.4 + 0.45 + r * 0.2, tz + 2.2 - r * 0.9, Tb.w - 0.4, 0.25, 0.5, blue); }
  tg.box(0, 2.3, tz - Tb.d / 2 + 0.2, Tb.w, 3.6, 0.3, rgb('#F4F1EA'));
  for (const sx of [-1, -0.33, 0.33, 1]) tg.box(sx * tw, Tb.h / 2 + 0.5, tz + Tb.d / 2 - 0.3, 0.25, Tb.h, 0.25, rgb('#E6E2DA'));
  slab(tg, -tw - 3.2, tw + 3.2, tz - Tb.d / 2 - 0.3, Tb.h + 0.9, tz + Tb.d / 2 + 0.6, Tb.h + 0.5, 0.25, { top: winter ? rgb(P.snow) : rgb('#E6E2DA'), edge: rgb('#F4F1EA'), under: rgb('#C9C4B8') });
  tg.box(0, Tb.h + 1.15, tz + Tb.d / 2 + 0.62, 12, 0.7, 0.1, rgb('#2E5E9E'));   // самбар (бичиггүй)
  shadeDown(tg, Tb.h); geo.append(tg);
  // дээвэртэй суудлын эгнээ: замын гадна, хойд хагасаар (тайзаас бусад хэсэгт), өнгө өнгийн шатлалтай суудал
  const B = W.bleachers, rows = ['#B03A22', '#D8A93A', '#4E8A3A', '#2E5E9E'], bRoof = winter ? rgb(P.snow) : rgb(B.roof);
  for (let k = 0; k < B.n; k++) { const t = Math.PI * (0.95 + k / (B.n - 1) * 1.1) + (k >= B.n / 2 ? 0.25 : -0.25) * 0, [cx, cz] = ell(Tr.rx + Tr.w + 3.2, Tr.rz + Tr.w + 3.2, t);
    if (Math.abs(cx) < tw + 4 && cz < 0) continue;   // гол тайзны өмнө
    const phi = Math.atan2(-cx / (Tr.rx * Tr.rx), -cz / (Tr.rz * Tr.rz)), bg = new Geo(px2uv(...A.white)), hw2 = B.w / 2;
    rows.forEach((c, r) => bg.box(0, 0.25 + r * 0.35, -0.9 + r * 0.6 - 0.3 + 0.3, B.w, 0.3, 0.55, rgb(c)));
    for (const sx of [1, -1]) { bg.box(sx * hw2, 1.35, -1.2, 0.1, 2.7, 0.1, rgb(P.iron)); bg.box(sx * hw2, 1.6, 1.4, 0.1, 3.2, 0.1, rgb(P.iron)); }
    slab(bg, -hw2 - 0.2, hw2 + 0.2, -1.4, 2.75, 1.6, 3.3, 0.06, { top: bRoof, edge: sc(rgb(B.roof), 0.75), under: sc(rgb(B.roof), 0.7) });
    geo.append(bg, phi + Math.PI, cx, cz); }
  // сүлд: ногоон дугуй суурь, 9 алтан шон, бараан хялгасан сүлд, алтан сэрээ орой
  const S2 = W.sulde, gold = rgb('#D8A93A'), hair = rgb('#8A7558');   // хялгас (саарал хүрэн)
  geo.lathe({ segs: 12, cx: S2.x, cz: S2.z, smooth: false, profile: [[3.0, 0], [3.0, 0.45], [1.6, 0.45], [1.6, 0.85], [0, 0.85]], color: rgb(winter ? '#DCE6EE' : '#5FB04A') });
  for (let k = 0; k < 9; k++) { const c0 = k === 0, a = (k - 1) / 8 * Math.PI * 2, r = c0 ? 0 : (k % 2 ? 2.3 : 1.25), x = S2.x + Math.cos(a) * r, z = S2.z + Math.sin(a) * r, h = c0 ? 9 : 7.5 + (k % 3) * 0.4;
    geo.beam([x, 0.45, z], [x, h, z], 0.09, 0.09, gold);
    geo.lathe({ cx: x, cz: z, segs: 5, profile: [[0.45, h - 1.9], [0.55, h - 1.0], [0.4, h - 0.25]], color: hair });   // хялгас
    geo.lathe({ cx: x, cz: z, smooth: false, segs: 5, profile: [[0.45, h - 0.3], [0.45, h - 0.12], [0, h - 0.08]], color: gold });
    geo.beam([x - 0.25, h + 0.35, z], [x + 0.25, h + 0.35, z], 0.06, 0.06, gold); geo.beam([x, h - 0.1, z], [x, h + 0.75, z], 0.07, 0.07, gold); }   // сэрээ
  shadeDown(geo, 1.8, 0);
  const lamps = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => floodlight(geo, sx * (F.rx - 6), sz * (F.rz - 3), W.lamps.h, [-sx, -sz]));
  return { geo, door: { position: new THREE.Vector3(0, 0, F.rz + 2), inward: new THREE.Vector3(0, 0, -1), width: 4, height: 2 }, dims: { w: LW, d: LD, ridgeH: 9.8 }, interior: null, gameRole: 'wrestling', chimneyTop: null, lamps,
    points: [ { name: 'Бөх барилдах', position: new THREE.Vector3(6, 0, 4), inward: new THREE.Vector3(0, 0, -1) },
              { name: 'Сүлдэнд мөргөх', position: new THREE.Vector3(S2.x, 0, S2.z + 4), inward: new THREE.Vector3(0, 0, -1) },
              { name: 'Гол тайз', position: new THREE.Vector3(0, 0, tz + Tb.d / 2 + 3), inward: new THREE.Vector3(0, 0, -1) },
              { name: 'Гол хаалга', position: new THREE.Vector3(0, 0, F.rz + 2), inward: new THREE.Vector3(0, 0, -1) } ], stats: { office: 0 } };
}
