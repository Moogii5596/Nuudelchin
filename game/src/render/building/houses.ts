// @ts-nocheck — лабораторийн (tools/character-lab/buildings/index.html) хэрэглэгчийн баталсан геометрийн кодыг өөрчлөлтгүй хуулсан. Тоо, өнгө зөвхөн data/buildings.json-оос.
import * as THREE from 'three';
import { Geo, rgb, mix } from '../ger/geo';
import { BUILDING_CONFIG } from './config';
import { sc, px2uv, rot, bandV, wallQuad, slab, panel, shadeDown } from './core';

export function buildHouse(K, opts) {
  const C = BUILDING_CONFIG, P = C.palette, A = C.atlas, white = px2uv(...A.white), geo = new Geo(white), snowG = new Geo(white), winter = opts.season === 'winter';
  const w = K.w, d = K.d, hw = w / 2, hd = d / 2, wh = K.wallH, ph = K.plinthH;
  const rc = opts.roofColor || K.roofColor, roofCol = rgb(C.roofColors[rc] ? C.roofColors[rc].hex : rc);
  const wall = rgb(opts.wallColor || K.wallColor || P.wall), trimD = rgb(P.trim, 0.7), fascia = rgb(P.casing), under = rgb(P.woodDark), wood = rgb(P.wood);
  const snow = rgb(P.snow), snowEdge = mix(P.snow, P.snowShade, 0.45);
  const wallMat = { plaster: { r: A.plaster, span: A.plasterSpan, vh: wh }, logs: { r: A.logs, h: true }, siding: { r: A.siding, h: true } }[K.wallMat];
  const plankMat = vh => ({ r: A.planksOut, span: A.plankSpan, vh });

  // --- суурь, дөрвөн хана
  geo.box(0, ph / 2, 0, w + K.plinthOut * 2, ph, d + K.plinthOut * 2, rgb(P.plinth));
  wallQuad(geo, [-hw, hd], [hw, hd], ph, wh, [0, 0, 1], wall, wallMat);
  wallQuad(geo, [hw, -hd], [-hw, -hd], ph, wh, [0, 0, -1], wall, wallMat);
  wallQuad(geo, [hw, hd], [hw, -hd], ph, wh, [1, 0, 0], wall, wallMat);
  wallQuad(geo, [-hw, -hd], [-hw, hd], ph, wh, [-1, 0, 0], wall, wallMat);
  if (K.corner) for (const sx of [1, -1]) for (const sz of [1, -1])   // дүнзэн байшингийн булангийн цухуйсан дүнзний үзүүр
    geo.box(sx * hw, (ph + wh) / 2, sz * hd, K.corner * 2, wh - ph, K.corner * 2, sc(wall, 0.78));

  // --- хоёр хажуугийн гурвалжин хана, хоёр налуу төмөр дээвэр, оройн төмөр
  const apexY = wh + hd * K.roofPitch, ridgeY = apexY + K.roofLift, roofY = z => ridgeY - K.roofPitch * Math.abs(z);
  const gabCol = K.gableMat === 'planks' ? rgb(P.gable) : sc(wall, 0.93);
  for (const sx of [1, -1]) { const n = [sx, 0, 0];
    const uv = K.gableMat === 'planks' ? (z, y) => [z / A.plankSpan, bandV(A.planksOut, (y - wh) / A.plankH)] : (z, y) => [y / A.hSpan, bandV(wallMat.r, 0.05 + 0.9 * (z + hd) / d)];
    geo.tri([sx * hw, wh, -hd], [sx * hw, wh, hd], [sx * hw, apexY, 0], n, n, n, gabCol, gabCol, gabCol, uv(-hd, wh), uv(hd, wh), uv(0, apexY)); }
  const eaveZ = hd + K.eave, gx = hw + K.gableOut;
  for (const s of [1, -1]) slab(geo, -gx, gx, 0, ridgeY, s * eaveZ, roofY(eaveZ), K.roofT, { top: roofCol, uv: A.roof, span: A.roofSpan, edge: fascia, under });
  geo.box(0, ridgeY + 0.015, 0, gx * 2 + 0.06, 0.09, 0.28, sc(roofCol, 0.85));

  // --- тоосгон яндан
  const ch = K.chimney, chBase = roofY(ch.z) - 0.3, chTop = ridgeY + ch.rise;
  geo.box(ch.x, (chBase + chTop) / 2, ch.z, ch.size, chTop - chBase, ch.size, rgb(P.brick));
  geo.box(ch.x, chTop + 0.04, ch.z, ch.size + 0.1, 0.08, ch.size + 0.1, rgb(P.iron));

  // --- үүдний амбаар: локал координатад (хананаас +Z тийш, x ∈ ±w/2) угсарч, тал руу нь эргүүлж залгана
  const Q = K.porch, D = K.door, St = K.step, pg = new Geo(white), ps = new Geo(white);
  const qx0 = -Q.w / 2, qx1 = Q.w / 2, qz1 = Q.d, slope = (Q.hBack - Q.hFront) / Q.d, pm = plankMat(Q.hBack);
  wallQuad(pg, [qx0, 0], [qx0, qz1], 0, Q.hBack, [-1, 0, 0], wood, pm, Q.hFront);
  wallQuad(pg, [qx1, qz1], [qx1, 0], 0, Q.hFront, [1, 0, 0], wood, pm, Q.hBack);
  wallQuad(pg, [qx0, qz1], [qx1, qz1], 0, Q.hFront, [0, 0, 1], wood, pm);
  const pz = qz1 + Q.roofFront, pyH = Q.hBack + 0.06, pyL = Q.hFront + 0.06 - slope * Q.roofFront;
  slab(pg, qx0 - Q.roofOut, qx1 + Q.roofOut, 0, pyH, pz, pyL, 0.05, { top: roofCol, uv: A.roof, span: A.roofSpan, edge: fascia, under });
  let dLocal, dIn;
  if (Q.doorFace === 'out') {
    panel(pg, [0, D.sill + D.h / 2, qz1], [0, 0, 1], D.w / 2, D.h / 2, D.out, A.door, trimD);
    pg.box(0, St.h / 2, qz1 + St.d / 2, St.w, St.h, St.d, rgb(P.plinth));
    dLocal = [0, qz1 + St.d + C.doorStandOff]; dIn = [0, -1];
  } else { const sx = Q.doorFace === 'right' ? 1 : -1, zc = qz1 / 2;
    panel(pg, [sx * Q.w / 2, D.sill + D.h / 2, zc], [sx, 0, 0], D.w / 2, D.h / 2, D.out, A.door, trimD);
    pg.box(sx * (Q.w / 2 + St.d / 2), St.h / 2, zc, St.d, St.h, St.w, rgb(P.plinth));
    dLocal = [sx * (Q.w / 2 + St.d + C.doorStandOff), zc]; dIn = [-sx, 0]; }
  if (winter) slab(ps, qx0 - Q.roofOut + 0.06, qx1 + Q.roofOut - 0.06, 0.04, pyH + 0.1, pz - 0.12, pyL + 0.1 + slope * 0.12, 0.105, { top: snow, edge: snowEdge });
  const pose = { front: [0, Q.x, hd], east: [Math.PI / 2, hw, Q.z], west: [-Math.PI / 2, -hw, Q.z] }[Q.side];
  geo.append(pg, ...pose);

  // --- цонх: урд, хоёр хажууд (хойд талд цонхгүй). Амбаартай давхцах хажуугийн цонхыг алгасна
  const W = K.window, wy = W.sill + W.h / 2, windows = [];
  for (const x of W.front) if (Q.side !== 'front' || Math.abs(x - Q.x) > Q.w / 2 + W.w / 2 + 0.1) { panel(geo, [x, wy, hd], [0, 0, 1], W.w / 2, W.h / 2, W.out, A.window, trimD); windows.push(new THREE.Vector3(x, wy, hd)); }
  for (const sx of [1, -1]) for (const z of W.side) {
    if (Q.side === (sx > 0 ? 'east' : 'west') && Math.abs(z - Q.z) < Q.w / 2 + W.w / 2 + 0.1) continue;
    panel(geo, [sx * hw, wy, z], [sx, 0, 0], W.w / 2, W.h / 2, W.out, A.window, trimD); windows.push(new THREE.Vector3(sx * hw, wy, z)); }

  shadeDown(geo, wh);
  // --- өвөл: дээвэр, амбаарын дээвэр дээр цас (сүүдэрлэлтийн дараа)
  if (winter) { const zs = eaveZ - 0.28, o = { top: snow, edge: snowEdge };
    for (const s of [1, -1]) slab(geo, -gx + 0.08, gx - 0.08, 0, ridgeY + 0.13, s * zs, roofY(zs) + 0.13, 0.135, o);
    geo.append(ps, ...pose); }

  const dp = rot(dLocal[0], dLocal[1], pose[0], pose[1], pose[2]), di = rot(dIn[0], dIn[1], pose[0]);
  const pzOut = Q.side === 'front' ? hd + Q.d + St.d : hd, pxOut = Q.side === 'east' ? hw + Q.d + St.d : hw, nxOut = Q.side === 'west' ? -hw - Q.d - St.d : -hw;
  return {
    geo,
    door: { position: new THREE.Vector3(dp[0], 0, dp[1]), inward: new THREE.Vector3(di[0], 0, di[1]), width: D.w, height: D.h },
    dims: { w, d, wallH: wh, ridgeH: ridgeY, footprint: { x0: nxOut, x1: pxOut, z0: -hd, z1: pzOut } },
    interior: { main: { w: w - K.wallT * 2, d: d - K.wallT * 2, h: +(wh - ph - 0.06).toFixed(2) }, porch: { w: Q.w - 0.2, d: Q.d - 0.1, h: Q.hFront - 0.05 } },   // V6.1 дотор талын хэмжээ
    chimneyTop: new THREE.Vector3(ch.x, chTop + 0.12, ch.z), windows,
  };
}

