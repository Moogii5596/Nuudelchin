/** makeGer — гэрийн гадна талын загвар (1 mesh + хаалганы хавтас + бэхэн хүрээ). Эх: character-lab/ger.html */
import * as THREE from 'three';
import { GER } from './config';
import { Geo, rgb, mix, px2uv, outlineMaterial, type V2, type V3, type LatheOpts } from './geo';
import { doorAtlas } from './atlas';

/** Гэр, майхны үр дүн (ижил бүтэц) */
export interface GerBuilt {
  group: THREE.Group;
  /** Хаалганы цэг (гадаа, бууцны үндсэн координатад), inward = дотогш чиглэл */
  door: { position: THREE.Vector3; inward: THREE.Vector3; width: number; height: number };
  chimneyTop: THREE.Vector3 | null;
  dims: { diameter: number; topH: number; wallH: number; uni: number | string; belts: number | string; text?: string };
  stats: { triangles: number; drawCalls: number };
  setGlow(k: number): void;
  doorLeaf: THREE.Mesh | null;
  setDoorOpen(k: number): void;
  dispose(): void;
}
export interface GerOptions {
  season?: 'summer' | 'winter';
  doorVariant?: number;
  /** Гадна бүрээсийн өнгө (туслахын гэр) */
  coverColor?: string;
  belts?: number;
  glow?: number;
  doorOpen?: number;
  outline?: boolean;
  /** Дотроос харах: тоонон дээрх диск, хаалганы харанхуй нүүр байхгүй */
  interior?: boolean;
  clippingPlanes?: THREE.Plane[] | null;
}

