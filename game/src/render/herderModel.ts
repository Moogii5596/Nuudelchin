// @ts-nocheck
/**
 * Үндсэн дүрийн (малчин) загвар — `tools/character-lab/herder.html` загварын лабораторид боловсруулж
 * хэрэглэгч баталсан хувилбар (docs/character-design.md). Цилиндр толгой, зурмал нүүр (нүд, хөмсөг, ам),
 * үе мөч (өвдөг, тохой, бугуй, хуруу, бэлхүүс, хүзүү), улирлын дээл, монгол гутал, тоорцог ба үстэй малгай.
 *
 * `init()` доторх геометрийн код нь лабораторийн файлаас ХУУЛСАН (нэг эх сурвалж — загварыг тэнд засаж,
 * энд дахин хуулна) тул төрөлжүүлээгүй: файл бүхэлдээ `@ts-nocheck`. Гадагш гарах API (доод хэсэг) төрөлтэй.
 * Canvas текстурууд эхний дуудалтад л үүснэ (тест, sim-д DOM шаардахгүй).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { visualStyle, type HerderEmotion, type OutfitBody } from './style';
import type { Season } from '../sim/config';

export interface HerderModelColors {
  deel: number;
  hem: number;
  hat: number;
}

/** Нэг кадрын поз: хөдөлгөөн sim-ээс, нүүр үйл явдлаас */
export interface HerderPose {
  dt: number;
  /** газар дээрх хурд, м/с */
  speed: number;
  mode: 'foot' | 'mounted' | 'seated';
  /** хашгирах/дуудах үед хоёр гараа өргөнө */
  raise: boolean;
  uurga: boolean;
  talk: boolean;
  emotion: HerderEmotion;
}

export interface HerderRig {
  root: THREE.Group;
  legs: THREE.Group[];
  arms: THREE.Group[];
  knees: THREE.Group[];
  elbows: THREE.Group[];
  wrists: THREE.Group[];
  neck: THREE.Group;
  waist: THREE.Group;
  bodies: THREE.Group[];
  curls: Array<(curl: number, grip?: number) => void>;
  elbowRest: number[];
  armY: number;
  neckY: number;
  sleeveMat: THREE.MeshLambertMaterial;
  sleeveColors: Record<OutfitBody, number>;
  anim: { phase: number; time: number; run: number; blinkT: number; blinkP: number; emo: Record<string, number> };
}

const hexNum = (c: string): number => parseInt(c.slice(1), 16);

