/**
 * Хөдөлгөөнгүй олон хүн (`crowd`, сумын оршин суугчид — docs/character-design.md §4.3): дүрийг бага хуваалтаар
 * угсарч, тайван зогсох байрлалд оруулж, ясны хувиргалтыг CPU дээр геометрт шингээгээд материалаар нэгтгэнэ.
 * Дуудагч хэсэг бүрийг InstancedMesh болгоно — хүний тоо хэд ч байсан нэг төрх ≈ 10 draw call.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bakeStatic } from './bake';
import { vertexColored } from './materials';
import { staticFaceMat } from './face';
import { makeKit } from './geom';
import { headSegments } from './parts/head';
import { buildCharacter, showOutfit } from './rig';
import { characters, characterSpec, withColors, type CharacterColors, type CrowdLookSpec } from './spec';

export interface CrowdPart {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  castShadow: boolean;
}
/** characters.json crowd.looks-ийн төрх; colors — дээл, хормойг солих (байхгүй бол preset-ийнх) */
export interface CrowdLook extends CrowdLookSpec {
  colors?: Pick<CharacterColors, 'deel' | 'hem'>;
}

const cache = new Map<string, CrowdPart[]>();

export function makeCrowdParts(look: CrowdLook): CrowdPart[] {
  const key = JSON.stringify(look);
  const hit = cache.get(key);
  if (hit) return hit;
  const { lod, shadowParts } = characters.crowd;
  const base = characterSpec(look.preset);
  const spec = look.colors ? withColors(base, look.colors) : base;
  // npc нарийвчлал (нэгтгэсэн материал — хэсэг цөөн), хуваалт crowd.lod
  const rig = buildCharacter(spec, { detail: 'npc', lod, hats: look.hat === 'none' ? [] : [look.hat] });
  showOutfit(rig.root, look.body, look.hat);
  // тайван зогсох байрлал: тохой бага зэрэг нугарсан, хуруу сул
  rig.elbows.forEach((e, i) => { e.rotation.x = rig.elbowRest[i] ?? 0; });
  rig.curls.forEach((c) => c(0.35));
  rig.root.updateMatrixWorld(true);
  const face = staticFaceMat(spec, headSegments(makeKit(lod, 'npc')));
  const parts: CrowdPart[] = bakeStatic([rig.root], { swap: (mesh, m) => (mesh.material === rig.face.material ? face : m) });
  // сүүдрийг зөвхөн хамгийн том хэсгүүд тусгана (сүүдрийн дамжлагын draw call хэмнэнэ)
  const big = parts.filter((p) => p.castShadow).sort((a, b) => b.geometry.attributes.position!.count - a.geometry.attributes.position!.count);
  parts.forEach((p) => { const i = big.indexOf(p); p.castShadow = i >= 0 && i < shadowParts; });
  cache.set(key, parts);
  faceSkin.set(face, spec.skin.base);
  return parts;
}

const faceSkin = new Map<THREE.Material, number>();
const farCache = new Map<string, CrowdPart>();

/**
 * Холын хялбаршуулсан хувилбар (characters.json crowd.nearR-ээс цааш): төрхийн бүх хэсгийг нэг оройн өнгөт геометрт
 * нийлүүлнэ — нүүрний зураг арьсны өнгө, бэхэн хүрээгүй, сүүдэргүй. Нэг төрх = 1 draw call.
 */
export function makeCrowdFar(look: CrowdLook): CrowdPart {
  const key = JSON.stringify(look);
  const hit = farCache.get(key);
  if (hit) return hit;
  const c = new THREE.Color(), geos: THREE.BufferGeometry[] = [];
  for (const p of makeCrowdParts(look)) {
    const m = p.material as THREE.MeshLambertMaterial;
    if (m.side === THREE.BackSide) continue;   // бэхэн хүрээ
    const skin = faceSkin.get(m);
    c.set(skin ?? m.color ?? 0xffffff);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', p.geometry.attributes.position!.clone());
    g.setAttribute('normal', p.geometry.attributes.normal!.clone());
    const n = g.attributes.position!.count, src = m.vertexColors ? p.geometry.attributes.color : undefined, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      col[i * 3] = c.r * (src ? src.getX(i) : 1); col[i * 3 + 1] = c.g * (src ? src.getY(i) : 1); col[i * 3 + 2] = c.b * (src ? src.getZ(i) : 1);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geos.push(g);
  }
  const geometry = mergeGeometries(geos, false);
  if (!geometry) throw new Error('makeCrowdFar: mergeGeometries амжилтгүй');
  geos.forEach((g) => g.dispose());
  geometry.computeBoundingSphere();
  const part: CrowdPart = { geometry, material: vertexColored(true, THREE.DoubleSide), castShadow: false };
  farCache.set(key, part);
  return part;
}
