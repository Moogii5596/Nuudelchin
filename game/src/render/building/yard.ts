// @ts-nocheck — лабораторийн (tools/character-lab/buildings/index.html) хэрэглэгчийн баталсан геометрийн кодыг өөрчлөлтгүй хуулсан. Тоо, өнгө зөвхөн data/buildings.json-оос.
import * as THREE from 'three';
import { Geo, rgb, mix } from '../ger/geo';
import { BUILDING_CONFIG } from './config';
import { sc, px2uv, rot, bandV, shadeDown } from './core';
import { plantGeo, pathSeg } from './houses';
import { makeBuilding } from './index';
import { GER as GER_CONFIG } from '../ger/config';
import { makeGer } from '../ger/ger';

export function buildKhashaa(opts) {
  const C = BUILDING_CONFIG, K = C.khashaa, P = C.palette, A = C.atlas, geo = new Geo(px2uv(...A.white)), winter = opts.season === 'winter';
  const w = opts.w || K.w, d = opts.d || K.d, hw = w / 2, hd = d / 2, gy = opts.groundAt || (() => 0);
  let seed = opts.seed || 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const col = rgb(opts.fenceColor || P.fence), colIn = sc(col, 0.92), end = sc(col, 0.6), top = winter ? rgb(P.snow) : end, postCol = sc(col, 0.8);
  const th = K.thick / 2, pw = K.post / 2, sb = C.shade.bottom;
  const lo = c => sc(c, sb);

  // нэг шулуун хашаа: хэсэг бүр өөр өндөртэй банзан хавтан + дотор талын багана. Газрын өндрийг дагана
  const run = (ax, az, bx, bz) => {
    const L = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / L, tz = (bz - az) / L; let ox = tz, oz = -tx;
    if (ox * (ax + bx) + oz * (az + bz) < 0) { ox = -ox; oz = -oz; }
    const n = Math.max(1, Math.round(L / K.section)), at = (s, off, y) => [ax + tx * s + ox * off, y, az + tz * s + oz * off];
    let prevY1 = null;
    for (let i = 0; i < n; i++) {
      const s0 = i * L / n, s1 = (i + 1) * L / n, g0 = gy(ax + tx * s0, az + tz * s0), g1 = gy(ax + tx * s1, az + tz * s1);
      const y0 = Math.min(g0, g1) - K.sink, y1 = Math.max(g0, g1) + K.h + (rnd() - 0.5) * 2 * K.jitter, u0 = s0 / A.plankSpan, u1 = s1 / A.plankSpan;
      const face = (off, nn, c, r) => geo.quad([at(s0, off, y0), at(s1, off, y0), at(s1, off, y1), at(s0, off, y1)], nn, [lo(c), lo(c), c, c],
        [[u0, bandV(r, 0)], [u1, bandV(r, 0)], [u1, bandV(r, 1)], [u0, bandV(r, 1)]]);
      face(th, [ox, 0, oz], col, A.planksOut); face(-th, [-ox, 0, -oz], colIn, A.planksIn);
      geo.quad([at(s0, th, y1), at(s1, th, y1), at(s1, -th, y1), at(s0, -th, y1)], [0, 1, 0], top);
      if (i === 0) geo.quad([at(s0, th, y0), at(s0, -th, y0), at(s0, -th, y1), at(s0, th, y1)], [-tx, 0, -tz], end);
      else if (Math.abs(prevY1 - y1) > 0.005) { const hi = Math.max(prevY1, y1), lw = Math.min(prevY1, y1), sg = y1 > prevY1 ? -1 : 1;
        geo.quad([at(s0, th, lw), at(s0, -th, lw), at(s0, -th, hi), at(s0, th, hi)], [sg * tx, 0, sg * tz], end); }
      if (i === n - 1) geo.quad([at(s1, th, y0), at(s1, -th, y0), at(s1, -th, y1), at(s1, th, y1)], [tx, 0, tz], end);
      prevY1 = y1;
      const ps = s0 + (i === 0 ? K.post : 0), pb = y0, pt = y1 - K.postDrop, q = (s, off, y) => at(ps + s, -th - off, y);
      geo.quad([q(-pw, 2 * pw, pb), q(pw, 2 * pw, pb), q(pw, 2 * pw, pt), q(-pw, 2 * pw, pt)], [-ox, 0, -oz], postCol);
      geo.quad([q(-pw, 0, pb), q(-pw, 2 * pw, pb), q(-pw, 2 * pw, pt), q(-pw, 0, pt)], [-tx, 0, -tz], sc(postCol, 0.9));
      geo.quad([q(pw, 0, pb), q(pw, 2 * pw, pb), q(pw, 2 * pw, pt), q(pw, 0, pt)], [tx, 0, tz], sc(postCol, 0.9));
      geo.quad([q(-pw, 0, pt), q(pw, 0, pt), q(pw, 2 * pw, pt), q(-pw, 2 * pw, pt)], [0, 1, 0], winter ? rgb(P.snow) : end);
    }
  };

  const gp = K.gatePost, tot = K.leafW * 2 + K.wicketW + gp * 3, xa = K.gateX - tot / 2, zg = hd, g = gy(K.gateX, zg);
  const xLeaf = xa + gp, xMid = xLeaf + K.leafW * 2, xWk = xMid + gp, xEnd = xWk + K.wicketW;
  const AG = opts.animalGate ? { x: hw - C.animalShed.W / 2 - K.extra.shedEast, w: C.animalShed.gateW } : null;   // хойд хашаан дахь малын хорооны хаалга
  run(-hw, hd, xa, hd); run(xa + tot, hd, hw, hd); run(hw, hd, hw, -hd); run(-hw, -hd, -hw, hd);
  if (AG) { run(hw, -hd, AG.x + AG.w / 2 + gp, -hd); run(AG.x - AG.w / 2 - gp, -hd, -hw, -hd); } else run(hw, -hd, -hw, -hd);
  const gateCol = rgb(opts.gateColor || P.trim), gateLo = sc(gateCol, sb + 0.04);
  for (const x of [xa + gp / 2, xMid + gp / 2, xEnd + gp / 2]) geo.box(x, g + K.gatePostH / 2 - K.sink / 2, zg, gp, K.gatePostH + K.sink, gp, postCol);
  geo.box((xWk + xEnd) / 2, g + K.gatePostH - 0.08, zg, K.wicketW + gp * 2 + 0.16, 0.14, gp + 0.06, sc(postCol, 0.9));
  const leaf = (xl, xr, r, flip, zg = hd) => { const y0 = g + K.gateLift, y1 = g + K.gateH, ua = flip ? r[2] - 1 : r[0] + 1, ub = flip ? r[0] + 1 : r[2] - 1;
    for (const [z, nz] of [[zg + 0.022, 1], [zg - 0.022, -1]]) geo.quad([[xl, y0, z], [xr, y0, z], [xr, y1, z], [xl, y1, z]], [0, 0, nz], [gateLo, gateLo, gateCol, gateCol],
      [px2uv(ua, r[3] - 1), px2uv(ub, r[3] - 1), px2uv(ub, r[1] + 1), px2uv(ua, r[1] + 1)]);
    geo.quad([[xl, y1, zg + 0.022], [xr, y1, zg + 0.022], [xr, y1, zg - 0.022], [xl, y1, zg - 0.022]], [0, 1, 0], winter ? rgb(P.snow) : sc(gateCol, 0.6)); };
  if (!opts.noLeaves) { leaf(xLeaf, xLeaf + K.leafW, A.gateLeaf, false); leaf(xLeaf + K.leafW, xMid, A.gateLeaf, true); }   // noLeaves: том хаалганы навчийг sumcenter тусад нь анимаци хийнэ
  leaf(xWk, xEnd, A.wicket, false);
  if (AG) { for (const sx of [1, -1]) geo.box(AG.x + sx * (AG.w / 2 + gp / 2), g + K.gatePostH / 2 - K.sink / 2, -hd, gp, K.gatePostH + K.sink, gp, postCol);
    leaf(AG.x - AG.w / 2, AG.x, A.gateLeaf, false, -hd); leaf(AG.x, AG.x + AG.w / 2, A.gateLeaf, true, -hd); }

  const inward = new THREE.Vector3(0, 0, -1), T = C.toilet;
  return {
    geo,
    gate:   { position: new THREE.Vector3(xLeaf + K.leafW, g, zg + C.gateStandOff), inward, width: K.leafW * 2, height: K.gateH },
    animalGate: AG && { position: new THREE.Vector3(AG.x, g, -hd - C.gateStandOff), inward: new THREE.Vector3(0, 0, 1), width: AG.w, height: K.gateH },   // гаднаас (хойноос) хороо руу
    wicket: { position: new THREE.Vector3((xWk + xEnd) / 2, g, zg + C.doorStandOff), inward, width: K.wicketW, height: K.gateH - K.gateLift },
    houseSlot(houseW, houseD) { return new THREE.Vector3(-(hw - houseW / 2 - K.houseSide), 0, -hd + houseD / 2 + K.houseGap); },   // хойд-баруун буланд, урагшаа
    toiletSlot() { return { pos: new THREE.Vector3(hw - T.w / 2 - K.toiletIn, 0, hd - T.d / 2 - K.toiletIn), phi: Math.PI }; },   // зүүн-урд буланд, хаалга хойш
    extraSlot(kind) { const E = K.extra;   // { pos, phi }
      if (kind === 'woodshed') return { pos: new THREE.Vector3(E.woodshedX, 0, -hd + C.woodshed.d / 2 + E.woodshedBack), phi: 0 };
      if (kind === 'animalShed') return { pos: new THREE.Vector3(hw - C.animalShed.W / 2 - E.shedEast, 0, -hd + C.animalShed.D / 2 + C.animalShed.pen), phi: Math.PI };   // хойшоо харна
      if (kind === 'greenhouse') return { pos: new THREE.Vector3(-hw + C.greenhouse.L / 2 + E.greenWest, 0, hd - C.greenhouse.W / 2 - E.greenFront), phi: Math.PI / 2 }; },
    gerSlot(R) { return new THREE.Vector3(-(hw - R - K.gerGap), 0, -hd + R + K.gerGap + 0.6); },
    dims: { w, d, h: K.h, gateW: K.leafW * 2, wicketW: K.wicketW },
  };
}