export function buildToilet(opts) {
  const C = BUILDING_CONFIG, T = C.toilet, P = C.palette, A = C.atlas, geo = new Geo(px2uv(...A.white)), winter = opts.season === 'winter';
  const hw = T.w / 2, hd = T.d / 2, col = rgb(opts.color || T.color), m = { r: A.planksOut, span: A.plankSpan, vh: T.hFront }, sl = (T.hFront - T.hBack) / T.d;
  wallQuad(geo, [-hw, hd], [hw, hd], 0, T.hFront, [0, 0, 1], col, m);
  wallQuad(geo, [hw, -hd], [-hw, -hd], 0, T.hBack, [0, 0, -1], sc(col, 0.95), m);
  wallQuad(geo, [-hw, -hd], [-hw, hd], 0, T.hBack, [-1, 0, 0], col, m, T.hFront);
  wallQuad(geo, [hw, hd], [hw, -hd], 0, T.hFront, [1, 0, 0], col, m, T.hBack);
  const ro = T.roofOut, rcol = rgb(C.roofColors[T.roofColor].hex);
  slab(geo, -hw - ro, hw + ro, hd + ro, T.hFront + 0.05 + sl * ro, -hd - ro, T.hBack + 0.05 - sl * ro, 0.04, { top: rcol, uv: A.roof, span: A.roofSpan, edge: sc(rcol, 0.7), under: rgb(P.woodDark) });
  const D = T.door; panel(geo, [0, D.sill + D.h / 2, hd], [0, 0, 1], D.w / 2, D.h / 2, 0.025, A.wicket, sc(col, 0.6), sc(col, 0.9));
  geo.box(0, D.sill + D.h - 0.22, hd + 0.03, 0.12, 0.12, 0.01, [0.08, 0.06, 0.05]);   // агааржуулах нүх
  shadeDown(geo, T.hFront);
  if (winter) slab(geo, -hw - ro + 0.05, hw + ro - 0.05, hd + ro - 0.05, T.hFront + 0.15 + sl * ro, -hd - ro + 0.05, T.hBack + 0.15 - sl * ro, 0.1, { top: rgb(P.snow), edge: mix(P.snow, P.snowShade, 0.45) });
  return { geo, door: { position: new THREE.Vector3(0, 0, hd + C.doorStandOff), inward: new THREE.Vector3(0, 0, -1), width: D.w, height: D.h },
    dims: { w: T.w, d: T.d, ridgeH: T.hFront + 0.05 }, interior: { main: { w: T.w - 0.1, d: T.d - 0.1, h: T.hBack - 0.05 } } };
}

