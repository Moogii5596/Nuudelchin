/** makeGerInterior — гэрийн дотор тал (дотор өнгө, тавилга). Эх: character-lab/ger.html */
import * as THREE from 'three';
import { GER } from './config';
import { Geo, rgb, outlineMaterial, type V2, type V3 } from './geo';
import { interiorAtlas, IN_RECT } from './atlas';
import type { GerInteriorColors } from './config';
import { placeOnWall, type LayoutBox } from '../../sim/systems/gerLayout';

/** Гэрийн хэмжээс (гадна/дотор тал хуваалцана) */
export function gerDims(sizeKey: string, winter: boolean) {
  const C = GER, Z = C.sizes[sizeKey]!, S = C.shape, W = C.winter, tonoR = Z.tonoD / 2;
  const R = Z.diameter / 2 + (winter ? W.extraR : 0);
  return { Z, R, N: Math.min(27, Math.max(20, Math.round(Z.uni / 2))), wallH: Z.wallH, lipY: Z.wallH - S.eaveDrop,
    sh: [R - S.shoulderIn, Z.wallH + (winter ? W.shoulderUp : S.shoulderUp)] as V2, roofEnd: [tonoR + S.tonoRingW * 0.75, Z.topH - S.tonoProud] as V2,
    tonoR, ty0: Z.topH - S.tonoRingH, ri: tonoR - S.tonoRingW * 0.4 };
}


export interface GerInteriorOptions { season?: 'summer' | 'winter'; outline?: boolean; clippingPlanes?: THREE.Plane[] | null }
export interface GerInteriorBuilt {
  group: THREE.Group;
  stats: { triangles: number; drawCalls: number };
  /** Тавилгын хайрцгууд (өрөөний координат, хаалга +Z) — sim-ийн саадтай ижил */
  obstacles: LayoutBox[];
  dispose(): void;
}

