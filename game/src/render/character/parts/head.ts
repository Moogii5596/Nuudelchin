/**
 * Толгой (C-1: цилиндр хэлбэр, гөлгөр гадаргуу, чихгүй), хүзүү, үс. Нүүр нь зурмал (face.ts).
 */
import * as THREE from 'three';
import { noOut, profile, type Kit, type Pt } from '../geom';
import { hair, smooth } from '../materials';
import { atlasFace, liveFace, type FacePainter } from '../face';
import type { CharacterSpec, HeadShape } from '../spec';

/** Толгойн профайл [радиус, y]: доод нүүр бага зэрэг нарийссан цилиндр */
const HEAD: readonly Pt[] = [[0, -0.272], [0.16, -0.268], [0.228, -0.222], [0.24, -0.11], [0.24, 0], [0.24, 0.11], [0.226, 0.214], [0, 0.26]];
/** Толгойн хэлбэр (R4): round — дээд/доод захын бөөрөнхийлөлт (0 бол яг HEAD — тоглогч). Өргөн/өндрийг геометрт масштаблана */
export function headProfile(shape: HeadShape): readonly Pt[] {
  const r = shape.round;
  if (r === 0) return HEAD;
  return HEAD.map(([x, y], i): Pt => {
    if (i === 1) return [Math.max(0.06, x - 0.07 * r), y];
    if (i === 2) return [x - 0.03 * r, y + 0.012 * r];
    if (i === 6) return [x - 0.05 * r, y - 0.02 * r];
    return [x, y];
  });
}
/** Профайлын радиус тухайн өндөрт (масштаблахаас өмнө) */
export function profileRadius(prof: readonly Pt[]): (y: number) => number {
  const P = profile(prof, 56).map((p) => [p.x, p.y] as const);
  return (y) => {
    for (let n = 1; n < P.length; n++) if (y <= P[n]![1]) {
      const [r0, y0] = P[n - 1]!, [r1, y1] = P[n]!;
      return y1 - y0 < 1e-6 ? r1 : r0 + ((r1 - r0) * (y - y0)) / (y1 - y0);
    }
    return 0;
  };
}
/** Толгойн тойргийн хуваалт `full` нарийвчлалд (нүүрний зургийн шилжилт ч үүнээс) */
const HEAD_SEG = 40;
export const headSegments = (kit: Kit): number => kit.q(HEAD_SEG, 14);

function headGeo(kit: Kit, prof: readonly Pt[]): THREE.LatheGeometry {
  const seg = headSegments(kit);
  const geo = new THREE.LatheGeometry(profile(prof, kit.q(28, 10)), seg, Math.PI + Math.PI / seg);   // оёдол нь ар талд (үсний доор)
  geo.computeVertexNormals();
  return geo;
}
/** Оройн үс: малгайгүй үед толгойн орой халзан харагдахгүй — толгойн профайлыг 1.6 см гадагш түлхэнэ */
function hairTopGeo(kit: Kit, prof: readonly Pt[]): THREE.LatheGeometry {
  const up = profile(prof, 56).filter((p) => p.y >= 0.15);
  const pts = [new THREE.Vector2(up[0]!.x + 0.003, up[0]!.y - 0.006)];
  for (const p of up) pts.push(new THREE.Vector2(p.x > 1e-4 ? p.x + 0.016 : 0, p.y + 0.016 * Math.min(1, (p.y - 0.15) / 0.09)));
  return new THREE.LatheGeometry(pts, kit.q(48, 12));
}
/** Үс: толгойн ар, хажууг хучсан бүрхүүл; доод хүрээ нь араас чамархай руу жигд өгссөн нэг шугам */
/** TOP — дээд ирмэг (толгойн төвөөс), TEMPLE — ар голоос урагш хүрэх өнцөг (рад, чамархай 2.22) */
function hairGeo(kit: Kit, prof: readonly Pt[], TOP = 0.152, TEMPLE = 2.22): THREE.BufferGeometry {
  const headR = profileRadius(prof);   // толгойн яг муруй (завсар гарахгүй)
  const ss = (a: number, b: number, x: number): number => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const lowY = (d: number): number => -0.165 + 0.02 * ss(0, 1.0, d) + 0.15 * ss(1.15, 2.15, d);
  const NU = kit.q(56, 14), NV = kit.q(12, 4);   // TOP: оройн үс 0.15-аас эхэлнэ — давхцаж гялтганахгүй
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

/** Гэзэг: муруйн дагуу ээлжлэн хазайсан зууван бөмбөлгүүд (сүлжсэн), үзүүрт нь бүсний өнгийн боолт, нарийссан үзүүр */
function braid(kit: Kit, pts: THREE.Vector3[], r0: number, material: THREE.Material, tie: THREE.Material, g: THREE.Group): void {
  const curve = new THREE.CatmullRomCurve3(pts);
  const n = Math.max(6, Math.round(curve.getLength() / 0.045));
  const down = new THREE.Vector3(0, -1, 0), axisZ = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = curve.getPoint(t), side = i % 2 ? 1 : -1, r = r0 * (1 - 0.35 * t);
    const m = noOut(kit.sball(r, material, p.x + side * r * 0.3, p.y, p.z, g));
    m.scale.set(0.9, 1.5, 0.85);
    m.quaternion.setFromUnitVectors(down, curve.getTangent(t)).multiply(new THREE.Quaternion().setFromAxisAngle(axisZ, side * 0.45));
  }
  const end = curve.getPoint(1), dir = curve.getTangent(1);
  noOut(kit.sball(r0 * 0.75, tie, end.x, end.y, end.z, g)).scale.set(1, 0.6, 1);                  // боолт
  const tip = noOut(kit.lathe([[0.004, -0.1], [r0 * 0.45, -0.06], [r0 * 0.6, 0]], 1, material, end.x + dir.x * 0.02, end.y + dir.y * 0.02, end.z + dir.z * 0.02, g));
  tip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
}