// налуу дээвэртэй (урд өндөр) гурван хана: урд онгорхой. Новны амбаар, малын саравчинд
export function leanTo(g, w, d, hF, hB, col, roofCol, ro, winter) {
  const C = BUILDING_CONFIG, A = C.atlas, P = C.palette, hw = w / 2, hd = d / 2, m = { r: A.planksOut, span: A.plankSpan, vh: hF }, sl = (hF - hB) / d;
  wallQuad(g, [hw, -hd], [-hw, -hd], 0, hB, [0, 0, -1], sc(col, 0.95), m);
  wallQuad(g, [-hw, -hd], [-hw, hd], 0, hB, [-1, 0, 0], col, m, hF);
  wallQuad(g, [hw, hd], [hw, -hd], 0, hF, [1, 0, 0], col, m, hB);
  wallQuad(g, [-hw, -hd + 0.03], [hw, -hd + 0.03], 0, hB, [0, 0, 1], sc(col, 0.7), m);                      // дотор тал (харанхуй)
  const yF = hF + 0.05 + sl * ro, yB = hB + 0.05 - sl * ro;
  slab(g, -hw - ro, hw + ro, hd + ro, yF, -hd - ro, yB, 0.05, { top: roofCol, uv: A.roof, span: A.roofSpan, edge: sc(roofCol, 0.7), under: rgb(P.woodDark) });
  return () => winter && slab(g, -hw - ro + 0.06, hw + ro - 0.06, hd + ro - 0.06, yF + 0.11, -hd - ro + 0.06, yB + 0.11, 0.1, { top: rgb(P.snow), edge: mix(P.snow, P.snowShade, 0.45) });
}
export const roofHex = k => BUILDING_CONFIG.roofColors[k] ? BUILDING_CONFIG.roofColors[k].hex : k;

