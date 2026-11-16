/**
 * Туслах малчид (M5): малчин морьтой, хүүхэд явган; айлын гэр, туслахын майхан/гэр хотын ойролцоо.
 * Байрлалыг sim-ээс уншиж (алхам бүрт шинэчлэгддэг) кадр бүр зөөлрүүлнэ.
 */
import * as THREE from 'three';
import type { GameState } from '../sim/state';
import type { Dwelling, Helper } from '../sim/systems/helpers';
import type { Quality } from '../device';
import { animalLook } from './animal/config';
import { gaitFor } from './animal/pose';
import { saddleDims } from './animal/shapes';
import { ModelAnimals } from './animal/view';
import { visualStyle } from './style';
import { animateCharacter } from './character/animate';
import { buildCharacter, dressCharacter, type CharacterRig } from './character/rig';
import { characters, helperSpec } from './character/spec';
import { EmotionQueue } from './character/talk';
import type { Wolf } from '../sim/systems/wolves';
import type { HelperRole } from './style';
import type { Season } from '../sim/config';
import { angDiff } from './util';
import { GER } from './ger/config';
import { makeGer, type GerBuilt } from './ger/ger';
import { makeTent } from './ger/tent';

/** Туслахын үүрэг → preset ба дээлийн өнгө (V4.1, V4.5 R5 data/characters.json roles). Адуу хариулж буй малчин = адуучин. */
function helperRole(h: Helper): HelperRole {
  if (h.task === 'herd') return h.herd === 'horse' ? 'horse' : 'herd';
  return h.task;
}

/**
 * Туслахын байр (V3.5/V6.2 загвар, render/ger): айлын гэр — үндсэн бүрээс, хаалганы хээ айлаар; туслахын гэр — GER.helper
 * (бүрээсийн өнгө, бүслүүр, энгийн хаалга); ганц биеийн майхан — «отрын майхан», адуучных — «адуучны майхан».
 */
export function makeDwelling(d: Dwelling, season: 'summer' | 'winter'): GerBuilt {
  if (d.kind === 'helperTent') return makeTent('otor', { season });
  if (d.kind === 'horseCamp') return makeTent('horse', { season });
  if (d.kind === 'helperGer') {
    const H = GER.helper;
    return makeGer(H.size, { season, coverColor: H.coverColor, belts: H.belts, doorVariant: Math.max(0, GER.doors.findIndex((v) => v.motif === H.doorMotif)) });
  }
  return makeGer(GER.home.size, { season, doorVariant: (d.familyId ?? 0) % GER.doors.length });
}

interface HelperView {
  rig: CharacterRig;
  /** морьтой (адуучин, малчин): морь render/animal/-д, малчин эмээлд */
  horse: boolean;
  /** эмээлийн суудал (poseAnimal-ийн дараа) */
  seat: { x: number; y: number; z: number } | null;
  speed: number;
  root: THREE.Group;
  x: number;
  z: number;
  h: number;
  phase: number;
  role: HelperRole;
  /** R7: сэтгэл хөдлөл (чоно харвал гайхна) */
  emo: EmotionQueue;
  sawWolf: boolean;
}

export class StaffView {
  readonly group = new THREE.Group();
  private views = new Map<number, HelperView>();
  private models: ModelAnimals;
  private quality: Quality = 'high';   // scene.setQuality() жинхэнэ чанарыг тавина (device-ийг энд импортлохгүй: тест node-д ажиллана)
  private readonly saddle = saddleDims(animalLook.species.horse.d);

  constructor() {
    this.models = new ModelAnimals(this.group, this.quality);
  }

  setQuality(quality: Quality): void {
    this.quality = quality;
    this.models.setQuality(quality);
  }
  private dwellings = new Map<string, GerBuilt>();

  private season: Season = 'summer';
  /** Улирал солигдоход туслахуудын хувцас (V4.1) */
  setSeason(season: Season): void {
    if (season === this.season) return;
    this.season = season;
    for (const v of this.views.values()) dressCharacter(v.rig, season);
  }