/* =====================================================================
   makePlot(spec) — нэг айлын хашаа (sumlayout.ts-ийн нэг нүд). Байшин/гэр + хашаа + жорлон.
   spec: { kind: 'houseA'|'houseB'|'houseC'|'gerYard', season, roofColor, seed, w, d, fenceColor, gateColor, yard: bool }
   → { geo (бүх барилга, хашааны локал координат), gers: [{ ger, pos }], focus, door, yard, house, toilet, ... }
   ===================================================================== */
export function makePorter(season, col = {}) {
  const T = BUILDING_CONFIG.porter, g = new Geo(px2uv(...BUILDING_CONFIG.atlas.white)), hw = T.W / 2, cab = rgb(col.cab || T.cab), bed = rgb(col.bed || T.bed), glass = rgb(T.glass), dark = rgb(T.chassis);
  const wheel = (cx, cz) => { const n = 8, r = T.wheelR, hwW = T.wheelW / 2, tire = rgb(T.tire), rim = rgb(T.rim);
    const pt = (k, s, rr = r) => { const a = k / n * Math.PI * 2; return [cx + s * hwW, r + Math.sin(a) * rr, cz + Math.cos(a) * rr]; };
    for (let k = 0; k < n; k++) { const a = (k + 0.5) / n * Math.PI * 2;
      g.quad([pt(k, -1), pt(k + 1, -1), pt(k + 1, 1), pt(k, 1)], [0, Math.sin(a), Math.cos(a)], tire);
      const sx = Math.sign(cx); g.tri([cx + sx * hwW, r, cz], pt(k, sx, r * 0.98), pt(k + 1, sx, r * 0.98), [sx, 0, 0], [sx, 0, 0], [sx, 0, 0], rim, tire, tire); } };
  for (const z of T.axles) for (const sx of [1, -1]) wheel(sx * (hw - 0.14), z);
  g.box(0, 0.5, (T.bedZ[0] + T.cabZ[1]) / 2, T.W - 0.5, 0.18, T.cabZ[1] - T.bedZ[0] - 0.2, dark);                    // рам
  const [z0, z1] = T.cabZ, [y0, y1] = T.cabY;
  g.box(0, (y0 + y1) / 2, (z0 + z1) / 2, T.W, y1 - y0, z1 - z0, cab);                                                 // кабин
  g.quad([[-hw + 0.08, y1 - 0.62, z1 + 0.006], [hw - 0.08, y1 - 0.62, z1 + 0.006], [hw - 0.1, y1 - 0.08, z1 + 0.006], [-hw + 0.1, y1 - 0.08, z1 + 0.006]], [0, 0, 1], glass);   // салхины шил
  for (const sx of [1, -1]) g.quad([[sx * (hw + 0.006), y1 - 0.62, z0 + 0.15], [sx * (hw + 0.006), y1 - 0.62, z1 - 0.12], [sx * (hw + 0.006), y1 - 0.1, z1 - 0.12], [sx * (hw + 0.006), y1 - 0.1, z0 + 0.15]], [sx, 0, 0], glass);
  g.box(0, 0.62, z1 + 0.06, T.W + 0.04, 0.18, 0.12, dark);                                                               // бампер
  for (const sx of [1, -1]) g.box(sx * (hw - 0.22), 0.86, z1 + 0.012, 0.26, 0.12, 0.02, rgb(T.light));                  // гэрэл
  const [b0, b1] = T.bedZ, by = T.bedY;
  g.box(0, by - 0.05, (b0 + b1) / 2, T.W, 0.1, b1 - b0, dark);                                                          // тэвшний шал
  for (const sx of [1, -1]) g.box(sx * (hw - 0.025), by + T.sideH / 2, (b0 + b1) / 2, 0.05, T.sideH, b1 - b0, bed);   // хажуугийн хаалт
  g.box(0, by + T.sideH / 2, b0 + 0.025, T.W, T.sideH, 0.05, bed); g.box(0, by + T.sideH / 2, b1 - 0.025, T.W, T.sideH, 0.05, bed);
  shadeDown(g, y1);
  if (season === 'winter') g.box(0, y1 + 0.04, (z0 + z1) / 2, T.W - 0.06, 0.08, z1 - z0 - 0.06, rgb(BUILDING_CONFIG.palette.snow));
  return { geo: g, dims: { L: T.cabZ[1] + 0.12 - T.bedZ[0], W: T.W, H: T.cabY[1] } };
}

