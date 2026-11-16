/**
 * Гүйцэтгэл: дүрийг АРАГ ЯСТАЙ цөөн mesh (SkinnedMesh) болгоно (draw call 428 → 39, docs/character-design.md §2).
 * Үе мөчний бүлгүүд (Group) хэвээр үлдэж яс болно — анимац тэднийг өмнөх шигээ эргүүлнэ. Mesh бүрийн оройг эцэг
 * бүлэг (яс)-т нь 100% холбож, нэг давхарга (`body:*`, `hat:*` — улирлаар харагдах/нуугдах) доторх хэсгүүдийг
 * материалаар нь нэгтгэнэ. Нэг өнгийн (зураггүй) материалуудыг оройн өнгө болгож нэг материалд нийлүүлнэ. Бэхэн
 * хүрээ давхарга бүрт нэг mesh. Нэртэй mesh (head, hair, uurga, sack …) ба InstancedMesh (үс) хэвээр үлдэнэ.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { outline, vertexColored } from './materials';

const LAYER = /^(body|hat):/;
const WHITE = new THREE.Color(1, 1, 1);

/** Толин тусгал хувиргалт: гурвалжны эргэлтийг буцаана (гадагш харсан тал хэвээр). g индексгүй байх ёстой */
export function flipWinding(g: THREE.BufferGeometry): void {
  for (const name of Object.keys(g.attributes)) {
    const at = g.attributes[name]!, sz = at.itemSize, arr = at.array as Float32Array;
    for (let t = 0; t < at.count; t += 3) for (let c = 0; c < sz; c++) {
      const i1 = (t + 1) * sz + c, i2 = (t + 2) * sz + c;
      const v = arr[i1]!; arr[i1] = arr[i2]!; arr[i2] = v;
    }
  }
}

export interface BakeOptions {
  /** ажиллах үед өнгө нь өөрчлөгддөг материал (ханцуй улирлаар) — оройн өнгөнд шингээхгүй */
  liveMats?: readonly THREE.Material[];
  /** ижил нэртэй давхаргуудыг (body:deel-ийн бэлхүүсээс дээш/доош, ханцуйн үс) нэг mesh болгоно (npc) */
  mergeByName?: boolean;
  /** нэг өнгийн хэсгүүдийг нэг/хоёр талаас үл хамааран нэг (хоёр талт) материалд нийлүүлнэ (npc) */
  doubleSided?: boolean;
  /** сүүдэр тусгах хамгийн том mesh-ийн тоо (бусад нь сүүдэргүй); байхгүй бол хязгааргүй */
  shadowParts?: number;
}