export function buildWoodshed(opts) {
  const C = BUILDING_CONFIG, T = C.woodshed, A = C.atlas, geo = new Geo(px2uv(...A.white)), hw = T.w / 2, hd = T.d / 2, col = rgb(T.color);
  const snow = leanTo(geo, T.w, T.d, T.hFront, T.hBack, col, rgb(roofHex(T.roofColor)), T.roofOut, opts.season === 'winter');
  for (const sx of [1, -1]) geo.box(sx * (hw - T.post / 2), T.hFront / 2, hd - T.post / 2, T.post, T.hFront, T.post, sc(col, 0.8));   // урд багана
  const x0 = -hw + 0.12, x1 = hw - 0.12, z0 = -hd + 0.1, z1 = hd - 0.3, H = T.stackH, wood = rgb('#A97E50'), F = A.firewood;   // түлээний овоолго
  geo.box(0, H / 2, (z0 + z1) / 2 - 0.005, x1 - x0, H, z1 - z0 - 0.01, wood);
  geo.quad([[x0, 0, z1], [x1, 0, z1], [x1, H, z1], [x0, H, z1]], [0, 0, 1], [1, 1, 1], [px2uv(F[0], F[3]), px2uv(F[2], F[3]), px2uv(F[2], F[1]), px2uv(F[0], F[1])]);
  geo.box(0.9, 0.22, hd + 0.75, 0.42, 0.44, 0.42, rgb('#8A6230'));   // хагалах хожуул
  shadeDown(geo, T.hFront); snow();
  return { geo, door: { position: new THREE.Vector3(0, 0, hd + 1.4), inward: new THREE.Vector3(0, 0, -1), width: T.w - T.post * 2, height: T.hFront },
    dims: { w: T.w, d: T.d, ridgeH: T.hFront + 0.05 }, interior: null };
}

export function buildAnimalShed(opts) {
  const C = BUILDING_CONFIG, T = C.animalShed, A = C.atlas, geo = new Geo(px2uv(...A.white)), hw = T.W / 2, hd = T.D / 2, col = rgb(T.color), winter = opts.season === 'winter';
  geo.quad([[-hw, 0.008, hd + T.pen], [hw, 0.008, hd + T.pen], [hw, 0.008, -hd], [-hw, 0.008, -hd]], [0, 1, 0], rgb(winter ? '#C9D2DC' : T.manure));   // бууц
  const snow = leanTo(geo, T.W, T.D, T.hFront, T.hBack, col, rgb(roofHex(T.roofColor)), T.roofOut, winter);
  const pc = sc(col, 0.8), post = (x, z, h) => geo.box(x, h / 2, z, T.post, h, T.post, pc);
  for (const x of [-hw, -hw / 3, hw / 3, hw]) post(x + (x < 0 ? T.post / 2 : x > 0 ? -T.post / 2 : 0), hd - T.post / 2, T.hFront);   // саравчны урд багана
  const ff = !!opts.fenceFront;   // хорооны урд тал нь хашааны хашаа (хаалга нь тэнд)
  const zf = hd + T.pen, gx = T.gateW / 2, rails = (a, b) => { for (const y of T.railH) geo.beam([a[0], y, a[1]], [b[0], y, b[1]], T.rail, T.rail, sc(col, 0.9)); };
  const zr = ff ? zf - 0.12 : zf;
  for (const [x, z] of [[-hw, hd + T.pen / 2], [-hw, zr], [hw, hd + T.pen / 2], [hw, zr], ...(ff ? [] : [[-gx - 1.35, zf], [-gx, zf], [gx, zf], [gx + 1.35, zf]])]) post(x, z, 1.35);   // хорооны багана
  rails([-hw, hd], [-hw, zr]); rails([hw, hd], [hw, zr]); if (!ff) { rails([-hw, zf], [-gx, zf]); rails([gx, zf], [hw, zf]); }
  shadeDown(geo, T.hFront); snow();
  return { geo, door: { position: new THREE.Vector3(0, 0, zf + 0.9), inward: new THREE.Vector3(0, 0, -1), width: T.gateW, height: 1.3 },
    dims: { w: T.W, d: T.D + T.pen, ridgeH: T.hFront + 0.05 }, interior: { main: { w: T.W - 0.2, d: T.D - 0.2, h: T.hBack - 0.1 } } };
}