  update(state: GameState, heightAt: (x: number, z: number) => number, dt: number): void {
    this.syncDwellings(state.helpers.dwellings, heightAt);
    const alive = new Set<number>();
    for (const h of state.helpers.list as Helper[]) {
      alive.add(h.id);
      let v = this.views.get(h.id);
      const role = helperRole(h);
      // Үүрэг солигдвол дээлийн өнгө өөрчлөгдөнө — дүрсийг шинээр үүсгэнэ
      if (v && v.role !== role) {
        this.group.remove(v.root);
        this.views.delete(h.id);
        v = undefined;
      }
      if (!v) {
        const rig = buildCharacter(helperSpec(role, h.sex, h.kind === 'child'), { detail: 'npc' });
        dressCharacter(rig, this.season);
        const root = new THREE.Group();
        const horse = h.kind === 'adult';
        if (horse) this.group.add(rig.root);   // морьтой малчин дэлхийн байрлалаар (эмээлийн суудлаас)
        else root.add(rig.root);
        this.group.add(root);
        v = { rig, horse, seat: null, speed: 0, root, x: h.x, z: h.z, h: h.heading, phase: 0, role, emo: new EmotionQueue(), sawWolf: false };
        this.views.set(h.id, v);
      }
      const visible = h.mode !== 'away' && state.player.place === 'camp' && !state.move;
      v.root.visible = visible;
      if (v.horse) v.rig.root.visible = visible;
      if (!visible) continue;
      if (Math.hypot(h.x - v.x, h.z - v.z) > 30) {
        v.x = h.x;
        v.z = h.z;
      }
      const k = Math.min(1, dt * 7);
      const nx = v.x + (h.x - v.x) * k, nz = v.z + (h.z - v.z) * k;
      const sp = dt > 0 ? Math.hypot(nx - v.x, nz - v.z) / dt : 0;
      if (sp > 0.2) v.h += angDiff(Math.atan2(nx - v.x, nz - v.z), v.h) * Math.min(1, dt * 6);
      v.x = nx;
      v.z = nz;
      v.phase += dt * sp * (v.horse ? 0.9 : 2.6);
      // дайрч буй чоно ойроос харвал гайхна → уурлана (data/characters.json talk.events.wolfSeen)
      const R = characters.talk.wolfSeeR;
      const wolf = (state.wolves.list as Wolf[]).some((w) => (w.mode === 'hunt' || w.mode === 'drag') && Math.hypot(w.x - v!.x, w.z - v!.z) < R);
      if (wolf && !v.sawWolf) v.emo.playEvent('wolfSeen');
      v.sawWolf = wolf;
      v.speed = sp;
      if (v.horse) {   // морь: render/animal/ (эмээлтэй); малчны поз — flush-ийн дараа (суудлын байрлал)
        const hy = heightAt(v.x, v.z);
        this.models.add({
          id: 700000 + h.id, species: 'horse', male: h.id % 3 !== 0, age: 4, old: false, sc: 1, fat: 0.6, mark: false,
          action: gaitFor(animalLook.species.horse, sp), speed: Math.min(sp, 20), fast: sp > 5.3, saddled: true,
          x: v.x, y: hy, z: v.z, heading: v.h, dist: Math.hypot(v.x - state.player.x, v.z - state.player.z),
          onPose: (rig) => { const o = rig.saddle.localToWorld(new THREE.Vector3(0, this.saddle.seat, 0)); v!.seat = { x: o.x, y: o.y, z: o.z }; },
        });
        continue;
      }
      const bob = animateCharacter(v.rig, { dt, speed: sp, mode: 'foot', raise: false, uurga: false, talk: false, emotion: v.emo.step(dt) });
      v.rig.root.position.y = bob;
      // Унтаж байхад хэвтэнэ (хүүхэд, малчин гэртээ)
      v.root.rotation.z = h.mode === 'sleep' && !v.horse ? Math.PI / 2 : 0;
      v.root.position.set(v.x, heightAt(v.x, v.z) + (h.mode === 'sleep' && !v.horse ? 0.3 : 0), v.z);
      v.root.rotation.y = v.h;
    }
    this.models.flush(dt, visualStyle.quality[this.quality].animalAnimationDistance);
    for (const v of this.views.values()) {   // морьтой малчин: эмээлийн суудалд, хөл дөрөөнд
      if (!v.horse || !v.root.visible) continue;
      const S = this.saddle;
      animateCharacter(v.rig, { dt, speed: 0, mode: 'mounted', raise: false, uurga: false, talk: false, emotion: v.emo.step(dt), seat: { side: S.side, drop: S.seat - S.stir - 0.006 } });
      if (v.seat) v.rig.root.position.set(v.seat.x, v.seat.y - 0.85, v.seat.z);
      v.rig.root.rotation.y = v.h;
    }
    for (const [id, v] of this.views) if (!alive.has(id)) {
      if (v.horse) this.group.remove(v.rig.root);
      this.group.remove(v.root);
      this.views.delete(id);
    }
  }

  private syncDwellings(list: Dwelling[], heightAt: (x: number, z: number) => number): void {
    const keys = new Set<string>();
    for (const d of list) {
      const season = this.season === 'winter' ? 'winter' : 'summer';
      const key = `${d.kind}|${d.x}|${d.z}|${d.familyId ?? ''}|${season}`;
      keys.add(key);
      let o = this.dwellings.get(key);
      if (!o) {
        o = makeDwelling(d, season);
        o.group.rotation.y = Math.atan2(-d.x, -d.z);   // хаалга (+z) хот руу
        this.group.add(o.group);
        this.dwellings.set(key, o);
      }
      o.group.position.set(d.x, heightAt(d.x, d.z), d.z);
    }
    for (const [k, o] of this.dwellings) if (!keys.has(k)) {
      this.group.remove(o.group);
      o.dispose();
      this.dwellings.delete(k);
    }
  }
}