export function makePlot(spec) {
  const C = BUILDING_CONFIG, out = new Geo(px2uv(...C.atlas.white)), season = spec.season;
  const sp = C.special[spec.kind]; if (sp) spec = { ...spec, kind: sp.base, gerSize: sp.gerSize, roofColor: spec.roofColor || sp.roofColor };
  const yard = makeBuilding('khashaa', { season, seed: spec.seed, w: spec.w, d: spec.d, fenceColor: spec.fenceColor, gateColor: spec.gateColor, animalGate: (spec.extras || []).includes('animalShed'), noLeaves: spec.noLeaves });
  if (spec.yard !== false) out.append(yard.geo);
  const toilet = makeBuilding('toilet', { season }), ts = yard.toiletSlot(); out.append(toilet.geo, ts.phi, ts.pos.x, ts.pos.z);
  const td = rot(toilet.door.position.x, toilet.door.position.z, ts.phi, ts.pos.x, ts.pos.z), ti = rot(toilet.door.inward.x, toilet.door.inward.z, ts.phi);
  const r = { geo: out, gers: [], yard, toilet, toiletSlot: ts, toiletDoor: { position: new THREE.Vector3(td[0], 0, td[1]), inward: new THREE.Vector3(ti[0], 0, ti[1]) } };
  if (spec.kind === 'gerYard') {
    const gsz = spec.gerSize || 'small4', ger = makeGer(gsz, { season, doorVariant: 0, outline: spec.outline }), gs = yard.gerSlot(ger.dims.diameter / 2); r.gerLabel = GER_CONFIG.sizes[gsz].label;
    r.gers.push({ ger, pos: gs }); r.ger = ger; r.slot = gs;
    r.door = ger.door.position.clone().add(gs); r.chimney = ger.chimneyTop.clone().add(gs);
  } else {
    const house = makeBuilding(spec.kind, { season, roofColor: spec.roofColor }), s = yard.houseSlot(house.dims.w, house.dims.d);
    out.append(house.geo, 0, s.x, s.z);
    r.house = house; r.slot = s; r.door = house.door.position.clone().add(s); r.chimney = house.chimneyTop.clone().add(s);
    r.window = house.windows[0].clone().add(s);
  }
  r.extras = [];
  for (const k of spec.extras || []) { const b = makeBuilding(k, { season, fenceFront: k === 'animalShed' }), es = yard.extraSlot(k); out.append(b.geo, es.phi, es.pos.x, es.pos.z); r.extras.push({ kind: k, b, ...es }); }
  // зам: жижиг хаалганаас байшин/гэрийн хаалга хүртэл (L хэлбэртэй)
  const Y = yard.dims, hdY = Y.d / 2;
  if (spec.path && r.door) { const inw = r.house ? r.house.door.inward : new THREE.Vector3(0, 0, -1), wx = yard.wicket.position.x;
    const ex = r.door.x + inw.x * 0.55, ez = r.door.z + inw.z * 0.55, half = (spec.path === 'dirt' ? C.path.dirtW : C.path.w) / 2;
    if (Math.abs(wx - ex) < 0.4) pathSeg(out, [wx, hdY - 0.1], [wx, ez], spec.path);
    else { pathSeg(out, [wx, hdY - 0.1], [wx, ez], spec.path, half); pathSeg(out, [wx, ez], [ex, ez], spec.path); } }
  if (spec.drive) { const x = yard.gate.position.x, w = C.path.drive / 2, L = spec.drive;   // том хаалганаас гудамжны зам хүртэл
    out.quad([[x - w, 0.01, hdY], [x + w, 0.01, hdY], [x + w, 0.01, hdY + L], [x - w, 0.01, hdY + L]], [0, 1, 0], rgb(C.ground.road)); }
  r.plants = [];
  if (spec.trees) { const hw = Y.w / 2, list = spec.trees === 'bush'   // хашааны урд хашаа даган мод, байшингийн дэргэд бут
      ? [['bush', hw - 4.6, hdY - 1.4], ['bush', hw - 6.1, hdY - 1.3], ['bush', -hw + 1.6, hdY - 1.5]]
      : [['tree', -hw + 1.8, hdY - 1.6], ['tree', -hw + 4.6, hdY - 1.7], ['tree', -hw + 1.6, 0.2], ['bush', hw - 4.6, hdY - 1.4], ['bush', hw - 6.1, hdY - 1.3]];
    list.forEach(([k, x, z], i) => { const pg = plantGeo(k, season, (spec.seed || 3) * 31 + i * 7); out.append(pg, 0, x, z); r.plants.push({ kind: k, x, z, triangles: pg.triangles }); }); }
  if (spec.kennel) { const kn = makeBuilding('kennel', { season }), x = -3.4, z = hdY - 1.3; out.append(kn.geo, Math.PI / 2, x, z);   // хаалганы баруун талд, хаалга руу харна
    r.kennel = { x, z, b: kn }; }
  r.special = sp || null; r.enterable = sp ? !!sp.enterable : false;
  if (sp && sp.plaque) { const Q = C.plaque, x = yard.wicket.position.x + yard.dims.wicketW / 2 + Q.gap, z = yard.dims.d / 2 + 0.035;   // айлын самбар
    out.box(x, Q.y, z, Q.w + 0.06, Q.h + 0.06, 0.03, rgb(Q.frame)); out.box(x, Q.y, z + 0.016, Q.w, Q.h, 0.01, rgb(Q.color)); }
  if (sp && sp.porter) { const T = C.porter.at, pt = makePorter(season), px = yard.gate.position.x + T.dx, pz = yard.dims.d / 2 + T.dz;
    out.append(pt.geo, T.phi, px, pz); r.porter = { pos: new THREE.Vector3(px, 0, pz), dims: pt.dims, triangles: pt.geo.triangles }; }
  return r;
}