export function buildGreenhouse(opts) {
  const C = BUILDING_CONFIG, T = C.greenhouse, A = C.atlas, geo = new Geo(px2uv(...A.white)), hw = T.W / 2, hl = T.L / 2, n = T.segs, winter = opts.season === 'winter';
  const film = rgb(T.film), rib = rgb(T.rib), arc = (k, s = 1) => { const a = k / n * Math.PI; return [Math.cos(a) * hw * s, Math.sin(a) * T.H * s]; };
  const nrm = k => { const a = k / n * Math.PI, x = Math.cos(a) / hw, y = Math.sin(a) / T.H, l = Math.hypot(x, y); return [x / l, y / l, 0]; };
  for (let k = 0; k < n; k++) { const a = arc(k), b = arc(k + 1), top = winter && k >= 2 && k < n - 2;
    geo.quad([[a[0], a[1], hl], [b[0], b[1], hl], [b[0], b[1], -hl], [a[0], a[1], -hl]], [nrm(k), nrm(k + 1), nrm(k + 1), nrm(k)], top ? rgb(C.palette.snow) : film); }
  const nr = Math.round(T.L / T.ribEvery);
  for (let i = 0; i <= nr; i++) { const z = -hl + i * T.L / nr, z0 = Math.max(-hl, z - T.ribW / 2), z1 = Math.min(hl, z + T.ribW / 2);
    for (let k = 0; k < n; k++) { const a = arc(k, 1.012), b = arc(k + 1, 1.012); geo.quad([[a[0], a[1], z1], [b[0], b[1], z1], [b[0], b[1], z0], [a[0], a[1], z0]], [nrm(k), nrm(k + 1), nrm(k + 1), nrm(k)], rib); } }
  for (const [z, nz] of [[hl, 1], [-hl, -1]]) for (let k = 0; k < n; k++) { const a = arc(k), b = arc(k + 1);   // хоёр төгсгөл
    geo.tri([0, 0, z], [a[0], a[1], z], [b[0], b[1], z], [0, 0, nz], [0, 0, nz], [0, 0, nz], sc(film, 0.95), sc(film, 0.95), sc(film, 0.95)); }
  const dc = rgb(T.door);
  geo.box(0, 0.9, hl + 0.02, 0.9, 1.8, 0.04, dc); geo.box(0, 0.9, hl + 0.045, 0.7, 1.6, 0.01, sc(film, 0.85));   // хаалга
  geo.box(-hw - 0.04, 0.12, 0, 0.1, 0.24, T.L, sc(dc, 0.9)); geo.box(hw + 0.04, 0.12, 0, 0.1, 0.24, T.L, sc(dc, 0.9));   // доод модон тавцан
  shadeDown(geo, T.H);
  return { geo, door: { position: new THREE.Vector3(0, 0, hl + 0.8), inward: new THREE.Vector3(0, 0, -1), width: 0.8, height: 1.8 },
    dims: { w: T.W, d: T.L, ridgeH: T.H }, interior: { main: { w: T.W - 0.3, d: T.L - 0.2, h: T.H - 0.1 } } };
}

