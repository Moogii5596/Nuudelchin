/**
 * Хөдөлгөөнгүй (нэг удаа тавьсан) мал: сумын төвийн үүдэнд хэвтсэн нохой, газрын зургийн унаа морь. Загвар (хөнгөн хэсгүүд) нэг
 * позоор тавигдаж, дэлхийн матрицаар геометр болон өнгө (instanceColor, алаг толбо) оройд шингэж, ГАНЦ энгийн Mesh болно —
 * bakeStatic-д ордог, instance/тусгай shader хэрэггүй.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { animalLook, type LookSpecies } from './config';
import { cowModel } from './cow';
import { dogModel } from './dog';
import { goatModel } from './goat';
import { horseModel } from './horse';
import type { Rec } from './lod';
import { ageIdxOf, type AnimalModel } from './model';
import { makeRig, settle, type Action } from './pose';
import { saddleDims } from './shapes';
import { sheepModel } from './sheep';
import { wolfModel } from './wolf';

const MODELS: Record<LookSpecies, AnimalModel> = { sheep: sheepModel, goat: goatModel, cow: cowModel, horse: horseModel, dog: dogModel, wolf: wolfModel };
const MAT = new THREE.MeshLambertMaterial({ vertexColors: true });

export interface StaticOpts { action?: Action; id?: number; male?: boolean; age?: number; sc?: number; saddled?: boolean; old?: boolean }
export interface StaticAnimal {
  mesh: THREE.Mesh;
  /** эмээлийн суудлын орой (mesh-ийн локал, морь) */
  seat: THREE.Vector3;
}

export function bakeAnimal(species: LookSpecies, o: StaticOpts = {}): StaticAnimal {
  const model = MODELS[species], parts = model.parts('light'), id = o.id ?? 1, old = !!o.old, age = o.age ?? 4;
  const rig = makeRig(species);
  settle(rig, o.action ?? 'stand', { speed: 0, fast: false, sc: o.sc ?? 1, old, fat: 0.6, noStep: true, saddled: !!o.saddled });
  const variant = model.variantOf(id), cols = model.colors(variant, old), P = animalLook.palette;
  const rec: Rec = { male: o.male ?? true, ageIdx: ageIdxOf(age, old), patch: model.isPatched(variant), mark: false, polled: model.isPolled(id), saddle: !!o.saddled };
  const PC = new THREE.Color(P.patch), ic = new THREE.Color(), baked: THREE.BufferGeometry[] = [];
  for (const p of parts) {
    if (p.use && !p.use(rec)) continue;
    ic.set(p.col(cols));
    p.node(rig).forEach((node) => {
      const g = p.geo.clone();
      g.applyMatrix4(node.matrixWorld);
      const col = g.attributes.color as THREE.BufferAttribute, slot = g.attributes.aSlot as THREE.BufferAttribute;
      for (let i = 0; i < col.count; i++) {   // lod.ts-ийн shader-тай ижил: aSlot 0 тогтмол, 1 instanceColor, 1..2 алаг толбо, 3 тэмдэг (энд байхгүй)
        const s = slot.getX(i), k = Math.min(s, 1), pk = Math.min(1, Math.max(0, s - 1));
        const base = [1 + (ic.r - 1) * k, 1 + (ic.g - 1) * k, 1 + (ic.b - 1) * k];
        const alt = rec.patch ? [ic.r + (PC.r - ic.r), ic.g + (PC.g - ic.g), ic.b + (PC.b - ic.b)] : [ic.r, ic.g, ic.b];
        const f = s >= 2.5 ? [ic.r, ic.g, ic.b] : [base[0]! + (alt[0]! - base[0]!) * pk, base[1]! + (alt[1]! - base[1]!) * pk, base[2]! + (alt[2]! - base[2]!) * pk];
        col.setXYZ(i, col.getX(i) * f[0]!, col.getY(i) * f[1]!, col.getZ(i) * f[2]!);
      }
      g.deleteAttribute('aSlot'); g.deleteAttribute('uv');
      baked.push(g.index ? g.toNonIndexed() : g);
    });
  }
  const geo = mergeGeometries(baked, false);
  if (!geo) throw new Error('bakeAnimal: нэгтгэх амжилтгүй');
  baked.forEach((g) => g.dispose());
  const mesh = new THREE.Mesh(geo, MAT);
  mesh.castShadow = true;
  const seat = rig.saddle.localToWorld(new THREE.Vector3(0, species === 'horse' ? saddleDims(animalLook.species.horse.d).seat : 0, 0));
  return { mesh, seat };
}
