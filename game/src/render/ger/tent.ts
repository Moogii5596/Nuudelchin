/**
 * makeTent(kind, opts) — майхны загвар (makeGer-тэй ижил бүтэцтэй үр дүн). Эх: tools/character-lab/ger.html.
 * Нуруу мод урд-хойд чигт; үүд нь урд (+Z) хавтгайд. Тоонууд `data/ger.json` → "tent".
 */
import * as THREE from 'three';
import { GER, TENT } from './config';
import { Geo, rgb, px2uv, outlineMaterial, type V3 } from './geo';
import { doorAtlas } from './atlas';
import type { GerBuilt } from './ger';

export interface TentOptions { season?: 'summer' | 'winter'; glow?: number; outline?: boolean }

export function makeTent(kind: string, opts: TentOptions = {}): GerBuilt {
  const T = TENT, K = T.kinds[kind], P = T.palette, A = GER.atlas;
  if (!K) throw new Error(`майхны төрөл "${kind}" алга`);
  const geo = new Geo(px2uv(...A.white));
  const hw = K.W / 2, hl = K.L / 2, H = K.H, w = K.wall, base = K.old ? P.canvasOld : P.canvas, can = rgb(base), canD = rgb(base, 0.9), trim = rgb(P.trim);
  const nl = Math.hypot(H - w, hw);
  const rp = (sx: number, t: number, z: number, lift = 0): V3 => [sx * (hw * (1 - t) + (H - w) / nl * lift), w + (H - w) * t + hw / nl * lift, z];   // дээврийн налуу дээрх цэг
  for (const sx of [1, -1]) {
    const n: V3 = [sx * (H - w) / nl, hw / nl, 0];
    geo.quad([rp(sx, 0, -hl), rp(sx, 0, hl), rp(sx, 1, hl), rp(sx, 1, -hl)], n, can);                                    // дээвэр
    if (w > 0) geo.quad([[sx * hw, 0, -hl], [sx * hw, 0, hl], [sx * hw, w, hl], [sx * hw, w, -hl]], [sx, 0, 0], canD);   // хажуугийн намхан хана
    const tw = T.trimW / nl;
    if (K.trim) {
      geo.quad([rp(sx, 0.02, -hl, 0.004), rp(sx, 0.02, hl, 0.004), rp(sx, 0.02 + tw, hl, 0.004), rp(sx, 0.02 + tw, -hl, 0.004)], n, trim);   // захын хөх эмжээр
      geo.quad([rp(sx, 0.02 + tw * 1.5, -hl, 0.004), rp(sx, 0.02 + tw * 1.5, hl, 0.004), rp(sx, 0.02 + tw * 1.9, hl, 0.004), rp(sx, 0.02 + tw * 1.9, -hl, 0.004)], n, trim);
    }
    if (opts.season === 'winter') geo.quad([rp(sx, 0.34, -hl, 0.008), rp(sx, 0.34, hl, 0.008), rp(sx, 0.9, hl, 0.008), rp(sx, 0.9, -hl, 0.008)], n, rgb(P.snow));
    for (const z of [-hl, 0, hl]) {
      const a = rp(sx, w > 0 ? 0 : 0.22, z, 0.005), e: V3 = [sx * (hw + T.ropeOut), 0.02, z * 1.12];   // татлага, гадас
      geo.beam(a, e, 0.016, 0.016, rgb(P.rope));
      geo.beam([e[0], 0.13, e[2]], [e[0] + sx * 0.05, -0.02, e[2]], 0.035, 0.035, rgb(P.stake));
    }
  }
  const back: V3 = [0, 0, -1], front: V3 = [0, 0, 1], top: V3 = [0, H, -hl];
  const back3: [[number, number], [number, number]][] = [[[-hw, w], [-hw, 0]], [[-hw, 0], [hw, 0]], [[hw, 0], [hw, w]]];
  for (const [a, b] of back3) geo.tri(top, [a[0], a[1], -hl], [b[0], b[1], -hl], back, back, back, canD, canD, canD);   // хойд хавтгай
  const dw = K.doorW, dh = H * 0.84, z = hl;
  for (const sx of [1, -1]) {   // урд хавтгай: үүдний гурвалжин онгорхойтой
    const c: V3 = [sx * hw, w, z];
    const front3: [[number, number], [number, number]][] = [[[sx * hw, 0], [sx * dw / 2, 0]], [[sx * dw / 2, 0], [0, dh]], [[0, dh], [0, H]]];
    for (const [a, b] of front3) geo.tri(c, [a[0], a[1], z], [b[0], b[1], z], front, front, front, canD, canD, can);
  }
  const gu = px2uv(...A.glow);
  geo.tri([-dw / 2, 0, z - 0.012], [dw / 2, 0, z - 0.012], [0, dh, z - 0.012], front, front, front, [1, 1, 1], [1, 1, 1], [1, 1, 1], gu, gu, gu);   // онгорхой (шөнө дулаан гэрэл)
  geo.tri([-dw / 2, 0, z + 0.004], [0, 0, z + 0.004], [0, dh, z + 0.004], front, front, front, canD, canD, can);                                    // зүүн хаяавч хаалттай
  {   // баруун хаяавч гадагш эргүүлж сөхсөн
    const ax = dw / 2, bx = -dw / 2, by = dh, d2 = bx * bx + by * by, t = (-ax * bx) / d2, fx = 2 * (ax + bx * t), fy = 2 * (by * t);
    geo.tri([dw / 2, 0, z + 0.01], [0, dh, z + 0.01], [fx, fy, z + 0.01], front, front, front, rgb(base, 0.82), rgb(base, 0.82), rgb(base, 0.82));
  }
  if (K.trim) for (const sx of [1, -1]) geo.beam([sx * hw, w + 0.02, z + 0.006], [0, H + 0.01, z + 0.006], 0.012, 0.06, trim);                     // урд хавтгайн захын эмжээр
  const pole = rgb(P.pole);
  geo.beam([0, H + 0.005, -hl - 0.1], [0, H + 0.005, hl + 0.1], 0.05, 0.05, pole);                                    // нуруу мод
  geo.beam([0, 0, hl + 0.02], [0, H, hl + 0.02], 0.045, 0.045, pole);
  geo.beam([0, 0, -hl - 0.02], [0, H, -hl - 0.02], 0.045, 0.045, pole);   // хоёр багана
  if (K.uurga) geo.beam([hw + 0.75, 0, -hl * 0.5], [-0.25, H + 0.75, -hl * 0.2], 0.035, 0.035, rgb(P.uurga));        // налуулсан уурга
  for (let i = 0; i < geo.p.length; i += 3) { const k = 0.86 + 0.14 * Math.min(1, geo.p[i + 1]! / H); geo.c[i] = geo.c[i]! * k; geo.c[i + 1] = geo.c[i + 1]! * k; geo.c[i + 2] = geo.c[i + 2]! * k; }

  const tex = doorAtlas(0), mat = new THREE.MeshLambertMaterial({ vertexColors: true, map: tex.map, emissive: 0xffffff, emissiveMap: tex.emissiveMap, emissiveIntensity: opts.glow || 0 });
  const geometry = geo.build(), group = new THREE.Group(), body = new THREE.Mesh(geometry, mat);
  body.castShadow = true; body.receiveShadow = true; body.name = 'tent:body'; group.add(body);
  let om: THREE.MeshBasicMaterial | null = null;
  if (opts.outline !== false) {
    om = outlineMaterial(GER.palette.outline, T.outlineW);
    const o = new THREE.Mesh(geometry, om); o.name = 'tent:outline'; group.add(o);
  }
  return {
    group,
    door: { position: new THREE.Vector3(0, 0, hl + T.doorStandOff), inward: new THREE.Vector3(0, 0, -1), width: dw, height: dh },
    chimneyTop: null,
    dims: { diameter: Math.max(K.L, K.W) + 0.4, topH: H, wallH: w, uni: '—', belts: '—', text: `${K.L.toFixed(1)} × ${K.W.toFixed(1)} × ${H.toFixed(2)} м` },
    stats: { triangles: geo.triangles, drawCalls: group.children.length },
    setGlow(k: number) { mat.emissiveIntensity = k; },
    doorLeaf: null,
    setDoorOpen() { /* майхны үүд хөдөлгөөнгүй */ },
    dispose() { geometry.dispose(); mat.dispose(); if (om) om.dispose(); },
  };
}