function init() {
  const vo = visualStyle.outfits;
  const outfits = {
    player: { deel: hexNum(vo.player.deel), hem: hexNum(vo.player.hem), hat: hexNum(vo.player.hat) },
    foxFur: hexNum(vo.foxFur), collarFur: hexNum(vo.collarFur), terlegLighten: vo.terlegLighten,
    seasons: vo.seasons,
  };
  const darken = (c, k) => (((c >> 16 & 255) * k) | 0) << 16 | (((c >> 8 & 255) * k) | 0) << 8 | ((c & 255) * k) | 0;
  function lighten(c, k) {
    const ch = (sh) => { const v = (c >> sh) & 255; return Math.round(v + (255 - v) * k) << sh; };
    return ch(16) | ch(8) | ch(0);
  }

  /* ---------- util.ts-тэй ижил ---------- */
  const matCache = new Map();
  function mat(color) {
    let m = matCache.get(color);
    if (!m) { m = new THREE.MeshLambertMaterial({ color, flatShading: true }); matCache.set(color, m); }
    return m;
  }
  function meshBox(w, h, d, color, x, y, z, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
    m.position.set(x, y, z); m.castShadow = true; parent?.add(m); return m;
  }

  /* ---------- шинэ туслахууд ---------- */
  const gradCache = new Map();
  function gradMat(color) {
    let m = gradCache.get(color);
    if (!m) { m = new THREE.MeshLambertMaterial({ color, flatShading: true, vertexColors: true }); gradCache.set(color, m); }
    return m;
  }
  /** Нарийсдаг хайрцаг: дээд/доод ӨРГӨН (радиус биш), depthK = зузаан/өргөн. grad = [дээд, доод] гэрэлтэлт */
  function prism(wTop, wBot, h, depthK, color, x, y, z, parent, grad) {
    const geo = new THREE.CylinderGeometry(wTop * Math.SQRT1_2, wBot * Math.SQRT1_2, h, 4, 1, false, Math.PI / 4);
    if (grad) {
      const pos = geo.attributes.position, col = [];
      for (let i = 0; i < pos.count; i++) {
        const v = grad[1] + (grad[0] - grad[1]) * (pos.getY(i) / h + 0.5);
        col.push(v, v, v);
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    }
    const m = new THREE.Mesh(geo, grad ? gradMat(color) : mat(color));
    m.position.set(x, y, z); m.scale.z = depthK; m.castShadow = true; parent?.add(m); return m;
  }
  function ball(r, color, x, y, z, parent) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), mat(color));
    m.position.set(x, y, z); m.castShadow = true; parent?.add(m); return m;
  }
  /** Ink-outline: mesh бүрийн ХҮҮХЭД болгож нэмнэ — харагдах эсэх, хөдөлгөөн нь эцэг mesh-ээ дагана */
  const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x1a130d, side: THREE.BackSide });
  const outlines = [];
  /**
   * Гүйцэтгэл (зөвхөн тоглоомд, лабораторид байхгүй): дүрийг АРАГ ЯСТАЙ нэг mesh (SkinnedMesh) болгоно.
   * Үе мөчний бүлгүүд (Group) хэвээр үлдэж яс болно — анимацийн код тэднийг өмнөх шигээ эргүүлнэ.
   * Mesh бүрийн оройг эцэг бүлэг (яс)-т нь 100% холбож, нэг давхарга (body:*, hat:* — улирлаар харагдах/нуугдах)
   * доторх бүх хэсгийг материалаар нь нэгтгэнэ. Нэг өнгийн (зураггүй) материалуудыг оройн өнгө болгож нэг
   * материалд нийлүүлнэ. Бэхэн хүрээ (outline) давхарга бүрт нэг mesh болно. Нэртэй mesh (head, hair, uurga, sack,
   * ear …) болон InstancedMesh (үс) хэвээр үлдэнэ — код тэдгээрийг нэрээр нь удирддаг.
   * liveMats — ажиллах үед өнгө нь өөрчлөгддөг материал (ханцуй улирлаар) — оройн өнгөнд шингээхгүй.
   */
  function bakeSkinned(root, liveMats = [], k = 1.06) {
    root.updateMatrixWorld(true);
    const LAYER = /^(body|hat):/;
    const layerOf = (o) => { for (let q = o.parent; q && q !== root; q = q.parent) if (LAYER.test(q.name)) return q; return root; };
    const sources = [];
    root.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.name || o.children.length || Array.isArray(o.material)) return;
      for (let q = o; q && q !== root; q = q.parent) if (!q.visible && !LAYER.test(q.name)) return;   // нуугдсан хэсэг (лабораторийн сонголт)
      sources.push(o);
    });
    // жижиг хэсгүүд сүүдэр тусгахгүй (нэгтгэсэн mesh сүүдэр тусгах эсэхийг том хэсгүүд шийднэ)
    for (const o of sources) { o.geometry.computeBoundingSphere(); if (o.geometry.boundingSphere.radius < 0.1) o.castShadow = false; }
    const bones = [], boneIdx = new Map();
    const boneOf = (o) => { let i = boneIdx.get(o.parent); if (i === undefined) { i = bones.length; bones.push(o.parent); boneIdx.set(o.parent, i); } return i; };
    const flatColor = (m) => m.isMeshLambertMaterial && !m.map && !liveMats.includes(m) && !m.transparent && m.opacity === 1 && !m.alphaTest && m.emissive.getHex() === 0;
    const vcMats = new Map();
    const vcMat = (flat, side) => {
      const key = `${flat}|${side}`;
      if (!vcMats.has(key)) vcMats.set(key, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: flat, side }));
      return vcMats.get(key);
    };
    const buckets = new Map();
    const bucket = (layer, material) => {
      const key = layer.uuid + '|' + material.uuid;
      if (!buckets.has(key)) buckets.set(key, { layer, material, geos: [], shadow: false });
      return buckets.get(key);
    };
    /** Геометрийг нэг хэлбэрт оруулна: индексгүй, position/normal (+uv, +color), бүх оройд нэг яс */
    const prep = (m, matrix, wantUv, wantColor, tint) => {
      let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      if (!g.attributes.normal) g.computeVertexNormals();
      const n = g.attributes.position.count;
      for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(name)) g.deleteAttribute(name);
      if (wantUv && !g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
      if (!wantUv && g.attributes.uv) g.deleteAttribute('uv');
      if (wantColor) {
        const src = g.attributes.color, col = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          const r = src ? src.getX(i) : 1, gg = src ? src.getY(i) : 1, b = src ? src.getZ(i) : 1;
          col[i * 3] = r * tint.r; col[i * 3 + 1] = gg * tint.g; col[i * 3 + 2] = b * tint.b;
        }
        g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      } else if (g.attributes.color) g.deleteAttribute('color');
      g.applyMatrix4(matrix);
      if (matrix.determinant() < 0) {   // толин тусгал хувиргалт: гурвалжны эргэлтийг буцаана (гадагш харсан тал хэвээр)
        for (const name of Object.keys(g.attributes)) {
          const at = g.attributes[name], sz = at.itemSize, arr = at.array;
          for (let t = 0; t < n; t += 3) for (let c = 0; c < sz; c++) { const i1 = (t + 1) * sz + c, i2 = (t + 2) * sz + c; const v = arr[i1]; arr[i1] = arr[i2]; arr[i2] = v; }
        }
      }
      const bi = boneOf(m), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) { si[i * 4] = bi; sw[i * 4] = 1; }
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
      g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
      return g;
    };
    const scaleK = new THREE.Matrix4().makeScale(k, k, k);
    for (const m of sources) {
      const layer = layerOf(m), mat = m.material;
      if (mat === OUTLINE) {   // гараар хийсэн хүрээ (гутлын хүрээ)
        const bk = bucket(layer, OUTLINE); bk.geos.push(prep(m, m.matrixWorld, false, false));
      } else if (flatColor(mat)) {
        const bk = bucket(layer, vcMat(mat.flatShading, mat.side));
        bk.geos.push(prep(m, m.matrixWorld, false, true, mat.color));
        bk.shadow ||= m.castShadow;
      } else {
        const bk = bucket(layer, mat);
        bk.geos.push(prep(m, m.matrixWorld, Boolean(mat.map), Boolean(mat.vertexColors), new THREE.Color(1, 1, 1)));
        bk.shadow ||= m.castShadow;
      }
      if (!m.userData.noOutline) {
        const bk = bucket(layer, OUTLINE);
        bk.geos.push(prep(m, m.matrixWorld.clone().multiply(scaleK), false, false));
      }
    }
    for (const m of sources) m.removeFromParent();
    const skeleton = new THREE.Skeleton(bones);   // яс = үе мөчний бүлгүүд; урвуу матрицыг одоогийн (амрах) байрлалаас тооцно
    const identity = new THREE.Matrix4();
    for (const { layer, material, geos, shadow } of buckets.values()) {
      const merged = mergeGeometries(geos, false);
      if (!merged) throw new Error('herderModel: mergeGeometries амжилтгүй');
      const sk = new THREE.SkinnedMesh(merged, material);
      sk.userData.noOutline = true;
      sk.castShadow = shadow && material !== OUTLINE;
      sk.frustumCulled = false;   // ясаар хөдөлдөг тул анхны хүрээгээр тасалбал алга болж мэднэ
      layer.add(sk);              // давхарга нуугдахад хамт нуугдана
      sk.updateMatrixWorld(true);
      sk.bind(skeleton, identity);
      if (material === OUTLINE) outlines.push(sk);
    }
    return { bones: bones.length, meshes: buckets.size };
  }
  function addOutline(root, k = 1.06) {
    const targets = [];
    root.traverse((o) => { if (o.isMesh && !o.userData.noOutline) targets.push(o); });
    for (const m of targets) {
      const o = new THREE.Mesh(m.geometry, OUTLINE);
      o.scale.setScalar(k);
      m.add(o);
      outlines.push(o);
    }
  }

  /* ---------- Толгойн геометр: n = тойргийн хуваалт (их байх тусам дугуй) ---------- */
  let HEAD_N = 24;
  let HEAD_SMOOTH = true;
  /** Гөлгөр (өнцөггүй) Lambert: flatShading-гүй тул гэрэл талуудын хооронд жигд шилжинэ */
  const smoothCache = new Map();
  function smoothMat(color) {
    let m = smoothCache.get(color);
    if (!m) { m = new THREE.MeshLambertMaterial({ color }); smoothCache.set(color, m); }
    return m;
  }
  const headMat = (color) => (HEAD_SMOOTH ? smoothMat(color) : mat(color));
  function profile(ctrl, rows) {
    const curve = new THREE.SplineCurve(ctrl.map(([r, y]) => new THREE.Vector2(r, y)));
    return curve.getPoints(rows).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y));
  }
  /** Толгойн хэлбэр: 'round' = бөөрөнхий (анхны), 'block' = цилиндр маягийн тоглоомон толгой */
  let HEAD_SHAPE = 'block';   // батлагдсан: цилиндр толгой, хавтгай зурсан нүүр
  const HEAD_PROFILES = {
    // хуучин энгийн бөөрөнхий толгой: дүүрэн хацар, эрүү нарийсаагүй, зөвхөн хамар товойсон
    ball: [[0, -0.272], [0.13, -0.264], [0.212, -0.215], [0.25, -0.11], [0.26, 0], [0.25, 0.11], [0.18, 0.22], [0, 0.26]],
    round: [[0, -0.272], [0.105, -0.266], [0.188, -0.218], [0.24, -0.11], [0.258, 0], [0.25, 0.11], [0.18, 0.22], [0, 0.26]],
    // y утгууд нь round-тай ижил тул зурсан нүүр (нүд, ам) яг байрандаа үлдэнэ
    block: [[0, -0.272], [0.16, -0.268], [0.228, -0.222], [0.24, -0.11], [0.24, 0], [0.24, 0.11], [0.226, 0.214], [0, 0.26]],
  };
  function shapeHead(x, y, z) {
    if (HEAD_SHAPE === 'block') return [x, z];
    if (HEAD_SHAPE === 'ball') return [x, 0.95 * z];
    const t = Math.min(1, Math.max(0, (-0.05 - y) / 0.22));
    return [x * (1 - 0.05 * t), 0.95 * (z > 0 ? z * (1 + 0.04 * t) : z * (1 - 0.1 * t))];
  }
  /** Нарийвчлал: 1 = үндсэн дүр; олон хүнд (crowd) бага — хуваалтыг үржүүлнэ (q) */
  let LOD = 1;
  const q = (n, min) => Math.max(min, Math.round(n * LOD));
  const headSeg = (n) => q(Math.max(n, 40), 14);   // нүүрний бүтцийг гаргахад хангалттай нягт тор
  function headGeoFor(n) {
    const seg = headSeg(n);
    const pts = profile(HEAD_PROFILES[HEAD_SHAPE], q(28, 10));   // доод нүүр нарийссан — унжсан хацаргүй
    const geo = new THREE.LatheGeometry(pts, seg, Math.PI + Math.PI / seg);   // оёдол нь ар талд (үсний доор)
    // Нүүрний бүтэц: гадаргууг радиусын дагуу бага зэрэг түлхэж/татаж гаргана. a = урдаас хэмжсэн өнцөг (рад), y = өндөр
    const bump = (a, y, a0, sa, y0, sy) => Math.exp(-(((a - a0) / sa) ** 2) - ((y - y0) / sy) ** 2);
    const relief = (a, y) => {
      const m = Math.abs(a);                                     // хоёр тал тэгш хэмтэй
      return (
        0.011 * bump(m, y, 0.3, 0.3, 0.042, 0.024) +             // хөмсөгний яс
        0.005 * bump(m, y, 0, 0.16, 0.04, 0.03) +                // хөмсөг хоорондын товгор
        -0.013 * bump(m, y, 0.35, 0.2, -0.012, 0.026) +          // нүдний хонхор
        0.016 * bump(m, y, 0, 0.085, -0.035, 0.05) +             // хамрын хяр
        0.03 * bump(m, y, 0, 0.1, -0.078, 0.022) +               // хамрын үзүүр
        0.01 * bump(m, y, 0.1, 0.07, -0.086, 0.016) +            // хамрын угалз
        0.009 * bump(m, y, 0.62, 0.26, -0.065, 0.04) +           // шанаа
        -0.006 * bump(m, y, 0.6, 0.26, -0.16, 0.045) +           // шанааны доорх хонхор
        0.005 * bump(m, y, 0, 0.2, -0.156, 0.02) +               // уруулын товгор
        -0.007 * bump(m, y, 0, 0.16, -0.192, 0.015) +            // уруул эрүү хоёрын хоорондох хонхор
        0.016 * bump(m, y, 0, 0.24, -0.238, 0.028) +             // эрүүний товгор: урагш, тод
        0.007 * bump(m, y, 1.15, 0.3, -0.175, 0.04) +            // эрүүний булан (чихний доор)
        -0.008 * bump(m, y, 0.55, 0.3, -0.262, 0.02) +           // эрүүний доод ирмэг: эрүүний яс тодорно
        -0.004 * bump(m, y, 0.98, 0.25, 0.05, 0.06)              // чамархай
      );
    };
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i), z = pos.getZ(i);
      const y = pos.getY(i), r = Math.hypot(x, z);
      if (r > 1e-5) { const a = Math.atan2(x, z);
        const kr = HEAD_SHAPE === 'block' ? 0 : HEAD_SHAPE === 'ball' ? bump(Math.abs(a), y, 0, 0.2, -0.055, 0.06) : 1;   // ball: зөвхөн хамар
        const k = (r + kr * relief(a, y)) / r; x *= k; z *= k; }
      const [sx2, sz2] = shapeHead(x, y, z);
      pos.setX(i, sx2);
      pos.setZ(i, sz2);
    }
    geo.computeVertexNormals();
    return geo;
  }
  /** Үс: толгойн ар, хажууг хучсан бүрхүүл. Доод хүрээ нь байгалийн үсний шугам: шилэн дээр нам, чихний дээгүүр нум болж өргөгдөөд,
   *  чихний өмнө санчиг болж бууна. Урд талдаа чамархайгаар дуусна (дух нүцгэн, малгайн доор). */
  /** Оройн үс: малгайгүй үед толгойн орой халзан харагдахгүй (малгайн доор бүрэн нуугдана) */
  function hairTopGeoFor() {
    // толгойн яг өөрийнх нь муруй профайлыг 2 см гадагш түлхэж авна — завсар, шовх оройгүй
    // хажуугийн үстэй яг ижил зузаантай (1.6 см) тул хоёр хэсэг нэг гадаргуу болж нийлнэ; доод ирмэг нь дух руу наалдана
    const up = profile(HEAD_PROFILES[HEAD_SHAPE], 56).filter((q) => q.y >= 0.15);
    const pts = [new THREE.Vector2(up[0].x + 0.003, up[0].y - 0.006)];
    for (const q of up) pts.push(new THREE.Vector2(q.x > 1e-4 ? q.x + 0.016 : 0, q.y + 0.016 * Math.min(1, (q.y - 0.15) / 0.09)));
    const geo = new THREE.LatheGeometry(pts, q(48, 12));
    if (HEAD_SHAPE !== 'block') geo.scale(1, 1, 0.95);
    return geo;
  }
  function hairGeoFor() {
    const HEADP = profile(HEAD_PROFILES[HEAD_SHAPE], 56).map((q) => [q.x, q.y]);   // толгойн яг муруй (завсар гарахгүй)
    const headR = (y) => {
      for (let n = 1; n < HEADP.length; n++) if (y <= HEADP[n][1]) {
        const [r0, y0] = HEADP[n - 1], [r1, y1] = HEADP[n];
        return y1 - y0 < 1e-6 ? r1 : r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
      }
      return 0;
    };
    const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const TEMPLE = 2.22;                                   // ар голоос чамархай хүртэлх өнцөг (рад)
    const lowY = (d) => {                                  // d = ар голоос хэмжсэн өнцөг: үсний доод хүрээний өндөр
      if (HEAD_SHAPE === 'block') return -0.165 + 0.02 * ss(0, 1.0, d) + 0.15 * ss(1.15, 2.15, d);   // чихгүй: ховилгүй, араас чамархай руу жигд өгссөн нэг шугам
      let y = -0.175 + 0.035 * Math.pow(Math.min(d, 1.2) / 1.2, 2);          // шил: голдоо хамгийн нам
      y += (0.035 + 0.14) * ss(1.18, 1.42, d);                                // чихний ард өгсөнө
      y -= 0.095 * ss(1.7, 1.9, d);                                           // чихний өмнө санчиг болж бууна
      y += 0.11 * ss(2.0, TEMPLE, d);                                        // санчгийн урд ирмэг чамархай руу өгсөнө
      return y;
    };
    const NU = q(56, 14), NV = q(12, 4), TOP = 0.152,   /* оройн үс 0.15-аас эхэлнэ — давхцаж гялтганахгүй */ pos = [], uv = [], idx = [];
    for (let a = 0; a <= NU; a++) {
      const d = -TEMPLE + (a / NU) * TEMPLE * 2, phi = Math.PI + d, lo = lowY(Math.abs(d));
      for (let b = 0; b <= NV; b++) {
        const y = lo + (TOP - lo) * (b / NV);
        const back = Math.max(0, -Math.cos(phi));                              // ар талдаа арай зузаан
        const r = headR(y) + 0.016 + 0.01 * back * ss(0.2, -0.1, y);
        const [hx, hz] = shapeHead(r * Math.sin(phi), y, r * Math.cos(phi));   // толгойтой ижил гавлын хэлбэр
        pos.push(hx, y, hz);
        uv.push(a / NU, b / NV);
      }
    }
    for (let a = 0; a < NU; a++) for (let b = 0; b < NV; b++) {
      const p0 = a * (NV + 1) + b, p1 = p0 + NV + 1;
      idx.push(p0, p1, p0 + 1, p1, p1 + 1, p0 + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  }
  /** Нүүрний хэсгийг толгойн олон өнцөгт гадаргуу дээр яг тааруулж, гадаргууг дагуулж эргүүлнэ */
  function placeOnFace(m) {
    const { x, r, lift } = m.userData.face;
    const step = (Math.PI * 2) / HEAD_N;
    const th = Math.asin(x / r);
    const rho = (r * Math.cos(Math.PI / HEAD_N)) / Math.cos(th - Math.round(th / step) * step);
    m.position.x = rho * Math.sin(th);
    m.position.z = rho * Math.cos(th) * 0.95 + lift;
    m.rotation.y = th;
  }

  /* ---------- Гөлгөр хувцасны туслахууд: олон хуваалттай, smooth shading ---------- */
  const mix = (a, b, k) => a + (b - a) * k;
  const SEG = 24;
  const sm = smoothMat;
  const dsCache = new Map();
  function dsm(color) {   // хоёр талаасаа харагдах гөлгөр материал (нээлттэй хавтас)
    let m = dsCache.get(color);
    if (!m) { m = new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide }); dsCache.set(color, m); }
    return m;
  }
  function gsm(color) {   // гөлгөр + vertex gradient
    const key = 'sm' + color;
    let m = gradCache.get(key);
    if (!m) { m = new THREE.MeshLambertMaterial({ color, vertexColors: true }); gradCache.set(key, m); }
    return m;
  }
  /** Эргэлтийн бие: ctrl = [[радиус, y], ...] доороос дээш. depthK = зузаан/өргөн (зууван огтлол) */
  function lathe(ctrl, depthK, material, x, y, z, parent, opt = {}) {
    const pts = ctrl.length < 3 ? ctrl.map(([r, yy]) => new THREE.Vector2(r, yy)) : profile(ctrl, q(opt.rows ?? 10, 4));
    if (opt.capBottom) pts.unshift(new THREE.Vector2(0, pts[0].y));
    const geo = new THREE.LatheGeometry(pts, q(opt.segs ?? SEG, 6), opt.phiStart ?? 0, opt.phiLength ?? Math.PI * 2);
    if (opt.grad) {
      geo.computeBoundingBox();
      const y0 = geo.boundingBox.min.y, h = geo.boundingBox.max.y - y0 || 1;
      const pos = geo.attributes.position, col = [];
      for (let i = 0; i < pos.count; i++) {
        const v = opt.grad[1] + (opt.grad[0] - opt.grad[1]) * ((pos.getY(i) - y0) / h);
        col.push(v, v, v);
      }
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    }
    if (opt.folds) {   // даавууны нугалаа: доошлох тусам радиус долгиолно
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i), pz = pos.getZ(i);
        const k = foldK(Math.atan2(px, pz), Math.min(1, Math.max(0, -pos.getY(i) / opt.folds)));
        pos.setX(i, px * k); pos.setZ(i, pz * k);
      }
      geo.computeVertexNormals();
    }
    const m = new THREE.Mesh(geo, material);
    m.position.set(x, y, z); m.scale.z = depthK; m.castShadow = true; parent.add(m);
    return m;
  }
  const foldK = (phi, t) => 1 + 0.045 * t * t * Math.sin(7 * phi + 1);
  function cyl(rTop, rBot, h, material, x, y, z, parent) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, q(16, 5)), material);
    m.position.set(x, y, z); m.castShadow = true; parent.add(m);
    return m;
  }
  function sball(r, material, x, y, z, parent) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, r < 0.035 ? q(8, 4) : q(16, 6), r < 0.035 ? q(6, 3) : q(12, 4)), material);
    m.position.set(x, y, z); m.castShadow = true; parent.add(m);
    return m;
  }

  /* ---------- Малгайн материал: эсгийн ширхэг, оройн алхан хээ (canvas-аар зурсан) ---------- */
  function canvasTex(w, h, draw, rx = 1, ry = 1) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    return t;
  }
  const feltTex = canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let n = 0; n < 2600; n++) {
      c.fillStyle = `rgba(${rnd() < 0.5 ? '90,80,60' : '255,255,255'},${0.05 + rnd() * 0.1})`;
      c.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
    }
  }, 5, 3);
  const meanderTex = canvasTex(512, 128, (c, w, h) => {
    c.fillStyle = '#1e1a18'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#7a7168'; c.lineWidth = 5; c.lineJoin = 'miter';
    for (const y of [12, h - 12]) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    for (let x = 0; x < w; x += 64) {     // алхан хээний нэг нүд
      c.beginPath();
      c.moveTo(x, 100); c.lineTo(x, 30); c.lineTo(x + 50, 30); c.lineTo(x + 50, 84);
      c.lineTo(x + 18, 84); c.lineTo(x + 18, 54); c.lineTo(x + 34, 54);
      c.moveTo(x, 100); c.lineTo(x + 64, 100);
      c.stroke();
    }
  }, 2, 1);
  // Нүүр: нүд, хөмсөг, ам, хацрын ягаан туяаг толгойн гадаргуу дээр зурна (canvas)
  const SKIN = '#e0b48a';
  /** st = { blink: 0..1 (аниагүй → аньсан), gaze: -1..1 (харц), mouth: 0..1 (ам ангайлт) } */
  /** Цилиндр толгойн энгийн нүүр: сүүдэр, хамар, уруулгүй — зөвхөн хавтгай зурсан нүд, хөмсөг, ам */
  function drawSimpleFace(c, W, H, st) {
    const cx = W / 2, yOf = (v) => (1 - v) * H;
    const yEye = yOf(0.54), yMouth = yOf(0.4), INK = '#22160f';
    const o = Math.max(0.08, Math.min(1.25, st.emo.eye) * (1 - 0.94 * st.blink));
    for (const sx of [-1, 1]) {
      const ex = cx + sx * 92 + st.gaze * 10;
      c.fillStyle = INK;                                              // нүд: босоо зууван, анивчихад хавтгайрна
      c.beginPath(); c.ellipse(ex, yEye, 21, 31 * o, 0, 0, Math.PI * 2); c.fill();
      c.save();                                                       // хөмсөг: богино зураас
      c.translate(cx + sx * 96, yEye - 66 + st.emo.lift * 0.8); c.scale(sx, 1); c.rotate(-st.emo.tilt * 1.2);
      c.strokeStyle = INK; c.lineWidth = 13; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-34, 3); c.quadraticCurveTo(0, -7, 36, 2); c.stroke();
      c.restore();
    }
    const w = 78, k = st.emo.smile * 30, open = Math.min(1, st.mouth + st.emo.open) * 46;   // ам
    c.save(); c.translate(cx, yMouth);
    if (open > 4) {
      c.beginPath(); c.moveTo(-w, -k * 0.5); c.quadraticCurveTo(0, k * 0.4, w, -k * 0.5); c.quadraticCurveTo(0, k + open * 2, -w, -k * 0.5); c.closePath();
      c.fillStyle = '#3a1512'; c.fill(); c.save(); c.clip();
      c.fillStyle = '#b5584f'; c.beginPath(); c.ellipse(0, k * 0.5 + open * 0.95, 40, 20, 0, 0, Math.PI * 2); c.fill();
      c.restore();
    }
    c.strokeStyle = INK; c.lineWidth = 11; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-w, -k * 0.5); c.quadraticCurveTo(0, k * (open > 4 ? 0.4 : 1), w, -k * 0.5); c.stroke();
    c.restore();
  }
  function drawFace(c, W, H, st) {
    c.fillStyle = SKIN; c.fillRect(0, 0, W, H);
    if (HEAD_SHAPE === 'block') return drawSimpleFace(c, W, H, st);
    const cx = W / 2, yOf = (v) => (1 - v) * H;
    const yEye = yOf(0.557), yBrow = yOf(0.612), yMouth = yOf(0.375), yCheek = yOf(0.45), yNose = yOf(0.468);
    // Зөөлөн сүүдэр: нүдний хонхор, хамрын хажуу, хамрын доор, эрүүний доор — нүүрт гүн өгнө
    const soft = (x, y, rx, ry, a) => {
      c.save(); c.translate(x, y); c.scale(1, ry / rx);
      const gr = c.createRadialGradient(0, 0, 0, 0, 0, rx);
      gr.addColorStop(0, `rgba(150,88,58,${a})`); gr.addColorStop(1, 'rgba(150,88,58,0)');
      c.fillStyle = gr; c.fillRect(-rx, -rx, rx * 2, rx * 2);
      c.restore();
    };
    for (const sx of [-1, 1]) {
      soft(cx + sx * 112, yEye - 14, 95, 58, 0.12);        // нүдний хонхор
      soft(cx + sx * 34, yNose - 40, 30, 80, 0.08);         // хамрын хажуу
      c.strokeStyle = 'rgba(120,66,44,0.55)'; c.lineWidth = 4; c.lineCap = 'round';   // хамрын угалз
      c.beginPath(); c.arc(cx + sx * 26, yNose + 6, 13, sx > 0 ? -0.9 : Math.PI - 1.5, sx > 0 ? 1.5 : Math.PI + 0.9); c.stroke();
    }
    soft(cx, yNose + 30, 46, 16, 0.14);                     // хамрын доорх сүүдэр
    soft(cx, yMouth + 52, 60, 20, 0.22);
    for (const sx of [-1, 1]) soft(cx + sx * 215, yMouth + 10, 70, 120, 0.2);   // шанаа, эрүүний хажуугийн сүүдэр                   // доод уруулын доор
    for (const sx of [-1, 1]) {
      // хацрын туяа
      const gx = cx + sx * 190, gr = c.createRadialGradient(gx, yCheek, 4, gx, yCheek, 92);
      gr.addColorStop(0, 'rgba(176,96,66,0.2)'); gr.addColorStop(1, 'rgba(176,96,66,0)');   // салхинд борлосон хацар (ягаан туяа биш)
      c.fillStyle = gr; c.fillRect(gx - 95, yCheek - 110, 190, 220);
      // нүд: бүйлс хэлбэр; o = нээлт (сэтгэл хөдлөл × анивчилт). Шугамын зузаан нээлтээс хамаарахгүй
      c.save();
      c.translate(cx + sx * 114, yEye); c.scale(sx * 1.8, 1.17 * 1.8); c.rotate(-0.05);
      const o = st.emo.eye * (1 - 0.94 * st.blink);
      const upY = 4 - 29 * o, loY = 4 + 9 * o, gz = sx * st.gaze * 8;
      if (o > 0.14) {
        c.beginPath(); c.moveTo(-40, 4); c.quadraticCurveTo(-6, upY, 40, -2); c.quadraticCurveTo(4, loY, -40, 4); c.closePath();
        const wg = c.createLinearGradient(0, -12, 0, 8);
        wg.addColorStop(0, '#d9cfc4'); wg.addColorStop(0.45, '#f7f1e9'); wg.addColorStop(1, '#efe6dc');   // дээд зовхины сүүдэртэй цагаан
        c.fillStyle = wg; c.fill();
        c.save(); c.clip();
        const ig = c.createRadialGradient(2 + gz, -1, 2, 2 + gz, -1, 15);
        ig.addColorStop(0, '#5a3a22'); ig.addColorStop(0.75, '#3a2414'); ig.addColorStop(1, '#1c110a');   // цөцгий: захаараа бараан
        c.fillStyle = ig; c.beginPath(); c.arc(2 + gz, -1, 15, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#0c0705'; c.beginPath(); c.arc(2 + gz, -1, 7, 0, Math.PI * 2); c.fill();           // хүүхэн хараа
        c.fillStyle = 'rgba(255,255,255,0.95)'; c.beginPath(); c.arc(-3 + gz, -6.5, 3.4, 0, Math.PI * 2); c.fill();   // гялбаа
        c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.arc(7 + gz, 3, 1.8, 0, Math.PI * 2); c.fill();
        c.restore();
        c.strokeStyle = 'rgba(110,70,50,0.5)'; c.lineWidth = 1.6; c.lineCap = 'round';                   // доод зовхи
        c.beginPath(); c.moveTo(-34, 5.5); c.quadraticCurveTo(4, loY + 2, 40, -1); c.stroke();
        c.strokeStyle = 'rgba(120,76,54,0.4)'; c.lineWidth = 1.6;                                         // зовхины нугалаа
        c.beginPath(); c.moveTo(-36, -2); c.quadraticCurveTo(-4, upY - 7, 42, -8); c.stroke();
      }
      c.strokeStyle = '#1a110b'; c.lineWidth = 3.4; c.lineCap = 'round';                                  // дээд зовхи (аньсан үед зөвхөн энэ нум үлдэнэ)
      c.beginPath(); c.moveTo(-42, 5); c.quadraticCurveTo(-6, upY - 1.5, 43, -3.5); c.stroke();
      c.lineWidth = 2.4; c.beginPath(); c.moveTo(40, -3); c.lineTo(47, -6.5); c.stroke();                // гадна үзүүр
      c.restore();
      // хөмсөг: дотроо бүдүүн, гадагшаа нарийсна
      c.save();
      c.translate(cx + sx * 112, yBrow + 8 + st.emo.lift); c.scale(sx * 1.38, 1.17 * 1.3); c.rotate(-st.emo.tilt);   // tilt > 0: дотор үзүүр доошоо (уур)
      c.fillStyle = '#2a1e16';
      c.beginPath(); c.moveTo(-48, 2); c.quadraticCurveTo(-6, -12, 52, -2); c.lineTo(50, 8); c.quadraticCurveTo(-4, 4, -46, 20); c.closePath(); c.fill();   // өтгөн, шулуун
      c.restore();
    }
    // ам: дээд уруул (хоёр товгортой), доод уруул, ангайхад шүд, хэл; булан нь сэтгэл хөдлөлөөр өргөгдөж унжина
    c.save();
    c.translate(cx, yMouth); c.scale(1.55, 1.17 * 1.35);
    const w = 44;
    const open = Math.min(1, st.mouth + st.emo.open) * 11;       // ам ангайх хэмжээ
    const k = st.emo.smile * 9;                                   // > 0: булан дээшээ, < 0: доошоо
    const T = k + 1 + open * 2;                                   // доод уруулын дээд ирмэг
    if (open > 0.6) {
      c.save();
      c.beginPath(); c.moveTo(-w + 3, -k); c.quadraticCurveTo(0, k + 1, w - 3, -k); c.quadraticCurveTo(0, T, -w + 3, -k); c.closePath();
      c.fillStyle = '#34110f'; c.fill(); c.clip();
      c.fillStyle = '#f2eadf'; c.fillRect(-w, -20, w * 2, 25.5);                                             // дээд шүд
      c.fillStyle = '#a34d47'; c.beginPath(); c.ellipse(0, T / 2 + 9, 24, 8, 0, 0, Math.PI * 2); c.fill();   // хэл
      c.restore();
    }
    c.fillStyle = '#b98468';                                       // доод уруул
    c.beginPath(); c.moveTo(-w + 4, -k); c.quadraticCurveTo(0, T, w - 4, -k); c.quadraticCurveTo(0, T + 21, -w + 4, -k); c.closePath(); c.fill();
    c.fillStyle = 'rgba(255,236,216,0.22)'; c.beginPath(); c.ellipse(0, T / 2 + 5 - k * 0.15, 15, 3, 0, 0, Math.PI * 2); c.fill();   // гялбаа
    c.fillStyle = '#a6705a';                                       // дээд уруул
    c.beginPath(); c.moveTo(-w, -k);
    c.quadraticCurveTo(-w * 0.45, -9 - k * 0.25, -6, -6.5 + k * 0.5); c.quadraticCurveTo(0, -3.5 + k * 0.5, 6, -6.5 + k * 0.5);
    c.quadraticCurveTo(w * 0.45, -9 - k * 0.25, w, -k); c.quadraticCurveTo(0, k + 2, -w, -k); c.closePath(); c.fill();
    c.strokeStyle = '#532c22'; c.lineWidth = 2.6; c.lineCap = 'round';                                       // уруулын завсрын шугам
    c.beginPath(); c.moveTo(-w - 1, -k); c.quadraticCurveTo(0, k + 1.5, w + 1, -k); c.stroke();
    c.strokeStyle = 'rgba(110,62,44,0.55)'; c.lineWidth = 2.2;                                               // амны булангийн хонхор
    for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * (w + 3), -k - 4 - k * 0.3); c.quadraticCurveTo(sx * (w + 6), -k, sx * (w + 2), -k + 4); c.stroke(); }
    c.restore();
  }
  /** Сэтгэл хөдлөл: хөмсөгний налуу/өндөр, нүдний нээлт, амны булан, ам ангайлт */
  const EMOTIONS = {
    neutral: { tilt: 0, lift: 0, eye: 1, smile: 0.15, open: 0 },
    happy: { tilt: -0.08, lift: -8, eye: 0.7, smile: 1, open: 0.25 },
    angry: { tilt: 0.32, lift: 10, eye: 0.8, smile: -0.6, open: 0 },
    sad: { tilt: -0.3, lift: -4, eye: 0.85, smile: -0.85, open: 0 },
    surprised: { tilt: -0.05, lift: -26, eye: 1.35, smile: 0, open: 0.7 },
  };
  const faceCv = document.createElement('canvas');
  faceCv.width = 512; faceCv.height = 256;   // тоглоомд: 2048×1024-ийг кадр бүр GPU руу хуулах нь гацаалт үүсгэдэг тул 4 дахин жижиг (зураг 0.25-аар жижгэрнэ)
  const faceCtx = faceCv.getContext('2d');
  const faceTex = new THREE.CanvasTexture(faceCv);
  faceTex.colorSpace = THREE.SRGBColorSpace;
  faceTex.wrapS = faceTex.wrapT = THREE.RepeatWrapping;
  faceTex.anisotropy = 8;
  let faceKey = '';
  /** Нүүрийг дахин зурна — зөвхөн төлөв өөрчлөгдсөн үед (анивчих, харц, ам) */
  function paintFace(st) {
    const e = st.emo;
    const key = [st.blink * 4, st.gaze * 3, st.mouth * 6, e.tilt * 40, e.lift, e.eye * 20, e.smile * 12, e.open * 10].map(Math.round).join('|');
    if (key === faceKey) return;
    faceKey = key;
    faceCtx.setTransform(0.25, 0, 0, 0.25, 0, 0);
    drawFace(faceCtx, 2048, 1024, st);
    faceTex.needsUpdate = true;
  }
  paintFace({ blink: 0, gaze: 0, mouth: 0, emo: EMOTIONS.neutral });
  const setFaceOffset = () => { faceTex.offset.x = 1 / (2 * headSeg(HEAD_N)); };   // зургийн төв нүүрний урд талд
  const faceMats = {
    smooth: new THREE.MeshLambertMaterial({ color: 0xffffff, map: faceTex }),
    flat: new THREE.MeshLambertMaterial({ color: 0xffffff, map: faceTex, flatShading: true }),
  };

  // Торгон дээлийн өнгө дотроо хээ (дугуй хээ): өнгийг үржүүлдэг тул ямар ч өнгийн дээлд тохирно
  const drawBrocade = (c, w, h) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
    const medal = (cx, cy) => {
      c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineWidth = 5;
      for (const r of [42, 24]) { c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke(); }
      for (let q = 0; q < 4; q++) {
        const a = (q * Math.PI) / 2;
        c.beginPath(); c.arc(cx + Math.cos(a) * 33, cy + Math.sin(a) * 33, 7, 0, Math.PI * 2); c.stroke();
      }
      c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.arc(cx, cy, 8, 0, Math.PI * 2); c.fill();
    };
    medal(64, 64); medal(192, 192);
    c.fillStyle = 'rgba(0,0,0,0.14)';
    for (const [dx, dy] of [[192, 64], [64, 192]]) { c.beginPath(); c.arc(dx, dy, 9, 0, Math.PI * 2); c.fill(); }
  };
  const brocadeTex = canvasTex(256, 256, drawBrocade, 4, 2);
  const brocadeSleeveTex = canvasTex(256, 256, drawBrocade, 2, 1);
  function fab(color) {   // хээтэй + gradient-тэй дээлийн материал
    const key = 'fab' + color;
    let m = gradCache.get(key);
    if (!m) { m = new THREE.MeshLambertMaterial({ color, vertexColors: true, map: brocadeTex }); gradCache.set(key, m); }
    return m;
  }
  const makeFurTex = (base) => canvasTex(128, 128, (c, w, h) => {      // үс: богино ширхэгүүд
    c.fillStyle = base; c.fillRect(0, 0, w, h);
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let n = 0; n < 900; n++) {
      const x = rnd() * w, y = rnd() * h, v = rnd();
      c.strokeStyle = v < 0.5 ? `rgba(30,20,14,${0.3 + rnd() * 0.35})` : `rgba(255,245,230,${0.25 + rnd() * 0.35})`;
      c.lineWidth = 1 + rnd() * 1.5;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + (rnd() - 0.5) * 6, y + 5 + rnd() * 8); c.stroke();
    }
  }, 2, 2);
  const vestMat = new THREE.MeshLambertMaterial({ color: 0x8a5a36, map: feltTex, side: THREE.DoubleSide });       // хантааз: хүрэн ноосон даавуу
  const fleeceMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: makeFurTex('#e9dfcc'), side: THREE.DoubleSide });   // дотор тал: хонины арьсан доторлогоо
  const furMat = new THREE.MeshLambertMaterial({ color: 0x7a5c46, map: makeFurTex('#9a8676') });                  // хар хүрэн үс
  const darkFurMat = new THREE.MeshLambertMaterial({ color: 0x8a6a56, map: makeFurTex('#8a7466') });                // булга: бараан хүрэн үс (өвлийн малгай)
  const hatSilkMat = new THREE.MeshLambertMaterial({ color: 0xb0302f, map: brocadeTex });                           // малгайн оройн хээтэй улаан торго
  const hatTopTex = canvasTex(256, 256, drawBrocade, 5, 5);
  const hatTopMat = new THREE.MeshLambertMaterial({ color: 0xc0392f, map: hatTopTex });                             // малгайн хавтгай оройн хээтэй торго
  const creamFurMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: makeFurTex('#eadfcd') });             // цайвар үс (дээлийн хормой, ханцуй)
  const whiteFurMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: makeFurTex('#f6f2ea') });             // цагаан үс (хантаазны энгэр, хүрээ, зах)
  /** Сэвсгэр үс: шугамын дагуу хэмжээ, байрлал нь бага зэрэг санамсаргүй бөмбөлгүүдийг давхарлана (нэг InstancedMesh — хямд) */
  const FLUFF_GEO = new THREE.SphereGeometry(1, 8, 6);
  function fluff(points, r, material, parent, seed = 3) {
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const pts = [];
    for (let n = 1; n < points.length; n++) {                 // алхмыг r·0.6 болгож нягтруулна
      const a = points[n - 1], b = points[n], steps = Math.max(1, Math.ceil(a.distanceTo(b) / (r * 0.5)));
      for (let q = 0; q < steps; q++) pts.push(a.clone().lerp(b, q / steps));
    }
    pts.push(points[points.length - 1]);
    const m = new THREE.InstancedMesh(FLUFF_GEO, material, pts.length);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3();
    pts.forEach((pt, n) => {
      const k = r * (0.88 + rnd() * 0.28);
      S.set(k * (0.9 + rnd() * 0.25), k * (0.9 + rnd() * 0.25), k * (0.9 + rnd() * 0.25));
      Q.setFromEuler(new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6));
      M.compose(new THREE.Vector3(pt.x + (rnd() - 0.5) * r * 0.35, pt.y + (rnd() - 0.5) * r * 0.35, pt.z + (rnd() - 0.5) * r * 0.35), Q, S);
      m.setMatrixAt(n, M);
    });
    m.castShadow = true;
    m.userData.noOutline = true;
    parent.add(m);
    return m;
  }
  const ring = (cx, cy, cz, rad, axis, n = 28, a0 = 0, a1 = Math.PI * 2) => Array.from({ length: n + 1 }, (_, q) => {
    const a = a0 + ((a1 - a0) * q) / n, c = Math.cos(a) * rad, d = Math.sin(a) * rad;
    return axis === 'x' ? new THREE.Vector3(cx, cy + c, cz + d) : new THREE.Vector3(cx + d, cy, cz + c);
  });
  /* ---------- Гутал ---------- */
  // Гутлын өнгөний найруулга: бараан хүрэн-хар савхин түрий, дулаан шаргал зулаг, цөцгий ул;
  // чимэглэл нь хоёрхон өнгө — оюу (гол хээ, хөвөө) ба алтлаг (хүрээ, тодотгол). Алтлаг нь дээлийн бүс, хөвөөтэй холбоно
  const BOOT = { shaft: 0x241b17, tan: 0xc98a3f, sole: 0xf0e8d6, teal: 0x35b89e, gold: 0xe0a93a };
  /** Дугуй өлзий хээ: алтлаг гадна хүрээ, оюу дотор хүрээ, дундаа оюу сүлжээ зангилаа */
  function drawKnot(c, cx, cy, R) {
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.strokeStyle = '#e0a93a'; c.lineWidth = R * 0.09;
    c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = '#3fd0b2'; c.lineWidth = R * 0.1;
    c.beginPath(); c.arc(cx, cy, R * 0.8, 0, Math.PI * 2); c.stroke();
    const q = R * 0.19;
    c.lineWidth = R * 0.085;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {            // дөрвөн гогцоо
      c.beginPath(); c.arc(cx + dx * q * 1.55, cy + dy * q * 1.55, q, 0, Math.PI * 2); c.stroke();
    }
    c.strokeRect(cx - q * 1.55, cy - q * 1.55, q * 3.1, q * 3.1);            // гогцоонуудыг холбосон дөрвөлжин
    c.save(); c.translate(cx, cy); c.rotate(Math.PI / 4); c.strokeRect(-q * 1.2, -q * 1.2, q * 2.4, q * 2.4); c.restore();
    c.fillStyle = '#e0a93a'; c.beginPath(); c.arc(cx, cy, R * 0.07, 0, Math.PI * 2); c.fill();   // голын алтлаг цэг
  }
  const bootShaftMat = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    map: canvasTex(512, 256, (c, w, h) => {
      c.fillStyle = '#241b17'; c.fillRect(0, 0, w, h);
      for (const cx of [w * 0.25, w * 0.75]) drawKnot(c, cx, h * 0.6, 52);    // хоёр хажууд том өлзий
      for (const cx of [0, w * 0.5, w]) {                                      // урд, ард: жижиг алтлаг-оюу эвэр угалз
        c.strokeStyle = '#3fd0b2'; c.lineWidth = 5; c.lineCap = 'round';
        for (const sgn of [-1, 1]) { c.beginPath(); c.arc(cx + sgn * 14, h * 0.6, 12, 0, Math.PI * 2); c.stroke(); }
        c.fillStyle = '#e0a93a'; c.beginPath(); c.arc(cx, h * 0.6 - 22, 5, 0, Math.PI * 2); c.fill();
      }
      c.strokeStyle = '#e0a93a'; c.lineWidth = 5;                              // доод ирмэг: алтлаг шугам, дээр нь оюу шугам
      c.beginPath(); c.moveTo(0, h - 30); c.lineTo(w, h - 30); c.stroke();
      c.strokeStyle = '#3fd0b2'; c.lineWidth = 7;
      c.beginPath(); c.moveTo(0, h - 17); c.lineTo(w, h - 17); c.stroke();
    }),
  });
  /** Нурууны шугамын дагуу зууван огтлолуудыг холбосон бие (гутлын зулаг, ул). st = [[z, y, rx, ry], ...]. Геометр төвдөө байрлана */
  function loft(st, material, parent, shape = [2, 2], segs = 20) {
    segs = q(segs, 8);   // shape = [дээд, доод] хэлбэрийн зэрэг: 2 = зууван, их байх тусам дөрвөлжин
    {   // огтлолуудын хооронд муруйгаар нягтруулна — хошуу, өсгий талтай биш, жигд муруй болно
      const c1 = new THREE.CatmullRomCurve3(st.map(([z, y, rx]) => new THREE.Vector3(z, y, rx)), false, 'catmullrom', 0.5);
      const c2 = new THREE.CatmullRomCurve3(st.map(([, , , ry]) => new THREE.Vector3(ry, 0, 0)), false, 'catmullrom', 0.5);
      const n = (st.length - 1) * 4;
      st = Array.from({ length: n + 1 }, (_, q) => {
        const a1 = c1.getPoint(q / n), a2 = c2.getPoint(q / n);
        return [a1.x, a1.y, Math.max(0.002, a1.z), Math.max(0.002, a2.x)];
      });
    }
    const cz = (st[0][0] + st[st.length - 1][0]) / 2, cy = st[Math.floor(st.length / 2)][1];
    const pos = [], idx = [];
    st.forEach(([z, y, rx, ry], i) => {
      const a = st[Math.max(0, i - 1)], b = st[Math.min(st.length - 1, i + 1)];
      let tz = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tz, ty) || 1; tz /= tl; ty /= tl;
      for (let q = 0; q < segs; q++) {                       // огтлол нурууны шугамд перпендикуляр
        const ang = (q / segs) * Math.PI * 2, cs = Math.cos(ang), sn = Math.sin(ang), e = 2 / (sn >= 0 ? shape[0] : shape[1]);
        const u = Math.sign(cs) * Math.pow(Math.abs(cs), e) * rx, v = Math.sign(sn) * Math.pow(Math.abs(sn), e) * ry;
        pos.push(u, y - cy + v * tz, z - cz - v * ty);
      }
    });
    for (let i = 0; i < st.length - 1; i++) for (let q = 0; q < segs; q++) {
      const a = i * segs + q, b = i * segs + ((q + 1) % segs), c2 = a + segs, d = b + segs;
      idx.push(a, b, c2, b, d, c2);   // гадагш харсан тал
    }
    // Хоёр үзүүрийг таглана (нүх үлдээхгүй)
    const n0 = pos.length / 3, last = (st.length - 1) * segs;
    pos.push(0, st[0][1] - cy, st[0][0] - cz, 0, st[st.length - 1][1] - cy, st[st.length - 1][0] - cz);
    for (let q = 0; q < segs; q++) {
      idx.push(n0, (q + 1) % segs, q);
      idx.push(n0 + 1, last + q, last + ((q + 1) % segs));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, material);
    m.position.set(0, cy, cz);
    m.castShadow = true;
    parent.add(m);
    return m;
  }
  const hairMat = new THREE.MeshLambertMaterial({
    color: 0xffffff, side: THREE.DoubleSide,
    map: canvasTex(256, 128, (c, w, h) => {        // үсний ширхэг: хар хүрэн дэвсгэр дээр босоо нарийн судал
      c.fillStyle = '#44332a'; c.fillRect(0, 0, w, h);
      let seed = 23;
      const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      for (let n = 0; n < 420; n++) {
        const x = rnd() * w;
        c.strokeStyle = rnd() < 0.5 ? `rgba(12,8,6,${0.35 + rnd() * 0.4})` : `rgba(132,100,76,${0.25 + rnd() * 0.35})`;
        c.lineWidth = 0.8 + rnd() * 1.4;
        c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + (rnd() - 0.5) * 8, h * 0.33, x + (rnd() - 0.5) * 8, h * 0.66, x + (rnd() - 0.5) * 6, h); c.stroke();
      }
    }, 3, 1),
  });
  const feltMat = new THREE.MeshLambertMaterial({ color: 0xece4d0, map: feltTex });
  const feltMat2 = new THREE.MeshLambertMaterial({ color: 0xece4d0, map: feltTex, side: THREE.DoubleSide });
  const capMat = new THREE.MeshLambertMaterial({ color: 0xffffff, map: meanderTex });

  /* ===================== makeHerder v3 ===================== */
  function makeHerder(colors) {
    const noOut = (m) => { m.userData.noOutline = true; return m; };
    const tube = (pts, rad, material, parent, tension = 0.5) => {
      const m = noOut(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', tension), q(64, 12), rad, q(6, 4)), material));
      parent.add(m);
      return m;
    };
    const { deel, hem, hat } = colors;
    const o = outfits;
    const g = new THREE.Group();
    const skin = 0xe0b48a, legC = 0x2b1d14, bootC = 0x4a2c18, sash = 0xe0b030;

    const sack = meshBox(0.5, 0.6, 0.3, 0xb89a6a, 0, 1.35, -0.42, g);
    sack.name = 'sack'; sack.visible = false;

    // Хөл: гөлгөр гуя, шилбэ; Монгол гутал — түрий, ул, ээтэн хошуу
    const knees = [];
    const makeLeg = (x) => {
      const p = new THREE.Group();
      p.position.set(x, 0.85, 0);
      cyl(0.13, 0.12, 0.33, sm(legC), 0, -0.165, 0, p);                        // гуя
      const knee = new THREE.Group();                                          // өвдөг
      knee.position.y = -0.31;
      p.add(knee);
      sball(0.122, sm(legC), 0, 0, 0, knee);
      cyl(0.12, 0.11, 0.31, sm(legC), 0, -0.155, 0, knee);                     // шилбэ
      // Монгол гутал: өргөн хар түрий (хажуудаа оюу өлзий хээтэй), амсраараа шаргал эмжээртэй; намхан шаргал савхин зулаг,
      // ул нь бараг төгсгөл хүртэл тэгш яваад хоншоор нь огцом дээш, бага зэрэг хойшоо ээтийнэ; цагаан ул, оюу хөвөө
      lathe([[0.124, -0.185], [0.132, 0.0], [0.15, 0.175]], 1.16, bootShaftMat, 0, -0.245, 0, knee);                 // түрий (-0.43 … -0.07)
      lathe([[0.15, -0.03], [0.154, 0.03]], 1.16, sm(BOOT.tan), 0, -0.1, 0, knee);                                   // амсрын шаргал эмжээр
      noOut(lathe([[0.1, -0.006], [0.152, 0.0]], 1.16, dsm(BOOT.shaft), 0, -0.073, 0, knee));                        // амсрын таг: дээрээс харахад хөндий харагдахгүй
      noOut(lathe([[0.155, -0.012], [0.156, 0.012]], 1.16, sm(BOOT.shaft), 0, -0.1, 0, knee));                       // эмжээрийн дундах хар зурвас
      noOut(lathe([[0.152, -0.005], [0.153, 0.005]], 1.16, sm(BOOT.gold), 0, -0.137, 0, knee));                      // алтлаг хөвөө
      const FB = -0.5175;                                 // зулгийн ёроол (доор нь хөвөө + 1.6 см ул)
      const FOOT = [   // [z, ёроолын өндөр, хагас өргөн, хагас өндөр]
        [-0.147, FB, 0.02, 0.058], [-0.141, FB, 0.04, 0.06], [-0.126, FB, 0.068, 0.061], [-0.1, FB, 0.094, 0.062], [-0.06, FB, 0.117, 0.062],   // өсгий: түрийний ар талтай яг тэгш, бүтэн өндөртэй эгц хана (түрийтэй ижил дугуйралттай)
        [0, FB, 0.127, 0.062], [0.08, FB, 0.127, 0.06], [0.13, FB, 0.122, 0.054],
        [0.185, FB, 0.108, 0.048], [0.24, FB + 0.004, 0.086, 0.042], [0.283, FB + 0.02, 0.06, 0.035],                                               // урд хэсэг: ул тэгш хэвээр
        [0.31, FB + 0.056, 0.036, 0.026], [0.317, FB + 0.098, 0.02, 0.017], [0.309, FB + 0.126, 0.009, 0.009],                                      // хоншоор: огцом дээш, хойшоо ээтийнэ
      ].map(([z, bot, rx, ry]) => [z, bot + ry, rx, ry]);
      // Өсгий: зулгийг ар тал руу нь нарийсгаж дуусгахгүй (тэгвэл араас харахад босоо хонхор, ирмэг гардаг) —
      // түрийтэй ижил дугуй огтлолтой шаргал савхин аяга (lathe) болгож, зулгийн урд хэсэг түүнээс урагш гарна
      noOut(lathe([[0.1275, -0.062], [0.1295, -0.01], [0.1285, 0.04], [0.121, 0.062]], 1.16, sm(BOOT.tan), 0, FB + 0.062, 0, knee, { rows: 8 }));
      noOut(lathe([[0.14, -0.07], [0.142, -0.01], [0.141, 0.045], [0.128, 0.074]], 1.16, OUTLINE, 0, FB + 0.062, 0, knee, { rows: 8 }));   // өсгийн хар хүрээ
      noOut(loft(FOOT.slice(5), sm(BOOT.tan), knee, [2, 5]));   // өсгийн аяган дотроос эхэлнэ — заадал харагдахгүй
      noOut(lathe([[0.128, -0.005], [0.128, 0.005]], 1.16, sm(BOOT.teal), 0, FB + 0.119, 0, knee));                  // түрий-зулгийн заадлын оюу хөвөө
      // Зулгийн хажуугийн хар хээтэй дэвсгэр: доод хагасыг тойрсон хар зурвас, дээд ирмэгээрээ оюу хөвөөтэй
      const panel = (grow, hk) => [[-0.01, -0.012], [0.01, grow], [0.07, grow], [0.13, grow], [0.15, -0.012]].map(([z, gr]) => {
        const a = FOOT.findIndex((f) => f[0] >= z), f0 = FOOT[Math.max(0, a - 1)], f1 = FOOT[a], t = (z - f0[0]) / (f1[0] - f0[0]);
        const rx = f0[2] + (f1[2] - f0[2]) * t, ry = f0[3] + (f1[3] - f0[3]) * t, yc = f0[1] + (f1[1] - f0[1]) * t;
        return [z, yc - ry * (1 - hk) + 0.002, rx + gr, ry * hk];
      });
      noOut(loft(panel(0.0035, 0.6), sm(BOOT.gold), knee, [6, 5]));   // дэвсгэрийн алтлаг хөвөө
      noOut(loft(panel(0.005, 0.52), sm(BOOT.shaft), knee, [6, 5]));
      // Зулаг → оюу хөвөө → цагаан ул: ижил хүрээтэй, шат шатаар бага зэрэг өргөсөж нягт давхарлана
      const WELT = FOOT.map(([z, y, rx, ry]) => [z * 1.012, y - ry - 0.002, rx + 0.004, 0.0045]);
      const SOLE = FOOT.map(([z, y, rx, ry]) => [z * 1.024, y - ry - 0.0135, rx + 0.008, 0.008]);
      noOut(loft(WELT, sm(BOOT.teal), knee, [6, 6]));
      noOut(loft(SOLE, sm(BOOT.sole), knee, [6, 6]));
      noOut(loft(SOLE.map(([z, y, rx]) => [z * 1.002, y - 0.0055, rx + 0.0012, 0.0028]), sm(BOOT.shaft), knee, [6, 6]));   // улны доод бараан ирмэг
      // Хар хүрээ: огтлолыг жигд зузаатгаж гаргана
      const hull = FOOT.map(([z, y, rx, ry], n) => [z + (n < 3 ? -0.008 : n === FOOT.length - 1 ? 0.004 : 0), y - 0.008, rx + 0.012, ry + 0.012]);
      noOut(loft(hull.slice(5).map((h0, n) => (n === 0 ? [h0[0], h0[1], h0[2] - 0.03, h0[3] - 0.02] : h0)), OUTLINE, knee, [2, 5]));
      // Хоншоорын зүйдэл: зулгийн нурууг дагасан оюу хөвөө, түрийн урдаас хоншоорын үзүүр хүртэл
      tube(FOOT.slice(7, 12).map(([z, y, rx, ry]) => new THREE.Vector3(0, y + ry - 0.001, z)), 0.0045, sm(BOOT.teal), knee);   // үзүүрээс өмнө дуусна — хоншоороос илүү гарахгүй
      g.add(p);
      knees.push(knee);
      return p;
    };
    const legs = [makeLeg(-0.15), makeLeg(0.15)];

    // Бие: улирлын 3 хувилбар. k = зузаан, skirtH = хормойн урт, trim = хормойн эмжээрийн өнгө
    const bodies = [];
    const CHEST = [[0.225, -0.45], [0.24, -0.36], [0.25, -0.3], [0.293, -0.245], [0.3, -0.1],   // доод хэсэг нь бүсний дотуур шургасан — бөхийхөд зай гарахгүй
      [0.318, 0.08], [0.335, 0.18], [0.315, 0.255], [0.2, 0.3], [0.135, 0.315]];   // бүсний дээр даавуу сул унжиж товойно; мөр налуу
    const chestR = (yRel) => {   // цээжний радиус тухайн өндөрт (шугаман интерполяц)
      for (let n = 1; n < CHEST.length; n++) {
        const [r0, y0] = CHEST[n - 1], [r1, y1] = CHEST[n];
        if (yRel <= y1) return r0 + ((r1 - r0) * Math.max(0, yRel - y0)) / (y1 - y0);
      }
      return CHEST[CHEST.length - 1][0];
    };
    const body = (name, c, hc, trim, k, skirtH, fur) => {
      const b = new THREE.Group();
      b.name = 'body:' + name;
      const u = new THREE.Group();            // бэлхүүсээс дээшхи хэсэг — бэлхүүсээр эргэнэ
      u.name = 'body:' + name;
      lathe(CHEST.map(([r, y]) => [r * k, y]), 0.62, fab(c), 0, 1.42, 0, u, { grad: [1, 0.84], rows: 16 });   // цээж: торгон хээтэй, бүсний дээр сул товойсон
      const onChest = (px, py, lift) => {
        const r = chestR(py - 1.42) * k;
        return new THREE.Vector3(px, py, Math.sqrt(Math.max(0.0004, r * r - px * px)) * 0.62 + lift);
      };
      // Энгэр (дөрвөлжин): захнаас хэвтээ чигтээ мөр рүү гарч, булан эргээд суга, хажуугаар бүс хүртэл бууна. Гурван эгнээ нарийн хөвөө
      const LAPEL = [[0, 1.692], [-0.05, 1.672], [-0.12, 1.662], [-0.19 * k, 1.656], [-0.222 * k, 1.635], [-0.232 * k, 1.58], [-0.24 * k, 1.5], [-0.262 * k, 1.42], [-0.27 * k, 1.3]];
      // ↑ захны ёроолоос эхэлж бараг хэвтээ чигтээ мөрний урд хүртэл явна → бөөрөнхий өнцөг → богино босоо → суга руу орж алга болно
      const silver = sm(0xd9d4c8);
      const edgeM = sm(darken(c, 0.4));                                // эмжээр: дээлийн өнгөний бараан тон — тод ялгарна
      tube(LAPEL.map(([px, py]) => onChest(px, py, 0.001)), 0.016, edgeM, u, 0.12).scale.set(1, 1, 1);          // өргөн бараан эмжээр
      tube(LAPEL.map(([px, py]) => onChest(px + 0.021, py - 0.02, 0.005)), 0.0045, sm(sash), u, 0.12);          // дотор талын нарийн алтлаг хөвөө
      // Товч: энгэрийн хэвтээ шугам дээр, булангийн өмнө 3 товч зэрэгцэнэ; шилбэ нь хөвөөг хөндлөн дайрч босоо доош унжина
      for (const bx of [-0.105, -0.145, -0.185]) {
        const q = onChest(bx * k, 1.662, 0.014), q2 = onChest(bx * k, 1.627, 0.009);
        noOut(sball(0.013, silver, q.x, q.y, q.z, u));
        noOut(cyl(0.0045, 0.0045, 0.062, edgeM, q2.x, q2.y, q2.z, u)).rotation.x = -0.12;
      }
      {   // зах: гурван улирлын дээлд ижил босоо зах (өвлийн дээлд ч үстэй цагираг биш)
        // Босоо зах: хүзүү рүүгээ нарийссан (конус), хүзүүг тойрч суусан; дээд ирмэгээрээ алтлаг + бараан давхар хөвөө,
        // урдаа баруун тал нь зүүнээ дарсан давхцлын шугамтай, хоёр товчтой
        // Босоо зах: бараг эгц босоо; урд талдаа битүү биш — хоёр үзүүр нь тус тусдаа ирмэгтэй, дунд нь нарийн завсартай
        const CY = 1.74, colR = (dy) => 0.136 - dy * 0.12;                // бараг босоо (бага зэрэг л нарийсна)
        const dark = edgeM;
        const GAP = 0.2;                                                 // урд талын завсрын хагас өнцөг (рад)
        const open = { phiStart: GAP, phiLength: Math.PI * 2 - GAP * 2 };
        lathe([[colR(-0.055), -0.055], [colR(0), 0], [colR(0.06), 0.06]], 0.9, dsm(c), 0, CY, 0, u, open);                    // захны бие (хоёр талаасаа харагдана)
        noOut(lathe([[colR(-0.05) - 0.006, -0.05], [colR(0.055) - 0.006, 0.055]], 0.9, dsm(darken(c, 0.6)), 0, CY, 0, u, open));   // доторлогоо
        noOut(lathe([[colR(0.03) + 0.004, 0.03], [colR(0.06) + 0.005, 0.062], [colR(0.068) - 0.003, 0.068]], 0.9, dsm(darken(c, 0.4)), 0, CY, 0, u, open));   // дээд ирмэгийн өргөн бараан эмжээр
        noOut(lathe([[colR(0.018) + 0.004, 0.018], [colR(0.026) + 0.004, 0.026]], 0.9, sm(sash), 0, CY, 0, u, open));        // доор нь нарийн алтлаг хөвөө
        noOut(lathe([[colR(-0.055) + 0.004, -0.058], [colR(-0.045) + 0.004, -0.045]], 0.9, dark, 0, CY, 0, u, open));        // захны суурийн шугам
        const onCollar = (px, dy, lift) => new THREE.Vector3(px, CY + dy, Math.sqrt(Math.max(0.0004, colR(dy) ** 2 - px * px)) * 0.9 + lift);
        for (const sxc of [-1, 1]) {
          // урд ирмэг: дээд булан нь бөөрөнхий, эгц доош бууна
          const ex = (dy) => Math.sin(GAP) * colR(dy);
          const edge = [[0.03, 0.066], [0.008, 0.06], [0, 0.04], [0, 0], [0, -0.055]].map(([off, dy]) => onCollar(sxc * (ex(dy) + off), dy, 0.003));
          tube(edge, 0.008, dark, u, 0.2);
          // Товчлоогүй: нэг үзүүрт бөмбөлөг товч, нөгөө үзүүрт нь хоосон шилбэ (гогцоо) — хоорондоо холбогдоогүй
          const q2 = onCollar(sxc * 0.068, -0.036, 0.006);
          noOut(cyl(0.004, 0.004, 0.04, dark, q2.x, q2.y, q2.z, u)).rotation.z = Math.PI / 2;      // захад хадсан оосор
          const q = onCollar(sxc * 0.043, -0.036, 0.011);
          if (sxc < 0) noOut(sball(0.012, silver, q.x, q.y, q.z, u));                                // товч
          else {
            const loop = noOut(new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0035, 6, 16), dark)); // шилбэ: сул унжсан гогцоо
            loop.position.set(q.x - 0.004, q.y - 0.006, q.z + 0.002);
            loop.rotation.set(0.25, 0.3, 0);
            u.add(loop);
          }
        }
      }
      // Бүс: өргөн, хавтгай ороолт (нугалааны зураастай); зангилааг хажуудаа хавчуулсан, богино үзүүртэй
      lathe([[0.262 * k, -0.065], [0.273 * k, -0.035], [0.273 * k, 0.035], [0.262 * k, 0.065]], 0.72, sm(sash), 0, 1.08, 0, b);   // нарийн бүс (13 см)
      for (const dy of [-0.022, 0.022]) noOut(lathe([[0.2745 * k, dy - 0.003], [0.2745 * k, dy + 0.003]], 0.72, sm(0xb8891e), 0, 1.08, 0, b));
      sball(0.045, sm(sash), 0.262 * k, 1.08, -0.04, b).scale.set(0.55, 1.0, 1);
      cyl(0.02, 0.027, 0.15, sm(sash), 0.275 * k, 0.985, -0.05, b).rotation.z = -0.06;
      // Хормой: урт (шилбэний дунд хүртэл), доошоо нугалаатай дэлгэрнэ; захаараа нарийн хоёр эгнээ хөвөө; урд талын давхцлын зах
      const TOP = 1.0;
      lathe([[0.4 * k, -skirtH], [0.355 * k, -skirtH * 0.6], [0.295 * k, -0.15], [0.262 * k, 0]], 0.7, fab(c), 0, TOP, 0, b,
        { grad: [1, 0.7], capBottom: true, folds: skirtH, phiStart: Math.PI, rows: 14 });
      const band = fur ? 0.075 : 0.028;
      lathe([[0.408 * k, -skirtH - 0.004], [0.404 * k, -skirtH + band]], 0.7, sm(trim), 0, TOP, 0, b, { folds: skirtH, phiStart: Math.PI });
      noOut(lathe([[0.405 * k, -skirtH + band + 0.002], [0.404 * k, -skirtH + band + 0.012]], 0.7, sm(sash), 0, TOP, 0, b, { folds: skirtH, phiStart: Math.PI }));
      const skirtR = (t) => (0.262 + (0.4 - 0.262) * Math.pow(t, 0.85)) * k + 0.006;   // хормойн радиус (t: 0 бүс … 1 зах)
      const slitLine = (phi, rad, material) => {
        const pts = [];
        for (let n = 0; n <= 10; n++) {
          const t = n / 10, r = skirtR(t) * foldK(phi, t);
          pts.push(new THREE.Vector3(r * Math.sin(phi), TOP - skirtH * t, r * Math.cos(phi) * 0.7));
        }
        tube(pts, rad, material, b);
      };
      slitLine(-0.8, 0.009, sm(hc));       // давхцлын зах: өмсөгчийн баруун урд
      slitLine(-0.74, 0.005, sm(sash));
      if (fur) {
        // Өвлийн хантааз: зузаан, дулаан — гадна тал нь ноосон даавуу, дотроо хонины арьсан доторлогоотой (ирмэгээр нь зузаан нь харагдана),
        // энгэр, хормой, хүзүү, суганы амсраар сэвсгэр үстэй. Мөрнөөс ташаа хүртэл нэг цул, цээжтэйгээ хамт хөдөлнө
        const VK = 0.7, G = 0.12, PAD = 0.03;                           // зузааны харьцаа, урд завсрын хагас өнцөг, жийргэвчийн зузаан
        const open = { phiStart: G, phiLength: Math.PI * 2 - G * 2, rows: 20 };
        const V = [[0.338, -0.52], [0.322, -0.4], [0.308, -0.27], [0.322, -0.2], [0.326, -0.08], [0.343, 0.08], [0.358, 0.18], [0.335, 0.255], [0.235, 0.3]]
          .map(([r, y]) => [r + PAD, y]);
        lathe(V.map(([r, y]) => [r * k, y]), VK, vestMat, 0, 1.42, 0, u, open);
        noOut(lathe(V.map(([r, y]) => [(r - PAD + 0.004) * k, y]), VK, fleeceMat, 0, 1.42, 0, u, open));   // доторлогоо
        const vestR = (y) => {
          for (let n = 1; n < V.length; n++) if (y - 1.42 <= V[n][1]) {
            const [r0, y0] = V[n - 1], [r1, y1] = V[n];
            return (r0 + ((r1 - r0) * Math.max(0, y - 1.42 - y0)) / (y1 - y0)) * k;
          }
          return V[V.length - 1][0] * k;
        };
        const line = (phi, y0, y1, lift, n = 12) => Array.from({ length: n + 1 }, (_, q) => {
          const y = y0 + ((y1 - y0) * q) / n, r = vestR(y) + lift;
          return new THREE.Vector3(r * Math.sin(phi), y, r * Math.cos(phi) * VK);
        });
        for (const sxv of [-1, 1]) {
          fluff(line(sxv * (G + 0.045), 1.72, 0.9, -0.005), 0.046, whiteFurMat, u, 5 + sxv);   // энгэрийн цагаан сэвсгэр үс
          tube(line(sxv * (G + 0.27), 1.64, 0.97, 0.004), 0.006, sm(sash), u);            // дотуур нь алтлаг хөвөө
        }
        const hemR = vestR(0.9), neckR = 0.265 * k;
        fluff(ring(0, 0.9, 0, 1, 'y', 60, G, Math.PI * 2 - G).map((v) => new THREE.Vector3(v.x * hemR, v.y, v.z * hemR * VK)), 0.046, whiteFurMat, u, 13);   // хормойн хүрээний цагаан үс
        // Үслэг зах: хоолойг битүү хааж эрүү хүртэл босно (доод цагираг мөр рүү шилжинэ, дээд цагираг хүзүүг тойрч битүү)
        fluff(ring(0, 1.725, 0, 1, 'y', 40).map((v) => new THREE.Vector3(v.x * neckR * 0.86, v.y, v.z * neckR * 0.86 * VK)), 0.05, whiteFurMat, u, 17);
        fluff(ring(0, 1.775, 0.004, 0.158, 'y', 30), 0.055, whiteFurMat, u, 19);
        noOut(lathe([[(0.338 + PAD) * k + 0.004, 0.06], [(0.336 + PAD) * k + 0.004, 0.072]], VK, sm(sash), 0, 0.9, 0, u, open));                        // хормойн алтлаг хөвөө
        // Дээлийн хормойн зах: цайвар сэвсгэр үс
        const hr = (phi) => 0.405 * k * foldK(phi, 1);
        fluff(Array.from({ length: 73 }, (_, q) => {
          const phi = (q / 72) * Math.PI * 2;
          return new THREE.Vector3(hr(phi) * Math.sin(phi), TOP - skirtH + 0.02, hr(phi) * Math.cos(phi) * 0.7);
        }), 0.045, creamFurMat, b, 21);
      }
      g.add(b, u);
      bodies.push(u);
    };
    const tl = (c) => lighten(c, o.terlegLighten);
    body('terleg', tl(deel), tl(hem), tl(hem), 0.95, 0.58, false);
    body('deel', deel, hem, hem, 1, 0.66, false);
    body('winter', deel, hem, o.collarFur, 1.12, 0.72, true);

    // Гар: гөлгөр ханцуй (улирлаар өнгө нь цээжтэй ижил солигдоно), нударга, бугуй
    const sleeveMat = new THREE.MeshLambertMaterial({ color: deel, map: brocadeSleeveTex });
    const cuffMat = new THREE.MeshLambertMaterial({ color: hem, map: brocadeSleeveTex });
    const makeArm = (sx, bend) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(sx * 0.325, 1.6, 0);
      shoulder.rotation.z = sx * 0.06;                                          // гар биеэс бага зэрэг зайтай унжина
      sball(0.118, sleeveMat, 0, -0.01, 0, shoulder).scale.set(1.0, 0.95, 1.08);       // мөр: оёдолгүй, ханцуйтай нэг цул
      cyl(0.118, 0.104, 0.32, sleeveMat, 0, -0.16, 0, shoulder);               // ханцуй мөрөндөө өргөн, тохой руугаа нарийсна
      const elbow = new THREE.Group();
      elbow.position.y = -0.32;
      elbow.rotation.x = bend;                 // сөрөг = урагш
      shoulder.add(elbow);
      sball(0.104, sleeveMat, 0, 0, 0, elbow);
      cyl(0.1, 0.112, 0.28, sleeveMat, 0, -0.14, 0, elbow);      // урт, сул ханцуй
      cyl(0.117, 0.121, 0.12, cuffMat, 0, -0.265, 0, elbow);     // эргүүлсэн нударга: шулуун, өөр өнгийн хээтэй торго
      noOut(cyl(0.12, 0.12, 0.01, sm(sash), 0, -0.204, 0, elbow));   // нударганы дээд хөвөө
      noOut(cyl(0.124, 0.124, 0.01, sm(sash), 0, -0.322, 0, elbow));   // нударганы доод хөвөө
      const winterCuff = new THREE.Group();                      // өвөл л харагдах ханцуйны үслэг зах
      winterCuff.name = 'body:winter';
      elbow.add(winterCuff);
      fluff(ring(0, -0.325, 0, 0.125, 'y', 24), 0.036, creamFurMat, winterCuff, 31 + sx);
      const wrist = new THREE.Group();                           // бугуй
      wrist.position.y = -0.3;
      elbow.add(wrist);
      // Гарын сарвуу: хавтгай алга, үений товгор, 4 хуруу (3 үетэй, нийлж зэрэгцсэн), эрхийн булчин + эрхий
      const skinM = sm(skin);
      sball(0.032, skinM, 0, -0.015, 0, wrist).scale.set(0.75, 1, 1.3);                // бугуй
      // Алга: булан нь дугуйрсан, бугуй талдаа нарийн, хурууны уг талдаа өргөн нэг цул хэлбэр
      const palm = lathe([[0.02, -0.114], [0.047, -0.11], [0.057, -0.092], [0.056, -0.055], [0.046, -0.03], [0.026, -0.014]], 1, skinM, 0, 0, 0, wrist, { capBottom: true, rows: 12 });
      palm.scale.x = 0.4;
      const fingers = [];
      // [z, үе1, үе2, үе3]: чигчий → долоовор (эрхий талдаа)
      [[-0.039, 0.034, 0.025, 0.022], [-0.013, 0.041, 0.031, 0.025], [0.013, 0.044, 0.034, 0.026], [0.039, 0.041, 0.031, 0.025]].forEach(([fz, ...lens], n) => {
        const joints = [];
        let parent = wrist, y = -0.108, r = 0.0155;
        for (const len of lens) {
          const jt = new THREE.Group();
          jt.position.set(0, y, parent === wrist ? fz : 0);
          parent.add(jt);
          noOut(sball(r, skinM, 0, 0, 0, jt));                                          // үений товгор
          noOut(cyl(r, r * 0.9, len, skinM, 0, -len / 2, 0, jt));
          joints.push(jt);
          parent = jt; y = -len; r *= 0.9;
        }
        noOut(sball(r, skinM, 0, y, 0, parent));                                        // хурууны үзүүр
        noOut(sball(r * 0.85, sm(0xe6c3aa), sx * r * 0.7, y * 0.55, 0, parent)).scale.set(0.3, 1.2, 0.9);   // хумс (гарын ар талд)
        noOut(sball(0.0155, skinM, sx * 0.004, -0.106, fz, wrist)).scale.set(0.8, 1, 1);                     // гарын ар талын үений товгор
        fingers.push({ joints, k: 1.15 - n * 0.1 });                                    // чигчий илүү нугарна
      });
      noOut(sball(0.028, skinM, -sx * 0.01, -0.062, -0.03, wrist)).scale.set(0.6, 1.5, 0.9);    // алганы чигчий талын зөөлөвч
      // Эрхий: бугуйн ойролцоо угтай 3 хэсэг — алганы яс (булчинтай), уг үе, үзүүр үе (өргөн, хавтгай зөөлөвч, хумстай)
      const nailM = sm(0xe6c3aa);
      const thumbBase = new THREE.Group();                                              // алганы ясны үе
      thumbBase.position.set(-sx * 0.01, -0.035, 0.04);
      wrist.add(thumbBase);
      noOut(sball(0.021, skinM, 0, 0, 0, thumbBase));
      noOut(cyl(0.021, 0.019, 0.042, skinM, 0, -0.021, 0, thumbBase));
      noOut(sball(0.027, skinM, -sx * 0.008, -0.02, -0.006, thumbBase)).scale.set(0.8, 1.35, 1);   // эрхийн булчин: алгатай нийлнэ
      const thumb = new THREE.Group();                                                  // уг үе
      thumb.position.y = -0.042;
      thumbBase.add(thumb);
      noOut(sball(0.0188, skinM, 0, 0, 0, thumb));
      noOut(cyl(0.0182, 0.0168, 0.032, skinM, 0, -0.016, 0, thumb));
      const thumbTip = new THREE.Group();                                               // үзүүр үе
      thumbTip.position.y = -0.032;
      thumb.add(thumbTip);
      noOut(sball(0.017, skinM, 0, 0, 0, thumbTip));
      noOut(cyl(0.0165, 0.0155, 0.022, skinM, 0, -0.011, 0, thumbTip)).scale.set(0.88, 1, 1.12);   // үзүүр рүүгээ хавтгайрна
      noOut(sball(0.0158, skinM, 0, -0.023, 0, thumbTip)).scale.set(0.85, 1, 1.12);                // бөөрөнхий, өргөн үзүүр
      noOut(sball(0.0125, nailM, sx * 0.0085, -0.02, 0.004, thumbTip)).scale.set(0.35, 1.2, 1);     // хумс (эрхийн ар талд)
      /** Хуруу атгах: c = 0 тэнийсэн … 1.3 нударга. grip = 0..1: уурганы ишийг тойруулж атгасан байрлал руу шилжинэ */
      const GRIP = [0.107, 1.293, 0.974];      // бариулыг (радиус ~1.6 см) 200° орчим тойрч ороох үе тус бүрийн өнцөг (тооцоолсон)
      const curl = (c, grip = 0) => {
        for (const { joints, k } of fingers) {
          joints[0].rotation.z = -sx * mix(c * 0.8 * k, GRIP[0], grip);
          joints[1].rotation.z = -sx * mix(c * 1.0 * k, GRIP[1], grip);
          joints[2].rotation.z = -sx * mix(c * 0.7 * k, GRIP[2], grip);
        }
        // Сул үед: эрхий алганаас урагш 30° орчим салж, бага зэрэг дотогш нугарна.
        // Атгахад: алганы яс алганы ирмэгийг дагаж бууна, уг үе ишний дээгүүр хөндлөн давна, үзүүр үе цаад талаар нь доош дарна
        // Атгахад (шон атгасан гар шиг): эрхий долоовор хурууны яг хажууд, бариулыг хуруунуудын ЭСРЭГ талаас хөндлөн тойрно.
        // Уг нь булчинтайгаа алганы урд руу түрж, эрхий бариулын дээгүүр давж цаад талаар нь бууж, үзүүр нь долоовор хурууны үзүүрийг давж нийлнэ
        thumbBase.position.set(-sx * mix(0.01, 0.025, grip), mix(-0.035, -0.05, grip), mix(0.04, 0.058, grip));
        thumbBase.rotation.x = mix(-0.55, 0, grip);
        thumbBase.rotation.z = -sx * mix(0.1 + c * 0.25, 0.303, grip);
        thumb.rotation.x = mix(0.22, 0, grip);
        thumb.rotation.z = -sx * mix(c * 0.3, 0.422, grip);
        thumbTip.rotation.z = -sx * mix(c * 0.45, -0.822, grip);
      };
      curl(0.35);
      g.add(shoulder);
      return { shoulder, elbow, wrist, curl };
    };
    const armL = makeArm(-1, -0.25), armR = makeArm(1, -0.6);
    const arms = [armL.shoulder, armR.shoulder];

    const uurga = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 2.0, 10), sm(0x8a6a3a));
    uurga.name = 'uurga';
    uurga.position.set(-0.024, -0.126, 0.55);   // иш алганд тулж, хурууны угаас доогуур — атгасан хуруунуудын яг дотуур
    uurga.rotation.x = Math.PI / 2;               // бугуйн тэнхлэгт перпендикуляр, урагш чиглэсэн
    uurga.castShadow = true;
    uurga.visible = false;
    armR.wrist.add(uurga);   // уурга гарыг дагана

    // Толгой: талтай (icosahedron) — нүдгүй, зөвхөн жижиг хамар чиглэл заана
    const HY = 2.1, NECK_Y = 1.78;   // толгойг өргөж, хүзүү ба захыг ил гаргасан
    const headStart = g.children.length;   // эндээс хойш нэмэгдсэн бүхэн (толгой, малгай) хүзүүний бүлэгт орно
    const hairC = 0x3a2a1e;
    cyl(0.08, 0.092, 0.17, sm(0xd6a67c), 0, 1.795, 0, g);   // хүзүү: толгойноос нарийн, эрүүний сүүдэрт бага зэрэг бараан
    sball(0.02, sm(0xd6a67c), 0, 1.8, 0.07, g).scale.set(1, 1.3, 0.8);   // хоолойн товгор
    const face = (m) => { m.userData.noOutline = true; m.castShadow = false; return m; };
    // Толгой: lathe — эрүү нарийн, хацар өргөн. Хуваалтын тоо (HEAD_N) тохируулагдана
    setFaceOffset();
    const head = new THREE.Mesh(headGeoFor(HEAD_N), HEAD_SMOOTH ? faceMats.smooth : faceMats.flat);
    head.name = 'head';
    head.position.y = HY; head.castShadow = true;
    g.add(head);
    // Үс: толгойн ар талыг хучсан хагас бүрхүүл
    const hairM = new THREE.Mesh(hairGeoFor(), hairMat);
    hairM.userData.noOutline = true;        // нээлттэй бүрхүүлд хар хүрээ тавибал үсийг бүхэлд нь хараар дарна
    hairM.name = 'hair';
    const hairTop = new THREE.Mesh(hairTopGeoFor(), hairMat);
    hairTop.position.y = HY; hairTop.name = 'hairTop'; hairTop.castShadow = true;
    hairTop.userData.noOutline = true;   // хажуугийн үстэй нийлэх тул дундуур нь хар шугам гаргахгүй
    g.add(hairTop);
    hairM.position.y = HY; hairM.castShadow = true;
    g.add(hairM);
    // Нүүрний хэсгүүд: толгойн гадаргуу дээр (хуваалтаас хамаарч) суулгана — stick(mesh, x, толгойн радиус, цухуйлт)
    const stick = (m, x, r, lift) => { m.userData.face = { x, r, lift }; face(m); placeOnFace(m); return m; };
    for (const sx of [-1, 1]) { const ear = sball(0.05, sm(skin), sx * 0.248, HY - 0.04, 0.0, g); ear.scale.set(0.45, 1, 0.7); ear.name = 'ear'; ear.visible = HEAD_SHAPE !== 'block'; }   // чих

    // Тоорцог: хүрээ нь толгойг тойрч суусан
    const toortsog = new THREE.Group();
    toortsog.name = 'hat:toortsog';
    toortsog.position.y = 0.09;   // духны тал хүртэл дээш өмссөн
    {   // далийлгаж өмссөн: урд хүрээг байранд нь үлдээж (эргэлтийн тэнхлэг), ар талыг шил рүү буулгана
      const A = -0.17, Py = HY + 0.03, Pz = 0.28;
      toortsog.rotation.x = A;
      toortsog.position.y += Py - (Py * Math.cos(A) - Pz * Math.sin(A));
      toortsog.position.z = Pz - (Py * Math.sin(A) + Pz * Math.cos(A));
    }
    {
      const ink = 0x1e1a18;
      const noOut = (m) => { m.userData.noOutline = true; return m; };
      // Өндөр бөмбөгөр орой (эсгий)
      const DOME = [[0.285, 0.03], [0.287, 0.12], [0.262, 0.22], [0.19, 0.295], [0.09, 0.335], [0, 0.348]];
      const domePts = profile(DOME, 20);
      const domeR = (y) => {
        for (let n = 1; n < domePts.length; n++) {
          const a = domePts[n - 1], b = domePts[n];
          if (y <= b.y) return a.x + ((b.x - a.x) * (y - a.y)) / (b.y - a.y || 1);
        }
        return 0;
      };
      lathe(DOME, 1, feltMat, 0, HY, 0, toortsog, { rows: 20 });
      // Хар судлууд: доод хос, хар оройн доорх хос
      const band = (y0, y1) => noOut(lathe([[domeR(y0) + 0.004, y0], [domeR(y1) + 0.004, y1]], 1, sm(ink), 0, HY, 0, toortsog));
      band(0.1, 0.118); band(0.136, 0.147);
      band(0.218, 0.231); band(0.246, 0.256);
      // Алхан хээтэй хар орой
      noOut(lathe([[domeR(0.275) + 0.005, 0.275], [domeR(0.312) + 0.005, 0.312], [domeR(0.338) + 0.005, 0.338], [0, 0.355]], 1, capMat, 0, HY, 0, toortsog, { rows: 12 }));
      // Сампин: иш + мушгисан зангилаа
      cyl(0.016, 0.024, 0.05, sm(ink), 0, HY + 0.372, 0, toortsog);
      const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.03, 0.014, 64, 8, 2, 3), sm(ink));
      knot.position.y = HY + 0.42; knot.rotation.x = Math.PI / 2; knot.castShadow = true;
      toortsog.add(knot);
      // Далбаа: орой нь бараг тэгш, үзүүр рүүгээ огцом намсдаг бөөрөнхий дэлбээ; аяга шиг гадагш дэлгэрнэ
      const flap = (center, half, H, flare, round) => {
        const nu = 24, nv = 8, pos = [], uv = [], idx = [], edge = [], inner = [];
        for (let a = 0; a <= nu; a++) {
          const s01 = (a / nu) * 2 - 1, phi = center + s01 * half;
          const f = Math.pow(Math.cos((s01 * Math.PI) / 2), round);          // 0 (үзүүр) … 1 (дунд)
          for (let b = 0; b <= nv; b++) {
            const t = b / nv;
            const r = 0.29 + flare * (Math.sin((t * Math.PI) / 2) + 0.18 * t * t * t) * (0.4 + 0.6 * f);   // орой нь бага зэрэг гадагш эргэнэ
            const v = new THREE.Vector3(r * Math.sin(phi), 0.03 + H * f * t, r * Math.cos(phi));
            pos.push(v.x, v.y, v.z);
            uv.push((a / nu) * 0.6, t * 0.5);
            if (b === nv) edge.push(v);
            if (b === nv - 2) inner.push(v.clone().multiply(new THREE.Vector3(1.012, 1, 1.012)));
          }
        }
        for (let a = 0; a < nu; a++) for (let b = 0; b < nv; b++) {
          const p0 = a * (nv + 1) + b, p1 = p0 + nv + 1;
          idx.push(p0, p1, p0 + 1, p1, p1 + 1, p0 + 1);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        const m = noOut(new THREE.Mesh(geo, feltMat2));
        m.position.y = HY; m.castShadow = true;
        toortsog.add(m);
        for (const [pts, rad] of [[edge, 0.014], [inner, 0.006]]) {      // хар хөвөө + дотор талын нарийн шугам
          const tube = noOut(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), q(48, 10), rad, q(6, 4)), sm(ink)));
          tube.position.y = HY;
          toortsog.add(tube);
        }
      };
      // 4 тэнцүү далбаа: урд, хойд, хоёр хажуу — өмнөх хажуугийн далбааны тал хэмжээтэй
      for (let q = 0; q < 4; q++) flap((q * Math.PI) / 2, 0.72, 0.125, 0.085, 0.32);
      noOut(lathe([[0.29, 0.012], [0.294, 0.045]], 1, sm(ink), 0, HY, 0, toortsog));   // доод хар хүрээ
    }

    // Өвлийн монгол малгай (булган/үнэгэн хүрээтэй, шовгор оройтой): дээшээ дэлбээлсэн зузаан үсэн хүрээ, дотроос нь хээтэй торгон орой
    // арагшаа налж цухуйна, ар талд хоёр улаан залаа унжина
    const fox = new THREE.Group();
    fox.name = 'hat:fox';
    {
      const fh = new THREE.Group();
      fh.position.set(0, HY + 0.05, -0.03);   // арагш суулгаж өмссөн: дух ил, ар тал нь шил рүү буусан
      fh.rotation.x = -0.24;                                   // духан дээр намхан, ар тал руугаа өргөгдсөн
      fox.add(fh);
      // Үсэн хүрээ: доороо толгойд наалдсан, дээшээ өргөсөж, дээд ирмэг нь бөөрөнхийлж дотогш эргэнэ
      const FUR = [[0.236, 0.0], [0.286, 0.004], [0.322, 0.065], [0.342, 0.14], [0.345, 0.2], [0.325, 0.242], [0.28, 0.256], [0.24, 0.238]];   // бөөрөнхий, зузаан
      lathe(FUR, 1.02, darkFurMat, 0, 0, 0, fh, { rows: 28, segs: 48 });
      // Торгон орой: сонгодог монгол малгайн шовгор орой — үсэн хүрээний дундаас эгц дээш боссон конус, орой дээрээ сампинтай
      const crown = new THREE.Group();
      crown.position.set(0, 0.226, 0);
      fh.add(crown);
      lathe([[0.246, -0.09], [0.246, 0.015], [0.212, 0.07], [0.145, 0.125], [0.065, 0.168], [0.014, 0.185]], 1, hatSilkMat, 0, 0, 0, crown, { rows: 22, segs: 48 });
      noOut(lathe([[0.25, 0.012], [0.243, 0.04]], 1, sm(0x17152e), 0, 0, 0, crown, { segs: 48 }));   // ёроолын хар хөх эмжээр
      noOut(lathe([[0.241, 0.046], [0.237, 0.056]], 1, sm(0xe0a93a), 0, 0, 0, crown, { segs: 48 }));  // алтлаг зураас
      cyl(0.012, 0.016, 0.03, sm(0x8f1f24), 0, 0.195, 0, crown);                                       // сампингийн иш
      sball(0.034, sm(0xa3262b), 0, 0.232, 0, crown);                                                  // сампин (улаан зангилаа)
      // Залаа: ар талын хүрээний доороос унжсан хоёр улаан тууз
      const red = sm(0x9a2227);
      for (const sx of [-1, 1]) {
        const rb = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.34, 0.012), red);
        rb.geometry.translate(0, -0.17, 0);
        rb.position.set(sx * 0.05, 0.03, -0.268);
        rb.rotation.set(0.1, 0, sx * 0.14);
        rb.castShadow = true;
        fh.add(rb);
      }
      const knot = sball(0.036, red, 0, 0.03, -0.275, fh); knot.scale.set(1.5, 0.8, 0.6);
    }
    g.add(toortsog, fox);
    const neck = new THREE.Group();          // хүзүү: толгой, малгай хамт эргэнэ
    neck.position.y = NECK_Y;
    for (const c of g.children.slice(headStart)) { neck.add(c); c.position.y -= NECK_Y; }
    g.add(neck);
    // Бэлхүүс: цээж, гар, хүзүү, уут бүгд энэ бүлэгт — бүсний түвшнээс эргэнэ
    const WAIST_Y = 1.08;
    const waist = new THREE.Group();
    waist.position.y = WAIST_Y;
    for (const c of [...bodies, ...arms, neck, sack]) { waist.add(c); c.position.y -= WAIST_Y; }
    g.add(waist);

    bakeSkinned(g, [sleeveMat]);
    addOutline(g);
    const rig = {
      root: g, legs, arms, knees, neck, bodies, waist, armY: arms[0].position.y, neckY: neck.position.y,
      sleeveMat, sleeveColors: { terleg: tl(deel), deel, winter: deel },
      elbows: [armL.elbow, armR.elbow], elbowRest: [-0.25, -0.6], wrists: [armL.wrist, armR.wrist], curls: [armL.curl, armR.curl],
    };
    dressHerder(rig, 'autumn');
    return rig;
  }
  const HAT_CHOICE = 'auto';   // тоглоомд малгай улирлаар; сонголт нэмэхэд энд холбоно
  function dressHerder(r, season) {
    const look = outfits.seasons[season];
    r.root.traverse((child) => {
      const [kind, id] = child.name.split(':');
      if (kind === 'body') child.visible = id === look.body;
      else if (kind === 'hat') child.visible = id === (HAT_CHOICE === 'auto' ? look.hat : HAT_CHOICE);
    });
    r.sleeveMat.color.setHex(r.sleeveColors[look.body]);
  }
  /** Хөдөлгөөнгүй олон хүнд (сумын оршин суугчид): энгийн царайтай тогтмол нүүрний материал — тоглогчийн амьд нүүрээс тусдаа */
  let crowdFace = null;
  function staticFaceMat() {
    if (crowdFace) return crowdFace;
    const cv = document.createElement('canvas');
    cv.width = faceCv.width; cv.height = faceCv.height;
    const ctx = cv.getContext('2d');
    ctx.setTransform(cv.width / 2048, 0, 0, cv.height / 1024, 0, 0);
    drawFace(ctx, 2048, 1024, { blink: 0, gaze: 0, mouth: 0, emo: EMOTIONS.neutral });
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = faceTex.colorSpace; tex.wrapS = faceTex.wrapS; tex.wrapT = faceTex.wrapT;
    tex.anisotropy = faceTex.anisotropy; tex.offset.set(1 / (2 * headSeg(HEAD_N)), 0);   // олон хүний толгойн хуваалтад тааруулна
    crowdFace = new THREE.MeshLambertMaterial({ color: 0xffffff, map: tex });
    return crowdFace;
  }
  const setLod = (v) => { LOD = v; };
  return { makeHerder, dressHerder, paintFace, EMOTIONS, mix, staticFaceMat, faceMats, setLod };
}