export function makeGerInterior(sizeKey: string, opts: GerInteriorOptions = {}): GerInteriorBuilt {
  const C = GER, S = C.shape, I = C.interior, d = gerDims(sizeKey, opts.season === 'winter'), { Z, R, N } = d;
  const white: V2 = [0.5, 0.9375], liner = new Geo(white), g = new Geo(white), Ri = R - I.linerGap, c = (k: keyof GerInteriorColors): V3 => rgb(I[k]);
  const vL0 = 1 - 252 / 256, vL1 = 1 - 132 / 256, K = Math.round(2 * Math.PI * Ri / I.latticeTile);

  // дотор өнгө: ханын сараалж, унь (тоонод нийлнэ)
  const lGap = Math.asin((Z.doorW / 2 + 0.01) / Ri);
  liner.lathe({ a0: lGap, a1: Math.PI * 2 - lGap, segs: N, smooth: false, color: [1, 1, 1], profile: [[Ri, d.wallH], [Ri, 0]], uvAt: (pi, f) => [f * K, pi === 0 ? vL1 : vL0] });
  liner.lathe({ segs: N, color: c('feltIn'), profile: [[d.roofEnd[0], d.roofEnd[1] - I.linerGap], [d.sh[0] - I.linerGap, d.sh[1] - I.linerGap], [Ri, d.wallH]] });
  // өрхний доод тал (тооноор дээш харахад эсгий харагдана)
  const hubY = Z.topH + S.tonoRise;
  liner.lathe({ segs: 8, a0: Math.PI / 2, a1: Math.PI * 1.5, color: c('feltIn'), profile: [[0, hubY + 0.06], [d.tonoR * 0.55, hubY + 0.01], [d.tonoR + S.tonoRingW * 0.6, Z.topH + 0.005]] });
  // унь: ханын толгойгоос тооно хүртэл ШУЛУУН мод (текстур биш геометр). Унь бүр доошоо харсан "V" хоёр тал, үзүүр нь цагаан
  const u0: V2 = [Ri - 0.01, d.wallH - 0.04], u1: V2 = [d.tonoR + 0.05, d.ty0 - 0.045], uw = I.uniW / 2;
  const ul = Math.hypot(u1[0] - u0[0], u1[1] - u0[1]), nr: V2 = [(u1[1] - u0[1]) / ul, -(u1[0] - u0[0]) / ul]; // дээврийн гадагш чиглэл (r, y)
  for (let k = 0; k < Z.uni; k++) {
    const a = (k + 0.5) * Math.PI * 2 / Z.uni, sa = Math.sin(a), ca = Math.cos(a), t: V3 = [ca, 0, -sa];
    const at = (q: number, side: number, lift: number): V3 => { const r = u0[0] + (u1[0] - u0[0]) * q + nr[0] * lift, y = u0[1] + (u1[1] - u0[1]) * q + nr[1] * lift, w = uw * (1 - 0.3 * q) * side; return [r * sa + t[0] * w, y, r * ca + t[2] * w]; };
    const uniParts: [number, number, V3][] = [[0, I.uniTip, c('uni')], [I.uniTip, 1, c('cloth')]];
    for (const [q0, q1, col] of uniParts) for (const side of [1, -1]) {
      const n: V3 = [-nr[0] * sa * 0.6 + t[0] * side, -nr[1] * 0.6, -nr[0] * ca * 0.6 + t[2] * side];
      liner.quad([at(q0, side, 0), at(q1, side, 0), at(q1, 0, -0.03), at(q0, 0, -0.03)], n, col);
    }
  }

  // шал, ширдэг
  g.lathe({ segs: N, color: c('floor'), profile: [[Ri, 0.015], [0, 0.015]] });
  g.box(0, 0.022, -0.8, 1.5, 0.012, 1.0, c('rug')); g.box(0, 0.03, -0.8, 1.2, 0.006, 0.7, c('rugIn'));
  // хоёр багана: тооны зүүн-баруун тэнхлэгийн хоёр дааганы яг доор
  for (const sx of [1, -1]) { g.box(sx * d.ri, d.ty0 / 2, 0, 0.07, d.ty0, 0.07, c('wood')); g.box(sx * d.ri, d.ty0 * 0.55, 0, 0.085, 0.2, 0.085, c('blue')); }
  // зуух, яндан
  const chA = S.chimneySector * 2 * Math.PI / S.spokes, cx = Math.sin(chA) * S.chimneyOffR, cz = Math.cos(chA) * S.chimneyOffR;
  // Төмөр зуух: ард талын намхан хэсгээс яндан гарна, ам нь зүүн талын ор (гал тогооны тал) руу харна; яндан байрандаа, бие нь түүнийг тойрч эргэнэ
  { const sq = new Geo(white), ox = cx, oz = cz; { const g = sq, cx = 0, cz = 0; const V = I.stove, steel = c('steel'), dark = c('steelDark'), light = c('steelLight');
    const zb = cz + V.backD / 2, zm = zb + V.d / 2, zf = zb + V.d, top = V.legH + V.h, btop = V.legH + V.backH;
    const legs: [number, number][] = [[V.w / 2 - 0.03, zb + 0.04], [-V.w / 2 + 0.03, zb + 0.04], [V.w / 2 - 0.03, zf - 0.04], [-V.w / 2 + 0.03, zf - 0.04]];
    for (const [lx, lz] of legs)
      g.beam([cx + lx, V.legH + 0.02, lz], [cx + lx * 1.12, 0.015, lz + (lz > zm ? 0.02 : -0.02)], 0.045, 0.045, dark);       // 4 хөл
    g.box(cx, V.legH + V.h / 2, zm, V.w, V.h, V.d, steel);                                                                    // гол бие
    g.box(cx, V.legH + V.backH / 2, cz, V.backW, V.backH, V.backD, steel);                                                    // арын намхан хэсэг
    g.lathe({ segs: 12, cx, cz: zm, smooth: false, color: light, profile: [[V.plateR, top], [V.plateR, top + 0.012], [V.plateR * 0.62, top + 0.012]] });  // тавагны гадна цагираг
    g.lathe({ segs: 12, cx, cz: zm, smooth: false, color: dark, profile: [[V.plateR * 0.62, top + 0.012], [V.plateR * 0.62, top + 0.02], [0, top + 0.02]] }); // дотор таг
    g.box(cx, top + 0.03, zm, 0.05, 0.02, 0.05, light);
    g.obox([cx, V.legH + V.h * 0.6, zf + 0.022], [V.w * 0.27, 0, 0], [0, V.h * 0.3, -0.03], [0, 0.003, 0.008], light);       // налуу ам
    g.box(cx, V.legH + V.h * 0.24, zf + 0.004, V.w * 0.5, 0.025, 0.012, rgb(C.palette.fire));                                 // амны завсраар гал
    g.box(cx, V.legH + V.h * 0.1, zf + 0.012, V.w * 0.62, V.h * 0.2, 0.03, dark); g.box(cx, V.legH + V.h * 0.1, zf + 0.035, 0.1, 0.02, 0.02, light); // үнсний шургуулга
    g.lathe({ segs: 8, cx, cz, smooth: false, color: dark, profile: [[S.chimneyR + 0.02, btop], [S.chimneyR + 0.02, btop + 0.04], [S.chimneyR, btop + 0.04]] }); // янданы суурь
    g.lathe({ segs: 8, cx, cz, color: c('iron'), profile: [[S.chimneyR, btop], [S.chimneyR, d.ty0 + 0.02]] });
  }
    g.append(sq, I.stoveFacing, ox, oz);   // яндангаа тойрч эргэнэ
  }
  // Тавилга бүрийг локал координатад (нүүр нь +Z) угсарч, ханыг дагуулан төв рүү харуулж байрлуулна
  const uvI = (x: number, y: number): V2 => [x / 512, 1 - y / 512], aK = 2.165 / Ri;   // том гэрт тавилгын хоорондын өнцгийг багасгаж, зайг хэвээр барина
  const panel = (q: Geo, px: number, py: number, pz: number, w: number, h: number, r: [number, number, number, number]): void => q.quad([[px - w / 2, py - h / 2, pz], [px + w / 2, py - h / 2, pz], [px + w / 2, py + h / 2, pz], [px - w / 2, py + h / 2, pz]], [0, 0, 1], [1, 1, 1],
    [uvI(r[0] + 2, r[3] - 2), uvI(r[2] - 2, r[3] - 2), uvI(r[2] - 2, r[1] + 2), uvI(r[0] + 2, r[1] + 2)]);
  const obstacles: LayoutBox[] = [];
  const put = (q: Geo, theta: number, backFromWall: number, halfW: number, depth: number): void => { // theta: хаалганаас (0) зүүн тийш (+); ар тал нь хананд тулна
    const p = placeOnWall(Ri, theta, backFromWall, halfW, depth);
    g.append(q, p.phi, p.x, p.z);
    obstacles.push({ x: p.x, z: p.z, hw: halfW, hd: depth / 2, phi: p.phi });
  };
  // ор: улаан, хоёр үзүүртээ хайрцаг толгойтой, хана талдаа түшлэгтэй, хээтэй хавтангууд
  const B = I.bed, inner = B.l - B.endD * 2, red = c('bedRed');
  const makeBed = (pillowSide: number): Geo => { const q = new Geo(white);
    q.box(0, B.seatH / 2 + 0.02, 0, inner, B.seatH - 0.04, B.w, red);
    q.box(0, B.seatH + 0.035, 0, inner - 0.02, 0.07, B.w - 0.06, c('blanket'));
    q.box(pillowSide * (inner / 2 - 0.2), B.seatH + 0.10, 0, 0.3, 0.07, B.w - 0.2, c('cloth'));
    q.box(0, B.seatH + B.railH / 2, -B.w / 2 + 0.015, inner, B.railH, 0.03, red);
    for (const e of [1, -1]) { const ex = e * (B.l / 2 - B.endD / 2);
      q.box(ex, B.endH / 2, 0, B.endD, B.endH, B.w + 0.02, red); q.box(ex, B.endH + 0.01, 0, B.endD + 0.03, 0.02, B.w + 0.05, rgb(I.bedRed, 0.75));
      panel(q, ex, B.endH / 2, B.w / 2 + 0.012, B.endD - 0.03, B.endH - 0.1, IN_RECT.bedEnd); }
    for (let k = -1; k <= 1; k++) {
      panel(q, k * inner / 3, B.seatH / 2 + 0.02, B.w / 2 + 0.002, inner / 3 - 0.04, B.seatH - 0.1, IN_RECT.bedPanel);
      panel(q, k * inner / 3, B.seatH + B.railH / 2 + 0.035, -B.w / 2 + 0.032, inner / 3 - 0.04, B.railH - 0.1, IN_RECT.bedPanel); }
    return q; };
  put(makeBed(-1), I.layout.bedAt, 0.02, B.l / 2, B.w + 0.02);    // зүүн ор (дэр нь хойд талдаа)
  put(makeBed(1), -I.layout.bedAt, 0.02, B.l / 2, B.w + 0.02);    // баруун ор
  // авдар: суурь, их бие, таг; нүүрэндээ өлзий хээтэй. Хойморт гурав, голынх нь дээр жаазтай зураг
  const CH = I.chest, makeChest = (withFrame: boolean): Geo => { const q = new Geo(white), top = CH.baseH + CH.h + 0.024;
    q.box(0, CH.baseH / 2, 0, CH.w - 0.06, CH.baseH, CH.d - 0.04, rgb(I.chestCol, 0.85));
    q.box(0, CH.baseH + CH.h / 2, 0, CH.w, CH.h, CH.d, c('chestCol'));
    q.box(0, CH.baseH + CH.h + 0.012, 0, CH.w + 0.03, 0.024, CH.d + 0.03, rgb(I.chestCol, 0.9));
    panel(q, 0, CH.baseH + CH.h / 2, CH.d / 2 + 0.002, CH.w - 0.03, CH.h - 0.03, IN_RECT.chest);
    panel(q, 0, CH.baseH / 2, CH.d / 2 - 0.018, CH.w - 0.08, CH.baseH - 0.01, IN_RECT.apron);
    if (withFrame) for (const fx of [0.22, -0.22]) { q.box(fx, top + 0.16, -0.1, 0.34, 0.3, 0.03, c('woodDark')); q.box(fx, top + 0.16, -0.082, 0.27, 0.23, 0.01, c('glass')); }
    return q; };
  for (const k of [0, 1, -1]) put(makeChest(k === 0), Math.PI + k * I.layout.chestStep * aK, 0.02, CH.w / 2, CH.d + 0.03);
  // ширээ, аяга, хоёр сандал
  g.box(0, 0.3, -0.8, 0.7, 0.05, 0.42, c('wood')); for (const sx of [1, -1]) g.box(sx * 0.3, 0.14, -0.8, 0.05, 0.28, 0.38, c('woodDark'));
  g.lathe({ segs: 8, cz: -0.8, color: c('cloth'), profile: [[0.035, 0.326], [0.085, 0.39]] });
  for (const sx of [1, -1]) { g.box(sx * 0.72, 0.13, -0.5, 0.28, 0.26, 0.28, c('wood')); g.box(sx * 0.72, 0.27, -0.5, 0.3, 0.02, 0.3, c('blue')); }
  // зүүн урд: эргэнэг (гал тогооны тавиур) · баруун урд: сүүний бидон
  { const q = new Geo(white);
    for (const sx of [1, -1]) q.box(sx * 0.29, 0.45, 0, 0.03, 0.9, 0.3, c('chestCol'));
    for (const y of [0.12, 0.45, 0.78]) q.box(0, y, 0, 0.58, 0.03, 0.3, c('chestCol'));
    q.box(0, 0.45, -0.14, 0.58, 0.9, 0.02, rgb(I.chestCol, 0.8)); q.box(0, 0.52, 0.02, 0.36, 0.1, 0.16, c('cloth')); q.box(-0.1, 0.19, 0.02, 0.22, 0.1, 0.16, c('tin'));
    put(q, I.layout.shelfAt * aK, 0.02, 0.3, 0.3); }
  // баруун урд: нэг хөнгөн цагаан бидон (усны сав) — цайвар мөнгөлөг бие, бараан хүзүүвч, суурь, хоёр бариултай
  for (const [dt, dr] of [[0, 0.3]] as [number, number][]) { const t = -I.layout.canAt * aK - dt, r = Ri - dr, bx = Math.sin(t) * r, bz = Math.cos(t) * r, alu = c('alu'), dk = c('aluDark');
    g.lathe({ segs: 12, cx: bx, cz: bz, profile: [[0.15, 0.01], [0.16, 0.04], [0.16, 0.36], [0.115, 0.45], [0.115, 0.52], [0.13, 0.53], [0.13, 0.555], [0, 0.565]],
      colorAt: (seg: number) => (seg === 0 || seg === 3 ? dk : seg >= 4 ? rgb(I.alu, 1.08) : alu) });
    for (const sx of [1, -1]) g.box(bx + sx * 0.14, 0.47, bz, 0.05, 0.035, 0.07, dk);
    g.box(bx, 0.575, bz, 0.03, 0.02, 0.2, dk); }
  // баруун урд, бидоны хажууд: айрагны хөхүүр (хэрэглэгчийн зургуудаар). Том арьсан уут: доошоо өргөссөн, айргаар дүүрч гүзээ нь урагш төмбийсөн,
  // голдоо босоо хонхортой, хоёр мөрөөрөө дунд хөндлөвчөөс уягдсан, голын хүзүүгээр бүлүүр гарна. Модон хүрээ: хоёр багана, дээд ба дунд хөндлөвч
  { const q = new Geo(white), K = I.khukhuur, wd = c('standWood'), dk = rgb(I.standWood, 0.6), pale = c('paleWood'), strap = rgb(I.leather, 0.45), X = K.postX, H = K.height;
    for (const sx of [1, -1]) {
      q.box(sx * X, H / 2, 0, 0.075, H, 0.075, wd); q.box(sx * X, 0.035, 0.02, 0.1, 0.07, 0.4, dk);                          // багана, суурь
      q.beam([sx * X, 0.3, 0.0], [sx * X, 0.07, 0.17], 0.05, 0.05, dk);                                                      // суурийн ташуу тулаас
      q.beam([sx * (X + 0.12), H + 0.035, 0], [sx * (X + 0.2), H + 0.085, 0], 0.09, 0.07, wd); }                             // дээд хөндлөвчийн өргөгдсөн үзүүр
    q.box(0, H + 0.03, 0, X * 2 + 0.26, 0.08, 0.1, wd);                                                                      // дээд хөндлөвч
    { const bar = new Geo(white); bar.lathe({ segs: 8, color: wd, profile: [[0.032, -X], [0.032, X]] });                         // дунд хөндлөвч: дугуй мод (босоо үүсгээд хэвтүүлнэ)
      for (let i = 0; i < bar.p.length; i += 3) { const px = bar.p[i]!, py = bar.p[i + 1]!, nx = bar.n[i]!, ny = bar.n[i + 1]!;
        bar.p[i] = py; bar.p[i + 1] = K.barY - px; bar.n[i] = ny; bar.n[i + 1] = -nx; bar.p[i + 2] = bar.p[i + 2]! - 0.02; }
      q.append(bar); }
    q.box(0, 0.14, -0.1, X * 2, 0.05, 0.05, wd);                                                                             // доод хөндлөвч
    q.box(0, H - 0.17, 0.03, 0.26, 0.11, 0.035, dk); q.box(0, H - 0.1, 0.03, 0.12, 0.05, 0.035, dk);                         // сийлбэртэй чимэг (хүзүүний дээр өлгөөтэй)
    for (const sx of [1, -1]) { q.box(sx * 0.16, H - 0.16, 0.03, 0.07, 0.07, 0.03, wd); q.beam([sx * 0.07, H - 0.11, 0.03], [sx * 0.07, H, 0.02], 0.014, 0.014, strap); }
    const B = K.bag, n = B.length, L = IN_RECT.leather;
    const luv = (i: number, f: number): V2 => uvI(L[0] + 4 + (i / (n - 1)) * 184, L[1] + 4 + (0.5 + 0.5 * Math.sin(f * Math.PI * 2)) * 40);
    q.loft({ segs: 20, color: [1, 1, 1], uvAt: luv, rows: B.map(([y, w, d, cz]) => ({ y, w, d, cz })),
      mod: (i, a) => { const sq = Math.pow(Math.pow(Math.abs(Math.sin(a)), 2.8) + Math.pow(Math.abs(Math.cos(a)), 2.8), -1 / 2.8);      // дөрвөлжиндүү огтлол
        const fa = Math.atan2(Math.sin(a), Math.cos(a)), mid = Math.sin(Math.PI * i / (n - 1));
        return sq * (1 - K.crease * mid * Math.exp(-((fa / 0.33) ** 2))) * (i >= n - 3 ? 1 + 0.05 * Math.cos(a * 9) : 1); } });          // голын хонхор, амны атираа
    const top = B[n - 1]!;
    for (const sx of [1, -1]) {                                                                                               // хоёр мөр: шовх үзүүр нь дунд хөндлөвчид уягдана
      q.loft({ segs: 8, color: rgb(I.leather, 0.85), rows: [{ y: top[0] - 0.05, cx: sx * (top[1] - 0.05), w: 0.06, d: 0.03 }, { y: top[0] + 0.05, cx: sx * (top[1] + 0.02), w: 0.035, d: 0.018 }, { y: top[0] + 0.12, cx: sx * (top[1] + 0.07), w: 0.012, d: 0.01 }] });
      q.beam([sx * (top[1] + 0.07), top[0] + 0.12, 0], [sx * (top[1] + 0.13), K.barY, -0.01], 0.016, 0.016, strap); }
    q.loft({ segs: 10, color: rgb(I.leather, 0.8), rows: [{ y: top[0] - 0.03, w: 0.085, d: 0.045 }, { y: top[0] + 0.08, w: 0.062, d: 0.042 }, { y: top[0] + 0.15, w: 0.07, d: 0.048 }] });   // хүзүү
    { const m = new Geo(white); m.lathe({ segs: 10, smooth: false, color: rgb(I.leather, 0.3), profile: [[0.066, top[0] + 0.148], [0, top[0] + 0.13]] });
      for (let i = 2; i < m.p.length; i += 3) m.p[i] = m.p[i]! * 0.68; q.append(m); }
    q.beam([0.0, 0.6, 0.03], [0.1, H + 0.2, 0.12], 0.028, 0.028, pale); q.box(0.103, H + 0.22, 0.123, 0.05, 0.05, 0.05, pale);    // бүлүүр
    q.beam([X - 0.1, K.barY + 0.02, 0.05], [X - 0.12, 0.62, 0.07], 0.022, 0.022, pale);                                         // шанага
    q.lathe({ segs: 10, cx: X - 0.12, cz: 0.07, profile: [[0.04, 0.44], [0.052, 0.47], [0.056, 0.62], [0, 0.62]], colorAt: (seg: number) => (seg === 1 ? pale : rgb(I.paleWood, 0.75)) });
    put(q, -I.layout.khukhuurAt * aK, 0.04, X + 0.14, 0.42); }
  const tex = interiorAtlas(), group = new THREE.Group();
  for (let i = 0; i < g.p.length; i += 3) { const sd = C.shade, k = sd.furnitureBottom + (1 - sd.furnitureBottom) * Math.min(1, g.p[i + 1]! / sd.furnitureTop); g.c[i] = g.c[i]! * k; g.c[i + 1] = g.c[i + 1]! * k; g.c[i + 2] = g.c[i + 2]! * k; }
  const lm = new THREE.MeshLambertMaterial({ vertexColors: true, map: tex }), fm = new THREE.MeshLambertMaterial({ vertexColors: true, map: tex });
  if (opts.clippingPlanes) lm.clippingPlanes = opts.clippingPlanes;
  const lg = liner.build(), fg = g.build(), linerMesh = new THREE.Mesh(lg, lm), furn = new THREE.Mesh(fg, fm);
  linerMesh.name = 'ger:liner'; linerMesh.receiveShadow = true; furn.name = 'ger:furniture'; furn.castShadow = true; furn.receiveShadow = true; group.add(linerMesh, furn);
  let om: THREE.MeshBasicMaterial | null = null;
  if (opts.outline !== false) { // тавилгын бэхэн хүрээ (гол дүр, гадна гэртэй ижил)
    om = outlineMaterial(C.palette.outline, S.outlineW * 0.6);
    const o = new THREE.Mesh(fg, om); o.name = 'ger:furniture-outline'; group.add(o); }
  return { group, obstacles, stats: { triangles: liner.triangles + g.triangles, drawCalls: group.children.length }, dispose() { lg.dispose(); fg.dispose(); lm.dispose(); fm.dispose(); if (om) om.dispose(); } };
}
