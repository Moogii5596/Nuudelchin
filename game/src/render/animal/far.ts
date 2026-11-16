/**
 * Алс мал (хамгийн бүдүүвч LOD): төрөл бүрийн БҮХ хэсгийг (бие, хүзүү, толгой, 4 хөл, сүүл…) нэг геометр болгож, 3 тайван байрлал
 * (зогсох, бэлчих, хэвтэх) оройд морph-аар хадгална. Мал бүр = 1 instance; байрлалыг `iPose` (0 зогсох … 1 бэлчих … 2 хэвтэх)
 * гэж оройн shader-т холино. Төрөл бүр ГАНЦ draw call (≈ 300 гурвалжин), сүүдэргүй. Хөдөлгөөн (алхах) байхгүй — зөвхөн сүргийн
 * дунд хол харагдах малд (render/animal/view.ts: animalAnimationDistance-аас цааш, low чанарт бүх сүрэг).
 * Өнгө: wool = instanceColor, head = iHead, aux = iAux (хөлийн доод/дэл), алаг толбо, туслахын тэмдэг = iFlags.
 * Оройн атрибут: position ×3 (байрлал бүр) + normal + color + aTag = 6; instance: matrix ×4 + 5 = 9 → нийт 15 (≤ 16).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { animalLook, type LookSpecies } from './config';
import { buildParts, type Colors, type Rec } from './lod';
import { makeRig, settle, type Action } from './pose';

const POSES: Action[] = ['stand', 'graze', 'lie'];
/** iPose утга */
export const POSE_OF: Record<'stand' | 'graze' | 'lie', number> = { stand: 0, graze: 1, lie: 2 };
const vec = (c: THREE.Color): string => `vec3( ${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)} )`;
const PCV = vec(new THREE.Color(animalLook.palette.patch)), MCV = vec(new THREE.Color(animalLook.palette.mark));

export const FMAT = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true });
FMAT.onBeforeCompile = (sh) => {
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nattribute vec3 aPos1;\nattribute vec3 aPos2;\nattribute vec3 aTag;\nattribute vec3 iHead;\nattribute vec3 iAux;\nattribute vec2 iFlags;\nattribute float iPose;')
    .replace('#include <begin_vertex>', 'vec3 transformed = iPose < 1.0 ? mix( position, aPos1, iPose ) : mix( aPos1, aPos2, iPose - 1.0 );')
    .replace('#include <color_vertex>', [
      'vColor = vec4( 1.0 );', '#ifdef USE_COLOR', ' vColor.rgb *= color;', '#endif', '#ifdef USE_INSTANCING_COLOR',
      ' vec3 wool = instanceColor.rgb;',
      ' vec3 rc = aTag.x < 0.5 ? vec3( 1.0 ) : aTag.x < 1.5 ? wool : aTag.x < 2.5 ? iHead : aTag.x < 3.5 ? mix( wool, iHead, 0.5 ) : aTag.x < 4.5 ? iAux : wool;',
      ' vec3 base = mix( vec3( 1.0 ), rc, aTag.y );',
      ` vec3 patched = mix( base, mix( rc, ${PCV}, iFlags.x ), aTag.z );`,
      ` vec3 marked = mix( wool, ${MCV}, iFlags.y );`,
      ' vColor.rgb *= aTag.x > 4.5 ? marked : patched;', '#endif',
    ].join('\n'));
};

/** Төрөл бүрийн төлөөлөх бүтэц: хүйс/нас/зүсний хувилбар нэг (алсаас ялгагдахгүй) */
const repRec = (sp: LookSpecies): Rec => ({ male: sp === 'goat' || sp === 'sheep' || sp === 'dog' || sp === 'wolf', ageIdx: 4, patch: false, mark: true, polled: false, saddle: false });
/** col()-оос үүрэг: 1 wool, 2 head, 3 leg, 4 aux (хөлийн доод, дэл, сүүл) */
const PROBE: Colors = { wool: 1, head: 2, leg: 3, legLow: 4, mane: 4, tail: 4 };