let lib: ReturnType<typeof init> | null = null;
const L = () => (lib ??= init());

export function makeHerderModel(colors: HerderModelColors): HerderRig {
  const rig = L().makeHerder(colors);
  rig.anim = { phase: 0, time: 0, run: 0, blinkT: 1.5, blinkP: 1, emo: { ...L().EMOTIONS.neutral } };
  return rig;
}

export interface CrowdPart {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  castShadow: boolean;
}
export interface CrowdLook {
  colors: HerderModelColors;
  body: OutfitBody;
  /** малгайн нэр (`toortsog`, `fox`) эсвэл `none` */
  hat: string;
}

const crowdCache = new Map<string, CrowdPart[]>();
/**
 * Хөдөлгөөнгүй олон хүн (сумын оршин суугчид, docs/character-design.md §4 `crowd`): үндсэн дүрийн загварыг
 * тайван зогсох байрлалд оруулж, ясны хувиргалтыг CPU дээр геометрт шингээгээд материалаар нэгтгэнэ.
 * Дуудагч хэсэг бүрийг InstancedMesh болгоно — хүний тоо хэд ч байсан нэг төрх ≈ 10 draw call.
 */
export function makeCrowdParts(look: CrowdLook): CrowdPart[] {
  const key = JSON.stringify(look);
  const hit = crowdCache.get(key);
  if (hit) return hit;
  const lib = L();
  lib.setLod(visualStyle.sumResidents.lod);   // хөнгөн хувилбар: хуваалт цөөн
  let rig: HerderRig;
  try { rig = lib.makeHerder(look.colors); } finally { lib.setLod(1); }
  lib.setLod(visualStyle.sumResidents.lod);   // нүүрний зургийн шилжилт ч энэ хуваалтаар
  rig.root.traverse((o: THREE.Object3D) => {
    const [kind, id] = o.name.split(':');
    if (kind === 'body') o.visible = id === look.body;
    else if (kind === 'hat') o.visible = id === look.hat;
  });
  // тайван зогсох байрлал: тохой бага зэрэг нугарсан, хуруу сул
  rig.elbows.forEach((e, i) => { e.rotation.x = rig.elbowRest[i] ?? 0; });
  rig.curls.forEach((c) => c(0.35));
  rig.root.updateMatrixWorld(true);
  const shown = (o: THREE.Object3D): boolean => { for (let q: THREE.Object3D | null = o; q && q !== rig.root; q = q.parent) if (!q.visible) return false; return true; };
  const byMat = new Map<THREE.Material, { geos: THREE.BufferGeometry[]; shadow: boolean }>();
  const add = (material: THREE.Material, g: THREE.BufferGeometry, shadow: boolean): void => {
    const e = byMat.get(material) ?? { geos: [], shadow: false };
    e.geos.push(g); e.shadow ||= shadow;
    byMat.set(material, e);
  };
  const keep = (g: THREE.BufferGeometry, material: THREE.Material): THREE.BufferGeometry => {
    const m = material as THREE.MeshLambertMaterial;
    for (const name of Object.keys(g.attributes)) {
      const ok = name === 'position' || name === 'normal' || (name === 'uv' && !!m.map) || (name === 'color' && !!m.vertexColors);
      if (!ok) g.deleteAttribute(name);
    }
    if (m.map && !g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position!.count * 2), 2));
    return g;
  };
  const v = new THREE.Vector3(), nm = new THREE.Matrix3(), M = new THREE.Matrix4();
  rig.root.traverse((o: THREE.Object3D) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || (mesh as THREE.InstancedMesh).isInstancedMesh || !shown(mesh) || Array.isArray(mesh.material)) return;
    let material = mesh.material as THREE.Material;
    if (material === lib.faceMats.smooth || material === lib.faceMats.flat) material = lib.staticFaceMat();
    const src = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
    if (!src.attributes.normal) src.computeVertexNormals();
    const sk = mesh as THREE.SkinnedMesh;
    if (sk.isSkinnedMesh) {
      // хатуу холбоос (яс бүрд 100%): орой бүрийг өөрийн ясны одоогийн байрлалаар хувиргана
      const bones = sk.skeleton.bones, inv = sk.skeleton.boneInverses;
      const si = src.attributes.skinIndex!, pos = src.attributes.position!, nor = src.attributes.normal!;
      const mats = bones.map((b, i) => new THREE.Matrix4().multiplyMatrices(b.matrixWorld, inv[i]!));
      for (let i = 0; i < pos.count; i++) {
        const bm = mats[si.getX(i)]!;
        v.fromBufferAttribute(pos, i).applyMatrix4(bm); pos.setXYZ(i, v.x, v.y, v.z);
        nm.getNormalMatrix(bm);
        v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); nor.setXYZ(i, v.x, v.y, v.z);
      }
    } else {
      M.copy(mesh.matrixWorld);
      src.applyMatrix4(M);
      if (M.determinant() < 0) {
        for (const name of Object.keys(src.attributes)) {
          const at = src.attributes[name]!, sz = at.itemSize, arr = at.array as Float32Array;
          for (let t = 0; t < at.count; t += 3) for (let c = 0; c < sz; c++) { const a = (t + 1) * sz + c, b = (t + 2) * sz + c; const tmp = arr[a]!; arr[a] = arr[b]!; arr[b] = tmp; }
        }
      }
    }
    add(material, keep(src, material), mesh.castShadow && !(material as THREE.MeshBasicMaterial).isMeshBasicMaterial);
  });
  lib.setLod(1);
  const parts: CrowdPart[] = [];
  for (const [material, e] of byMat) {
    const geometry = mergeGeometries(e.geos, false);
    if (!geometry) throw new Error('makeCrowdParts: mergeGeometries амжилтгүй');
    geometry.computeBoundingSphere();
    parts.push({ geometry, material, castShadow: e.shadow });
  }
  // сүүдрийг зөвхөн хамгийн том хэсгүүд тусгана (сүүдрийн дамжлагын draw call хэмнэнэ)
  const big = [...parts].filter((p) => p.castShadow).sort((a, b) => b.geometry.attributes.position!.count - a.geometry.attributes.position!.count);
  parts.forEach((p) => { p.castShadow = big.indexOf(p) >= 0 && big.indexOf(p) < visualStyle.sumResidents.shadowParts; });
  crowdCache.set(key, parts);
  return parts;
}

