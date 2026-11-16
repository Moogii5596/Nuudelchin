/**
 * Хонь, ямааг sim-ийн төлөвөөс зурна (render/animals.ts дуудна): нэг кадрт `add` — мал бүрийн байрлал; `flush` — ойрын N малд
 * дэлгэрэнгүй, бусдад хөнгөн хувилбар, алсын малд кэшлэсэн тайван байрлал. Нас, тарга, зүс, туслахын тэмдэг, бэлчих/алхах/хэвтэх/
 * унтах/уух/үргэх хөдөлгөөн нь sim-ийн Animal-аас (mode, condition, age, ownerId); хөдөлгөөний төлөв sim-д хадгалагдахгүй.
 */
import * as THREE from 'three';
import type { GameConfig } from '../../sim/config';
import type { Animal } from '../../sim/state';
import { frameKg } from '../../sim/systems/animals';
import type { Quality } from '../../device';
import { animalLook, type LookSpecies } from './config';
import { goatModel } from './goat';
import { AnimalSet, RestPoses, type Rec } from './lod';
import { ageIdxOf, type AnimalModel } from './model';
import { makeRig, newState, poseAnimal, type Action, type PoseState, type Rig } from './pose';
import { sheepModel } from './sheep';

export const MODEL_SPECIES: readonly LookSpecies[] = ['sheep', 'goat'];
export const hasModel = (sp: string): sp is LookSpecies => sp === 'sheep' || sp === 'goat';

export interface Placed { a: Animal; x: number; y: number; z: number; heading: number; speed: number; dist: number }
interface Entry { st: PoseState; variant: number; seen: number }
interface PerSpecies { model: AnimalModel; rig: Rig; light: AnimalSet; detail: AnimalSet | null; rest: RestPoses; queue: { p: Placed; detail: boolean }[] }

const DETAIL_CAP = 64;

export class ModelAnimals {
  private sp = {} as Record<LookSpecies, PerSpecies>;
  private entries = new Map<number, Entry>();
  private frame = 0;
  private qual: Quality;
  private readonly m = new THREE.Matrix4();
  private readonly qt = new THREE.Quaternion();
  private readonly pv = new THREE.Vector3();
  private readonly sv = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);

  constructor(private cfg: GameConfig, private group: THREE.Object3D, quality: Quality) {
    this.qual = quality;
    for (const [model, name] of [[sheepModel, 'sheep'], [goatModel, 'goat']] as const) {
      const lightParts = model.parts('light');
      this.sp[name] = { model, rig: makeRig(name), light: new AnimalSet(lightParts, group), detail: null, rest: new RestPoses(name, lightParts), queue: [] };
    }
    this.applyQuality();
  }

  /** Чанар солигдоход дэлгэрэнгүй хувилбарыг үүсгэнэ/устгана */
  setQuality(q: Quality): void { this.qual = q; this.applyQuality(); }
  private applyQuality(): void {
    const want = animalLook.quality[this.qual].detail > 0;
    for (const name of MODEL_SPECIES) {
      const s = this.sp[name];
      if (want && !s.detail) s.detail = new AnimalSet(s.model.parts('detail'), this.group, DETAIL_CAP);
      else if (!want && s.detail) { s.detail.dispose(); s.detail = null; }
    }
  }

  /** Төрөл тус бүрийн гурвалжин ба draw call (stats, тест) */
  stats(): { drawCalls: number; lightTris: Record<string, number>; detailTris: Record<string, number> } {
    let dc = 0; const lt: Record<string, number> = {}, dt: Record<string, number> = {};
    for (const n of MODEL_SPECIES) { const s = this.sp[n]; dc += s.light.drawCalls + (s.detail?.drawCalls ?? 0); lt[n] = s.light.tris; dt[n] = s.detail?.tris ?? 0; }
    return { drawCalls: dc, lightTris: lt, detailTris: dt };
  }

  add(p: Placed): void { this.sp[p.a.species as LookSpecies].queue.push({ p, detail: false }); }

  /** Кадрын төгсгөл: хэсэг бүрийг instance-д бичнэ. animDist — хөдөлгөөнтэй зурах зай (м) */
  flush(dt0: number, animDist: number): void {
    this.frame++;
    const dt = Math.min(0.1, Math.max(0, Number.isFinite(dt0) ? dt0 : 0));   // сөрөг/том dt үйлдлийн жинг тархааж болохгүй
    const Qd = animalLook.quality[this.qual];
    // Хамгийн ойрын N мал (хоёр төрлийн хамт) дэлгэрэнгүй
    const near: { p: Placed; detail: boolean }[] = [];
    if (Qd.detail > 0) {
      const all = MODEL_SPECIES.flatMap((n) => this.sp[n].queue.filter((q) => q.p.dist <= Qd.detailR));
      for (const q of all) {
        let i = near.length;
        while (i > 0 && near[i - 1]!.p.dist > q.p.dist) i--;
        if (i < Qd.detail) { near.splice(i, 0, q); if (near.length > Qd.detail) near.pop(); }
      }
      for (const q of near) q.detail = true;
    }
    for (const n of MODEL_SPECIES) {
      const s = this.sp[n];
      s.light.begin(); s.detail?.begin();
      for (const q of s.queue) this.place(s, q.p, q.detail && s.detail !== null, dt, animDist);
      s.light.end(); s.detail?.end();
      s.queue.length = 0;
    }
    if (this.frame % 120 === 0) for (const [id, e] of this.entries) if (e.seen !== this.frame) this.entries.delete(id);
  }

  private place(s: PerSpecies, p: Placed, detail: boolean, dt: number, animDist: number): void {
    const a = p.a, cfg = this.cfg.animals, sc0 = cfg.species[a.species];
    let e = this.entries.get(a.id);
    if (!e) { e = { st: newState(), variant: s.model.variantOf(a.id), seen: 0 }; this.entries.set(a.id, e); }
    e.seen = this.frame;
    const mature = sc0.matureKg[a.sex], sc = Math.min(1.05, Math.max(0.35, Math.cbrt(frameKg(a, cfg) / mature)));
    const old = a.age >= sc0.oldAge;
    const rec: Rec = { male: a.sex === 'm', ageIdx: ageIdxOf(a.age, old), patch: s.model.isPatched(e.variant), mark: a.ownerId !== undefined };
    const cols = s.model.colors(e.variant, old);
    const resting = a.mode === 'rest' || a.mode === 'sleep', walking = p.speed > 0.3 && !resting;
    const action: Action = resting ? 'lie' : walking ? 'walk' : a.mode === 'graze' || a.mode === 'drink' ? 'graze' : 'stand';
    this.pv.set(p.x, p.y, p.z); this.qt.setFromAxisAngle(this.up, p.heading);
    const target = detail ? s.detail! : s.light;
    if (p.dist <= animDist || detail) {
      const rig = s.rig;
      rig.st = e.st;
      rig.root.position.copy(this.pv); rig.root.quaternion.copy(this.qt);
      poseAnimal(rig, dt, { action, speed: p.speed, fast: a.mode === 'flee' || p.speed > 2.2, sc, old, fat: a.condition, noStep: a.mode === 'drink' });
      rig.root.updateMatrixWorld(true);
      target.push(rig, rec, cols);
    } else {
      this.sv.setScalar(sc);
      this.m.compose(this.pv, this.qt, this.sv);
      target.pushRest(this.m, s.rest.get(action === 'walk' ? 'stand' : action), rec, cols);
    }
  }

  /** Бууц солигдох, шинэ тоглоом: хөдөлгөөний төлөвийг тэглэнэ */
  reset(): void { this.entries.clear(); }
}