export function buildFarGeometry(species: LookSpecies): THREE.BufferGeometry {
  const parts = buildParts(species, 'far'), rec = repRec(species), rig = makeRig(species);
  const perPose: THREE.BufferGeometry[][] = POSES.map(() => []);
  POSES.forEach((action, pi) => {
    settle(rig, action, { speed: 0, fast: false, sc: 1, old: false, fat: 0.6, noStep: true });
    for (const p of parts) {
      if (p.use && !p.use(rec)) continue;
      const role = p.col(PROBE);
      p.node(rig).forEach((node) => {
        let g = p.geo.clone();
        g.applyMatrix4(node.matrixWorld);
        if (g.index) g = g.toNonIndexed();
        if (pi === 0) {   // зөвхөн эхний байрлалд нормал, өнгө, үүрэг; бусдад зөвхөн байрлал
          const slot = g.attributes.aSlot as THREE.BufferAttribute, tag = new Float32Array(slot.count * 3);
          for (let i = 0; i < slot.count; i++) {
            const s = slot.getX(i), w = Math.min(1, s), pw = Math.min(1, Math.max(0, s - 1));
            if (s >= 2.5) tag.set([5, 1, 0], i * 3); else tag.set([w > 0 ? role : 0, w, pw], i * 3);
          }
          g.setAttribute('aTag', new THREE.BufferAttribute(tag, 3));
          g.deleteAttribute('aSlot'); g.deleteAttribute('uv');
        } else for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k);
        perPose[pi]!.push(g);
      });
    }
  });
  const [stand, graze, lie] = perPose.map((list) => {
    const m = mergeGeometries(list, false);
    if (!m) throw new Error('far: нэгтгэх амжилтгүй');
    list.forEach((g) => g.dispose());
    return m;
  }) as [THREE.BufferGeometry, THREE.BufferGeometry, THREE.BufferGeometry];
  stand.setAttribute('aPos1', graze.attributes.position!);
  stand.setAttribute('aPos2', lie.attributes.position!);
  return stand;
}

export class FarSet {
  readonly mesh: THREE.InstancedMesh;
  readonly tris: number;
  readonly cap: number;
  private n = 0;
  private readonly cc = new THREE.Color();
  private readonly head: THREE.InstancedBufferAttribute;
  private readonly aux: THREE.InstancedBufferAttribute;
  private readonly flags: THREE.InstancedBufferAttribute;
  private readonly pose: THREE.InstancedBufferAttribute;

  constructor(private species: LookSpecies, parent: THREE.Object3D, cap: number) {
    this.cap = cap;
    const geo = buildFarGeometry(species);
    this.tris = geo.attributes.position!.count / 3;
    this.head = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    this.aux = new THREE.InstancedBufferAttribute(new Float32Array(cap * 3), 3);
    this.flags = new THREE.InstancedBufferAttribute(new Float32Array(cap * 2), 2);
    this.pose = new THREE.InstancedBufferAttribute(new Float32Array(cap), 1);
    geo.setAttribute('iHead', this.head); geo.setAttribute('iAux', this.aux); geo.setAttribute('iFlags', this.flags); geo.setAttribute('iPose', this.pose);
    const m = new THREE.InstancedMesh(geo, FMAT, cap);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.setColorAt(0, this.cc.set(0xffffff));
    m.frustumCulled = false; m.castShadow = false; m.count = 0;
    parent.add(m);
    this.mesh = m;
  }

  begin(): void { this.n = 0; }
  /** root — мал бүрийн дэлхийн матриц (байрлал, чиглэл, хэмжээ); pose — 0 зогсох, 1 бэлчих, 2 хэвтэх */
  push(root: THREE.Matrix4, cols: Colors, patch: boolean, mark: boolean, pose: number): void {
    if (this.n >= this.cap) return;
    const i = this.n++, c = this.cc;
    this.mesh.setMatrixAt(i, root);
    this.mesh.setColorAt(i, c.set(cols.wool));
    c.set(cols.head); this.head.setXYZ(i, c.r, c.g, c.b);
    c.set(this.species === 'horse' ? cols.mane : cols.legLow); this.aux.setXYZ(i, c.r, c.g, c.b);
    this.flags.setXY(i, patch ? 1 : 0, mark ? 1 : 0);
    this.pose.setX(i, pose);
  }
  end(): void {
    const m = this.mesh;
    m.count = this.n; m.visible = this.n > 0;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    this.head.needsUpdate = this.aux.needsUpdate = this.flags.needsUpdate = this.pose.needsUpdate = true;
    m.boundingSphere = null;
  }
  get drawCalls(): number { return this.mesh.visible ? 1 : 0; }
  dispose(): void { this.mesh.removeFromParent(); this.mesh.geometry.dispose(); this.mesh.dispose(); }
}
