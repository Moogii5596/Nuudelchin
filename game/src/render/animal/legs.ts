/**
 * Нийтлэг хоёр үетэй хөл (бүх малд: хонь, ямаа, дараа нь үхэр, адуу): дээд (хонго → өвдөг/шагай), доод (өвдөг → туурай).
 * Урд хөлийн өвдөг урагш, хойд хөлийн шагай хойш нугарна (pose.ts). Дэлгэрэнгүйд өвдөгний бөмбөлөг + туурай, хөнгөнд 5 талт хоолой;
 * хоёулаа нэг геометрт (хөл бүр 2 instance-ийн хэсэг: дээд, доод+туурай).
 */
import * as THREE from 'three';
import type { DLook } from './config';
import { animalLook } from './config';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ellipsoid, prep } from './geo';

export const legRm = (d: DLook): number => (d.legR0 + d.legR1) / 2 + 0.004;
export function legLens(d: DLook): { lu: number; ll: number; hh: number; hk: number } {
  const lu = d.legLen * d.legSplit;
  return { lu, ll: d.legLen - lu, hh: d.hoofH ?? 0.045, hk: d.hoofK ?? 1 };
}

const lathe = (pts: [number, number][], seg: number): THREE.BufferGeometry => {
  const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
  g.computeVertexNormals();
  return g;
};

/** Туурайн геометр (хөлийн доод үзүүр) */
function hoofGeo(r: number, ys: number): THREE.BufferGeometry {
  return lathe([[0, 0.004], [r, 0], [r * 1.12, -0.022 * ys], [r * 1.05, -0.05 * ys], [0, -0.052 * ys]], 16);
}

/** Дээд хэсэг: хөл + өвдөгний бөмбөлөг (нэг геометр, slot 1) */
export function legUpper(d: DLook, level: 'light' | 'detail'): THREE.BufferGeometry {
  const { lu } = legLens(d), rm = legRm(d);
  if (level === 'light') return prep(lathe([[d.legR0, 0], [rm, -lu], [rm * 0.6, -lu - 0.012]], 5), 1);
  const upper = prep(lathe([[0, 0], [d.legR0 * 0.92, -0.012], [d.legR0, -0.04], [rm, -lu]], 16), 1);
  const knee = prep(ellipsoid(rm * 0.6, rm * 0.6, rm * 0.6, [0, -lu, 0], 12, 8), 1);
  return merge2(upper, knee);
}

/** Доод хэсэг: шилбэ + туурай (туурай slot 0 — тогтмол өнгө) */
export function legLower(d: DLook, level: 'light' | 'detail'): THREE.BufferGeometry {
  const { ll, hh, hk } = legLens(d), rm = legRm(d), r1 = d.legR1, hoofC = animalLook.palette.hoof;
  if (level === 'light') {
    const hy = -(ll - hh), g = prep(lathe([[rm, 0], [r1, hy], [r1 * 1.1 * hk, hy], [r1 * 1.02 * hk, -ll]], 5), 1);
    const slot = g.attributes.aSlot as THREE.BufferAttribute, col = g.attributes.color as THREE.BufferAttribute, c = new THREE.Color(hoofC);
    for (let i = 0; i < g.attributes.position!.count; i++) if (i % 4 >= 2) { slot.setX(i, 0); col.setXYZ(i, c.r, c.g, c.b); }   // 3, 4-р цагираг = туурай
    return g;
  }
  const len = ll - hh, shin = prep(lathe([[rm, 0], [(rm + r1) / 2 + 0.002, -len * 0.45], [r1, -len * 0.92], [r1 * 0.96, -len], [0, -len]], 16), 1);
  const hoof = prep(hoofGeo(r1 * hk, hh / 0.045), 0, hoofC);
  hoof.translate(0, -len + 0.002, 0);
  return merge2(shin, hoof);
}

function merge2(a: THREE.BufferGeometry, b: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = mergeGeometries([a, b], false);
  if (!g) throw new Error('legs: mergeGeometries амжилтгүй');
  a.dispose(); b.dispose();
  return g;
}

/** Хойд шагайн амралтын өнцөг: дээд хэсэг хойш hr, доод хэсэг босоо болох нугаралт (сөрөг = урагш) */
export function hockKnee(d: DLook): number {
  const { lu, ll } = legLens(d), hr = d.hock;
  return hr ? -(hr + Math.asin(Math.min(1, (lu * Math.sin(hr)) / ll))) : 0;
}