export function makeGer(sizeKey: string, opts: GerOptions = {}): GerBuilt {
  const C = GER, Z = C.sizes[sizeKey]!, S = C.shape, P = C.palette, W = C.winter;
  const winter = opts.season === 'winter', D = C.doors[opts.doorVariant || 0]!, A = C.atlas;
  const geo = new Geo(px2uv(...A.white));

  const R = Z.diameter / 2 + (winter ? W.extraR : 0);        // ханын радиус
  const N = Math.min(27, Math.max(20, Math.round(Z.uni / 2)));             // тойргийн хуваалт = унь / 2
  const wallH = Z.wallH, topH = Z.topH, tonoR = Z.tonoD / 2;
  const hayH = winter ? W.hayavchH : S.hayavchH, hayR = R + (winter ? W.hayavchOut : S.hayavchOut);
  const cover = rgb(opts.coverColor || P.cover), felt = rgb(P.felt), rope = rgb(P.rope);

  type FeltOpts = LatheOpts & { uScale?: number; v0?: number };
  const feltLathe = (o: FeltOpts): void => { // эсгийн ширхэг: v нь профайлын уртын дагуу (сунахгүй), u нь тойргийн дагуу давтагдана
    const P = o.profile ?? o.profileFn!(0), len = [0]; for (let i = 1; i < P.length; i++) len.push(len[i - 1]! + Math.hypot(P[i]![0] - P[i - 1]![0], P[i]![1] - P[i - 1]![1]));
    geo.lathe({ ...o, uvAt: (pi, f) => [f * A.feltRepeat * (o.uScale || 1), 1 - (A.felt[1] - Math.min(1, ((o.v0 || 0) + len[pi]!) / A.feltSpan) * (A.felt[1] - A.felt[0])) / A.size] }); };
  const aGap = Math.asin((Z.doorW / 2 + 0.01) / R), wallArc = { a0: aGap, a1: Math.PI * 2 - aGap };   // хаалганы онгорхой
  // --- хана + хаяавч. Олон давхар эсгий, гадуур нь цагаан бүрээс: бүслүүр хооронд нэвсгэр төмбийж, бүслүүр дээрээ хавчигдана
  const lipY = wallH - S.eaveDrop, puff = winter ? W.puff : S.puff;
  const nBelts = opts.belts || Z.belts, beltYs = (nBelts === 2 ? [0.3, 0.7] : S.beltAt.slice(0, nBelts)).map((f: number) => hayH + (lipY - hayH) * f);
  // Цагаан бүрээс гэрийг нэлэнхүйд нь нэг хучна: хана → мөр → дээвэр завсаргүй нэг гадаргуу (хана хаалганы хэсгээр таслагдана, дээвэр бүтэн тойрог)
  const sh: V2 = [R - S.shoulderIn, wallH + (winter ? W.shoulderUp : S.shoulderUp)], E: V2 = [R + puff * 0.9, wallH - S.eaveDrop + 0.02];
  const roofEnd: V2 = [tonoR + S.tonoRingW * 0.75, topH - S.tonoProud];
  const rl = Math.hypot(roofEnd[0] - sh[0], roofEnd[1] - sh[1]), rp = winter ? W.roofPuff : S.roofPuff;
  const bulge = (t: number): V2 => [sh[0] + (roofEnd[0] - sh[0]) * t + (roofEnd[1] - sh[1]) / rl * rp * 4 * t * (1 - t), sh[1] + (roofEnd[1] - sh[1]) * t - (roofEnd[0] - sh[0]) / rl * rp * 4 * t * (1 - t)];
  const m1 = bulge(0.3), m2 = bulge(0.68), roofPts: V2[] = [sh, m1, m2, roofEnd];          // дээвэр: зузаан эсгий дэвссэн мэт гүдгэр, нэвсгэр
  const roofY = (r: number): number => { for (let i = 0; i < 3; i++) { const a = roofPts[i]!, b = roofPts[i + 1]!; if (r >= b[0] || i === 2) return a[1] + (b[1] - a[1]) * (a[0] - r) / (a[0] - b[0]); } return roofEnd[1]; };
  { const ys = [hayH, ...beltYs], last: V2 = [R, ys[ys.length - 1]!];
    const wallProf = (k: number): V2[] => { const p: V2[] = [[R + (hayR - R) * (0.2 + 0.8 * k), 0], [R + (hayR - R) * (0.2 + 0.8 * k), hayH]];   // k: 0 = хаалганы хажууд (төмбийлтгүй) … 1 = бүрэн нэвсгэр
      for (let i = 0; i < ys.length - 1; i++) { if (i) p.push([R, ys[i]!]); p.push([R + puff * k, (ys[i]! + ys[i + 1]!) / 2]); }
      p.push(last, [R + (E[0] - R) * k, E[1]], sh); return p; };
    const taper = (j: number): number => Math.min(1, Math.min(j, N - j) / 2), prof = wallProf(1);     // хаалга руу ойртохдоо бүрээс хавтгайрч, хаалга бүрээстэй тэгш сууна
    const nW = prof.length - 1; let v0 = 0; for (let i = 1; i < nW; i++) v0 += Math.hypot(prof[i]![0] - prof[i - 1]![0], prof[i]![1] - prof[i - 1]![1]);
    feltLathe({ ...wallArc, segs: N, profile: prof, profileFn: (f: number) => wallProf(taper(Math.round(f * N))), skipSeg: (i: number) => i === nW - 1, colorAt: (seg: number) => (seg < 1 ? rgb(P.hayavch) : cover) });
    const ang: number[] = []; for (let k = 0; k <= N; k++) ang.push(aGap + k * (Math.PI * 2 - 2 * aGap) / N); ang.push(Math.PI * 2 + aGap);   // ханын оройтой яг давхцана + хаалганы дээгүүр нэг хэсэг
    feltLathe({ angles: ang, profile: [last, E, sh, m1, m2, roofEnd], skipSeg: (i: number) => i === 0,
      profileFn: (f: number): V2[] => { const j = Math.round(f * (N + 1)), k = j > N ? 0 : taper(j); return [last, [R + (E[0] - R) * k, E[1]], sh, m1, m2, roofEnd]; }, v0: v0 - Math.hypot(E[0] - last[0], E[1] - last[1]),
      color: cover }); }   // дээвэр тооно хүртэл судалгүй, гөлгөр

  // --- бүслүүр (хавчсан хэсэгт)
  for (const y of beltYs) geo.lathe({ ...wallArc, segs: N, smooth: false, color: rope, profile: [[R + S.beltPinch, y - S.beltH / 2], [R + S.beltPinch, y + S.beltH / 2]] });

  // --- тооно: модон цагираг, дааган мод, дотор талын диск (шөнө гэрэлтэнэ)
  const ro = tonoR + S.tonoRingW * 0.6, ri = tonoR - S.tonoRingW * 0.4, ty0 = topH - S.tonoRingH, ty1 = topH, tono = rgb(P.tono);
  geo.lathe({ segs: 12, smooth: false, color: tono, profile: opts.interior ? [[ro, ty0], [ro, ty1], [ri, ty1], [ri, ty0], [ro, ty0]] : [[ro, ty0], [ro, ty1], [ri, ty1], [ri, ty0]] });
  if (!opts.interior) geo.lathe({ segs: 12, color: [1, 1, 1], uv: px2uv(...A.glow), profile: [[ri + 0.01, ty0 + 0.01], [0, ty0 + 0.01]] });
  const hubY = ty1 + S.tonoRise;
  for (let k = 0; k < S.spokes; k++) {
    const a = k * Math.PI * 2 / S.spokes;
    geo.beam([Math.sin(a) * (ri + 0.02), ty1 - 0.02, Math.cos(a) * (ri + 0.02)], [0, hubY, 0], S.spokeT, S.spokeT, tono);
  }

  // --- өрх: хойд тал руу хагас нугалсан
  const uR = tonoR + S.urkhOut, urkhCol = mix(P.felt, P.cover, 0.35);
  const uProf: V2[] = [[uR, roofY(uR) + 0.03], [ro + 0.03, ty1 + 0.02], [tonoR * 0.55, hubY + 0.03], [0, hubY + 0.08]];
  feltLathe({ segs: 6, a0: Math.PI / 2, a1: Math.PI * 1.5, color: urkhCol, profile: uProf, uScale: 0.5 });
  for (const sx of [1, -1]) for (let i = 0; i < uProf.length - 1; i++) { // нугалаасны ирмэг
    const a = uProf[i]!, b = uProf[i + 1]!;
    geo.quad([[sx * a[0], a[1], 0], [sx * b[0], b[1], 0], [sx * b[0], b[1] - 0.06, 0], [sx * a[0], a[1] - 0.06, 0]], [0, 0, 1], rgb(P.felt, 0.85));
  }
  // өрхний уяа: ар талын яг голоор нэг уяа дунд бүслүүр хүртэл; хоёр хажуугийн уяа яг өрхний хоёр үзүүрээс яг хажуу тийшээ шулуун бууж 3 дахь (доод) бүслүүр дээр дуусна
  const beltMid = beltYs[Math.floor((beltYs.length - 1) / 2)]!;
  const ropes: V3[] = [[Math.PI, Math.PI, beltMid], [Math.PI / 2, Math.PI / 2 - S.urkhRopeLean, beltYs[0]!], [-Math.PI / 2, -Math.PI / 2 + S.urkhRopeLean, beltYs[0]!]];
  for (const [a0, a1, yEnd] of ropes) {
    const at = (r: number, y: number, k: number): V3 => { const a = a0 + (a1 - a0) * k; return [Math.sin(a) * r, y, Math.cos(a) * r]; };
    const p: V3[] = [at(uR, roofY(uR) + 0.03, 0), at(m2[0], m2[1] + 0.022, 0.3), at(m1[0], m1[1] + 0.022, 0.7), at(sh[0] + 0.01, sh[1] + 0.025, 1), at(E[0] + 0.02, E[1], 1), at(R + S.beltPinch + 0.012, yEnd, 1)];
    for (let i = 0; i < 5; i++) geo.beam(p[i]!, p[i + 1]!, 0.025, 0.02, rope);
  }

  // --- яндан (тооны урд хагасаар)
  const chTop = topH + S.chimneyH, chA = S.chimneySector * 2 * Math.PI / S.spokes, cx = Math.sin(chA) * S.chimneyOffR, cz = Math.cos(chA) * S.chimneyOffR, iron = rgb(P.iron);
  geo.lathe({ segs: 8, cx, cz, color: iron, profile: [[S.chimneyR, ty0 + 0.02], [S.chimneyR, chTop]] });
  geo.lathe({ segs: 8, cx, cz, color: rgb(P.iron, 0.35), smooth: false, profile: [[S.chimneyR, chTop], [0, chTop - 0.03]] });   // янданы онгорхой ам (хаалтгүй)

  // --- хаалга: модон хүрээ + хээтэй хавтас (атласын зураг)
  const dw = Z.doorW, dh = Z.doorH, y0 = S.doorSill, zf = R + S.frameOut, frame = rgb(D.frame);
  for (const sx of [1, -1]) geo.box(sx * (dw / 2 + S.jambW / 2), (y0 + dh) / 2, zf - 0.05, S.jambW, y0 + dh, 0.10, frame);   // хүрээ ханын зузаан дотор сууна
  geo.box(0, y0 + dh + S.lintelH / 2, zf - 0.047, dw + S.jambW * 2 + 0.02, S.lintelH, 0.106, frame);
  geo.box(0, y0 / 2, zf - 0.05, dw + S.jambW * 2, y0, 0.11, rgb(D.frame, 0.8));
  // хатавч (хөдөлгөөнгүй) + хавтас (тусдаа mesh, нугасаар эргэнэ) + онгорхойн цаад харанхуй/гэрэл
  const [dx0, dy0, dx1, dy1] = A.door, pz = zf - 0.008, sf = D.stile || 0, sw = dw * sf, lw = dw - sw * 2, du = (dx1 - dx0) * sf;
  const dquad = (q: Geo, xa: number, xb: number, ua: number, ub: number, z: number): void => q.quad([[xa, y0, z], [xb, y0, z], [xb, y0 + dh, z], [xa, y0 + dh, z]], [0, 0, 1], [1, 1, 1],
    [px2uv(ua, dy1), px2uv(ub, dy1), px2uv(ub, dy0), px2uv(ua, dy0)]);
  if (sf) for (const sx of [1, -1]) { geo.box(sx * (dw / 2 - sw / 2), y0 + dh / 2, pz - S.leafT / 2 - 0.001, sw, dh, S.leafT, rgb(D.base, 0.8));
    if (sx < 0) dquad(geo, -dw / 2, -dw / 2 + sw, dx0, dx0 + du, pz); else dquad(geo, dw / 2 - sw, dw / 2, dx1 - du, dx1, pz); }
  if (!opts.interior) { const gu = px2uv(...A.glow), zb = R - 0.115;   // дотор талгүй үед онгорхойгоор харанхуй (шөнө дулаан гэрэл) харагдана
    geo.quad([[-dw / 2, y0, zb], [dw / 2, y0, zb], [dw / 2, y0 + dh, zb], [-dw / 2, y0 + dh, zb]], [0, 0, 1], [1, 1, 1], [gu, gu, gu, gu]); }
  for (const y of beltYs) for (const sx of [1, -1]) geo.box(sx * (dw / 2 + S.jambW / 2), y, zf + 0.006, 0.035, 0.035, 0.02, rgb(S.knob));   // бүслүүр уях товруу
  const leaf = new Geo(px2uv(...A.white));
  leaf.box(lw / 2, y0 + dh / 2, -S.leafT / 2 - 0.001, lw, dh - 0.01, S.leafT, rgb(D.base, 0.8)); dquad(leaf, 0, lw, dx0 + du, dx1 - du, 0);

  // --- зөөлөн шилжилт: хана, хаалга доошоо бага зэрэг бараантана (цас нэмэхээс өмнө)
  for (let i = 0; i < geo.p.length; i += 3) { const y = geo.p[i + 1]!; if (y < wallH) { const k = C.shade.wallBottom + (1 - C.shade.wallBottom) * (y / wallH); geo.c[i] = geo.c[i]! * k; geo.c[i + 1] = geo.c[i + 1]! * k; geo.c[i + 2] = geo.c[i + 2]! * k; } }
  // --- өвөл: хаяаны цас, дээврийн хойд талын цас, хаалганы дээр эвхсэн эсгий үүд
  if (winter) {
    const gap = Math.asin((dw / 2 + S.jambW + 0.22) / R), snow = rgb(P.snow), shade = mix(P.snow, P.snowShade, 0.45), ground = rgb('#EEF2F6');
    geo.lathe({ segs: Math.round(N * 0.32), a0: gap, a1: Math.PI * 2 - gap,
      profileFn: (t: number): V2[] => { const k = Math.min(1, Math.min(t, 1 - t) / 0.1), s = k * k * (3 - 2 * k);
        return [[hayR + 0.04 + W.bankW * s, 0.005], [hayR + 0.04 + W.bankW * 0.45 * s, W.bankH * 0.55 * s], [hayR - 0.02, W.bankH * s + 0.01]]; },
      colorAt: (_seg: number, _side: number, pi: number): V3 => (pi === 0 ? ground : pi === 1 ? shade : snow) });
    const sr = sh[0] - (sh[0] - roofEnd[0]) * W.roofSnowTo;
    geo.lathe({ segs: Math.round(N * 0.19), a0: Math.PI * 0.45, a1: Math.PI * 1.55, color: snow,
      profileFn: (t: number): V2[] => { const k = Math.min(1, Math.min(t, 1 - t) / 0.25), r = sh[0] - (sh[0] - sr) * k; return [[E[0] + 0.015, E[1] + 0.01], [sh[0] + 0.012, sh[1] + 0.025], [r, roofY(r) + 0.025]]; } });
    geo.beam([-dw / 2 - 0.04, y0 + dh + S.lintelH + 0.07, zf + 0.0], [dw / 2 + 0.04, y0 + dh + S.lintelH + 0.07, zf + 0.0], 0.15, 0.14, felt);
  }

  // --- материал: 1 draw call (бие) + 1 (бэхэн хүрээ)
  const tex = doorAtlas(opts.doorVariant || 0);
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, map: tex.map, emissive: 0xffffff, emissiveMap: tex.emissiveMap, emissiveIntensity: opts.glow || 0 });
  if (opts.clippingPlanes) { mat.clippingPlanes = opts.clippingPlanes; mat.clipShadows = true; }
  const geometry = geo.build(), group = new THREE.Group();
  const body = new THREE.Mesh(geometry, mat); body.castShadow = true; body.receiveShadow = true; body.name = 'ger:body';
  const leafGeo = leaf.build(), leafMesh = new THREE.Mesh(leafGeo, mat); leafMesh.name = 'ger:door'; leafMesh.castShadow = true;
  leafMesh.position.set(-lw / 2, 0, pz); leafMesh.rotation.y = -(opts.doorOpen || 0) * S.doorSwing;
  group.add(body, leafMesh);
  let outlineMat: THREE.MeshBasicMaterial | null = null;
  if (opts.outline !== false) {
    outlineMat = outlineMaterial(P.outline, S.outlineW);
    if (opts.clippingPlanes) outlineMat.clippingPlanes = opts.clippingPlanes;
    const o = new THREE.Mesh(geometry, outlineMat); o.name = 'ger:outline'; group.add(o);
  }
  return {
    group,
    door: { position: new THREE.Vector3(0, 0, zf + S.doorStandOff), inward: new THREE.Vector3(0, 0, -1), width: dw, height: dh },
    chimneyTop: new THREE.Vector3(cx, chTop + 0.04, cz),
    dims: { diameter: R * 2, topH: hubY, wallH, uni: Z.uni, belts: nBelts },
    stats: { triangles: geo.triangles + leaf.triangles, drawCalls: group.children.length },
    setGlow(k: number) { mat.emissiveIntensity = k; },
    doorLeaf: leafMesh,
    setDoorOpen(k: number) { leafMesh.rotation.y = -k * S.doorSwing; },   // 0 = хаалттай … 1 = бүрэн нээлттэй
    dispose() { geometry.dispose(); leafGeo.dispose(); mat.dispose(); if (outlineMat) outlineMat.dispose(); },
  };
}