/**
 * Үс (spec.hair.style): short — ар/хажуу + орой; bald — зөвхөн ар, хажуугийн нам хүрээ; bun — + ар талын боодол;
 * braids — + хоёр гэзэг урдуур мөрөн дээгүүр; braid — + нэг гэзэг араар. hy — толгойн төв
 */
function buildHair(spec: CharacterSpec, kit: Kit, g: THREE.Group, hy: number): void {
  const named = kit.detail === 'full';   // npc: нэргүй — bake-д нийлнэ (draw call хэмнэнэ)
  const hairM = hair(spec.hair.color, spec.hair.strands), style = spec.hair.style;
  const prof = headProfile(spec.headShape), { width: hw, height: hh } = spec.headShape, shaped = hw !== 1 || hh !== 1;
  const back = new THREE.Mesh(style === 'bald' ? hairGeo(kit, prof, 0.0, 1.75) : hairGeo(kit, prof), hairM);
  if (shaped) back.geometry.scale(hw, hh, hw);
  back.userData.noOutline = true;        // нээлттэй бүрхүүлд хар хүрээ тавибал үсийг бүхэлд нь хараар дарна
  if (named) back.name = 'hair';
  if (style !== 'bald') {
    const top = new THREE.Mesh(hairTopGeo(kit, prof), hairM);
    if (shaped) top.geometry.scale(hw, hh, hw);
    top.position.y = hy; top.castShadow = true;
    if (named) top.name = 'hairTop';
    top.userData.noOutline = true;   // хажуугийн үстэй нийлэх тул дундуур нь хар шугам гаргахгүй
    g.add(top);
  }
  back.position.y = hy; back.castShadow = true;
  g.add(back);
  const tie = smooth(spec.sash.color), V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x * hw, hy + y * hh, z * hw);
  if (style === 'bun') {
    const b0 = V(0, 0.08, -0.25), b1 = V(0, 0.06, -0.205);
    noOut(kit.sball(0.105, hairM, b0.x, b0.y, b0.z, g)).scale.set(1, 0.85, 0.75);
    noOut(kit.cyl(0.07, 0.07, 0.03, tie, b1.x, b1.y, b1.z, g)).rotation.x = Math.PI / 2 - 0.3;
  } else if (style === 'braids') {
    for (const sx of [-1, 1]) braid(kit, [V(sx * 0.2, -0.12, -0.05), V(sx * 0.25, -0.26, 0.03), V(sx * 0.27, -0.44, 0.15), V(sx * 0.255, -0.64, 0.2), V(sx * 0.24, -0.8, 0.215)], 0.04, hairM, tie, g);
  } else if (style === 'braid') {
    braid(kit, [V(0, -0.1, -0.21), V(0, -0.3, -0.3), V(0, -0.55, -0.335), V(0, -0.8, -0.34), V(0, -0.98, -0.33)], 0.048, hairM, tie, g);
  }
}

/** Хүзүү, толгой, үсийг g-д нэмнэ. hy — толгойн төвийн өндөр. Нүүр зурагчийг буцаана */
export function buildHead(spec: CharacterSpec, kit: Kit, g: THREE.Group, hy: number): FacePainter {
  const neckM = smooth(spec.skin.shade);   // хүзүү: эрүүний сүүдэрт бага зэрэг бараан
  kit.cyl(0.08, 0.092, 0.17, neckM, 0, 1.795, 0, g);
  kit.sball(0.02, neckM, 0, 1.8, 0.07, g).scale.set(1, 1.3, 0.8);   // хоолойн товгор
  // full: амьд canvas (шилжилт full хуваалтаар; олон хүнд crowd.ts тогтмол нүүрээр солино); npc: атлас
  const face = kit.detail === 'npc' ? atlasFace(spec, headSegments(kit)) : liveFace(spec, HEAD_SEG);
  const head = new THREE.Mesh(headGeo(kit, headProfile(spec.headShape)), face.material);
  const { width: hw, height: hh } = spec.headShape;
  if (hw !== 1 || hh !== 1) head.geometry.scale(hw, hh, hw);
  if (kit.detail === 'full') head.name = 'head';   // npc: bake-д орж хүрээ нь нийтийн хүрээнд нийлнэ
  head.position.y = hy; head.castShadow = true;
  g.add(head);
  buildHair(spec, kit, g, hy);
  return face;
}
