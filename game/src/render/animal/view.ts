/**
 * Малыг sim-ийн төлөвөөс зурна (render/animals.ts, characters.ts дуудна): нэг кадрт `add` — мал бүрийн байрлал; `flush` — ойрын N малд
 * дэлгэрэнгүй, бусдад хөнгөн хувилбар, алсын малд кэшлэсэн тайван байрлал. Бүх төрөл (хонь, ямаа, үхэр, адуу, нохой, чоно) нэг
 * замаар: төрөл бүр `model.ts`-ийн `AnimalModel` (sheep.ts, goat.ts, cow.ts, horse.ts, dog.ts, wolf.ts) — шинэ төрөл нэмэхэд
 * зөвхөн data/animals-look.json + нэг модуль. Төрлийн геометр нь анх дуудагдахад л бүтээгдэнэ (нохой, чоно ховор).
 * Нас, тарга, зүс, туслахын тэмдэг, үйлдэл нь `Placed`-д (placedOf — sim-ийн Animal-аас); хөдөлгөөний төлөв sim-д хадгалагдахгүй.
 */
import * as THREE from 'three';
import type { GameConfig } from '../../sim/config';
import type { Animal } from '../../sim/state';
import { frameKg } from '../../sim/systems/animals';
import type { Quality } from '../../device';
import { animalLook, LOOK_SPECIES, type LookSpecies } from './config';
import { cowModel } from './cow';
import { dogModel } from './dog';
import { goatModel } from './goat';
import { horseModel } from './horse';
import { AnimalSet, RestPoses, type Rec } from './lod';
import { ageIdxOf, type AnimalModel } from './model';
import { makeRig, newState, poseAnimal, type Action, type PoseState, type Rig } from './pose';
import { sheepModel } from './sheep';
import { wolfModel } from './wolf';

export const MODEL_SPECIES: readonly LookSpecies[] = LOOK_SPECIES;
export const hasModel = (sp: string): sp is LookSpecies => (LOOK_SPECIES as readonly string[]).includes(sp);
const MODELS: Record<LookSpecies, AnimalModel> = { sheep: sheepModel, goat: goatModel, cow: cowModel, horse: horseModel, dog: dogModel, wolf: wolfModel };
/** Төрөл бүрийн хөнгөн хувилбарын instance-ийн дээд хязгаар (өөрөөр өгөөгүй бол animalLook.lightCap) */
const CAPS: Partial<Record<LookSpecies, number>> = { cow: 1500, horse: 1000, dog: 200, wolf: 200 };

/** Нэг малын нэг кадрын дүрслэлийн мэдээлэл */
export interface Placed {
  id: number; species: LookSpecies; male: boolean;
  /** нас (жил): эвэр, насны шат */
  age: number; old: boolean;
  /** хэмжээ (root масштаб) 0.35–1.05, тарга 0–1 */
  sc: number; fat: number;
  /** туслахын нурууны тэмдэг */
  mark: boolean;
  action: Action; speed: number; fast: boolean; noStep?: boolean; saddled?: boolean;
  x: number; y: number; z: number; heading: number;
  /** тоглогч/камераас зай (м) — дэлгэрэнгүйг сонгоно */
  dist: number;
}
interface Entry { st: PoseState; variant: number; seen: number }
interface PerSpecies { model: AnimalModel; rig: Rig; light: AnimalSet; detail: AnimalSet | null; rest: RestPoses; queue: Placed[] }

const DETAIL_CAP = 64;

/** sim-ийн Animal → Placed (хонь, ямаа, үхэр, адуу). speed — бодит м/с */
export function placedOf(a: Animal, cfg: GameConfig, at: { x: number; y: number; z: number; heading: number; speed: number; dist: number }): Placed {
  const sc0 = cfg.animals.species[a.species], mature = sc0.matureKg[a.sex];
  const sp = a.species as LookSpecies, resting = a.mode === 'rest' || a.mode === 'sleep';
  let action: Action = 'stand';
  if (resting) action = 'lie';
  else if (at.speed > 0.3) action = sp === 'horse' ? (at.speed > 4.8 ? 'gallop' : at.speed > 2.2 ? 'trot' : 'walk') : 'walk';
  else if (a.mode === 'graze' || a.mode === 'drink') action = 'graze';
  return {
    id: a.id, species: sp, male: a.sex === 'm', age: a.age, old: a.age >= sc0.oldAge,
    sc: Math.min(1.05, Math.max(0.35, Math.cbrt(frameKg(a, cfg.animals) / mature))), fat: a.condition, mark: a.ownerId !== undefined,
    action, speed: at.speed, fast: a.mode === 'flee' || at.speed > 2.2, noStep: a.mode === 'drink',
    x: at.x, y: at.y, z: at.z, heading: at.heading, dist: at.dist,
  };
}

