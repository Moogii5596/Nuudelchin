/**
 * Хөдөлгөөнгүй олон хүн (`crowd`, сумын оршин суугчид — docs/character-design.md §4.3): дүрийг бага хуваалтаар
 * угсарч, тайван зогсох байрлалд оруулж, ясны хувиргалтыг CPU дээр геометрт шингээгээд материалаар нэгтгэнэ.
 * Дуудагч хэсэг бүрийг InstancedMesh болгоно — хүний тоо хэд ч байсан нэг төрх ≈ 10 draw call.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { visualStyle, type OutfitBody } from '../style';
import { flipWinding } from './bake';
import { staticFaceMat } from './face';
import { makeKit } from './geom';
import { headSegments } from './parts/head';
import { buildCharacter, showOutfit } from './rig';
import { characterSpec, withColors, type CharacterColors } from './spec';

export interface CrowdPart {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  castShadow: boolean;
}
export interface CrowdLook {
  colors: CharacterColors;
  body: OutfitBody;
  /** малгайн нэр (`toortsog`, `fox`) эсвэл `none` */
  hat: string;
  /** characters.json preset (анхдагч `man`) */
  preset?: string;
}

const cache = new Map<string, CrowdPart[]>();

export function makeCrowdParts(look: CrowdLook): CrowdPart[] {
  const key = JSON.stringify(look);
  const hit = cache.get(key);
  if (hit) return hit;
  const lod = visualStyle.sumResidents.lod;
  const spec = withColors(characterSpec(look.preset ?? 'man'), look.colors);
  const rig = buildCharacter(spec, { lod });
  showOutfit(rig.root, look.body, look.hat);
  // тайван зогсох байрлал: тохой бага зэрэг нугарсан, хуруу сул
  rig.elbows.forEach((e, i) => { e.rotation.x = rig.elbowRest[i] ?? 0; });
  rig.curls.forEach((c) => c(0.35));
  rig.root.updateMatrixWorld(true);
  const face = staticFaceMat(spec.skin.base, headSegments(makeKit(lod)));
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
    const material = mesh.material === rig.face.material ? face : (mesh.material as THREE.Material);
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
      if (M.determinant() < 0) flipWinding(src);
    }
    add(material, keep(src, material), mesh.castShadow && !(material as THREE.MeshBasicMaterial).isMeshBasicMaterial);
  });
  const parts: CrowdPart[] = [];
  for (const [material, e] of byMat) {
    const geometry = mergeGeometries(e.geos, false);
    if (!geometry) throw new Error('makeCrowdParts: mergeGeometries амжилтгүй');
    geometry.computeBoundingSphere();
    parts.push({ geometry, material, castShadow: e.shadow });
  }
  // сүүдрийг зөвхөн хамгийн том хэсгүүд тусгана (сүүдрийн дамжлагын draw call хэмнэнэ)
  const big = parts.filter((p) => p.castShadow).sort((a, b) => b.geometry.attributes.position!.count - a.geometry.attributes.position!.count);
  parts.forEach((p) => { const i = big.indexOf(p); p.castShadow = i >= 0 && i < visualStyle.sumResidents.shadowParts; });
  cache.set(key, parts);
  return parts;
}
