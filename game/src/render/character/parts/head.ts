/**
 * Толгой (C-1: цилиндр хэлбэр, гөлгөр гадаргуу, чихгүй), хүзүү, үс. Нүүр нь зурмал (face.ts).
 */
import * as THREE from 'three';
import { profile, type Kit, type Pt } from '../geom';
import { hair, smooth } from '../materials';
import { liveFace, type FacePainter } from '../face';
import type { CharacterSpec } from '../spec';

/** Толгойн профайл [радиус, y]: доод нүүр бага зэрэг нарийссан цилиндр */
const HEAD: readonly Pt[] = [[0, -0.272], [0.16, -0.268], [0.228, -0.222], [0.24, -0.11], [0.24, 0], [0.24, 0.11], [0.226, 0.214], [0, 0.26]];
/** Толгойн тойргийн хуваалт `full` нарийвчлалд (нүүрний зургийн шилжилт ч үүнээс) */
const HEAD_SEG = 40;
export const headSegments = (kit: Kit): number => kit.q(HEAD_SEG, 14);

function headGeo(kit: Kit): THREE.LatheGeometry {
  const seg = headSegments(kit);
  const geo = new THREE.LatheGeometry(profile(HEAD, kit.q(28, 10)), seg, Math.PI + Math.PI / seg);   // оёдол нь ар талд (үсний доор)
  geo.computeVertexNormals();
  return geo;
}
/** Оройн үс: малгайгүй үед толгойн орой халзан харагдахгүй — толгойн профайлыг 1.6 см гадагш түлхэнэ */
function hairTopGeo(kit: Kit): THREE.LatheGeometry {
  const up = profile(HEAD, 56).filter((p) => p.y >= 0.15);
  const pts = [new THREE.Vector2(up[0]!.x + 0.003, up[0]!.y - 0.006)];
  for (const p of up) pts.push(new THREE.Vector2(p.x > 1e-4 ? p.x + 0.016 : 0, p.y + 0.016 * Math.min(1, (p.y - 0.15) / 0.09)));
  return new THREE.LatheGeometry(pts, kit.q(48, 12));
}
/** Үс: толгойн ар, хажууг хучсан бүрхүүл; доод хүрээ нь араас чамархай руу жигд өгссөн нэг шугам */
function hairGeo(kit: Kit): THREE.BufferGeometry {
  const HEADP = profile(HEAD, 56).map((p) => [p.x, p.y] as const);   // толгойн яг муруй (завсар гарахгүй)
  const headR = (y: number): number => {
    for (let n = 1; n < HEADP.length; n++) if (y <= HEADP[n]![1]) {
      const [r0, y0] = HEADP[n - 1]!, [r1, y1] = HEADP[n]!;
      return y1 - y0 < 1e-6 ? r1 : r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
    }
    return 0;
  };
  const ss = (a: number, b: number, x: number): number => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const TEMPLE = 2.22;                                   // ар голоос чамархай хүртэлх өнцөг (рад)
  const lowY = (d: number): number => -0.165 + 0.02 * ss(0, 1.0, d) + 0.15 * ss(1.15, 2.15, d);
  const NU = kit.q(56, 14), NV = kit.q(12, 4), TOP = 0.152;   // оройн үс 0.15-аас эхэлнэ — давхцаж гялтганахгүй
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let a = 0; a <= NU; a++) {
    const d = -TEMPLE + (a / NU) * TEMPLE * 2, phi = Math.PI + d, lo = lowY(Math.abs(d));
    for (let b = 0; b <= NV; b++) {
      const y = lo + (TOP - lo) * (b / NV);
      const back = Math.max(0, -Math.cos(phi));                              // ар талдаа арай зузаан
      const r = headR(y) + 0.016 + 0.01 * back * ss(0.2, -0.1, y);
      pos.push(r * Math.sin(phi), y, r * Math.cos(phi));
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

/** Хүзүү, толгой, үсийг g-д нэмнэ. hy — толгойн төвийн өндөр. Нүүр зурагчийг буцаана */
export function buildHead(spec: CharacterSpec, kit: Kit, g: THREE.Group, hy: number): FacePainter {
  const neckM = smooth(spec.skin.shade);   // хүзүү: эрүүний сүүдэрт бага зэрэг бараан
  kit.cyl(0.08, 0.092, 0.17, neckM, 0, 1.795, 0, g);
  kit.sball(0.02, neckM, 0, 1.8, 0.07, g).scale.set(1, 1.3, 0.8);   // хоолойн товгор
  // амьд нүүр зөвхөн full толгойд — шилжилт нь full хуваалтаар (олон хүн тогтмол нүүрээр солигдоно, crowd.ts)
  const face = liveFace(spec.skin.base, HEAD_SEG);
  const head = new THREE.Mesh(headGeo(kit), face.material);
  head.name = 'head';
  head.position.y = hy; head.castShadow = true;
  g.add(head);
  const hairM = hair(spec.hair.color);
  const back = new THREE.Mesh(hairGeo(kit), hairM);
  back.userData.noOutline = true;        // нээлттэй бүрхүүлд хар хүрээ тавибал үсийг бүхэлд нь хараар дарна
  back.name = 'hair';
  const top = new THREE.Mesh(hairTopGeo(kit), hairM);
  top.position.y = hy; top.name = 'hairTop'; top.castShadow = true;
  top.userData.noOutline = true;   // хажуугийн үстэй нийлэх тул дундуур нь хар шугам гаргахгүй
  g.add(top);
  back.position.y = hy; back.castShadow = true;
  g.add(back);
  return face;
}