export function bakeSkinned(root: THREE.Object3D, opts: BakeOptions = {}, k = 1.06): { bones: number; meshes: number } {
  const liveMats = opts.liveMats ?? [];
  root.updateMatrixWorld(true);
  const INK = outline();
  const layerOf = (o: THREE.Object3D): THREE.Object3D => {
    for (let q = o.parent; q && q !== root; q = q.parent) if (LAYER.test(q.name)) return q;
    return root;
  };
  const sources: THREE.Mesh[] = [];
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh || (m as THREE.SkinnedMesh).isSkinnedMesh || m.name || m.children.length || Array.isArray(m.material)) return;
    for (let q: THREE.Object3D | null = m; q && q !== root; q = q.parent) if (!q.visible && !LAYER.test(q.name)) return;   // нуугдсан хэсэг
    sources.push(m);
  });
  // жижиг хэсгүүд сүүдэр тусгахгүй (нэгтгэсэн mesh сүүдэр тусгах эсэхийг том хэсгүүд шийднэ)
  for (const o of sources) { o.geometry.computeBoundingSphere(); if (o.geometry.boundingSphere!.radius < 0.1) o.castShadow = false; }
  const bones: THREE.Object3D[] = [], boneIdx = new Map<THREE.Object3D, number>();
  const boneOf = (o: THREE.Object3D): number => {
    const p = o.parent!;
    let i = boneIdx.get(p);
    if (i === undefined) { i = bones.length; bones.push(p); boneIdx.set(p, i); }
    return i;
  };
  const flatColor = (m: THREE.Material): m is THREE.MeshLambertMaterial => {
    const l = m as THREE.MeshLambertMaterial;
    return !!l.isMeshLambertMaterial && !l.map && !liveMats.includes(l) && !l.transparent && l.opacity === 1 && !l.alphaTest && l.emissive.getHex() === 0;
  };
  interface Bucket { layer: THREE.Object3D; material: THREE.Material; geos: THREE.BufferGeometry[]; shadow: boolean }
  const buckets = new Map<string, Bucket>();
  const bucket = (layer: THREE.Object3D, material: THREE.Material): Bucket => {
    const key = (opts.mergeByName && layer !== root ? layer.name : layer.uuid) + '|' + material.uuid;
    let b = buckets.get(key);
    if (!b) { b = { layer, material, geos: [], shadow: false }; buckets.set(key, b); }
    return b;
  };
  /** Геометрийг нэг хэлбэрт оруулна: индексгүй, position/normal (+uv, +color), бүх оройд нэг яс */
  const prep = (m: THREE.Mesh, matrix: THREE.Matrix4, wantUv: boolean, wantColor: boolean, tint: THREE.Color = WHITE): THREE.BufferGeometry => {
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
    if (!g.attributes.normal) g.computeVertexNormals();
    const n = g.attributes.position!.count;
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
    if (matrix.determinant() < 0) flipWinding(g);
    const bi = boneOf(m), si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { si[i * 4] = bi; sw[i * 4] = 1; }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    return g;
  };
  const scaleK = new THREE.Matrix4().makeScale(k, k, k);
  for (const m of sources) {
    const layer = layerOf(m), mat = m.material as THREE.Material;
    if (mat === INK) {   // гараар хийсэн хүрээ (гутлын хүрээ)
      bucket(layer, INK).geos.push(prep(m, m.matrixWorld, false, false));
    } else if (flatColor(mat)) {
      const bk = bucket(layer, vertexColored(mat.flatShading, opts.doubleSided ? THREE.DoubleSide : mat.side));
      bk.geos.push(prep(m, m.matrixWorld, false, true, mat.color));
      bk.shadow ||= m.castShadow;
    } else {
      const l = mat as THREE.MeshLambertMaterial;
      const bk = bucket(layer, mat);
      bk.geos.push(prep(m, m.matrixWorld, Boolean(l.map), Boolean(l.vertexColors)));
      bk.shadow ||= m.castShadow;
    }
    if (!m.userData.noOutline) bucket(layer, INK).geos.push(prep(m, m.matrixWorld.clone().multiply(scaleK), false, false));
  }
  for (const m of sources) m.removeFromParent();
  // яс = үе мөчний бүлгүүд; урвуу матрицыг одоогийн (амрах) байрлалаас тооцно
  const skeleton = new THREE.Skeleton(bones as THREE.Bone[]);
  const identity = new THREE.Matrix4();
  if (opts.shadowParts !== undefined) {   // сүүдрийн дамжлагын draw call хэмнэнэ: зөвхөн хамгийн том хэсгүүд
    const size = (b: Bucket): number => b.geos.reduce((s, g) => s + g.attributes.position!.count, 0);
    const byLayer = new Map<string, Bucket[]>();
    for (const b of buckets.values()) {
      if (!b.shadow || b.material === INK) continue;
      const id = b.layer === root ? '' : b.layer.name;   // давхарга бүрд (улирлын хувцас нэг л харагдана)
      byLayer.set(id, [...(byLayer.get(id) ?? []), b]);
    }
    for (const list of byLayer.values()) list.sort((a, b) => size(b) - size(a)).forEach((b, i) => { b.shadow = i < opts.shadowParts!; });
  }
  for (const { layer, material, geos, shadow } of buckets.values()) {
    const merged = mergeGeometries(geos, false);
    if (!merged) throw new Error('bakeSkinned: mergeGeometries амжилтгүй');
    const sk = new THREE.SkinnedMesh(merged, material);
    sk.userData.noOutline = true;
    sk.castShadow = shadow && material !== INK;
    sk.frustumCulled = false;   // ясаар хөдөлдөг тул анхны хүрээгээр тасалбал алга болж мэднэ
    layer.add(sk);              // давхарга нуугдахад хамт нуугдана
    sk.updateMatrixWorld(true);
    sk.bind(skeleton, identity);
  }
  return { bones: bones.length, meshes: buckets.size };
}

/** Үлдсэн (нэртэй) mesh бүрд хүүхэд болгон бэхэн хүрээ нэмнэ */
export function addOutline(root: THREE.Object3D, k = 1.06): void {
  const targets: THREE.Mesh[] = [];
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh && !o.userData.noOutline) targets.push(o as THREE.Mesh); });
  const INK = outline();
  for (const m of targets) {
    const o = new THREE.Mesh(m.geometry, INK);
    o.scale.setScalar(k);
    m.add(o);
  }
}

