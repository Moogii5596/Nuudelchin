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
import { FarSet, POSE_OF } from './far';
import { AnimalSet, type Rec } from './lod';
import { ageIdxOf, type AnimalModel } from './model';
import { gaitFor, makeRig, newState, poseAnimal, type Action, type PoseState, type Rig } from './pose';
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
  /** poseAnimal-ийн дараа дуудна (унаа морины эмээлийн байрлалыг авахад) */
  onPose?: (rig: Rig) => void;
  x: number; y: number; z: number; heading: number;
  /** тоглогч/камераас зай (м) — дэлгэрэнгүйг сонгоно */
  dist: number;
}
interface Entry { st: PoseState; variant: number; seen: number }
interface PerSpecies { model: AnimalModel; rig: Rig; light: AnimalSet | null; detail: AnimalSet | null; far: FarSet | null; queue: Placed[] }

const DETAIL_CAP = 64;

/** sim-ийн Animal → Placed (хонь, ямаа, үхэр, адуу). speed — бодит м/с */
export function placedOf(a: Animal, cfg: GameConfig, at: { x: number; y: number; z: number; heading: number; speed: number; dist: number }): Placed {
  const sc0 = cfg.animals.species[a.species], mature = sc0.matureKg[a.sex];
  const sp = a.species as LookSpecies, resting = a.mode === 'rest' || a.mode === 'sleep';
  let action: Action = 'stand';
  if (resting) action = 'lie';
  else if (at.speed > 0.3) action = sp === 'horse' ? gaitFor(animalLook.species.horse, at.speed) : 'walk';
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

  /** farTier — алс/бүх сүргийг ганц draw call-тай бүдүүвч шатаар зурна (сүрэг: animals.ts); false — бүх мал хөдөлгөөнтэй (унаа морь, нохой, чоно) */
  constructor(private group: THREE.Object3D, quality: Quality, private farTier = false) {
    this.qual = quality;
  }

  private get(name: LookSpecies): PerSpecies {
    let s = this.sp[name];
    if (!s) {
      s = { model: MODELS[name], rig: makeRig(name), light: null, detail: null, far: null, queue: [] };
      this.sp[name] = s;
      this.applyQuality();
    }
    return s;
  }
  private each(): [LookSpecies, PerSpecies][] { return (Object.entries(this.sp) as [LookSpecies, PerSpecies][]); }

  /** Чанар солигдоход дэлгэрэнгүй хувилбарыг үүсгэнэ/устгана */
  setQuality(q: Quality): void { this.qual = q; this.applyQuality(); }
  private applyQuality(): void {
    const want = this.detailN() > 0;
    for (const [, s] of this.each()) {
      if (want && !s.detail) s.detail = new AnimalSet(s.model.parts('detail'), this.group, DETAIL_CAP);
      else if (!want && s.detail) { s.detail.dispose(); s.detail = null; }
      if (s.light) this.shadows(s.light);
      if (s.detail) this.shadows(s.detail);
    }
  }
  /** Утасны хөнгөн горим (data/visuals.json grass.touch.lodShadows; scene.ts нэг удаа тавина): draw call хэмнэнэ — загварт хүрэхгүй, зөвхөн зурах бодлого */
  static lite = false;
  /** Ойрын хэдэн мал дэлгэрэнгүй хувилбараар зурагдах вэ (утсанд 0 — жижиг дэлгэцэд ялгаа харагдахгүй, draw call хоёр дахин бага) */
  private detailN(): number { return ModelAnimals.lite ? 0 : animalLook.quality[this.qual].detail; }
  /** Сүүдэр: хөнгөн чанарт үгүй; утсанд зөвхөн их бие (эхний хэсэг ба түүний хувилбарууд) — хөл, толгойн сүүдэр тус бүр нэг draw call */
  private shadows(set: AnimalSet): void {
    const torso = set.parts[0]!.name.split(' ')[0]!;   // «бие+сүүл» (♂/♀/өсвөр хувилбарууд ижил эхлэлтэй)
    set.meshes.forEach((m, i) => { m.castShadow = this.qual !== 'low' && (!ModelAnimals.lite || set.parts[i]!.name.startsWith(torso)); });
  }

  /** Төрөл бүрийн гурвалжин ба draw call (stats, тест) */
  stats(): { drawCalls: number; lightTris: Record<string, number>; detailTris: Record<string, number>; farTris: Record<string, number> } {
    let dc = 0; const lt: Record<string, number> = {}, dt: Record<string, number> = {}, farTris: Record<string, number> = {};
    for (const [n, s] of this.each()) { dc += (s.light?.drawCalls ?? 0) + (s.detail?.drawCalls ?? 0) + (s.far?.drawCalls ?? 0); lt[n] = s.light?.tris ?? 0; dt[n] = s.detail?.tris ?? 0; farTris[n] = s.far?.tris ?? 0; }
    return { drawCalls: dc, lightTris: lt, detailTris: dt, farTris };
  }

  add(p: Placed): void { this.get(p.species).queue.push(p); }

  /** Кадрын төгсгөл: хэсэг бүрийг instance-д бичнэ. animDist — хөдөлгөөнтэй зурах зай (м) */
  flush(dt0: number, animDist: number): void {
    this.frame++;
    const dt = Math.min(0.1, Math.max(0, Number.isFinite(dt0) ? dt0 : 0));   // сөрөг/том dt үйлдлийн жинг тархааж болохгүй
    const Qd = animalLook.quality[this.qual];
    // Хамгийн ойрын N мал (бүх төрлийн хамт) дэлгэрэнгүй
    const near = new Set<Placed>();
    const detailN = this.detailN();
    if (detailN > 0) {
      const best: Placed[] = [];
      for (const [, s] of this.each()) for (const p of s.queue) {
        if (p.dist > Qd.detailR) continue;
        let i = best.length;
        while (i > 0 && best[i - 1]!.dist > p.dist) i--;
        if (i < detailN) { best.splice(i, 0, p); if (best.length > detailN) best.pop(); }
      }
      for (const p of best) near.add(p);
    }
    for (const [n, s] of this.each()) {
      s.light?.begin(); s.detail?.begin(); s.far?.begin();
      for (const p of s.queue) this.place(n, s, p, near.has(p) && s.detail !== null, dt, animDist);
      s.light?.end(); s.detail?.end(); s.far?.end();
      s.queue.length = 0;
    }
    if (this.frame % 120 === 0) for (const [id, e] of this.entries) if (e.seen !== this.frame) this.entries.delete(id);
  }

  private place(name: LookSpecies, s: PerSpecies, p: Placed, detail: boolean, dt: number, animDist: number): void {
    const model = s.model, animated = detail || !this.farTier || p.dist <= Math.min(animDist, animalLook.quality[this.qual].lightR);
    const rec = (variant: number): Rec => ({ male: p.male, ageIdx: ageIdxOf(p.age, p.old), patch: model.isPatched(variant), mark: p.mark, polled: model.isPolled(p.id), saddle: !!p.saddled });
    this.pv.set(p.x, p.y, p.z); this.qt.setFromAxisAngle(this.up, p.heading);
    if (!animated) {   // алс: ганц draw call-тай бүдүүвч шат, 3 байрлалын morph (far.ts)
      const variant = model.variantOf(p.id), cols = model.colors(variant, p.old);
      const far = s.far ?? (s.far = new FarSet(name, this.group, CAPS[name] ?? animalLook.lightCap));
      const walking = p.action !== 'stand' && p.action !== 'graze' && p.action !== 'lie';
      this.pv.y += walking ? Math.abs(Math.sin(this.frame * (p.fast ? 0.5 : 0.25) + p.id * 1.7)) * (p.fast ? 0.07 : 0.03) * p.sc : 0;   // алхаж буй мал бага зэрэг дэвхцэнэ
      this.sv.setScalar(p.sc);
      this.m.compose(this.pv, this.qt, this.sv);
      const pose = p.action === 'lie' ? POSE_OF.lie : p.action === 'graze' ? POSE_OF.graze : POSE_OF.stand;
      far.push(this.m, cols, model.isPatched(variant), p.mark, pose);
      return;
    }
    const key = p.id * 8 + LOOK_SPECIES.indexOf(p.species);   // төрөл хооронд id давхцахгүй (нохой, чонын id тусдаа)
    let e = this.entries.get(key);
    if (!e) { e = { st: newState(), variant: model.variantOf(p.id), seen: 0 }; this.entries.set(key, e); }
    e.seen = this.frame;
    const cols = model.colors(e.variant, p.old);
    const target = detail ? s.detail! : (s.light ?? (s.light = this.newLight(name, s)));
    const rig = s.rig;
    rig.st = e.st;
    rig.root.position.copy(this.pv); rig.root.quaternion.copy(this.qt);
    poseAnimal(rig, dt, { action: p.action, speed: p.speed, fast: p.fast, sc: p.sc, old: p.old, fat: p.fat, noStep: p.noStep, saddled: p.saddled });
    rig.root.updateMatrixWorld(true);
    p.onPose?.(rig);
    target.push(rig, rec(e.variant), cols);
  }

  private newLight(name: LookSpecies, s: PerSpecies): AnimalSet {
    const set = new AnimalSet(s.model.parts('light'), this.group, CAPS[name]);
    this.shadows(set);
    set.begin();
    return set;
  }

  /** Бууц солигдох, шинэ тоглоом: хөдөлгөөний төлөвийг тэглэнэ */
  reset(): void { this.entries.clear(); }
}