export function buildKennel(opts) {
  const C = BUILDING_CONFIG, T = C.kennel, A = C.atlas, geo = new Geo(px2uv(...A.white)), hw = T.w / 2, hd = T.d / 2, col = rgb(T.color), m = { r: A.planksOut, span: A.plankSpan, vh: T.ridgeH };
  geo.box(0, T.wallH / 2, 0, T.w, T.wallH, T.d, col);
  for (const sz of [1, -1]) { const n = [0, 0, sz], z = sz * hd, uv = (x, y) => [x / A.plankSpan, bandV(A.planksOut, y / T.ridgeH)];   // гурвалжин хана
    geo.tri([-hw, T.wallH, z], [hw, T.wallH, z], [0, T.ridgeH, z], n, n, n, col, col, col, uv(-hw, T.wallH), uv(hw, T.wallH), uv(0, T.ridgeH)); }
  const rc = rgb(opts.season === 'winter' ? C.palette.snow : T.roof), sl = (T.ridgeH - T.wallH) / hw;
  for (const sx of [1, -1]) { const x1 = sx * (hw + 0.08), y1 = T.wallH - 0.08 * sl, n = [sx * sl, 1, 0];
    geo.quad([[0, T.ridgeH + 0.03, -hd - 0.06], [0, T.ridgeH + 0.03, hd + 0.06], [x1, y1 + 0.03, hd + 0.06], [x1, y1 + 0.03, -hd - 0.06]], n, rc); }
  geo.quad([[-T.holeW / 2, 0.04, hd + 0.005], [T.holeW / 2, 0.04, hd + 0.005], [T.holeW / 2, 0.04 + T.holeH, hd + 0.005], [-T.holeW / 2, 0.04 + T.holeH, hd + 0.005]], [0, 0, 1], [0.08, 0.06, 0.05]);   // нүх
  shadeDown(geo, T.ridgeH);
  return { geo, door: { position: new THREE.Vector3(0, 0, hd + 0.9), inward: new THREE.Vector3(0, 0, -1), width: T.holeW, height: T.holeH }, dims: { w: T.w, d: T.d, ridgeH: T.ridgeH + 0.03 }, interior: null };
}

export function plantGeo(kind, season, seed = 1) {   // мод (улиас/хайлаас маягийн) эсвэл бут. Өвөл навчгүй
  const C = BUILDING_CONFIG, T = C[kind], g = new Geo(px2uv(...C.atlas.white)), winter = season === 'winter';
  let sd = seed; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647; const k = 0.85 + rnd() * 0.3;
  const base = kind === 'tree' ? T.trunkH * 0.75 * k : 0.05, R = T.crownR * k, H = T.crownH * k, top = base + H;
  if (kind === 'tree') g.box(0, T.trunkH * k / 2, 0, T.trunkW, T.trunkH * k, T.trunkW, rgb(T.trunk));
  if (winter) { const bc = rgb(T.bare), n = kind === 'tree' ? 4 : 5;   // нүцгэн мөчир
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rnd(), r = R * 0.7; g.beam([0, base, 0], [Math.sin(a) * r, top - H * 0.25 * rnd(), Math.cos(a) * r], 0.05, 0.05, bc); }
    return g; }
  const prof = [[0, base], [R * 0.75, base + H * 0.1], [R, base + H * 0.45], [R * 0.7, base + H * 0.8], [0, top]];
  g.lathe({ segs: 7, smooth: false, profile: prof, colorAt: (seg, side, pi) => mix(T.crown, T.crownTop, Math.min(1, pi / 4)) });
  return g;
}

// хашаан доторх зам: a → b (x, z) шулуун хэсэг. style: walk (хавтан) | dirt
export function pathSeg(g, a, b, style, extend = 0) {
  const C = BUILDING_CONFIG, Pp = C.path, G = C.ground, L0 = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L0 < 0.05) return;
  const tx = (b[0] - a[0]) / L0, tz = (b[1] - a[1]) / L0, ox = tz, oz = -tx, L = L0 + extend;
  const at = (s, o, y) => [a[0] + tx * s + ox * o, y, a[1] + tz * s + oz * o];
  if (style === 'dirt') { const w = Pp.dirtW / 2; g.quad([at(0, -w, 0.012), at(0, w, 0.012), at(L, w, 0.012), at(L, -w, 0.012)], [0, 1, 0], rgb(G.dirt)); return; }
  const w = Pp.w / 2, h = Pp.walkH, n = Math.max(1, Math.round(L / Pp.slab)), sl = L / n, col = rgb(G.walk);
  for (let i = 0; i < n; i++) { const s0 = i * sl + Pp.joint / 2, s1 = (i + 1) * sl - Pp.joint / 2, c = sc(col, 0.94 + ((i * 7) % 5) * 0.025);
    g.quad([at(s0, -w, h), at(s0, w, h), at(s1, w, h), at(s1, -w, h)], [0, 1, 0], c); }
  for (const sg of [1, -1]) g.quad([at(0, sg * w, 0), at(L, sg * w, 0), at(L, sg * w, h), at(0, sg * w, h)], [ox * sg, 0, oz * sg], sc(col, 0.75));
}