export class ModelAnimals {
  private sp: Partial<Record<LookSpecies, PerSpecies>> = {};
  private entries = new Map<number, Entry>();
  private frame = 0;
  private qual: Quality;
  private readonly m = new THREE.Matrix4();
  private readonly qt = new THREE.Quaternion();
  private readonly pv = new THREE.Vector3();
  private readonly sv = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);

  constructor(private group: THREE.Object3D, quality: Quality) {
    this.qual = quality;
  }

  private get(name: LookSpecies): PerSpecies {
    let s = this.sp[name];
    if (!s) {
      const model = MODELS[name], lightParts = model.parts('light');
      s = { model, rig: makeRig(name), light: new AnimalSet(lightParts, this.group, CAPS[name]), detail: null, rest: new RestPoses(name, lightParts), queue: [] };
      this.sp[name] = s;
      this.applyQuality();
    }
    return s;
  }
  private each(): [LookSpecies, PerSpecies][] { return (Object.entries(this.sp) as [LookSpecies, PerSpecies][]); }

  /** Чанар солигдоход дэлгэрэнгүй хувилбарыг үүсгэнэ/устгана */
  setQuality(q: Quality): void { this.qual = q; this.applyQuality(); }
  private applyQuality(): void {
    const want = animalLook.quality[this.qual].detail > 0;
    for (const [, s] of this.each()) {
      if (want && !s.detail) s.detail = new AnimalSet(s.model.parts('detail'), this.group, DETAIL_CAP);
      else if (!want && s.detail) { s.detail.dispose(); s.detail = null; }
    }
  }

  /** Төрөл бүрийн гурвалжин ба draw call (stats, тест) */
  stats(): { drawCalls: number; lightTris: Record<string, number>; detailTris: Record<string, number> } {
    let dc = 0; const lt: Record<string, number> = {}, dt: Record<string, number> = {};
    for (const [n, s] of this.each()) { dc += s.light.drawCalls + (s.detail?.drawCalls ?? 0); lt[n] = s.light.tris; dt[n] = s.detail?.tris ?? 0; }
    return { drawCalls: dc, lightTris: lt, detailTris: dt };
  }

  add(p: Placed): void { this.get(p.species).queue.push(p); }

  /** Кадрын төгсгөл: хэсэг бүрийг instance-д бичнэ. animDist — хөдөлгөөнтэй зурах зай (м) */
  flush(dt0: number, animDist: number): void {
    this.frame++;
    const dt = Math.min(0.1, Math.max(0, Number.isFinite(dt0) ? dt0 : 0));   // сөрөг/том dt үйлдлийн жинг тархааж болохгүй
    const Qd = animalLook.quality[this.qual];
    // Хамгийн ойрын N мал (бүх төрлийн хамт) дэлгэрэнгүй
    const near = new Set<Placed>();
    if (Qd.detail > 0) {
      const best: Placed[] = [];
      for (const [, s] of this.each()) for (const p of s.queue) {
        if (p.dist > Qd.detailR) continue;
        let i = best.length;
        while (i > 0 && best[i - 1]!.dist > p.dist) i--;
        if (i < Qd.detail) { best.splice(i, 0, p); if (best.length > Qd.detail) best.pop(); }
      }
      for (const p of best) near.add(p);
    }
    for (const [, s] of this.each()) {
      s.light.begin(); s.detail?.begin();
      for (const p of s.queue) this.place(s, p, near.has(p) && s.detail !== null, dt, animDist);
      s.light.end(); s.detail?.end();
      s.queue.length = 0;
    }
    if (this.frame % 120 === 0) for (const [id, e] of this.entries) if (e.seen !== this.frame) this.entries.delete(id);
  }

  private place(s: PerSpecies, p: Placed, detail: boolean, dt: number, animDist: number): void {
    const key = p.id * 8 + LOOK_SPECIES.indexOf(p.species);   // төрөл хооронд id давхцахгүй (нохой, чонын id тусдаа)
    let e = this.entries.get(key);
    if (!e) { e = { st: newState(), variant: s.model.variantOf(p.id), seen: 0 }; this.entries.set(key, e); }
    e.seen = this.frame;
    const rec: Rec = { male: p.male, ageIdx: ageIdxOf(p.age, p.old), patch: s.model.isPatched(e.variant), mark: p.mark, polled: s.model.isPolled(p.id), saddle: !!p.saddled };
    const cols = s.model.colors(e.variant, p.old);
    this.pv.set(p.x, p.y, p.z); this.qt.setFromAxisAngle(this.up, p.heading);
    const target = detail ? s.detail! : s.light;
    if (p.dist <= animDist || detail) {
      const rig = s.rig;
      rig.st = e.st;
      rig.root.position.copy(this.pv); rig.root.quaternion.copy(this.qt);
      poseAnimal(rig, dt, { action: p.action, speed: p.speed, fast: p.fast, sc: p.sc, old: p.old, fat: p.fat, noStep: p.noStep, saddled: p.saddled });
      rig.root.updateMatrixWorld(true);
      target.push(rig, rec, cols);
    } else {
      this.sv.setScalar(p.sc);
      this.m.compose(this.pv, this.qt, this.sv);
      const rest: Action = p.action === 'lie' ? 'lie' : p.action === 'graze' ? 'graze' : 'stand';
      target.pushRest(this.m, s.rest.get(rest), rec, cols);
    }
  }

  /** Бууц солигдох, шинэ тоглоом: хөдөлгөөний төлөвийг тэглэнэ */
  reset(): void { this.entries.clear(); }
}