export function dressHerderModel(rig: HerderRig, season: Season): void {
  L().dressHerder(rig, season);
}

const TAU = Math.PI * 2;
const sstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Дүрийг нэг кадр хөдөлгөнө (лабораторийн animate()-ийн хуулбар). Буцаах утга — алхам бүрийн
 * биеийн дэвхцэлт (м); дуудагч root.position.y дээр нэмнэ. Тоонууд → data/visuals.json herderAnim.
 */
export function animateHerder(H: HerderRig, p: HerderPose): number {
  const { mix, EMOTIONS, paintFace } = L();
  const cfg = visualStyle.herderAnim;
  const a = H.anim, dt = p.dt;
  const onFoot = p.mode === 'foot';
  const moving = onFoot && p.speed > cfg.moveMin;
  a.run += ((moving ? sstep(cfg.runFrom, cfg.runFull, p.speed) : 0) - a.run) * Math.min(1, dt * 5);
  const run = a.run;
  a.time += dt;
  if (moving) a.phase += dt * p.speed * mix(cfg.strideWalk, cfg.strideRun, run);
  const t = a.time, phase = a.phase;
  const sw = moving ? Math.sin(phase) * mix(0.7, 1.1, run) : 0;
  const f = moving ? Math.sin(phase) : 0;
  const mv = moving ? 1 : 0;

  // --- Хөл: 0..π тулах үе, π..2π савлах үе ---
  const legPose = (u0: number) => {
    const u = ((u0 % TAU) + TAU) % TAU;
    const swing = u > Math.PI ? (u - Math.PI) / Math.PI : 0;
    const wThigh = -Math.cos(u) * 0.7;
    const wKnee = Math.max(0, -Math.sin(u)) * 0.9;
    const rThigh = -Math.cos(u) * 1.0 - 0.2 - 0.3 * Math.sin(Math.PI * swing);
    const rKnee = u <= Math.PI ? 0.22 + 0.3 * Math.sin(u) - 0.12 * (u / Math.PI) : 0.1 + 1.85 * Math.sin(Math.PI * Math.pow(swing, 0.72));
    return { thigh: mix(wThigh, rThigh, run), knee: mix(wKnee, rKnee, run) };
  };
  const L0 = legPose(phase + Math.PI / 2), L1 = legPose(phase + Math.PI * 1.5);
  H.legs[0].rotation.set(L0.thigh * mv, 0, 0);
  H.legs[1].rotation.set(L1.thigh * mv, 0, 0);
  H.knees[0].rotation.x = L0.knee * mv;
  H.knees[1].rotation.x = L1.knee * mv;

  // --- Гар: хөлийн эсрэг савлана ---
  const armPose = (fwd: number, fwdLag: number) => ({
    shoulder: mix(-fwd * 0.56, fwd > 0 ? -fwd * 0.8 : -fwd * 0.95, run),
    elbowRun: -1.5 - 0.42 * Math.max(0, fwdLag) + 0.32 * Math.max(0, -fwdLag),
    inward: 0.38 * Math.max(0, fwd) * run,
  });
  const lag = moving ? Math.sin(phase - 0.45) : 0;
  const A0 = armPose(f, lag), A1 = armPose(-f, -lag);
  H.arms[0].rotation.x = A0.shoulder * mv;
  H.arms[1].rotation.x = A1.shoulder * mv;
  H.arms[0].rotation.y = A0.inward * mv;
  H.arms[1].rotation.y = -A1.inward * mv;
  const idleEl = !moving ? Math.sin(t * 1.1) * 0.06 : 0;
  const walkEl = (rest: number, fwd: number) => rest * (1 - 0.6 * Math.max(0, -fwd)) - Math.max(0, fwd) * 0.8;
  H.elbows[0].rotation.x = mix(walkEl(H.elbowRest[0], f), A0.elbowRun, run) + idleEl;
  H.elbows[1].rotation.x = mix(walkEl(H.elbowRest[1], -f), A1.elbowRun, run) - idleEl;

  // --- Хүзүү, амьсгал, бэлхүүс ---
  const lean = moving ? mix(0.07, 0.3, run) : 0;
  H.neck.rotation.y = Math.sin(t * 0.45) * 0.3 * (1 - run);
  H.neck.rotation.x = Math.sin(t * 0.3 + 1) * 0.07 * (1 - run) - lean * 0.55 * run;
  const b = Math.sin(t * mix(1.6, 5, run)) * mix(1, 1.6, run);
  for (const body of H.bodies) body.scale.set(1 + b * 0.015, 1, 1 + b * 0.035);
  H.arms[0].position.y = H.arms[1].position.y = H.armY + b * 0.012;
  H.neck.position.y = H.neckY + b * 0.012;
  H.waist.rotation.y = moving ? sw * 0.22 : Math.sin(t * 0.5) * 0.14;
  H.waist.rotation.x = lean;
  H.waist.rotation.z = !moving ? Math.sin(t * 0.8) * 0.03 : 0;

  // --- Хуруу, бугуй ---
  const relaxed = 0.35 + Math.sin(t * 0.9) * 0.08;
  let curl0 = mix(relaxed, 1.3, run), curl1 = curl0;
  const wk = 1 - run, hold = p.uurga ? 0.4 : 1;
  H.wrists[0].rotation.x = Math.sin(t * 2.1) * 0.3 * wk;
  H.wrists[1].rotation.x = Math.sin(t * 2.1 + 1) * 0.3 * wk * hold;
  H.wrists[1].rotation.z = Math.sin(t * 1.3) * 0.15 * wk * hold;

  // --- Морь унасан / тэрэг дээр суусан / гар өргөсөн ---
  if (p.mode === 'mounted') {
    H.legs[0].rotation.set(-0.9, 0, -0.5);
    H.legs[1].rotation.set(-0.9, 0, 0.5);
    H.knees[0].rotation.x = H.knees[1].rotation.x = 0.9;
    H.arms[0].rotation.set(-0.45, 0, H.arms[0].rotation.z);
    H.arms[1].rotation.set(-0.45, 0, H.arms[1].rotation.z);
    H.elbows[0].rotation.x = H.elbows[1].rotation.x = -0.85;   // жолоо барьсан
    H.waist.rotation.set(0.06, 0, 0);
    H.wrists[0].rotation.x = H.wrists[1].rotation.x = 0;
    curl0 = curl1 = 1.2;
  } else if (p.mode === 'seated') {
    H.legs[0].rotation.set(-1.4, 0, 0);
    H.legs[1].rotation.set(-1.4, 0, 0);
    H.knees[0].rotation.x = H.knees[1].rotation.x = 1.35;
    H.arms[0].rotation.set(-0.5, 0, H.arms[0].rotation.z);
    H.arms[1].rotation.set(-0.5, 0, H.arms[1].rotation.z);
    H.elbows[0].rotation.x = H.elbows[1].rotation.x = -0.7;
    H.waist.rotation.set(0, 0, 0);
  }
  if (p.raise) {
    H.arms[0].rotation.x = H.arms[1].rotation.x = -2.6;
    H.arms[0].rotation.y = H.arms[1].rotation.y = 0;
    H.elbows[0].rotation.x = H.elbows[1].rotation.x = -0.2;
    curl0 = 0.15;
  }
  H.curls[0](curl0);
  H.curls[1](curl1, p.uurga ? 1 : 0);

  // --- Нүүр: анивчих, харц, ярих, сэтгэл хөдлөл (зөөлөн шилжинэ) ---
  a.blinkT -= dt;
  if (a.blinkT <= 0) { a.blinkP = 0; a.blinkT = 2.2 + Math.random() * 3; }
  if (a.blinkP < 1) a.blinkP = Math.min(1, a.blinkP + dt / 0.16);
  const blink = Math.sin(a.blinkP * Math.PI);
  const gaze = Math.sin(t * 0.45) * 0.9 * (1 - run);
  const mouth = p.talk ? Math.abs(Math.sin(t * 9)) * (0.45 + 0.55 * Math.abs(Math.sin(t * 2.3))) : 0;
  const target = EMOTIONS[p.emotion];
  for (const k of Object.keys(a.emo)) a.emo[k] += (target[k] - a.emo[k]) * Math.min(1, dt * 8);
  paintFace({ blink, gaze, mouth, emo: a.emo });

  return moving ? Math.abs(Math.sin(phase)) * mix(0.02, 0.1, run) : 0;
}