/** Хөдөлгөөнгүй объектуудын нэгтгэсэн хэсэг: нэг материал = нэг draw call */
export interface StaticPart {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  castShadow: boolean;
}
export interface StaticBakeOptions {
  /** материалын нэгтгэх түлхүүр — ижил тохиргоотой өөр материалтай объектуудыг нэгтгэнэ (байхгүй бол материал өөрөө) */
  key?: (m: THREE.Material) => string;
  /** mesh-ийн материалыг солих; null — тэр mesh-ийг хасна */
  swap?: (mesh: THREE.Mesh, m: THREE.Material) => THREE.Material | null;
}

/**
 * Хөдөлгөөнгүй объектуудыг (root бүрийн одоогийн байрлал, яс, харагдах байдлаар) CPU дээр геометрт шингээж материалаар
 * нь нэгтгэнэ: N объект × M материал → M хэсэг. SkinnedMesh-ийн оройг өөрийн ясаар (100% холбоос) хувиргана. Үр дүн
 * root-уудын эцгийн координатад (root-ууд үзэгдэлд залгаагүй байх ёстой). Хүмүүсийн бөөгнөрөл, хэвтээ нохой, гэр.
 */
export function bakeStatic(roots: readonly THREE.Object3D[], opts: StaticBakeOptions = {}): StaticPart[] {
  const groups = new Map<unknown, { material: THREE.Material; geos: THREE.BufferGeometry[]; shadow: boolean }>();
  const v = new THREE.Vector3(), nm = new THREE.Matrix3();
  const keep = (g: THREE.BufferGeometry, m: THREE.MeshLambertMaterial): THREE.BufferGeometry => {
    for (const name of Object.keys(g.attributes)) {
      const ok = name === 'position' || name === 'normal' || (name === 'uv' && !!m.map) || (name === 'color' && !!m.vertexColors);
      if (!ok) g.deleteAttribute(name);
    }
    const n = g.attributes.position!.count;
    if (m.map && !g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
    if (m.vertexColors && !g.attributes.color) g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(n * 3).fill(1), 3));
    return g;
  };
  for (const root of roots) {
    root.updateMatrixWorld(true);
    const shown = (o: THREE.Object3D): boolean => { for (let q: THREE.Object3D | null = o; q; q = q === root ? null : q.parent) if (!q.visible) return false; return true; };
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || (mesh as THREE.InstancedMesh).isInstancedMesh || Array.isArray(mesh.material) || !shown(mesh)) return;
      const material = opts.swap ? opts.swap(mesh, mesh.material) : mesh.material;
      if (!material) return;
      const src = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      if (!src.attributes.normal) src.computeVertexNormals();
      const sk = mesh as THREE.SkinnedMesh;
      if (sk.isSkinnedMesh && src.attributes.skinIndex) {
        const bones = sk.skeleton.bones, inv = sk.skeleton.boneInverses;
        const si = src.attributes.skinIndex, pos = src.attributes.position!, nor = src.attributes.normal!;
        const mats = bones.map((b, i) => new THREE.Matrix4().multiplyMatrices(b.matrixWorld, inv[i]!));
        for (let i = 0; i < pos.count; i++) {
          const bm = mats[si.getX(i)]!;
          v.fromBufferAttribute(pos, i).applyMatrix4(bm); pos.setXYZ(i, v.x, v.y, v.z);
          nm.getNormalMatrix(bm);
          v.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize(); nor.setXYZ(i, v.x, v.y, v.z);
        }
      } else {
        src.applyMatrix4(mesh.matrixWorld);
        if (mesh.matrixWorld.determinant() < 0) flipWinding(src);
      }
      const k = opts.key ? opts.key(material) : material;
      const e = groups.get(k) ?? { material, geos: [], shadow: false };
      e.geos.push(keep(src, material as THREE.MeshLambertMaterial));
      e.shadow ||= mesh.castShadow && !(material as THREE.MeshBasicMaterial).isMeshBasicMaterial;
      groups.set(k, e);
    });
  }
  const parts: StaticPart[] = [];
  for (const e of groups.values()) {
    const geometry = mergeGeometries(e.geos, false);
    if (!geometry) throw new Error('bakeStatic: mergeGeometries амжилтгүй');
    e.geos.forEach((g) => g.dispose());
    geometry.computeBoundingSphere();
    parts.push({ geometry, material: e.material, castShadow: e.shadow });
  }
  return parts;
}

/** Хэсгүүдийг Mesh болгоно (хүлээн авах сүүдэр — материал хүлээн авдаг бол) */
export function staticMeshes(parts: readonly StaticPart[], castShadow = true): THREE.Mesh[] {
  return parts.map((p) => {
    const m = new THREE.Mesh(p.geometry, p.material);
    m.castShadow = castShadow && p.castShadow;
    m.receiveShadow = !(p.material as THREE.MeshBasicMaterial).isMeshBasicMaterial;
    return m;
  });
}
